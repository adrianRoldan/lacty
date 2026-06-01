import type { BabyConfig, Feeding, Rest, TimelineItem } from '../types';
import { getCurrentDaysOfLife, formatMinutes, gapMinutes, isSameDay, todayIso } from '../utils/dateUtils';
import {
  getTodayFeedings,
  getTotalSupplementMl,
  getTotalBreastMinutes,
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
  onNewFeeding: () => void;
  onNewRest: () => void;
  onEditFeeding: (f: Feeding) => void;
  onEditRest: (r: Rest) => void;
  onDeleteFeeding: (id: string) => void;
  onDeleteRest: (id: string) => void;
}

// Returns the previous feeding timestamp for a given index, ignoring rests.
function prevFeedingTimestamp(timeline: TimelineItem[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (timeline[i].type === 'feeding') return (timeline[i].data as import('../types').Feeding).timestamp;
  }
  return null;
}

export default function DailySummary({
  config, feedings, rests, currentWeightKg,
  onNewFeeding, onNewRest,
  onEditFeeding, onEditRest,
  onDeleteFeeding, onDeleteRest,
}: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const todayFeedings = getTodayFeedings(feedings);
  const today = todayIso();
  const todayRests = rests.filter((r) => isSameDay(r.startTime, today));
  const totalMl = getTotalSupplementMl(todayFeedings);
  const totalBreastMin = getTotalBreastMinutes(todayFeedings);
  const totalRestMin = getTodayRestMinutes(rests);
  const timeline = buildTimeline(feedings, rests);
  const reference = getEffectiveReference(daysOfLife, currentWeightKg);

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hoy</h1>
          <p className="text-sm text-gray-500">Día {daysOfLife} de vida</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewRest}
            className="bg-purple-600 text-white font-semibold px-4 py-3 rounded-xl text-sm active:bg-purple-700 touch-manipulation"
          >
            + Descanso
          </button>
          <button
            onClick={onNewFeeding}
            className="bg-blue-600 text-white font-semibold px-4 py-3 rounded-xl text-sm active:bg-blue-700 touch-manipulation"
          >
            + Toma
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard value={String(todayFeedings.length)} label="tomas" color="text-gray-900" />
        <StatCard value={totalMl > 0 ? `${totalMl} ml` : '0'} label="jeringa-dedo" color="text-blue-600" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard value={formatMinutes(totalBreastMin)} label="pecho" color="text-pink-600" />
        <StatCard value={formatMinutes(totalRestMin)} label="descanso" color="text-purple-600" />
      </div>

      {/* Insights: progress + averages */}
      <DayInsights feedings={todayFeedings} rests={todayRests} reference={reference} />

      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🍼</p>
          <p className="text-base">Aún no hay registros hoy</p>
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={onNewFeeding} className="text-blue-600 font-medium touch-manipulation">+ Toma</button>
            <button onClick={onNewRest} className="text-purple-600 font-medium touch-manipulation">+ Descanso</button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hoy</h2>
          {timeline.map((item, i) => {
            const gap =
              item.type === 'feeding'
                ? gapMinutes(prevFeedingTimestamp(timeline, i) ?? undefined, item.data.timestamp)
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
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  const isLong = value.length > 4;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
      <p className={`font-bold ${color} ${isLong ? 'text-xl' : 'text-3xl'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
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
