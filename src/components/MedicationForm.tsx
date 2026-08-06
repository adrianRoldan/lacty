import { useState } from 'react';
import type { MedicationLog, MedicationPlan } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue, todayIso } from '../utils/dateUtils';
import { horasPorDefecto, isoMasDias } from '../utils/medicationUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  /** `plan` solo llega al programar la administración: crea la pauta y sus avisos. */
  onSave: (m: MedicationLog, plan?: MedicationPlan) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: MedicationLog | null;
}

const DURACIONES = [
  { etiqueta: '3 días',    dias: 2 },
  { etiqueta: '1 semana',  dias: 6 },
  { etiqueta: '2 semanas', dias: 13 },
  { etiqueta: '1 mes',     dias: 29 },
];

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

  // Pauta programada (opcional). Solo se ofrece al crear un registro nuevo:
  // editar uno viejo no debería estrenar un tratamiento.
  const hoy = todayIso();
  const [programar, setProgramar] = useState(false);
  const [horas, setHoras] = useState<string[]>(horasPorDefecto(1));
  const [hasta, setHasta] = useState(isoMasDias(hoy, 6));

  const nombreFinal = (usaOtro ? otro : name).trim();

  function cambiarVeces(veces: number) {
    setHoras((prev) => {
      const base = horasPorDefecto(veces);
      // Se respetan las horas ya tocadas por el usuario al añadir o quitar una.
      return base.map((h, i) => prev[i] ?? h);
    });
  }

  function cambiarHora(i: number, valor: string) {
    setHoras((prev) => prev.map((h, j) => (j === i ? valor : h)));
  }

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
    if (programar) {
      if (horas.some((h) => !h)) {
        setError('Indica todas las horas de administración.');
        return;
      }
      if (hasta < hoy) {
        setError('La fecha de fin no puede ser anterior a hoy.');
        return;
      }
    }

    const planId = programar ? generateId() : undefined;
    const log: MedicationLog = {
      id: existing?.id ?? generateId(),
      timestamp: new Date(timestamp).toISOString(),
      name: nombreFinal,
      ...(doseMl != null ? { doseMl } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(planId ? { planId } : {}),
    };

    if (!planId) {
      onSave(log);
      return;
    }
    onSave(log, {
      id: planId,
      name: nombreFinal,
      ...(doseMl != null ? { doseMl } : {}),
      times: [...horas].sort(),
      startDate: hoy,
      endDate: hasta,
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

        {/* Pauta programada — solo al crear, no al editar un registro pasado */}
        {!existing && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">¿Debes administrarlo periódicamente?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Programa la pauta y Lacty te avisa cuando toque, hasta que termine el tratamiento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProgramar((v) => !v)}
                aria-label={programar ? 'No programar' : 'Programar'}
                className={`relative w-12 h-6 rounded-full transition-colors touch-manipulation shrink-0 ${programar ? 'bg-sage-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${programar ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {programar && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                {/* Veces al día */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Veces al día</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => cambiarVeces(n)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                          horas.length === n
                            ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horas */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {horas.length === 1 ? 'Hora' : 'Horas'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {horas.map((h, i) => (
                      <input
                        key={i}
                        type="time"
                        value={h}
                        onChange={(e) => cambiarHora(i, e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                      />
                    ))}
                  </div>
                </div>

                {/* Hasta cuándo */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Hasta</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DURACIONES.map((d) => {
                      const fecha = isoMasDias(hoy, d.dias);
                      return (
                        <button
                          key={d.etiqueta}
                          type="button"
                          onClick={() => setHasta(fecha)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold touch-manipulation transition-colors ${
                            hasta === fecha
                              ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {d.etiqueta}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="date"
                    value={hasta}
                    min={hoy}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                  />
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  La dosis de arriba se usará para cada administración. Este registro cuenta como
                  la primera; el resto los irás marcando desde «Hoy».
                </p>
              </div>
            )}
          </div>
        )}

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
