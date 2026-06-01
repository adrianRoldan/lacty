import { useState } from 'react';
import type { WeightEntry } from '../types';
import { generateId } from '../utils/feedingUtils';

interface Props {
  onSave: (entry: WeightEntry) => void;
  onCancel: () => void;
  existing?: WeightEntry | null;
}

export default function WeightForm({ onSave, onCancel, existing }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(existing?.date ?? today);
  const [weightKg, setWeightKg] = useState<number | ''>(existing?.weightKg ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (weightKg === '' || weightKg <= 0) {
      setError('Introduce un peso válido.');
      return;
    }
    setError('');
    onSave({
      id: existing?.id ?? generateId(),
      date,
      weightKg: Number(weightKg),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-blue-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {existing ? 'Editar peso' : 'Registrar peso'}
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Peso */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2 text-center">Peso</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0.3}
              max={15}
              step={0.001}
              value={weightKg}
              placeholder="0.000"
              onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-4 text-3xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 placeholder:font-normal placeholder:text-xl"
            />
            <span className="text-xl font-semibold text-gray-500 shrink-0">kg</span>
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-blue-700 touch-manipulation"
        >
          {existing ? 'Guardar cambios' : 'Guardar peso'}
        </button>
      </form>
    </div>
  );
}
