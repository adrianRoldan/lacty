import { useState } from 'react';
import type { HeightEntry } from '../types';
import { generateId } from '../utils/feedingUtils';

interface Props {
  onSave: (entry: HeightEntry) => Promise<void>;
  onCancel: () => void;
  existing?: HeightEntry | null;
}

export default function HeightForm({ onSave, onCancel, existing }: Props) {
  const [id] = useState(() => existing?.id ?? generateId());
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(existing?.date ?? today);
  const [heightCm, setHeightCm] = useState<number | ''>(existing?.heightCm ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (heightCm === '' || heightCm <= 0) {
      setError('Introduce una altura válida.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        id,
        date,
        heightCm: Number(heightCm),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } catch {
      setError('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {existing ? 'Editar altura' : 'Registrar altura'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fecha */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            required
          />
        </div>

        {/* Altura */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2 text-center">Altura</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={20}
              max={120}
              step={0.1}
              value={heightCm}
              placeholder="0.0"
              onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-4 text-3xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 placeholder:text-gray-300 placeholder:font-normal placeholder:text-xl"
            />
            <span className="text-xl font-semibold text-gray-500 shrink-0">cm</span>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: visita pediatra semana 2, alta maternidad..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation disabled:opacity-60"
        >
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar altura'}
        </button>
      </form>
    </div>
  );
}
