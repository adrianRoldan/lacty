import { useState } from 'react';
import type { Extraction, ExtractionSide } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  onSave: (e: Extraction) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: Extraction | null;
}

const LADOS: { valor: ExtractionSide; etiqueta: string }[] = [
  { valor: 'left',  etiqueta: 'Izquierdo' },
  { valor: 'right', etiqueta: 'Derecho' },
  { valor: 'both',  etiqueta: 'Ambos' },
];

type NumField = number | '';

export default function ExtractionForm({ onSave, onCancel, onDelete, existing }: Props) {
  const confirm = useConfirm();

  const [id] = useState(() => existing?.id ?? generateId());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timestamp, setTimestamp] = useState(
    toLocalDatetimeInputValue(existing ? new Date(existing.timestamp) : new Date())
  );
  const [side, setSide] = useState<ExtractionSide>(existing?.side ?? 'both');
  const [ml, setMl] = useState<NumField>(existing?.ml ?? '');
  const [durationMin, setDurationMin] = useState<NumField>(existing?.durationMin ?? '');
  const [purpose, setPurpose] = useState<'replace' | 'extra'>(existing?.purpose ?? 'replace');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id,
        timestamp: new Date(timestamp).toISOString(),
        side,
        purpose,
        ...(ml !== '' ? { ml: Number(ml) } : {}),
        ...(durationMin !== '' ? { durationMin: Number(durationMin) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } catch {
      setError('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing || !onDelete) return;
    if (await confirm('¿Eliminar esta extracción?')) onDelete(existing.id);
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sage-600 text-lg p-1 touch-manipulation">← Atrás</button>
        <h2 className="text-xl font-bold text-gray-900">{existing ? 'Editar extracción' : 'Nueva extracción'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Hora de la extracción</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
            required
          />
        </div>

        {/* Lado */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-3">Lado</p>
          <div className="flex flex-wrap gap-2">
            {LADOS.map((l) => (
              <button
                key={l.valor}
                type="button"
                onClick={() => setSide(l.valor)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  side === l.valor
                    ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {l.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Cantidad y duración */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Mililitros <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={5}
                value={ml}
                placeholder="0"
                onChange={(e) => setMl(e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
              <span className="text-sm font-medium text-gray-500 shrink-0">ml</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Duración <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={durationMin}
                placeholder="0"
                onChange={(e) => setDurationMin(e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
              <span className="text-sm font-medium text-gray-500 shrink-0">min</span>
            </div>
          </div>
        </div>

        {/* Sustituye una toma vs. extra para banco */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">¿Para qué es?</p>
          <p className="text-xs text-gray-400 mb-3">
            Sacarte al ritmo de las tomas del bebé protege la producción; hacerlo
            extra para banco a diario tiende a subirla.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPurpose('replace')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                purpose === 'replace'
                  ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Sustituye una toma
            </button>
            <button
              type="button"
              onClick={() => setPurpose('extra')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                purpose === 'extra'
                  ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-300'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Extra (banco)
            </button>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Observaciones (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: costó más de lo normal, se ha usado el sacaleches doble..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-600 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-cyan-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-cyan-700 touch-manipulation disabled:opacity-60"
        >
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar extracción'}
        </button>

        {existing && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation"
          >
            🗑️ Eliminar extracción
          </button>
        )}
      </form>
    </div>
  );
}
