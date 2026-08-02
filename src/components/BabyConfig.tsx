import { useState } from 'react';
import type { BabyConfig } from '../types';
import { getBirthDate } from '../utils/dateUtils';
import { suggestedFrenectomyEnd, suggestedVitaminDEnd, MASAJES_POR_DIA_POR_DEFECTO } from '../utils/careUtils';
import { isPushSupported } from '../utils/pushNotifications';
import { enablePush } from '../utils/enablePush';

interface Props {
  onSave: (config: Omit<BabyConfig, 'id'>) => void | Promise<void>;
  onLogout?: () => void;
  username?: string | null;
  existing?: BabyConfig | null;
  initialWeight?: number;
  onSaveWeight?: (kg: number) => void | Promise<void>;
}

type Paso = 'bebe' | 'cuidados' | 'frenectomia' | 'avisos';

/**
 * Alta de un bebé, en pasos.
 *
 * Antes solo pedía nombre, fecha, sexo y peso, y los cuidados diarios
 * (vitamina D, probiótico, frenectomía) quedaban escondidos en «Mi bebé»,
 * donde casi nadie los encontraba. Ahora se preguntan aquí, se pueden saltar
 * y siguen siendo editables después.
 */
export default function BabyConfigScreen({ onSave, onLogout, username, existing, initialWeight, onSaveWeight }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [paso, setPaso] = useState<Paso>('bebe');

  // Paso 1 — datos del bebé
  const [name, setName] = useState(existing?.name ?? '');
  const [birthDate, setBirthDate] = useState(existing ? getBirthDate(existing) ?? today : today);
  const [sex, setSex] = useState<'male' | 'female' | ''>(existing?.sex ?? '');
  const [weightKg, setWeightKg] = useState<number | ''>(initialWeight ?? '');

  // Paso 2 — cuidados diarios
  const [vitaminD, setVitaminD] = useState(existing?.vitaminDEnabled ?? false);
  const [vitaminDName, setVitaminDName] = useState(existing?.vitaminDMedName ?? '');
  const [vitaminDHour, setVitaminDHour] = useState<number | ''>(existing?.vitaminDReminderHour ?? 10);
  const [vitaminDEnd, setVitaminDEnd] = useState(existing?.vitaminDEndDate ?? '');
  const [probiotic, setProbiotic] = useState(existing?.probioticEnabled ?? false);
  const [probioticName, setProbioticName] = useState(existing?.probioticMedName ?? '');
  const [probioticHour, setProbioticHour] = useState<number | ''>(existing?.probioticReminderHour ?? 10);

  // Paso 3 — frenectomía
  const [frenectomy, setFrenectomy] = useState(existing?.frenectomyEnabled ?? false);
  const [frenDate, setFrenDate] = useState(existing?.frenectomyDate ?? today);
  const [frenMassages, setFrenMassages] = useState<number | ''>(existing?.frenectomyMassagesPerDay ?? MASAJES_POR_DIA_POR_DEFECTO);
  const [frenStart, setFrenStart] = useState(existing?.frenectomyStartTime ?? '08:30');
  const [frenEndTime, setFrenEndTime] = useState(existing?.frenectomyEndTime ?? '22:30');
  const [frenEndDate, setFrenEndDate] = useState(existing?.frenectomyEndDate ?? '');

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [avisosActivados, setAvisosActivados] = useState(false);

  // La vitamina D se administra durante el primer año: se sugiere esa fecha.
  const vitaminDEndSugerida = vitaminDEnd || (birthDate ? suggestedVitaminDEnd(birthDate) : '');
  const frenEndSugerida = frenEndDate || (frenDate ? suggestedFrenectomyEnd(frenDate) : '');

  function irACuidados(e: React.FormEvent) {
    e.preventDefault();
    if (!birthDate) { setError('La fecha de nacimiento es obligatoria.'); return; }
    if (!sex) { setError('Indica el sexo del bebé.'); return; }
    if (weightKg === '' || weightKg <= 0) { setError('Introduce el peso del bebé.'); return; }
    setError('');
    setPaso('cuidados');
  }

  async function guardar() {
    setGuardando(true);
    try {
      const birthD = new Date(birthDate + 'T12:00:00');
      const todayD = new Date(today + 'T12:00:00');
      const daysOfLife = Math.max(1, Math.round((todayD.getTime() - birthD.getTime()) / 86400000) + 1);

      await onSave({
        name: name.trim() || undefined,
        birthDate,
        sex: sex as 'male' | 'female',
        daysOfLifeAtSetup: existing?.daysOfLifeAtSetup ?? daysOfLife,
        setupDate: existing?.setupDate ?? today,

        vitaminDEnabled: vitaminD,
        ...(vitaminD ? {
          vitaminDMedName: vitaminDName.trim() || undefined,
          vitaminDReminderHour: vitaminDHour === '' ? undefined : Number(vitaminDHour),
          vitaminDEndDate: vitaminDEndSugerida || undefined,
        } : {}),

        probioticEnabled: probiotic,
        ...(probiotic ? {
          probioticMedName: probioticName.trim() || undefined,
          probioticReminderHour: probioticHour === '' ? undefined : Number(probioticHour),
        } : {}),

        frenectomyEnabled: frenectomy,
        ...(frenectomy ? {
          frenectomyDate: frenDate,
          frenectomyMassagesPerDay: frenMassages === '' ? MASAJES_POR_DIA_POR_DEFECTO : Number(frenMassages),
          frenectomyStartTime: frenStart,
          frenectomyEndTime: frenEndTime,
          frenectomyEndDate: frenEndSugerida || undefined,
        } : {}),
      });

      if (weightKg && weightKg > 0 && onSaveWeight) {
        await onSaveWeight(Number(weightKg));
      }
    } finally {
      setGuardando(false);
    }
  }

  async function activarAvisos() {
    setError('');
    const r = await enablePush();
    if (r === 'ok') setAvisosActivados(true);
    else if (r === 'denegado') setError('Los avisos están bloqueados en el navegador. Puedes activarlos luego en Ajustes.');
    else setError('No se han podido activar los avisos. Puedes hacerlo luego en Ajustes.');
  }

  const pasos: Paso[] = ['bebe', 'cuidados', 'frenectomia', 'avisos'];
  const indice = pasos.indexOf(paso);

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 bg-cream-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">👶</div>
          <h1 className="text-2xl font-bold text-gray-900">Lacty</h1>
          <p className="text-gray-500 text-sm mt-2">
            {paso === 'bebe' && (existing ? 'Completa los datos del bebé' : 'Empecemos por los datos del bebé')}
            {paso === 'cuidados' && 'Cuidados del día a día'}
            {paso === 'frenectomia' && 'Frenillo lingual'}
            {paso === 'avisos' && '¡Todo listo!'}
          </p>
        </div>

        {/* Progreso */}
        <div className="flex gap-1.5 mb-6" aria-hidden="true">
          {pasos.map((p, i) => (
            <div key={p} className={`h-1 flex-1 rounded-full ${i <= indice ? 'bg-sage-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* ── Paso 1: datos del bebé ────────────────────────────────────── */}
        {paso === 'bebe' && (
          <form onSubmit={irACuidados} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nombre <span className="text-gray-300">(opcional)</span>
              </label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del bebé"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Fecha de nacimiento <span className="text-red-400">*</span>
              </label>
              <input
                type="date" value={birthDate} max={today}
                onChange={(e) => { if (e.target.value <= today) setBirthDate(e.target.value); }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Sexo <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSex('male')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                    sex === 'male' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-100 text-gray-500'}`}>
                  ♂ Niño
                </button>
                <button type="button" onClick={() => setSex('female')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                    sex === 'female' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300' : 'bg-gray-100 text-gray-500'}`}>
                  ♀ Niña
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Peso <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0.5} max={7} step={0.01} value={weightKg} placeholder="Ej: 3.25"
                  onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 placeholder:text-gray-300"
                />
                <span className="text-sm font-medium text-gray-500 shrink-0">kg</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Peso de nacimiento o peso actual. Se usa para calcular la referencia de ml/día.
              </p>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button type="submit"
              className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation">
              Continuar
            </button>
          </form>
        )}

        {/* ── Paso 2: cuidados diarios ──────────────────────────────────── */}
        {paso === 'cuidados' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 text-center -mt-2">
              Puedes activarlos ahora o más adelante desde «Mi bebé».
            </p>

            <Cuidado
              icono="💊" titulo="Vitamina D"
              descripcion="Se suele dar a diario durante el primer año"
              activo={vitaminD} onToggle={setVitaminD}
            >
              <CampoTexto etiqueta="Medicamento" valor={vitaminDName} onChange={setVitaminDName} placeholder="Ej. Deltius" />
              <CampoHora etiqueta="Recordatorio" valor={vitaminDHour} onChange={setVitaminDHour} />
              <CampoFecha etiqueta="Hasta" valor={vitaminDEndSugerida} onChange={setVitaminDEnd} ayuda="Por defecto, el primer año" />
            </Cuidado>

            <Cuidado
              icono="🦠" titulo="Probiótico"
              descripcion="Si tu pediatra lo ha pautado"
              activo={probiotic} onToggle={setProbiotic}
            >
              <CampoTexto etiqueta="Medicamento" valor={probioticName} onChange={setProbioticName} placeholder="Ej. Reuteri" />
              <CampoHora etiqueta="Recordatorio" valor={probioticHour} onChange={setProbioticHour} />
            </Cuidado>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setPaso('bebe')}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                Atrás
              </button>
              <button type="button" onClick={() => setPaso('frenectomia')}
                className="flex-1 bg-sage-600 text-white font-semibold py-3 rounded-xl active:bg-sage-700 touch-manipulation">
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: frenectomía ───────────────────────────────────────── */}
        {paso === 'frenectomia' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 text-center -mt-2">
              Responde <strong className="text-gray-500">sí</strong> solo si le han cortado el frenillo
              de la lengua. Si no sabes de qué va, responde <strong className="text-gray-500">no</strong>.
            </p>

            <Cuidado
              icono="👅" titulo="¿Le han hecho una frenectomía?"
              descripcion="Si es así, Lacty lleva el control de los masajes"
              activo={frenectomy} onToggle={setFrenectomy} siNo
            >
              <CampoFecha etiqueta="Fecha de la intervención" valor={frenDate} onChange={setFrenDate} />
              <Campo etiqueta="Masajes al día" ayuda="El protocolo habitual son 5">
                <input
                  type="number" min={1} max={12} value={frenMassages}
                  onChange={(e) => setFrenMassages(e.target.value === '' ? '' : Number(e.target.value))}
                  className={claseCampo}
                />
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo etiqueta="Primer masaje">
                  <input type="time" value={frenStart} onChange={(e) => setFrenStart(e.target.value)}
                    className={`${claseCampo} px-2`} />
                </Campo>
                <Campo etiqueta="Último masaje">
                  <input type="time" value={frenEndTime} onChange={(e) => setFrenEndTime(e.target.value)}
                    className={`${claseCampo} px-2`} />
                </Campo>
              </div>
              <CampoFecha etiqueta="Fin de los masajes" valor={frenEndSugerida} onChange={setFrenEndDate}
                ayuda="Por defecto, 21 días tras la intervención" min={frenDate} />
            </Cuidado>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setPaso('cuidados')} disabled={guardando}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 disabled:opacity-50 touch-manipulation">
                Atrás
              </button>
              <button type="button"
                onClick={() => isPushSupported() ? setPaso('avisos') : guardar()}
                disabled={guardando}
                className="flex-1 bg-sage-600 text-white font-semibold py-3 rounded-xl active:bg-sage-700 disabled:opacity-60 touch-manipulation">
                {guardando ? 'Guardando…' : isPushSupported() ? 'Continuar' : 'Empezar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 4: avisos ────────────────────────────────────────────── */}
        {paso === 'avisos' && (
          <div className="space-y-4 text-center">
            <p className="text-4xl">{avisosActivados ? '✅' : '🔔'}</p>
            <p className="text-sm text-taupe-700 leading-relaxed">
              {avisosActivados
                ? 'Avisos activados. Ya puedes empezar a registrar.'
                : 'Activa los avisos para que Lacty te recuerde las tomas, los medicamentos y los masajes. Sin ellos, los recordatorios que has configurado no llegarán al móvil.'}
            </p>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {!avisosActivados && (
              <button type="button" onClick={activarAvisos}
                className="w-full bg-sage-600 text-white font-semibold py-3.5 rounded-xl active:bg-sage-700 touch-manipulation">
                Activar avisos
              </button>
            )}
            <button type="button" onClick={guardar} disabled={guardando}
              className={`w-full py-3.5 rounded-xl font-semibold touch-manipulation disabled:opacity-60 ${
                avisosActivados
                  ? 'bg-sage-600 text-white active:bg-sage-700'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
              {guardando ? 'Guardando…' : avisosActivados ? 'Empezar' : 'Ahora no, empezar'}
            </button>
          </div>
        )}
      </div>

      {username && (
        <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400">
          <span>Sesión: <span className="font-medium text-gray-500">{username}</span></span>
          {onLogout && (
            <>
              <span>·</span>
              <button onClick={onLogout} className="text-red-400 font-medium touch-manipulation">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Piezas del formulario ────────────────────────────────────────────────────

function Cuidado({ icono, titulo, descripcion, activo, onToggle, siNo, children }: {
  icono: string; titulo: string; descripcion: string;
  activo: boolean; onToggle: (v: boolean) => void;
  /** Muestra «Sí»/«No» junto al interruptor, para las preguntas cerradas. */
  siNo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${activo ? 'border-sage-200 bg-sage-50/50' : 'border-gray-200'}`}>
      <button type="button" onClick={() => onToggle(!activo)} className="w-full flex items-center justify-between gap-3 touch-manipulation">
        <div className="flex items-start gap-3 min-w-0 text-left">
          <span className="text-xl shrink-0">{icono}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-400 leading-snug">{descripcion}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {siNo && (
            <span className={`text-sm font-bold ${activo ? 'text-sage-700' : 'text-gray-400'}`}>
              {activo ? 'Sí' : 'No'}
            </span>
          )}
          <div className={`w-12 h-7 rounded-full transition-colors relative ${activo ? 'bg-sage-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>
      </button>
      {activo && <div className="mt-4 pt-4 border-t border-sage-200/60 space-y-3">{children}</div>}
    </div>
  );
}

function Campo({ etiqueta, ayuda, children }: {
  etiqueta: string; ayuda?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{etiqueta}</label>
      {children}
      {ayuda && <p className="text-xs text-gray-400 mt-1 leading-snug">{ayuda}</p>}
    </div>
  );
}

const claseCampo =
  'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400';

function CampoTexto({ etiqueta, valor, onChange, placeholder }: {
  etiqueta: string; valor: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <Campo etiqueta={etiqueta}>
      <input type="text" value={valor} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className={claseCampo} />
    </Campo>
  );
}

function CampoHora({ etiqueta, valor, onChange }: {
  etiqueta: string; valor: number | ''; onChange: (v: number | '') => void;
}) {
  return (
    <Campo etiqueta={etiqueta}>
      <select value={valor} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={claseCampo}>
        <option value="">Sin recordatorio</option>
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
        ))}
      </select>
    </Campo>
  );
}

function CampoFecha({ etiqueta, valor, onChange, ayuda, min }: {
  etiqueta: string; valor: string; onChange: (v: string) => void; ayuda?: string; min?: string;
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <input type="date" value={valor} min={min} onChange={(e) => onChange(e.target.value)}
        className={claseCampo} />
    </Campo>
  );
}
