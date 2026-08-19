import { useState } from 'react';
import type { MedicationLog, MedicationPlan } from '../types';
import { generateId } from '../utils/feedingUtils';
import { toLocalDatetimeInputValue, todayIso } from '../utils/dateUtils';
import { horasPorDefecto, isoMasDias, pautaParaNombre, pautaVigente, resumenPauta, dosisDelDia } from '../utils/medicationUtils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  /** `plan` solo llega al programar la administración: crea la pauta y sus avisos. */
  onSave: (m: MedicationLog, plan?: MedicationPlan) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  existing?: MedicationLog | null;
  /** Pautas ya programadas, para no duplicarlas y colgar de ellas esta dosis. */
  medPlans?: MedicationPlan[];
  medications?: MedicationLog[];
}

const DURACIONES = [
  { etiqueta: '3 días',    dias: 2 },
  { etiqueta: '1 semana',  dias: 6 },
  { etiqueta: '2 semanas', dias: 13 },
  { etiqueta: '1 mes',     dias: 29 },
];

// Los más habituales en lactantes. Cualquier otro se escribe a mano.
const COMUNES = ['Apiretal', 'Dalsy', 'Paracetamol', 'Ibuprofeno', 'Omeprazol', 'Suero fisiológico'];

export default function MedicationForm({ onSave, onCancel, onDelete, existing, medPlans = [], medications = [] }: Props) {
  const confirm = useConfirm();

  const [logId] = useState(() => existing?.id ?? generateId());
  const [newPlanId] = useState(() => generateId());
  const [saving, setSaving] = useState(false);
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

  // Si ya hay una pauta en pie para este medicamento, esta administración se
  // cuelga de ella: así el chip de «Hoy» avanza y el aviso deja de insistir,
  // se apunte desde el chip o desde aquí.
  const pautaExistente = existing?.planId
    ? medPlans.find((p) => p.id === existing.planId)
    : pautaParaNombre(medPlans, nombreFinal, hoy);
  const yaProgramado = pautaExistente != null;

  // Pautas en marcha hoy: se ofrecen arriba para apuntar la dosis de un toque.
  const pautasDeHoy = existing
    ? []
    : medPlans.filter((p) => pautaVigente(p, hoy)).sort((a, b) => a.name.localeCompare(b.name));

  function elegirMedicamento(nombre: string, doseMl?: number) {
    if (COMUNES.includes(nombre)) {
      setUsaOtro(false);
      setName(nombre);
    } else {
      setUsaOtro(true);
      setOtro(nombre);
    }
    if (doseMl != null) setDose(String(doseMl).replace('.', ','));
    setError('');
  }

  /** Programar cuando ya hay pauta para lo mismo pide confirmación explícita. */
  async function alternarProgramar() {
    if (programar) { setProgramar(false); return; }
    if (yaProgramado && pautaExistente) {
      const ok = await confirm(
        `Ya hay una pauta activa de ${pautaExistente.name} (${resumenPauta(pautaExistente)}). ` +
        '¿Quieres crear otra de todos modos? Recibirás avisos de las dos.'
      );
      if (!ok) return;
    }
    setProgramar(true);
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreFinal) {
      setError('Indica qué medicamento le has dado.');
      return;
    }
    // Sin dosis escrita se hereda la de la pauta, que es la que toca cada vez.
    const doseMl = dose.trim()
      ? Number(dose.replace(',', '.'))
      : pautaExistente?.doseMl;
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

    // Si se ha programado, es una pauta nueva: cuando ya había otra igual, el
    // usuario lo ha confirmado en `alternarProgramar`. Si no, la dosis se cuelga
    // de la pauta que ya existía.
    const pautaNueva = programar;
    const planId = pautaNueva ? newPlanId : pautaExistente?.id;

    const log: MedicationLog = {
      id: logId,
      timestamp: new Date(timestamp).toISOString(),
      name: nombreFinal,
      ...(doseMl != null ? { doseMl } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(planId ? { planId } : {}),
    };

    setSaving(true);
    try {
      if (!pautaNueva) {
        await onSave(log);
      } else {
        await onSave(log, {
          id: planId!,
          name: nombreFinal,
          ...(doseMl != null ? { doseMl } : {}),
          times: [...horas].sort(),
          startDate: hoy,
          endDate: hasta,
        });
      }
    } catch {
      setError('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
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
        {/* Pautas en marcha: el atajo para apuntar una dosis de las de siempre */}
        {pautasDeHoy.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Programados</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              Toca el que le acabas de dar y solo tendrás que guardar.
            </p>
            <div className="space-y-2">
              {pautasDeHoy.map((plan) => {
                const elegido = pautaExistente?.id === plan.id;
                const dadas = dosisDelDia(medications, plan.id, hoy);
                const total = plan.times.length;
                const completo = dadas >= total;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => elegirMedicamento(plan.name, plan.doseMl)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left touch-manipulation transition-colors ${
                      elegido
                        ? 'bg-violet-100 ring-2 ring-violet-300'
                        : 'bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg shrink-0" aria-hidden="true">💊</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900 truncate">
                        {plan.name}
                        {plan.doseMl != null && (
                          <span className="text-gray-400 font-normal"> · {String(plan.doseMl).replace('.', ',')} ml</span>
                        )}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">{resumenPauta(plan)}</span>
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        completo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {completo ? '✓ ' : ''}{dadas}/{total} hoy
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

        {/* Ya hay una pauta para este medicamento: esta dosis se cuelga de ella */}
        {yaProgramado && pautaExistente && !programar && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0 leading-none mt-0.5" aria-hidden="true">💊</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-900">
                  Ya tienes {pautaExistente.name} programado
                </p>
                <p className="text-xs text-violet-800 mt-1 leading-relaxed">
                  {resumenPauta(pautaExistente)}
                  {pautaExistente.doseMl != null && ` · ${String(pautaExistente.doseMl).replace('.', ',')} ml`}
                  {' · hasta el '}
                  {new Date(pautaExistente.endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.
                </p>
                <p className="text-xs text-violet-700 mt-2 leading-relaxed">
                  {existing
                    ? 'Este registro cuenta como una de sus dosis.'
                    : (() => {
                        const dadas = dosisDelDia(medications, pautaExistente.id, hoy);
                        const total = pautaExistente.times.length;
                        return `Esta administración contará como la dosis ${Math.min(dadas + 1, total)} de ${total} de hoy, así que no hace falta volver a programarla.`;
                      })()}
                </p>
              </div>
            </div>
          </div>
        )}

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
                onClick={alternarProgramar}
                aria-label={programar ? 'No programar' : 'Programar'}
                className={`relative w-12 h-6 rounded-full transition-colors touch-manipulation shrink-0 ${programar ? 'bg-sage-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${programar ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {programar && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                {yaProgramado && pautaExistente && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                    Vas a crear una segunda pauta de {pautaExistente.name}: recibirás avisos de las
                    dos. Si solo querías cambiarla, borra la anterior en Mi bebé → Cuidados.
                  </p>
                )}

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
          disabled={saving}
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation disabled:opacity-60"
        >
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Guardar medicamento'}
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
