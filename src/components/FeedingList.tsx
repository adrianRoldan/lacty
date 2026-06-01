import type { Feeding, Rest, TimelineItem } from '../types';
import { formatDate, formatDateShort, formatMinutes, gapMinutes } from '../utils/dateUtils';
import {
  groupTimelineByDay,
  getTotalSupplementMl,
  getTotalBreastMinutes,
} from '../utils/feedingUtils';
import FeedingItem from './FeedingItem';
import RestItem from './RestItem';

interface Props {
  feedings: Feeding[];
  rests: Rest[];
  onEditFeeding: (f: Feeding) => void;
  onEditRest: (r: Rest) => void;
  onDeleteFeeding: (id: string) => void;
  onDeleteRest: (id: string) => void;
}

function prevFeedingTimestamp(items: TimelineItem[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (items[i].type === 'feeding') return (items[i].data as import('../types').Feeding).timestamp;
  }
  return null;
}

export default function FeedingList({
  feedings, rests,
  onEditFeeding, onEditRest,
  onDeleteFeeding, onDeleteRest,
}: Props) {
  const groups = groupTimelineByDay(feedings, rests);
  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  if (days.length === 0) {
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historial</h1>
      <div className="space-y-6">
        {days.map((day) => {
          const items = groups[day];
          const dayFeedings = items
            .filter((i): i is typeof i & { type: 'feeding' } => i.type === 'feeding')
            .map((i) => i.data);
          const totalMl = getTotalSupplementMl(dayFeedings);
          const totalMin = getTotalBreastMinutes(dayFeedings);
          const isoRef = items[0].sortKey;

          return (
            <div key={day}>
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-700 capitalize">
                  {formatDate(isoRef)}
                </h2>
                <span className="text-xs text-gray-400">{formatDateShort(isoRef)}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-400 mb-2">
                <span>{dayFeedings.length} tomas</span>
                {totalMl > 0 && <span>· {totalMl} ml jeringa</span>}
                {totalMin > 0 && <span>· {formatMinutes(totalMin)} pecho</span>}
              </div>

              <div>
                {items.map((item, i) => {
                  const gap =
                    item.type === 'feeding'
                      ? gapMinutes(prevFeedingTimestamp(items, i) ?? undefined, item.data.timestamp)
                      : null;
                  return (
                    <div key={item.data.id}>
                      {gap !== null && <GapLine minutes={gap} />}
                      {item.type === 'feeding' ? (
                        <FeedingItem
                          feeding={item.data}
                          onEdit={onEditFeeding}
                          onDelete={onDeleteFeeding}
                        />
                      ) : (
                        <RestItem
                          rest={item.data}
                          onEdit={onEditRest}
                          onDelete={onDeleteRest}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
