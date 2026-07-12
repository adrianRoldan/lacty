import type { DiaperChange, PoopColor } from '../types';
import { formatTime } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';

export function DiaperIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="6" width="5" height="4" rx="1.5"/>
      <rect x="18" y="6" width="5" height="4" rx="1.5"/>
      <rect x="4" y="8" width="16" height="12" rx="2.5"/>
    </svg>
  );
}

interface Props {
  diaper: DiaperChange;
  onEdit: (d: DiaperChange) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

const CONTENT_LABEL: Record<string, string> = {
  wet:   '💧 Pipí',
  dirty: '💩 Caca',
  both:  '💧💩 Pipí + caca',
  dry:   '✅ Limpio',
};

const COLOR_LABEL: Record<string, string> = {
  yellow: 'Amarillo',
  brown:  'Marrón',
  green:  'Verde',
  orange: 'Naranja',
  black:  'Negro',
  red:    'Rojo ⚠',
  white:  'Blanco ⚠',
};

const CONSISTENCY_LABEL: Record<string, string> = {
  liquid: 'Líquida',
  soft:   'Blanda',
  pasty:  'Pastosa',
  solid:  'Sólida',
};

const AMOUNT_LABEL: Record<string, string> = {
  little: 'Poca',
  normal: 'Normal',
  much:   'Mucha',
};

const ALARM_COLORS: PoopColor[] = ['red', 'white'];

export default function DiaperItem({ diaper, onEdit, onDelete, readOnly }: Props) {
  const confirm = useConfirm();
  const isAlarm = diaper.poopColor != null && ALARM_COLORS.includes(diaper.poopColor);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (await confirm('¿Eliminar este cambio de pañal?')) {
      onDelete(diaper.id);
    }
  }

  return (
    <div
      onClick={readOnly ? undefined : () => onEdit(diaper)}
      className={`bg-sky-50 border-l-4 border-sky-200 rounded-r-xl px-3 py-2.5 select-none ${readOnly ? '' : 'active:brightness-95 cursor-pointer'}`}
    >
      <div className={`flex ${diaper.notes ? 'items-start' : 'items-center'} justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-sm font-bold text-gray-900">
              {CONTENT_LABEL[diaper.content]} · {formatTime(diaper.timestamp)}
            </span>
            {isAlarm && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">⚠</span>
            )}
            {diaper.poopColor && (
              <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {COLOR_LABEL[diaper.poopColor]}
              </span>
            )}
            {diaper.poopConsistency && (
              <span className="bg-sky-100 text-sky-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {CONSISTENCY_LABEL[diaper.poopConsistency]}
              </span>
            )}
            {diaper.poopAmount && (
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {AMOUNT_LABEL[diaper.poopAmount]}
              </span>
            )}
          </div>
          {diaper.notes && (
            <p className="text-xs text-taupe-700 mt-1 italic truncate">"{diaper.notes}"</p>
          )}
        </div>

        {!readOnly && (
          <button
            onClick={handleDelete}
            className="text-purple-300 hover:text-red-400 active:text-red-500 p-2 shrink-0 touch-manipulation"
            aria-label="Eliminar cambio de pañal"
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
