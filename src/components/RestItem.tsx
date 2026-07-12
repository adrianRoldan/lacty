import type { Rest } from '../types';
import { formatTime, formatMinutes, startDayHint } from '../utils/dateUtils';
import { getRestDurationMinutes } from '../utils/feedingUtils';
import { useElapsedTime } from '../hooks/useElapsedMinutes';
import { useConfirm } from './ConfirmDialog';

interface Props {
  rest: Rest;
  onEdit: (rest: Rest) => void;
  onDelete: (id: string) => void;
  onStop?: (rest: Rest) => void;
  listDay?: string;
  readOnly?: boolean;
}

export default function RestItem({ rest, onEdit, onDelete, onStop, listDay, readOnly }: Props) {
  const confirm = useConfirm();
  const duration = getRestDurationMinutes(rest);
  const elapsed = useElapsedTime(rest.startTime);
  const dayHint = listDay ? startDayHint(rest.startTime, listDay) : null;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (await confirm('¿Eliminar este sueño?')) {
      onDelete(rest.id);
    }
  }

  return (
    <div
      onClick={readOnly ? undefined : () => onEdit(rest)}
      className={`bg-lagoon-100 border-l-4 border-lagoon-300 rounded-r-xl px-3 py-2.5 select-none ${readOnly ? '' : 'active:brightness-95 cursor-pointer'}`}
    >
      <div className={`flex ${rest.notes ? 'items-start' : 'items-center'} justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              🌙{' '}
              {dayHint && (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full mr-1 align-middle">
                  {dayHint}
                </span>
              )}
              {formatTime(rest.startTime)}
              {rest.endTime && (
                <span className="font-normal text-gray-500"> → {formatTime(rest.endTime)}</span>
              )}
            </span>
            {duration != null ? (
              <span className="bg-taupe-200 text-taupe-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {formatMinutes(duration)}
              </span>
            ) : (
              <span className="bg-taupe-100 text-taupe-600 text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
                En curso…
              </span>
            )}
          </div>
          {rest.notes && (
            <p className="text-xs text-taupe-700 mt-1 italic truncate">"{rest.notes}"</p>
          )}
        </div>

        {duration == null && (
          <span className="text-xs text-gray-400 tabular-nums self-center shrink-0">
            {elapsed}
          </span>
        )}

        {duration == null && onStop && !readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(rest); }}
            className="text-red-500 active:text-red-600 p-2 shrink-0 touch-manipulation self-center"
            aria-label="Finalizar sueño"
            title="Finalizar sueño"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="3" />
            </svg>
          </button>
        )}

        {!readOnly && <button
          onClick={handleDelete}
          className="text-purple-300 hover:text-red-400 active:text-red-500 p-2 shrink-0 touch-manipulation"
          aria-label="Eliminar sueño"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>}
      </div>
    </div>
  );
}
