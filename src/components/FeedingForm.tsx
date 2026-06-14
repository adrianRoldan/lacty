import { useState } from 'react';
import type { Feeding } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';

interface Props {
  onSave: (feeding: Feeding) => void;
  onCancel: () => void;
  existing?: Feeding | null;
}

type NumField = number | '';

export default function FeedingForm({ onSave, onCancel, existing }: Props) {
  const [timestamp, setTimestamp] = useState(
    existing
      ? toLocalDatetimeInputValue(new Date(existing.timestamp))
      : toLocalDatetimeInputValue(new Date())
  );
  const [hasBreast, setHasBreast] = useState(existing?.hasBreast ?? false);
  const [breastMinLeft, setBreastMinLeft] = useState<NumField>(existing?.breastMinLeft ?? '');
  const [breastMinRight, setBreastMinRight] = useState<NumField>(existing?.breastMinRight ?? '');
  const [hasSupplement, setHasSupplement] = useState(existing?.hasSupplement ?? false);
  const [supplementMl, setSupplementMl] = useState<NumField>(existing?.supplementMl ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  // Minutes elapsed from the form's start timestamp to now
  function elapsedMinutes(): number {
    const start = new Date(timestamp).getTime();
    return Math.max(0, Math.round((Date.now() - start) / 60000));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasBreast && !hasSupplement) {
      setError('Indica al menos pecho o jeringa-dedo.');
      return;
    }
    setError('');

    const feeding: Feeding = {
      id: existing?.id ?? generateId(),
      timestamp: new Date(timestamp).toISOString(),
      hasBreast,
      ...(hasBreast && breastMinLeft !== '' ? { breastMinLeft: Number(breastMinLeft) } : {}),
      ...(hasBreast && breastMinRight !== '' ? { breastMinRight: Number(breastMinRight) } : {}),
      hasSupplement,
      ...(hasSupplement && supplementMl !== '' ? { supplementMl: Number(supplementMl) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    onSave(feeding);
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {existing ? 'Editar toma' : 'Nueva toma'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fecha y hora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Inicio de la toma</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            required
          />
        </div>

        {/* Pecho */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <ToggleRow
            emoji="🤱"
            label="Pecho"
            on={hasBreast}
            onToggle={() => setHasBreast(!hasBreast)}
          />
          {hasBreast && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Pecho izquierdo */}
                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-500 text-center">Izquierdo (min)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={breastMinLeft}
                    placeholder="—"
                    onChange={(e) => setBreastMinLeft(e.target.value === '' ? '' : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-2xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 placeholder:text-gray-300 placeholder:font-normal placeholder:text-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setBreastMinLeft(elapsedMinutes())}
                    className="w-full text-xs font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-lg py-2 active:bg-pink-100 touch-manipulation"
                  >
                    ⏱ Finalizar ahora
                  </button>
                </div>

                {/* Pecho derecho */}
                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-500 text-center">Derecho (min)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={breastMinRight}
                    placeholder="—"
                    onChange={(e) => setBreastMinRight(e.target.value === '' ? '' : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-2xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 placeholder:text-gray-300 placeholder:font-normal placeholder:text-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setBreastMinRight(elapsedMinutes())}
                    className="w-full text-xs font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-lg py-2 active:bg-pink-100 touch-manipulation"
                  >
                    ⏱ Finalizar ahora
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suplemento */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <ToggleRow
            emoji="💉"
            label="Jeringa-dedo"
            on={hasSupplement}
            onToggle={() => setHasSupplement(!hasSupplement)}
          />
          {hasSupplement && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 text-center mb-2">Mililitros (opcional — puedes añadirlos al terminar)</p>
              <NumInput
                label=""
                value={supplementMl}
                max={300}
                onChange={setSupplementMl}
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
            placeholder="Ej: estaba muy activo, mal agarre..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation"
        >
          {existing ? 'Guardar cambios' : 'Guardar toma'}
        </button>
      </form>
    </div>
  );
}

function ToggleRow({
  emoji, label, on, onToggle,
}: {
  emoji: string; label: string; on: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between touch-manipulation"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <span className="text-base font-semibold text-gray-900">{label}</span>
      </div>
      <div className={`w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-sage-600' : 'bg-gray-200'} relative`}>
        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

function NumInput({
  label, value, max, onChange,
}: {
  label: string; value: number | ''; max: number; onChange: (v: number | '') => void;
}) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1 text-center">{label}</label>}
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onFocus={(e) => e.target.select()}
        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-2xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 placeholder:text-gray-300 placeholder:font-normal placeholder:text-xl"
      />
    </div>
  );
}
