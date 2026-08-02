import { useState, useEffect } from 'react';
import type { Feeding } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';
import { BreastIcon } from './FeedingItem';

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
  const [hasBottle, setHasBottle] = useState(existing?.hasBottle ?? false);
  const [bottleMl, setBottleMl] = useState<NumField>(existing?.bottleMl ?? '');
  const [bottleType, setBottleType] = useState<'breast' | 'formula'>(existing?.bottleType ?? 'breast');
  const [hasSupplement, setHasSupplement] = useState(existing?.hasSupplement ?? false);
  const [supplementMl, setSupplementMl] = useState<NumField>(existing?.supplementMl ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [endTime, setEndTime] = useState(
    existing?.endTime ? toLocalDatetimeInputValue(new Date(existing.endTime)) : ''
  );
  const [endTimeManual, setEndTimeManual] = useState(!!existing?.endTime);
  const [showEndTime, setShowEndTime] = useState(false);
  const [error, setError] = useState('');

  // Para pecho: hora fin siempre = inicio + minutos (prevalece sobre cualquier edición manual)
  useEffect(() => {
    if (!hasBreast) return;
    const totalMin = (breastMinLeft !== '' ? Number(breastMinLeft) : 0) + (breastMinRight !== '' ? Number(breastMinRight) : 0);
    if (totalMin <= 0) return;
    setEndTime(toLocalDatetimeInputValue(new Date(new Date(timestamp).getTime() + totalMin * 60000)));
  }, [breastMinLeft, breastMinRight, timestamp, hasBreast]);

  // Minutes elapsed from the form's start timestamp to now
  function elapsedMinutes(): number {
    const start = new Date(timestamp).getTime();
    return Math.max(0, Math.round((Date.now() - start) / 60000));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasBreast && !hasBottle && !hasSupplement) {
      setError('Indica al menos pecho, biberón o jeringa-dedo.');
      return;
    }
    setError('');

    // Hora fin: pecho con minutos siempre calcula inicio+min (prevalece sobre edición manual)
    // Para biberón/jeringa: solo si el usuario la introdujo manualmente
    const totalBreastMin = (breastMinLeft !== '' ? Number(breastMinLeft) : 0) + (breastMinRight !== '' ? Number(breastMinRight) : 0);
    const computedEndTime = (hasBreast && totalBreastMin > 0)
      ? new Date(new Date(timestamp).getTime() + totalBreastMin * 60000).toISOString()
      : (endTimeManual && endTime ? new Date(endTime).toISOString() : undefined);

    const feeding: Feeding = {
      id: existing?.id ?? generateId(),
      timestamp: new Date(timestamp).toISOString(),
      ...(computedEndTime ? { endTime: computedEndTime } : {}),
      hasBreast,
      ...(hasBreast && breastMinLeft !== '' ? { breastMinLeft: Number(breastMinLeft) } : {}),
      ...(hasBreast && breastMinRight !== '' ? { breastMinRight: Number(breastMinRight) } : {}),
      hasBottle,
      ...(hasBottle && bottleMl !== '' ? { bottleMl: Number(bottleMl) } : {}),
      ...(hasBottle ? { bottleType } : {}),
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
            emoji={<BreastIcon size={24} className="text-mustard-700" />}
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

        {/* Biberón */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <ToggleRow
            emoji="🍼"
            label="Biberón"
            on={hasBottle}
            onToggle={() => setHasBottle(!hasBottle)}
          />
          {hasBottle && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBottleType('breast')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                    bottleType === 'breast' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <BreastIcon size={14} /> Leche materna
                </button>
                <button
                  type="button"
                  onClick={() => setBottleType('formula')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                    bottleType === 'formula' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  🧪 Fórmula
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">Mililitros (opcional — puedes añadirlos al terminar)</p>
              <NumInput
                label=""
                value={bottleMl}
                max={300}
                onChange={setBottleMl}
              />
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

        {/* Hora fin (oculta por defecto) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowEndTime((v) => !v)}
            className="w-full flex items-center justify-between text-sm text-gray-500 touch-manipulation"
          >
            <span>Hora de fin</span>
            <span className="text-sage-600 font-medium">
              {showEndTime ? 'Ocultar' : endTime ? endTime.slice(11, 16) : 'Añadir ▾'}
            </span>
          </button>
          {showEndTime && (
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setEndTimeManual(true); }}
              className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            />
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
  emoji: React.ReactNode; label: string; on: boolean; onToggle: () => void;
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
