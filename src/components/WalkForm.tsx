import { useState } from 'react';
import type { Walk } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';
import { StrollerIcon } from './CareIcons';

interface Props {
  onSave: (walk: Walk) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: Walk | null;
}

export default function WalkForm({ onSave, onCancel, onDelete, existing }: Props) {
  const confirm = useConfirm();

  const [startTime, setStartTime] = useState(
    toLocalDatetimeInputValue(existing ? new Date(existing.startTime) : new Date())
  );
  const [hasEnd, setHasEnd] = useState(existing?.endTime != null);
  const [endTime, setEndTime] = useState(
    toLocalDatetimeInputValue(existing?.endTime ? new Date(existing.endTime) : new Date())
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(startTime);
    if (hasEnd && new Date(endTime) <= start) {
      setError('La hora de vuelta debe ser posterior a la de salida.');
      return;
    }
    setError('');
    onSave({
      id: existing?.id ?? generateId(),
      startTime: start.toISOString(),
      ...(hasEnd ? { endTime: new Date(endTime).toISOString() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  async function handleDelete() {
    if (!existing || !onDelete) return;
    if (await confirm('¿Eliminar este paseo?')) {
      onDelete(existing.id);
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {existing ? 'Editar paseo' : 'Nuevo paseo'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Salida */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Hora de salida</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-coral-600"
            required
          />
        </div>

        {/* Vuelta (opcional) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setHasEnd(!hasEnd)}
            className="w-full flex items-center justify-between touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <span className="text-coral-600"><StrollerIcon size={24} /></span>
              <div className="text-left">
                <span className="text-base font-semibold text-gray-900">Hora de vuelta</span>
                {!hasEnd && <p className="text-xs text-gray-400">Opcional — añádela al volver a casa</p>}
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors shrink-0 relative ${hasEnd ? 'bg-coral-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasEnd ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {hasEnd && (
            <div className="mt-4">
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-coral-600"
              />
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Observaciones (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: durmió todo el paseo · fuimos al parque"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-coral-600 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-coral-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-coral-700 touch-manipulation"
        >
          {existing ? 'Guardar cambios' : 'Guardar paseo'}
        </button>

        {existing && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation"
          >
            🗑️ Eliminar paseo
          </button>
        )}
      </form>
    </div>
  );
}
