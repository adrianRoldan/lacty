import { useState } from 'react';
import type { NoteEntry } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  onSave: (n: NoteEntry) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: NoteEntry | null;
}

/**
 * Una nota libre con su hora. El texto va primero y con el foco puesto: lo
 * normal es abrir, escribir «ha vomitado un poco» y guardar.
 */
export default function NoteForm({ onSave, onCancel, onDelete, existing }: Props) {
  const confirm = useConfirm();

  const [id] = useState(() => existing?.id ?? generateId());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState(existing?.text ?? '');
  const [timestamp, setTimestamp] = useState(
    toLocalDatetimeInputValue(existing ? new Date(existing.timestamp) : new Date())
  );
  const [forPediatrician, setForPediatrician] = useState(existing?.forPediatrician ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError('Escribe algo en la nota.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        id,
        timestamp: new Date(timestamp).toISOString(),
        text: text.trim(),
        ...(forPediatrician ? { forPediatrician: true } : {}),
      });
    } catch {
      setError('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing || !onDelete) return;
    if (await confirm('¿Eliminar esta nota?')) onDelete(existing.id);
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sage-600 text-lg p-1 touch-manipulation">← Atrás</button>
        <h2 className="text-xl font-bold text-gray-900">{existing ? 'Editar nota' : 'Nueva nota'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label htmlFor="nota-texto" className="block text-sm font-medium text-gray-600 mb-2">Nota</label>
          <textarea
            id="nota-texto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            autoFocus={!existing}
            placeholder="Ej: ha vomitado un poco después de la toma · 37,8 °C · han venido los abuelos"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label htmlFor="nota-hora" className="block text-sm font-medium text-gray-600 mb-2">Hora</label>
          <input
            id="nota-hora"
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            required
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={forPediatrician}
          onClick={() => setForPediatrician((v) => !v)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 text-left touch-manipulation"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="text-2xl" aria-hidden="true">🩺</span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-gray-900">Comentar con el pediatra</span>
              <span className="block text-xs text-gray-400">Aparecerá en el resumen para la consulta</span>
            </span>
          </span>
          <span className={`w-12 h-7 rounded-full transition-colors shrink-0 relative ${forPediatrician ? 'bg-sage-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${forPediatrician ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </span>
        </button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation disabled:opacity-60"
        >
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar nota'}
        </button>

        {existing && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation"
          >
            🗑️ Eliminar nota
          </button>
        )}
      </form>
    </div>
  );
}
