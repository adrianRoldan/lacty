import type { Feeding } from '../types';
import { formatTime, formatMinutes, startDayHint } from '../utils/dateUtils';
import { useElapsedTime } from '../hooks/useElapsedMinutes';
import { useConfirm } from './ConfirmDialog';

interface Props {
  feeding: Feeding;
  onEdit: (feeding: Feeding) => void;
  onDelete: (id: string) => void;
  onStop?: (feeding: Feeding) => void;
  listDay?: string;
  readOnly?: boolean;
}

export function BreastIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block align-middle ${className}`}>
      <path d="M5 4 Q16 4 19 12 Q16 20 5 20" />
      <circle cx="17" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function FeedingItem({ feeding, onEdit, onDelete, onStop, listDay, readOnly }: Props) {
  const confirm = useConfirm();
  const totalBreastMin = (feeding.breastMinLeft ?? 0) + (feeding.breastMinRight ?? 0);
  const dayHint = listDay ? startDayHint(feeding.timestamp, listDay) : null;

  const breastInProgress =
    !feeding.endTime &&
    feeding.hasBreast &&
    feeding.breastMinLeft == null &&
    feeding.breastMinRight == null;

  const bottleInProgress =
    !feeding.endTime && feeding.hasBottle && feeding.bottleMl == null;

  const supplementInProgress =
    !feeding.endTime && feeding.hasSupplement && feeding.supplementMl == null;

  const isInProgress = breastInProgress || bottleInProgress || supplementInProgress;
  const elapsed = useElapsedTime(feeding.timestamp);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (await confirm('¿Eliminar esta toma?')) {
      onDelete(feeding.id);
    }
  }

  const bgColor = 'bg-mustard-100';
  const borderColor = 'border-mustard-300';

  return (
    <div
      onClick={readOnly ? undefined : () => onEdit(feeding)}
      className={`${bgColor} border-l-4 ${borderColor} rounded-r-xl px-3 py-2.5 select-none ${readOnly ? '' : 'active:brightness-95 cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold text-gray-900">
              {feeding.hasBreast ? '🤱 ' : feeding.hasBottle ? '🍼 ' : '💉 '}
              {dayHint && (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full mr-1 align-middle">
                  {dayHint}
                </span>
              )}
              {formatTime(feeding.timestamp)}
              {/* Hora fin: pecho con minutos siempre calcula inicio+min; biberón/jeringa usa endTime si existe */}
              {!breastInProgress && !bottleInProgress && !supplementInProgress && (() => {
                const endTs = (feeding.hasBreast && totalBreastMin > 0)
                  ? new Date(new Date(feeding.timestamp).getTime() + totalBreastMin * 60000).toISOString()
                  : (feeding.endTime ?? null);
                return endTs ? (
                  <span className="font-normal text-gray-500">{' → '}{formatTime(endTs)}</span>
                ) : null;
              })()}
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
                </span>
              )
            )}

            {/* Bottle badge */}
            {feeding.hasBottle && (
              bottleInProgress ? (
                <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
                  🍼 En curso…
                </span>
              ) : (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  feeding.bottleType === 'formula' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  🍼 {feeding.bottleMl} ml{feeding.bottleType === 'formula' ? ' · fórmula' : ''}
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
              Toca para finalizar y añadir {breastInProgress ? 'los minutos' : 'los ml'}
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

        {isInProgress && onStop && !readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(feeding); }}
            className="text-red-500 active:text-red-600 p-2 shrink-0 touch-manipulation self-center"
            aria-label="Finalizar toma"
            title="Finalizar toma"
          >
            <StopIcon />
          </button>
        )}

        {!readOnly && (
          <button
            onClick={handleDelete}
            className="text-gray-300 hover:text-red-400 active:text-red-500 p-2 shrink-0 touch-manipulation"
            aria-label="Eliminar toma"
          >
            <TrashIcon />
          </button>
        )}
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
