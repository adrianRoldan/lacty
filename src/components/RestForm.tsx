import { useState } from 'react';
import type { Rest } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';

interface Props {
  onSave: (rest: Rest) => void;
  onCancel: () => void;
  existing?: Rest | null;
}

export default function RestForm({ onSave, onCancel, existing }: Props) {
  const [startTime, setStartTime] = useState(
    existing
      ? toLocalDatetimeInputValue(new Date(existing.startTime))
      : toLocalDatetimeInputValue(new Date())
  );
  const [hasEnd, setHasEnd] = useState(existing?.endTime != null);
  const [endTime, setEndTime] = useState(
    existing?.endTime
      ? toLocalDatetimeInputValue(new Date(existing.endTime))
      : toLocalDatetimeInputValue(new Date(Date.now() + 30 * 60 * 1000))
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(startTime);
    if (hasEnd) {
      const end = new Date(endTime);
      if (end <= start) {
        setError('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
    }
    setError('');

    const rest: Rest = {
      id: existing?.id ?? generateId(),
      startTime: start.toISOString(),
      ...(hasEnd ? { endTime: new Date(endTime).toISOString() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    onSave(rest);
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-blue-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {existing ? 'Editar descanso' : 'Nuevo descanso'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Inicio */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Inicio del descanso</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {/* Fin (opcional) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setHasEnd(!hasEnd)}
            className="w-full flex items-center justify-between touch-manipulation mb-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div className="text-left">
                <span className="text-base font-semibold text-gray-900">Fin del descanso</span>
                {!hasEnd && <p className="text-xs text-gray-400">Opcional — añádelo cuando despierte</p>}
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors shrink-0 ${hasEnd ? 'bg-purple-600' : 'bg-gray-200'} relative`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasEnd ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {hasEnd && (
            <div className="mt-4">
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            placeholder="Ej: durmió profundo, se despertó varias veces..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-purple-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-purple-700 touch-manipulation"
        >
          {existing ? 'Guardar cambios' : 'Guardar descanso'}
        </button>
      </form>
    </div>
  );
}
