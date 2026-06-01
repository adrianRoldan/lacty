import type { Rest } from '../types';
import { formatTime } from '../utils/dateUtils';
import { getRestDurationMinutes } from '../utils/feedingUtils';

interface Props {
  rest: Rest;
  onEdit: (rest: Rest) => void;
  onDelete: (id: string) => void;
}

export default function RestItem({ rest, onEdit, onDelete }: Props) {
  const duration = getRestDurationMinutes(rest);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm('¿Eliminar este descanso?')) {
      onDelete(rest.id);
    }
  }

  return (
    <div
      onClick={() => onEdit(rest)}
      className="bg-purple-50 border border-purple-100 rounded-2xl p-4 active:bg-purple-100 cursor-pointer select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900">
              😴 {formatTime(rest.startTime)}
              {rest.endTime && (
                <span className="font-normal text-gray-500"> → {formatTime(rest.endTime)}</span>
              )}
            </span>
            {duration != null ? (
              <span className="bg-purple-200 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {duration} min
              </span>
            ) : (
              <span className="bg-purple-100 text-purple-600 text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
                En curso…
              </span>
            )}
          </div>
          {rest.notes && (
            <p className="text-xs text-purple-700 mt-1 italic truncate">"{rest.notes}"</p>
          )}
        </div>

        <button
          onClick={handleDelete}
          className="text-purple-300 hover:text-red-400 active:text-red-500 p-2 shrink-0 touch-manipulation"
          aria-label="Eliminar descanso"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
