import { useState } from 'react';
import type { Rest, RestWaking, WakingSoothe } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';

interface Props {
  onSave: (rest: Rest) => Promise<void>;
  onCancel: () => void;
  existing?: Rest | null;
}

export default function RestForm({ onSave, onCancel, existing }: Props) {
  const [id] = useState(() => existing?.id ?? generateId());
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState(
    existing
      ? toLocalDatetimeInputValue(new Date(existing.startTime))
      : toLocalDatetimeInputValue(new Date())
  );
  const [hasEnd, setHasEnd] = useState(existing?.endTime != null);
  const [endTime, setEndTime] = useState(
    existing?.endTime
      ? toLocalDatetimeInputValue(new Date(existing.endTime))
      : toLocalDatetimeInputValue(new Date())
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  // Los despertares se editan como hora local; al guardar vuelven a ISO.
  const [wakings, setWakings] = useState<FilaDespertar[]>(() =>
    (existing?.wakings ?? []).map((w) => ({
      id: w.id,
      at: toLocalDatetimeInputValue(new Date(w.at)),
      endAt: w.endAt ? toLocalDatetimeInputValue(new Date(w.endAt)) : '',
      soothe: w.soothe ?? '',
    })),
  );
  const [error, setError] = useState('');

  function añadirDespertar() {
    // Por defecto, a mitad del sueño (o ahora, si sigue en curso).
    const ini = new Date(startTime).getTime();
    const fin = hasEnd ? new Date(endTime).getTime() : Date.now();
    const at = new Date(ini + Math.max(0, fin - ini) / 2);
    setWakings((ws) => [...ws, { id: generateId(), at: toLocalDatetimeInputValue(at), endAt: '', soothe: '' }]);
  }
  function cambiarDespertar(id: string, cambio: Partial<FilaDespertar>) {
    setWakings((ws) => ws.map((w) => (w.id === id ? { ...w, ...cambio } : w)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(startTime);
    if (hasEnd) {
      const end = new Date(endTime);
      if (end <= start) {
        setError('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
    }
    const fin = hasEnd ? new Date(endTime) : null;
    for (const w of wakings) {
      const at = new Date(w.at);
      if (at < start || (fin && at > fin)) {
        setError('Cada despertar tiene que caer dentro del sueño.');
        return;
      }
      if (w.endAt && new Date(w.endAt) < at) {
        setError('Un despertar no puede terminar antes de empezar.');
        return;
      }
    }
    setError('');

    const despertares: RestWaking[] = wakings
      .map((w) => ({
        id: w.id,
        at: new Date(w.at).toISOString(),
        ...(w.endAt ? { endAt: new Date(w.endAt).toISOString() } : {}),
        ...(w.soothe ? { soothe: w.soothe } : {}),
      }))
      .sort((a, b) => a.at.localeCompare(b.at));

    const rest: Rest = {
      id,
      startTime: start.toISOString(),
      ...(hasEnd ? { endTime: new Date(endTime).toISOString() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(despertares.length > 0 ? { wakings: despertares } : {}),
    };

    setSaving(true);
    try {
      await onSave(rest);
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
          {existing ? 'Editar sueño' : 'Nuevo sueño'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Inicio */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Inicio del sueño</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-taupe-600"
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
                <span className="text-base font-semibold text-gray-900">Fin del sueño</span>
                {!hasEnd && <p className="text-xs text-gray-400">Opcional — añádelo cuando despierte</p>}
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors shrink-0 ${hasEnd ? 'bg-taupe-600' : 'bg-gray-200'} relative`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasEnd ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {hasEnd && (
            <div className="mt-4">
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-taupe-600"
              />
            </div>
          )}
        </div>

        {/* Despertares: los que se apuntaron con «se despierta», o los que se
            olvidaron y se añaden ahora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-600">
              Despertares {wakings.length > 0 && <span className="text-gray-400">({wakings.length})</span>}
            </label>
            <button
              type="button"
              onClick={añadirDespertar}
              className="text-sm font-semibold text-lagoon-700 px-2 py-1 touch-manipulation"
            >
              + Añadir
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Veces que se despertó y volvió a dormirse sin que el sueño terminara.
          </p>
          <div className="space-y-3">
            {wakings.map((w, i) => (
              <div key={w.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Despertar n.º {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setWakings((ws) => ws.filter((x) => x.id !== w.id))}
                    className="text-xs text-red-500 px-2 py-1 touch-manipulation"
                  >
                    Quitar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-500">
                    Se despertó
                    <input
                      type="datetime-local"
                      value={w.at}
                      onChange={(e) => cambiarDespertar(w.id, { at: e.target.value })}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-900"
                      required
                    />
                  </label>
                  <label className="text-xs text-gray-500">
                    Volvió a dormir <span className="text-gray-300">(opcional)</span>
                    <input
                      type="datetime-local"
                      value={w.endAt}
                      onChange={(e) => cambiarDespertar(w.id, { endAt: e.target.value })}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-900"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cómo se volvió a dormir">
                  {CALMAS.map(([valor, texto]) => (
                    <button
                      key={valor}
                      type="button"
                      role="radio"
                      aria-checked={w.soothe === valor}
                      onClick={() => cambiarDespertar(w.id, { soothe: w.soothe === valor ? '' : valor })}
                      className={`h-8 px-3 rounded-full text-xs font-semibold touch-manipulation ${
                        w.soothe === valor ? 'bg-lagoon-700 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
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
            placeholder="Ej: durmió profundo, se despertó varias veces..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-taupe-600 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-taupe-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-taupe-700 touch-manipulation disabled:opacity-60"
        >
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar sueño'}
        </button>
      </form>
    </div>
  );
}

interface FilaDespertar {
  id: string;
  at: string;
  endAt: string;
  soothe: WakingSoothe | '';
}

const CALMAS: [WakingSoothe, string][] = [
  ['solo', 'Solo'],
  ['chupete', 'Chupete'],
  ['manita', 'Manita'],
  ['brazos', 'Brazos'],
  ['pecho', 'Pecho'],
];
