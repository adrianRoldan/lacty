import type { Extraction } from '../types';
import { formatTime } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  extraction: Extraction;
  onEdit: (e: Extraction) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

const LADO_LABEL: Record<Extraction['side'], string> = { left: 'Izquierdo', right: 'Derecho', both: 'Ambos' };

export default function ExtractionItem({ extraction, onEdit, onDelete, readOnly }: Props) {
  const confirm = useConfirm();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (await confirm('¿Eliminar esta extracción?')) {
      onDelete(extraction.id);
    }
  }

  return (
    <div
      onClick={readOnly ? undefined : () => onEdit(extraction)}
      className={`bg-cyan-50 border-l-4 border-cyan-200 rounded-r-xl px-3 py-2.5 select-none ${readOnly ? '' : 'active:brightness-95 cursor-pointer'}`}
    >
      <div className={`flex ${extraction.notes ? 'items-start' : 'items-center'} justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-sm font-bold text-gray-900">
              🥛 {formatTime(extraction.timestamp)}
              <span className="text-gray-500"> · {LADO_LABEL[extraction.side]}</span>
            </span>
            {extraction.ml != null && (
              <span className="bg-cyan-100 text-cyan-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {extraction.ml} ml
              </span>
            )}
            {extraction.purpose === 'extra' && (
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                Extra (banco)
              </span>
            )}
          </div>
          {extraction.notes && (
            <p className="text-xs text-taupe-700 mt-1 italic truncate">"{extraction.notes}"</p>
          )}
        </div>

        {!readOnly && (
          <button
            onClick={handleDelete}
            className="text-purple-300 hover:text-red-400 active:text-red-500 p-2 shrink-0 touch-manipulation"
            aria-label="Eliminar extracción"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
