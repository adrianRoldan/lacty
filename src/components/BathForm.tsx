import { useState } from 'react';
import type { Bath, BathSkin } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  onSave: (b: Bath) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: Bath | null;
}

// El estado de la piel es lo que más se acaba consultando con la pediatra,
// y el baño es justo el momento en que se ve.
const PIEL: { valor: BathSkin; etiqueta: string }[] = [
  { valor: 'normal',    etiqueta: 'Normal' },
  { valor: 'dry',       etiqueta: 'Seca' },
  { valor: 'irritated', etiqueta: 'Irritada' },
  { valor: 'cradleCap', etiqueta: 'Costra láctea' },
  { valor: 'redness',   etiqueta: 'Rojeces' },
];

export default function BathForm({ onSave, onCancel, onDelete, existing }: Props) {
  const confirm = useConfirm();

  const [timestamp, setTimestamp] = useState(
    toLocalDatetimeInputValue(existing ? new Date(existing.timestamp) : new Date())
  );
  const [skin, setSkin] = useState<BathSkin | undefined>(existing?.skin);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: existing?.id ?? generateId(),
      timestamp: new Date(timestamp).toISOString(),
      ...(skin ? { skin } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  async function handleDelete() {
    if (!existing || !onDelete) return;
    if (await confirm('¿Eliminar este baño?')) onDelete(existing.id);
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sage-600 text-lg p-1 touch-manipulation">← Atrás</button>
        <h2 className="text-xl font-bold text-gray-900">{existing ? 'Editar baño' : 'Nuevo baño'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Hora del baño</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            required
          />
        </div>

        {/* Estado de la piel */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">
            Estado de la piel <span className="text-gray-400 font-normal">(opcional)</span>
          </p>
          <p className="text-xs text-gray-400 mb-3">
            El baño es buen momento para fijarse. Si aparece algo, quedará anotado con su fecha.
          </p>
          <div className="flex flex-wrap gap-2">
            {PIEL.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setSkin(skin === p.valor ? undefined : p.valor)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  skin === p.valor
                    ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-300'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Observaciones (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: le encantó el agua · le puse crema después"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation"
        >
          {existing ? 'Guardar cambios' : 'Guardar baño'}
        </button>

        {existing && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation"
          >
            🗑️ Eliminar baño
          </button>
        )}
      </form>
    </div>
  );
}
