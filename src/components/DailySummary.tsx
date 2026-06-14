import { useState, useEffect, type ReactNode } from 'react';
import type { BabyConfig, Feeding, Rest, TimelineItem, VitaminDLog, ProbioticLog, MassageLog, CalendarEvent } from '../types';
import { getCurrentDaysOfLife, formatMinutes, gapMinutes, isSameDay, todayIso } from '../utils/dateUtils';
import {
  getTodayFeedings,
  getTotalSupplementMl,
  getTotalBreastMinutes,
  getTotalEstimatedBreastMl,
  getTodayRestMinutes,
  buildTimeline,
} from '../utils/feedingUtils';
import { getEffectiveReference } from '../data/referenceTable';
import FeedingItem from './FeedingItem';
import RestItem from './RestItem';
import DayInsights from './DayInsights';

interface Props {
  config: BabyConfig;
  feedings: Feeding[];
  rests: Rest[];
  currentWeightKg?: number;
  vitaminDLogs: VitaminDLog[];
  calendarEvents: CalendarEvent[];
  onOpenAgenda: () => void;
  onNewFeeding: () => void;
  onNewRest: () => void;
  onEditFeeding: (f: Feeding) => void;
  onEditRest: (r: Rest) => void;
  onDeleteFeeding: (id: string) => void;
  onDeleteRest: (id: string) => void;
  onStopFeeding: (f: Feeding) => void;
  onStopRest: (r: Rest) => void;
  onGiveVitaminD: (date: string) => void;
  onRemoveVitaminD: (date: string) => void;
  probioticLogs: ProbioticLog[];
  onGiveProbiotic: (date: string) => void;
  onRemoveProbiotic: (date: string) => void;
  onRecalculateTodayBreast: () => Promise<void>;
  massageLogs: MassageLog[];
  onAddMassage: (date: string) => void;
  onRemoveMassage: (id: string) => void;
}

// Returns the previous feeding timestamp for a given index, ignoring rests.
function prevFeedingTimestamp(timeline: TimelineItem[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (timeline[i].type === 'feeding') return (timeline[i].data as import('../types').Feeding).timestamp;
  }
  return null;
}

export default function DailySummary({
  config, feedings, rests, currentWeightKg, vitaminDLogs,
  calendarEvents, onOpenAgenda,
  onNewFeeding, onNewRest,
  onEditFeeding, onEditRest,
  onDeleteFeeding, onDeleteRest,
  onStopFeeding, onStopRest,
  onGiveVitaminD, onRemoveVitaminD,
  probioticLogs, onGiveProbiotic, onRemoveProbiotic,
  onRecalculateTodayBreast,
  massageLogs, onAddMassage, onRemoveMassage,
}: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const todayFeedings = getTodayFeedings(feedings);
  const today = todayIso();
  const todayRests = rests.filter((r) => isSameDay(r.startTime, today) || r.endTime == null);
  const totalMl = getTotalSupplementMl(todayFeedings);
  const totalBreastMin = getTotalBreastMinutes(todayFeedings);
  const totalEstimatedBreastMl = getTotalEstimatedBreastMl(todayFeedings);
  const totalRestMin = getTodayRestMinutes(rests);
  const hasBreastWithMinutes = todayFeedings.some(
    (f) => f.hasBreast && ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0
  );
  const timeline = buildTimeline(feedings, rests);
  const reference = getEffectiveReference(daysOfLife, currentWeightKg);

  function buildCareItems(): CareItem[] {
    const items: CareItem[] = [];

    if (config.vitaminDEnabled) {
      const given = vitaminDLogs.some((l) => l.date === today);
      items.push({
        key: 'vitaminD',
        icon: '💊',
        done: given,
        reminder: config.vitaminDReminderHour !== undefined
          ? <SupplementReminder logs={vitaminDLogs} reminderHour={config.vitaminDReminderHour} icon="💊" label="vitamina D3" />
          : undefined,
        card: <SupplementCard icon="💊" label={`Vitamina D3${config.vitaminDMedName ? ` · ${config.vitaminDMedName}` : ''}`} sublabel="2 gotas" given={given}
                onGive={() => onGiveVitaminD(today)} onRemove={() => onRemoveVitaminD(today)} />,
      });
    }

    if (config.probioticEnabled) {
      const given = probioticLogs.some((l) => l.date === today);
      items.push({
        key: 'probiotic',
        icon: '🦠',
        done: given,
        reminder: config.probioticReminderHour !== undefined
          ? <SupplementReminder logs={probioticLogs} reminderHour={config.probioticReminderHour} icon="🦠" label="probiótico" />
          : undefined,
        card: <SupplementCard icon="🦠" label={`Probiótico${config.probioticMedName ? ` · ${config.probioticMedName}` : ''}`} sublabel="5 gotas" given={given}
                onGive={() => onGiveProbiotic(today)} onRemove={() => onRemoveProbiotic(today)} />,
      });
    }

    if (config.frenectomyEnabled && config.frenectomyDate) {
      const end = new Date(config.frenectomyDate + 'T12:00:00');
      end.setDate(end.getDate() + 21);
      if (end.getTime() > Date.now()) {
        const count = massageLogs.filter((m) => m.date === today).length;
        const startT = config.frenectomyStartTime ?? '08:30';
        const endT = config.frenectomyEndTime ?? '22:30';
        items.push({
          key: 'massage',
          icon: '👅',
          done: count >= 5,
          reminder: <MassageReminder massageLogs={massageLogs} frenectomyDate={config.frenectomyDate}
                      startTime={startT} endTime={endT} />,
          card: <MassageWidget massageLogs={massageLogs} frenectomyDate={config.frenectomyDate}
                  startTime={startT} endTime={endT}
                  onAdd={() => onAddMassage(today)} onRemove={onRemoveMassage} />,
        });
      }
    }

    return items;
  }

  const careItems = buildCareItems();
  const careReminders = careItems.filter((i) => !i.done && i.reminder);

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hoy</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}día {daysOfLife} de vida
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewRest}
            className="bg-taupe-600 text-white font-semibold px-4 py-3 rounded-xl text-sm active:bg-taupe-700 touch-manipulation"
          >
            + Sueño
          </button>
          <button
            onClick={onNewFeeding}
            className="bg-sage-600 text-white font-semibold px-4 py-3 rounded-xl text-sm active:bg-sage-700 touch-manipulation"
          >
            + Toma
          </button>
        </div>
      </div>

      {/* Avisos — siempre arriba del todo */}
      <LastFeedingBanner feedings={todayFeedings} reference={reference} />
      {careReminders.map((i) => (
        <div key={`reminder-${i.key}`}>{i.reminder}</div>
      ))}
      <NextEventBanner events={calendarEvents} onOpen={onOpenAgenda} />

      {/* Stats — 2 filas × 3 columnas */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Fila 1 */}
        <StatCard value={String(todayFeedings.length)}  label="tomas"    color="text-gray-900" />
        <StatCard
          value={totalEstimatedBreastMl > 0 ? `~${totalMl + totalEstimatedBreastMl} ml` : `${totalMl} ml`}
          label="total ml"
          color="text-gray-900"
        />
        <StatCard value={`${totalMl} ml`} label="jeringa" color="text-sage-600" />

        {/* Fila 2 */}
        <StatCard
          value={totalEstimatedBreastMl > 0 ? `~${totalEstimatedBreastMl} ml` : '—'}
          label="pecho ml"
          color={totalEstimatedBreastMl > 0 ? 'text-pink-400' : 'text-gray-300'}
        />
        <div className="relative">
          <StatCard value={formatMinutes(totalBreastMin)} label="pecho" color="text-pink-600" />
          {hasBreastWithMinutes && (
            <button
              onClick={onRecalculateTodayBreast}
              className="absolute top-2 right-2 text-xs text-pink-300 hover:text-pink-500 touch-manipulation"
              title="Recalcular ml de pecho de hoy"
            >
              ↻
            </button>
          )}
        </div>
        <StatCard value={formatMinutes(totalRestMin)} label="sueño" color="text-taupe-600" />
      </div>

      {/* Cuidados diarios agrupados */}
      <DailyCareSection items={careItems} />

      {/* Insights: progress + averages */}
      <DayInsights feedings={todayFeedings} rests={todayRests} reference={reference} />

      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🍼</p>
          <p className="text-base">Aún no hay registros hoy</p>
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={onNewFeeding} className="text-sage-600 font-medium touch-manipulation">+ Toma</button>
            <button onClick={onNewRest} className="text-taupe-600 font-medium touch-manipulation">+ Sueño</button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hoy</h2>
          {timeline.map((item, i) => {
            // Lista descendente: prevFeedingTimestamp es MÁS RECIENTE (índice menor)
            // Gap = desde este ítem hasta el más reciente de arriba
            const morerecentTs = prevFeedingTimestamp(timeline, i);
            const gap =
              item.type === 'feeding' && morerecentTs
                ? gapMinutes(item.data.timestamp, morerecentTs)
                : null;
            return (
              <div key={item.data.id}>
                {gap !== null && <GapLine minutes={gap} />}
                {item.type === 'feeding' ? (
                  <FeedingItem feeding={item.data} onEdit={onEditFeeding} onDelete={onDeleteFeeding} onStop={onStopFeeding} />
                ) : (
                  <RestItem rest={item.data} onEdit={onEditRest} onDelete={onDeleteRest} onStop={onStopRest} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getRecommendedTimes(startTime: string, endTime: string): string[] {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toStr = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const start = toMin(startTime);
  const end = toMin(endTime);
  const interval = (end - start) / 4;
  return Array.from({ length: 5 }, (_, i) => toStr(Math.round(start + interval * i)));
}

function MassageWidget({ massageLogs, frenectomyDate, startTime, endTime, onAdd, onRemove }: {
  massageLogs: MassageLog[];
  frenectomyDate: string;
  startTime: string;
  endTime: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const today = todayIso();
  const end = new Date(frenectomyDate + 'T12:00:00');
  end.setDate(end.getDate() + 21);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return null;

  const todayMassages = massageLogs
    .filter((m) => m.date === today)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  const recommended = getRecommendedTimes(startTime, endTime);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">👅</span>
          <span className="text-sm font-semibold text-gray-800">Masajes</span>
          <span className="text-xs text-gray-400">{todayMassages.length}/5</span>
        </div>
        <span className="text-xs text-blue-500 font-medium">{daysLeft} días restantes</span>
      </div>
      <div className="flex justify-between gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const massage = todayMassages[i];
          const done = !!massage;
          const recMin = (() => { const [h, m] = recommended[i].split(':').map(Number); return h * 60 + m; })();
          const isPast = nowMin >= recMin;
          const isNext = !done && i === todayMassages.length && isPast;
          return (
            <button
              key={i}
              onClick={done ? () => onRemove(massage.id) : onAdd}
              disabled={!done && todayMassages.length >= 5}
              className="flex-1 flex flex-col items-center gap-1 touch-manipulation"
            >
              <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-colors
                ${done ? 'bg-blue-100 text-blue-700' : isNext ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300' : 'bg-gray-100 text-gray-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className="text-xs text-blue-400 tabular-nums">{recommended[i]}</span>
              <span className="text-xs text-gray-400 tabular-nums">
                {done ? formatMassageTime(massage.performedAt) : '—'}
              </span>
            </button>
          );
        })}
      </div>
      {todayMassages.length < 5 && (
        <button
          onClick={onAdd}
          className="mt-3 w-full py-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 text-sm font-semibold rounded-xl touch-manipulation transition-colors"
        >
          + Registrar masaje
        </button>
      )}
      {todayMassages.length === 5 && (
        <p className="mt-3 text-center text-xs text-green-600 font-medium">✓ Todos los masajes del día completados</p>
      )}
    </div>
  );
}

function MassageReminder({ massageLogs, frenectomyDate, startTime, endTime }: {
  massageLogs: MassageLog[];
  frenectomyDate: string;
  startTime: string;
  endTime: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = todayIso();
  const end = new Date(frenectomyDate + 'T12:00:00');
  end.setDate(end.getDate() + 21);
  if (end.getTime() <= Date.now()) return null;

  const todayMassages = massageLogs.filter((m) => m.date === today);
  if (todayMassages.length >= 5) return null;

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const recommended = getRecommendedTimes(startTime, endTime);
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  // Próximo masaje pendiente cuya hora recomendada ya ha pasado
  const nextPending = todayMassages.length; // índice 0-4 del próximo masaje a hacer
  if (nextPending >= 5) return null;

  const recMin = toMin(recommended[nextPending]);
  const minutesLate = nowMin - recMin;
  if (minutesLate < 0) return null; // aún no ha llegado la hora

  const h = Math.floor(minutesLate / 60);
  const m = minutesLate % 60;
  const lateStr = h > 0 ? `${h}h ${m}min` : `${m}min`;

  const isLate = minutesLate > 0;

  return (
    <div className={`border-2 rounded-2xl p-4 mb-4 ${isLate ? 'border-orange-400 bg-orange-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl animate-pulse">👅</span>
        <div>
          <p className={`text-sm font-bold ${isLate ? 'text-orange-800' : 'text-amber-800'}`}>
            Masaje #{nextPending + 1} pendiente — {recommended[nextPending]}
          </p>
          <p className={`text-xs mt-0.5 ${isLate ? 'text-orange-600' : 'text-amber-600'}`}>
            {isLate ? `Con ${lateStr} de retraso` : '¡Es la hora!'}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatMassageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface CareItem {
  key: string;
  icon: string;
  done: boolean;
  reminder?: ReactNode;
  card: ReactNode;
}

function SupplementCard({ icon, label, sublabel, given, onGive, onRemove }: {
  icon: string;
  label: string;
  sublabel: string;
  given: boolean;
  onGive: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={given ? onRemove : onGive}
      className={`rounded-2xl p-4 cursor-pointer select-none flex items-center justify-between
        ${given ? 'bg-green-50 border border-green-200 active:bg-green-100' : 'bg-white shadow-sm active:bg-gray-50'}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className={`text-xs mt-0.5 ${given ? 'text-green-600' : 'text-gray-400'}`}>
            {given ? `Dado hoy ✓` : `${sublabel} — toca para marcar`}
          </p>
        </div>
      </div>
      {given && <span className="text-xs text-gray-400">Toca para deshacer</span>}
    </div>
  );
}

function SupplementReminder({ logs, reminderHour, icon, label }: {
  logs: { date: string }[];
  reminderHour: number;
  icon: string;
  label: string;
}) {
  const today = todayIso();
  const given = logs.some((l) => l.date === today);
  if (given || new Date().getHours() < reminderHour) return null;

  return (
    <div className="border-2 border-amber-300 bg-amber-50 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xl animate-pulse">{icon}</span>
        <div>
          <p className="text-sm font-bold text-amber-800">¡No olvides el {label} de hoy!</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Recordatorio a las {String(reminderHour).padStart(2, '0')}:00
          </p>
        </div>
      </div>
    </div>
  );
}

function DailyCareSection({ items }: { items: CareItem[] }) {
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  const pending = items.filter((i) => !i.done);
  const completed = items.filter((i) => i.done);
  const allDone = pending.length === 0;

  return (
    <>
      {/* Pendientes: cards individuales (los recordatorios se muestran arriba del todo) */}
      {pending.map((i) => (
        <div key={i.key} className="mb-4">{i.card}</div>
      ))}

      {/* Completados: card colapsable de resumen */}
      {completed.length > 0 && (
        <div className="mb-4">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between active:bg-green-100 touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-lg">✓</span>
                <span className="text-sm font-semibold text-green-800">
                  {allDone ? 'Cuidados completados' : 'Cuidados hechos'}
                </span>
                <span className="flex items-center gap-1">
                  {completed.map((i) => <span key={i.key} className="text-lg">{i.icon}</span>)}
                </span>
              </div>
              <span className="text-gray-400 text-sm">▶</span>
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setExpanded(false)}
                className="w-full flex items-center justify-between px-1 touch-manipulation"
              >
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cuidados hechos</span>
                <span className="text-gray-400 text-sm">▼</span>
              </button>
              {completed.map((i) => (
                <div key={i.key}>{i.card}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function StatCard({ value, label, color, note }: { value: string; label: string; color: string; note?: string }) {
  const len = value.length;
  const size = len <= 2 ? 'text-3xl' : len <= 5 ? 'text-2xl' : 'text-lg';
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
      <p className={`font-bold ${color} ${size} leading-tight`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
      {note && <p className="text-xs text-pink-400 mt-0.5">{note}</p>}
    </div>
  );
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const EVENT_CAT_META: Record<string, { icon: string; label: string }> = {
  pediatra: { icon: '🩺', label: 'Pediatra' },
  matrona:  { icon: '👩‍⚕️', label: 'Matrona' },
  fisio:    { icon: '💪', label: 'Fisio' },
  vacuna:   { icon: '💉', label: 'Vacuna' },
  analisis: { icon: '🔬', label: 'Análisis' },
  revision: { icon: '👶', label: 'Revisión' },
  otro:     { icon: '📌', label: 'Otro' },
};

function NextEventBanner({ events, onOpen }: { events: CalendarEvent[]; onOpen: () => void }) {
  const today = todayIso();
  const next = events
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time ?? '99')).localeCompare(b.date + (b.time ?? '99')))[0];
  if (!next) return null;

  const meta = EVENT_CAT_META[next.category] ?? EVENT_CAT_META.otro;
  const isToday = next.date === today;
  const isTomorrow = next.date === isoPlusDays(today, 1);
  const whenLabel = isToday ? 'Hoy' : isTomorrow ? 'Mañana'
    : new Date(next.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left rounded-2xl p-3 mb-4 flex items-center gap-3 touch-manipulation active:opacity-80 ${
        isToday ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white shadow-sm'
      }`}
    >
      <span className="text-xl shrink-0">📅</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isToday ? 'font-bold text-blue-800' : 'font-semibold text-gray-800'}`}>
          {isToday ? '¡Cita hoy!' : 'Próxima cita'} · {whenLabel}{next.time ? ` ${next.time}` : ''}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {meta.icon} {next.title || meta.label}
        </p>
      </div>
      <span className="text-gray-300 text-sm">›</span>
    </button>
  );
}

function isoPlusDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function LastFeedingBanner({ feedings, reference }: { feedings: Feeding[]; reference: import('../data/referenceTable').FeedingReference | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (feedings.length === 0) return null;

  const last = [...feedings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const inProgress =
    (last.hasBreast && last.breastMinLeft == null && last.breastMinRight == null) ||
    (last.hasSupplement && last.supplementMl == null);

  if (inProgress) return null;

  // Derive max gap from reference: 24h / min feeds per day
  // Falls back to 3h if no reference available
  const alertMin = reference
    ? Math.round((24 * 60) / reference.feedsPerDayMin)
    : 180;

  const elapsed = Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 60000);
  const isAlert = elapsed >= alertMin;
  const label = formatElapsed(elapsed);

  if (isAlert) {
    return (
      <div className="border-2 border-red-400 bg-red-50 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl animate-pulse">⚠️</span>
          <span className="text-sm font-bold text-red-700">
            ¡Han pasado {label} desde la última toma!
          </span>
        </div>
        <p className="text-xs text-red-500 ml-8 mb-2">El bebé debería comer pronto.</p>
        <div className="ml-8 flex items-center gap-1.5">
          <span className="text-xs text-red-400">Límite recomendado para esta edad:</span>
          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            {formatElapsed(alertMin)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm mb-4 flex items-center gap-2">
      <span>🕐</span>
      <span className="text-sm text-gray-500">
        Última toma hace{' '}
        <span className="font-semibold text-gray-700">{label}</span>
      </span>
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
