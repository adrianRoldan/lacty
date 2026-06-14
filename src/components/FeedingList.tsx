import { useState } from 'react';
import type { Feeding, Rest, TimelineItem, WeightEntry, VitaminDLog, ProbioticLog, MassageLog } from '../types';
import { formatDate, formatDateShort, formatMinutes, gapMinutes, localDateOf } from '../utils/dateUtils';
import {
  groupTimelineByDay,
  getTotalSupplementMl,
  getTotalBreastMinutes,
  getTotalEstimatedBreastMl,
  getHistorySummary,
} from '../utils/feedingUtils';
import FeedingItem from './FeedingItem';
import RestItem from './RestItem';
import { lazy, Suspense } from 'react';
const ChartsView = lazy(() => import('./ChartsView'));

interface Props {
  feedings: Feeding[];
  rests:    Rest[];
  weights:  WeightEntry[];
  vitaminDLogs: VitaminDLog[];
  vitaminDEnabled: boolean;
  probioticLogs: ProbioticLog[];
  probioticEnabled: boolean;
  massageLogs: MassageLog[];
  frenectomyEnabled: boolean;
  frenectomyDate?: string;
  onEditFeeding: (f: Feeding) => void;
  onEditRest:    (r: Rest) => void;
  onDeleteFeeding: (id: string) => void;
  onDeleteRest:    (id: string) => void;
}

type FilterType   = 'all' | 'feedings' | 'rests';
type FilterPeriod = 'all' | '7d' | '14d' | '30d';
type MainView     = 'list' | 'charts';

function morerecentFeedingTimestamp(items: TimelineItem[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (items[i].type === 'feeding') return (items[i].data as Feeding).timestamp;
  }
  return null;
}

function cutoffDate(period: FilterPeriod): string | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateOf(d.toISOString());
}

function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7); // "2026-06"
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export default function FeedingList({
  feedings, rests, weights, vitaminDLogs, vitaminDEnabled,
  probioticLogs, probioticEnabled,
  massageLogs, frenectomyEnabled, frenectomyDate,
  onEditFeeding, onEditRest,
  onDeleteFeeding, onDeleteRest,
}: Props) {
  const vitaminDDates  = new Set(vitaminDLogs.map((l) => l.date));
  const probioticDates = new Set(probioticLogs.map((l) => l.date));

  // Rango de días de frenectomía para mostrar masajes en historial
  const frenectomyStart = frenectomyDate ? new Date(frenectomyDate + 'T12:00:00') : null;
  const frenectomyEnd   = frenectomyStart ? new Date(frenectomyStart.getTime() + 21 * 86400000) : null;
  function isInFrenectomyPeriod(day: string): boolean {
    if (!frenectomyEnabled || !frenectomyStart || !frenectomyEnd) return false;
    const d = new Date(day + 'T12:00:00');
    return d >= frenectomyStart && d <= frenectomyEnd;
  }
  const [mainView, setMainView]       = useState<MainView>('list');
  const [filterType, setFilterType]   = useState<FilterType>('all');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set([currentMonth]));

  function toggleMonth(key: string) {
    setOpenMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const summary = getHistorySummary(feedings, rests);

  const cutoff = cutoffDate(filterPeriod);
  const filteredFeedings = filterType === 'rests'    ? [] : feedings.filter(f => !cutoff || localDateOf(f.timestamp) >= cutoff);
  const filteredRests    = filterType === 'feedings' ? [] : rests.filter(r => !cutoff || localDateOf(r.startTime) >= cutoff);

  const groups = groupTimelineByDay(filteredFeedings, filteredRests);
  const days   = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  // Group days by month
  const monthsMap: Record<string, string[]> = {};
  for (const day of days) {
    const mk = monthKey(day);
    if (!monthsMap[mk]) monthsMap[mk] = [];
    monthsMap[mk].push(day);
  }
  const months = Object.keys(monthsMap).sort((a, b) => b.localeCompare(a));

  if (feedings.length === 0 && rests.length === 0) {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Historial</h1>
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-base">No hay registros aún</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          <button
            onClick={() => setMainView('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mainView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setMainView('charts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mainView === 'charts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            📈 Gráficas
          </button>
        </div>
      </div>

      {mainView === 'charts' && (
        <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Cargando gráficas…</div>}>
          <ChartsView feedings={feedings} rests={rests} weights={weights} />
        </Suspense>
      )}

      {mainView === 'list' && <>
        {/* Resumen global */}
        {summary && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Media global — {summary.totalDays} {summary.totalDays === 1 ? 'día' : 'días'}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <SummaryRow icon="🍼" label="Tomas/día"      value={String(summary.avgFeedingsPerDay)} />
              {summary.avgBreastFeedsPerDay > 0 && (
                <SummaryRow icon="🤱" label="Pecho/día"     value={`${summary.avgBreastFeedsPerDay} tomas`} />
              )}
              {summary.avgSyringeFeedsPerDay > 0 && (
                <SummaryRow icon="💉" label="Jeringa/día"   value={`${summary.avgSyringeFeedsPerDay} tomas`} />
              )}
              {summary.avgTotalMlPerFeeding > 0 && (
                <SummaryRow icon="💧" label="ml/toma total" value={`${summary.avgTotalMlPerFeeding} ml`} />
              )}
              {summary.avgTotalMlPerDay > 0 && (
                <SummaryRow icon="💧" label="ml/día total"  value={`${summary.avgTotalMlPerDay} ml`} />
              )}
              {summary.avgBreastMinPerDay > 0 && (
                <SummaryRow icon="⏱" label="Min pecho/día" value={formatMinutes(summary.avgBreastMinPerDay)} />
              )}
              {summary.avgRestMinutes > 0 && (
                <SummaryRow icon="😴" label="Sueño"         value={formatMinutes(summary.avgRestMinutes)} />
              )}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="space-y-2 mb-5">
          <div className="flex gap-2">
            {(['all', 'feedings', 'rests'] as FilterType[]).map((v) => (
              <button
                key={v}
                onClick={() => setFilterType(v)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold touch-manipulation transition-colors ${
                  filterType === v ? 'bg-sage-600 text-white' : 'bg-white text-gray-500 shadow-sm'
                }`}
              >
                {v === 'all' ? 'Todo' : v === 'feedings' ? '🍼 Tomas' : '😴 Sueños'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all', '7d', '14d', '30d'] as FilterPeriod[]).map((v) => (
              <button
                key={v}
                onClick={() => setFilterPeriod(v)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold touch-manipulation transition-colors ${
                  filterPeriod === v ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 shadow-sm'
                }`}
              >
                {v === 'all' ? 'Siempre' : v === '7d' ? '7 días' : v === '14d' ? '14 días' : '30 días'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista agrupada por mes */}
        {months.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No hay registros con estos filtros.
          </div>
        ) : (
          <div className="space-y-3">
            {months.map((mk) => {
              const monthDays = monthsMap[mk];
              const isOpen = openMonths.has(mk);

              // Aggregate stats for the month header
              const allDayFeedings = monthDays.flatMap(d =>
                groups[d]
                  .filter(i => i.type === 'feeding')
                  .map(i => i.data as Feeding)
              );
              const monthTotalMl = getTotalSupplementMl(allDayFeedings) + getTotalEstimatedBreastMl(allDayFeedings);
              const monthAvgMl = monthDays.length > 0 ? Math.round(monthTotalMl / monthDays.length) : 0;
              const monthAvgFeedings = monthDays.length > 0
                ? Math.round((allDayFeedings.length / monthDays.length) * 10) / 10
                : 0;

              return (
                <div key={mk}>
                  {/* Month header */}
                  <button
                    onClick={() => toggleMonth(mk)}
                    className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 active:bg-gray-200 rounded-2xl px-4 py-3 touch-manipulation transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-800">{monthLabel(mk)}</span>
                      <span className="text-xs text-gray-500">{monthDays.length} {monthDays.length === 1 ? 'día' : 'días'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        {monthAvgFeedings > 0 && (
                          <span className="text-xs text-gray-500">{monthAvgFeedings} tomas/día</span>
                        )}
                        {monthAvgMl > 0 && (
                          <span className="text-xs text-gray-500 ml-2">· ~{monthAvgMl} ml/día</span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">{isOpen ? '▼' : '▶'}</span>
                    </div>
                  </button>

                  {/* Days within month */}
                  {isOpen && (
                    <div className="mt-2 space-y-6 pl-1">
                      {monthDays.map((day) => {
                        const items = groups[day];
                        const dayFeedings = items
                          .filter((i): i is typeof i & { type: 'feeding' } => i.type === 'feeding')
                          .map((i) => i.data);
                        const jeringaMl    = getTotalSupplementMl(dayFeedings);
                        const estimatedMl  = getTotalEstimatedBreastMl(dayFeedings);
                        const totalMl      = jeringaMl + estimatedMl;
                        const totalMin     = getTotalBreastMinutes(dayFeedings);
                        const isoRef       = items[0].sortKey;
                        const mlFeedings   = dayFeedings.filter(
                          f => (f.supplementMl != null && f.supplementMl > 0) || (f.breastEstimatedMl != null && f.breastEstimatedMl > 0)
                        );
                        const avgMlPerToma = mlFeedings.length > 0
                          ? Math.round(totalMl / mlFeedings.length)
                          : 0;
                        const breastCount  = dayFeedings.filter(f => f.hasBreast).length;
                        const syringeCount = dayFeedings.filter(f => f.hasSupplement && (f.supplementMl ?? 0) > 0).length;

                        return (
                          <div key={day}>
                            <div className="flex items-baseline justify-between mb-1">
                              <h2 className="text-sm font-semibold text-gray-700 capitalize">
                                {formatDate(isoRef)}
                              </h2>
                              <span className="text-xs text-gray-400">{formatDateShort(isoRef)}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-400 mb-2">
                              {dayFeedings.length > 0 && <span>{dayFeedings.length} tomas</span>}
                              {breastCount > 0 && <span className="text-pink-400">· 🤱 {breastCount}</span>}
                              {syringeCount > 0 && <span className="text-sage-500">· 💉 {syringeCount}</span>}
                              {totalMl > 0 && <span>· {totalMl} ml</span>}
                              {avgMlPerToma > 0 && <span>· {avgMlPerToma} ml/toma</span>}
                              {totalMin > 0 && <span>· {formatMinutes(totalMin)} pecho</span>}
                              {vitaminDEnabled && (
                                vitaminDDates.has(day)
                                  ? <span className="text-green-600 font-medium">· 💊 ✓</span>
                                  : <span className="text-red-400 font-medium">· 💊 ✗</span>
                              )}
                              {(probioticEnabled || probioticDates.has(day)) && (
                                probioticDates.has(day)
                                  ? <span className="text-green-600 font-medium">· 🦠 ✓</span>
                                  : probioticEnabled
                                    ? <span className="text-red-400 font-medium">· 🦠 ✗</span>
                                    : null
                              )}
                              {isInFrenectomyPeriod(day) && (() => {
                                const count = massageLogs.filter((m) => m.date === day).length;
                                return count > 0
                                  ? <span className="text-blue-500 font-medium">· 👅 {count}/5</span>
                                  : <span className="text-red-400 font-medium">· 👅 0/5</span>;
                              })()}
                            </div>
                            {/* Masajes detalle */}
                            {isInFrenectomyPeriod(day) && (() => {
                              const dayMassages = massageLogs
                                .filter((m) => m.date === day)
                                .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
                              if (dayMassages.length === 0) return null;
                              return (
                                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                  <span className="text-xs text-gray-400">👅</span>
                                  {dayMassages.map((m) => (
                                    <span key={m.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                      {new Date(m.performedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            <div>
                              {items.map((item, i) => {
                                const recentTs = morerecentFeedingTimestamp(items, i);
                                const gap = item.type === 'feeding' && recentTs
                                  ? gapMinutes(item.data.timestamp, recentTs)
                                  : null;
                                return (
                                  <div key={item.data.id}>
                                    {gap !== null && <GapLine minutes={gap} />}
                                    {item.type === 'feeding' ? (
                                      <FeedingItem feeding={item.data} onEdit={onEditFeeding} onDelete={onDeleteFeeding} />
                                    ) : (
                                      <RestItem rest={item.data} onEdit={onEditRest} onDelete={onDeleteRest} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>}
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function GapLine({ minutes }: { minutes: number }) {
  return (
    <div className="flex items-center gap-2 my-1 px-1">
      <div className="flex-1 border-t border-dashed border-gray-200" />
      <span className="text-xs text-gray-400 shrink-0">{formatMinutes(minutes)}</span>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  );
}
