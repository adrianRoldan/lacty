import { useState } from 'react';
import type { DiaperChange, DiaperContent, PoopColor, PoopConsistency, PoopAmount } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';

interface Props {
  onSave: (d: DiaperChange) => Promise<void>;
  onCancel: () => void;
  existing?: DiaperChange | null;
}

const POOP_COLORS: { value: PoopColor; label: string; bg: string; text: string; alarm?: boolean }[] = [
  { value: 'yellow',  label: 'Amarillo mostaza', bg: 'bg-yellow-400',  text: 'text-yellow-900' },
  { value: 'brown',   label: 'Marrón',            bg: 'bg-amber-700',   text: 'text-white' },
  { value: 'green',   label: 'Verde',              bg: 'bg-green-500',   text: 'text-white' },
  { value: 'orange',  label: 'Naranja',            bg: 'bg-orange-400',  text: 'text-white' },
  { value: 'black',   label: 'Negro',              bg: 'bg-gray-900',    text: 'text-white' },
  { value: 'red',     label: 'Rojo',               bg: 'bg-red-500',     text: 'text-white', alarm: true },
  { value: 'white',   label: 'Blanco/grisáceo',   bg: 'bg-gray-200',    text: 'text-gray-700', alarm: true },
];

const CONSISTENCIES: { value: PoopConsistency; label: string }[] = [
  { value: 'liquid', label: 'Líquida' },
  { value: 'soft',   label: 'Blanda' },
  { value: 'pasty',  label: 'Pastosa' },
  { value: 'solid',  label: 'Sólida' },
];

const AMOUNTS: { value: PoopAmount; label: string }[] = [
  { value: 'little', label: 'Poca' },
  { value: 'normal', label: 'Normal' },
  { value: 'much',   label: 'Mucha' },
];

export default function DiaperForm({ onSave, onCancel, existing }: Props) {
  const [id] = useState(() => existing?.id ?? generateId());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timestamp, setTimestamp] = useState(
    existing
      ? toLocalDatetimeInputValue(new Date(existing.timestamp))
      : toLocalDatetimeInputValue(new Date())
  );
  const [content, setContent] = useState<DiaperContent>(existing?.content ?? 'wet');
  const [poopColor, setPoopColor] = useState<PoopColor | undefined>(existing?.poopColor);
  const [poopConsistency, setPoopConsistency] = useState<PoopConsistency | undefined>(existing?.poopConsistency);
  const [poopAmount, setPoopAmount] = useState<PoopAmount | undefined>(existing?.poopAmount);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const hasPoopDetails = content === 'dirty' || content === 'both';
  const selectedColor = POOP_COLORS.find((c) => c.value === poopColor);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entry: DiaperChange = {
      id,
      timestamp: new Date(timestamp).toISOString(),
      content,
      ...(hasPoopDetails && poopColor ? { poopColor } : {}),
      ...(hasPoopDetails && poopConsistency ? { poopConsistency } : {}),
      ...(hasPoopDetails && poopAmount ? { poopAmount } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    setSaving(true);
    try {
      await onSave(entry);
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
          {existing ? 'Editar cambio de pañal' : 'Nuevo cambio de pañal'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fecha y hora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Hora del cambio</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            required
          />
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-3">Contenido del pañal</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'wet',   label: '💧 Solo pipí' },
                { value: 'dirty', label: '💩 Solo caca' },
                { value: 'both',  label: '💧💩 Pipí + caca' },
                { value: 'dry',   label: '✅ Limpio' },
              ] as { value: DiaperContent; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContent(opt.value)}
                className={`py-3 px-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  content === opt.value
                    ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detalles de caca */}
        {hasPoopDetails && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-5">
            <p className="text-sm font-semibold text-gray-700">Detalles de la caca</p>

            {/* Color */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {POOP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPoopColor(c.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold touch-manipulation transition-all ${
                      poopColor === c.value
                        ? 'ring-2 ring-offset-1 ring-gray-400 scale-105'
                        : 'opacity-80'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full shrink-0 ${c.bg} border border-black/10`} />
                    <span className="text-gray-700">{c.label}</span>
                  </button>
                ))}
              </div>
              {selectedColor?.alarm && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  ⚠ Consulta al pediatra
                </p>
              )}
            </div>

            {/* Consistencia */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Consistencia</p>
              <div className="flex gap-2 flex-wrap">
                {CONSISTENCIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPoopConsistency(c.value === poopConsistency ? undefined : c.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                      poopConsistency === c.value
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Cantidad</p>
              <div className="flex gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setPoopAmount(a.value === poopAmount ? undefined : a.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                      poopAmount === a.value
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Observaciones (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: con rastros de sangre, olor fuerte..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation disabled:opacity-60"
        >
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar cambio de pañal'}
        </button>
      </form>
    </div>
  );
}
