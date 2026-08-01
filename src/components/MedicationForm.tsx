import { useState } from 'react';
import type { MedicationLog } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  onSave: (m: MedicationLog) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: MedicationLog | null;
}

// Los más habituales en lactantes. Cualquier otro se escribe a mano.
const COMUNES = ['Apiretal', 'Dalsy', 'Paracetamol', 'Ibuprofeno', 'Suero fisiológico'];

export default function MedicationForm({ onSave, onCancel, onDelete, existing }: Props) {
  const confirm = useConfirm();

  const [timestamp, setTimestamp] = useState(
    toLocalDatetimeInputValue(existing ? new Date(existing.timestamp) : new Date())
  );
  // Si el medicamento guardado no está en la lista, se abre el campo libre con su valor.
  const esComun = existing ? COMUNES.includes(existing.name) : false;
  const [name, setName] = useState(esComun ? existing!.name : '');
  const [otro, setOtro] = useState(existing && !esComun ? existing.name : '');
  const [usaOtro, setUsaOtro] = useState(Boolean(existing) && !esComun);
  const [dose, setDose] = useState(existing?.doseMl != null ? String(existing.doseMl).replace('.', ',') : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  const nombreFinal = (usaOtro ? otro : name).trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreFinal) {
      setError('Indica qué medicamento le has dado.');
      return;
    }
    const doseMl = dose.trim() ? Number(dose.replace(',', '.')) : undefined;
    if (doseMl != null && (Number.isNaN(doseMl) || doseMl <= 0)) {
      setError('La dosis debe ser un número mayor que cero.');
      return;
    }
    onSave({
      id: existing?.id ?? generateId(),
      timestamp: new Date(timestamp).toISOString(),
      name: nombreFinal,
      ...(doseMl != null ? { doseMl } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  async function handleDelete() {
    if (!existing || !onDelete) return;
    if (await confirm('¿Eliminar este registro de medicamento?')) {
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
          {existing ? 'Editar medicamento' : 'Nuevo medicamento'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Hora de administración</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            required
          />
        </div>

        {/* Medicamento */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-3">Medicamento</p>
          <div className="flex flex-wrap gap-2">
            {COMUNES.map((m) => {
              const activo = !usaOtro && name === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setUsaOtro(false); setName(m); setError(''); }}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                    activo
                      ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {m}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => { setUsaOtro(true); setError(''); }}
              className={`px-3 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                usaOtro
                  ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Otro…
            </button>
          </div>

          {usaOtro && (
            <input
              type="text"
              value={otro}
              onChange={(e) => { setOtro(e.target.value); setError(''); }}
              placeholder="Nombre del medicamento"
              autoFocus
              className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            />
          )}
        </div>

        {/* Dosis */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Dosis <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={dose}
              onChange={(e) => { setDose(e.target.value); setError(''); }}
              placeholder="Ej. 2,5"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            />
            <span className="text-base font-medium text-gray-500">ml</span>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-2">Observaciones (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: por fiebre de 38,2 · lo vomitó al rato"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation"
        >
          {existing ? 'Guardar cambios' : 'Guardar medicamento'}
        </button>

        {existing && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation"
          >
            🗑️ Eliminar registro
          </button>
        )}

        <p className="text-xs text-gray-400 text-center leading-relaxed px-2">
          Lacty solo guarda lo que apuntas. Las dosis y las pautas te las indica tu pediatra o tu farmacia.
        </p>
      </form>
    </div>
  );
}
