import type { Feeding } from '../types';
import { formatTime, formatMinutes } from '../utils/dateUtils';
import { useElapsedTime } from '../hooks/useElapsedMinutes';

interface Props {
  feeding: Feeding;
  onEdit: (feeding: Feeding) => void;
  onDelete: (id: string) => void;
  onStop?: (feeding: Feeding) => void;
}

export default function FeedingItem({ feeding, onEdit, onDelete, onStop }: Props) {
  const totalBreastMin = (feeding.breastMinLeft ?? 0) + (feeding.breastMinRight ?? 0);

  const breastInProgress =
    feeding.hasBreast &&
    feeding.breastMinLeft == null &&
    feeding.breastMinRight == null;

  const supplementInProgress =
    feeding.hasSupplement && feeding.supplementMl == null;

  const isInProgress = breastInProgress || supplementInProgress;
  const elapsed = useElapsedTime(feeding.timestamp);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta toma?')) {
      onDelete(feeding.id);
    }
  }

  return (
    <div
      onClick={() => onEdit(feeding)}
      className="bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50 cursor-pointer select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold text-gray-900">
              🍼 {formatTime(feeding.timestamp)}
            </span>

            {/* Breast badge */}
            {feeding.hasBreast && (
              breastInProgress ? (
                <span className="bg-pink-100 text-pink-600 text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
                  🤱 En curso…
                </span>
              ) : (
                <span className="bg-pink-100 text-pink-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  🤱 {formatMinutes(totalBreastMin)}
                  {feeding.breastEstimatedMl != null && (
                    <span className="text-pink-400 ml-1">· ~{feeding.breastEstimatedMl}ml</span>
                  )}
                </span>
              )
            )}

            {/* Supplement badge */}
            {feeding.hasSupplement && (
              supplementInProgress ? (
                <span className="bg-sage-100 text-sage-600 text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
                  💉 En curso…
                </span>
              ) : (
                <span className="bg-sage-100 text-sage-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  💉 {feeding.supplementMl} ml
                </span>
              )
            )}
          </div>

          {/* Breast detail */}
          {feeding.hasBreast && !breastInProgress &&
            (feeding.breastMinLeft != null || feeding.breastMinRight != null) && (
            <p className="text-xs text-gray-400">
              {feeding.breastMinLeft != null && `Izq: ${feeding.breastMinLeft} min`}
              {feeding.breastMinLeft != null && feeding.breastMinRight != null && '  ·  '}
              {feeding.breastMinRight != null && `Der: ${feeding.breastMinRight} min`}
            </p>
          )}

          {/* In-progress hint */}
          {isInProgress && (
            <p className="text-xs text-gray-400 mt-0.5">
              Toca para finalizar y añadir los minutos
            </p>
          )}

          {feeding.notes && (
            <p className="text-xs text-gray-500 mt-1 italic truncate">"{feeding.notes}"</p>
          )}
        </div>

        {isInProgress && (
          <span className="text-xs text-gray-400 tabular-nums self-center shrink-0">
            {elapsed}
          </span>
        )}

        {breastInProgress && onStop && (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(feeding); }}
            className="text-red-500 active:text-red-600 p-2 shrink-0 touch-manipulation self-center"
            aria-label="Finalizar toma"
            title="Finalizar toma"
          >
            <StopIcon />
          </button>
        )}

        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-400 active:text-red-500 p-2 shrink-0 touch-manipulation"
          aria-label="Eliminar toma"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
