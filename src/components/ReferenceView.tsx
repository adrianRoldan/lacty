import type { BabyConfig, Feeding, Rest } from '../types';
import { getCurrentDaysOfLife } from '../utils/dateUtils';
import { getTodayFeedings, getTotalSupplementMl, getTotalBreastMinutes, getRestCorrelation } from '../utils/feedingUtils';
import { FEEDING_REFERENCE, getEffectiveReference, getSleepReference } from '../data/referenceTable';

interface Props {
  config: BabyConfig;
  feedings: Feeding[];
  rests: Rest[];
  currentWeightKg?: number;
}

function formatGap(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const FIRST_WEEK = FEEDING_REFERENCE.filter(r => r.dayTo <= 7);
const AFTER_WEEK_ONE = FEEDING_REFERENCE.filter(r => r.dayFrom >= 8);

export default function ReferenceView({ config, feedings, rests, currentWeightKg }: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const ref = getEffectiveReference(daysOfLife, currentWeightKg);
  const sleep = getSleepReference(daysOfLife);
  const todayFeedings = getTodayFeedings(feedings);
  const todayMl = getTotalSupplementMl(todayFeedings) + todayFeedings.reduce((s, f) => s + (f.bottleMl ?? 0), 0);
  const todayBreastMin = getTotalBreastMinutes(todayFeedings);
  const correlation = getRestCorrelation(feedings, rests);

  const dailyMin = ref?.dailyMlMin ?? (ref ? ref.mlPerFeedMin * ref.feedsPerDayMin : 0);
  const dailyMax = ref?.dailyMlMax ?? (ref ? ref.mlPerFeedMax * ref.feedsPerDayMax : 0);

  const isFirstWeek = daysOfLife <= 6;
  const hasWeight = !!currentWeightKg && currentWeightKg > 0;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Referencia</h1>
      <p className="text-sm text-gray-500 mb-6">Día {daysOfLife} de vida</p>

      {/* ── Referencia de hoy ────────────────────────────────────────────── */}
      {ref ? (
        <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-sage-800">Leche total orientativa</h2>
            {ref.isWeightBased ? (
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                ⚖️ Por peso ({currentWeightKg} kg)
              </span>
            ) : (
              <span className="text-xs bg-sage-100 text-sage-600 font-medium px-2 py-0.5 rounded-full">
                📅 Por días de vida
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 text-center mb-3">
            <p className="text-3xl font-bold text-gray-900">
              {dailyMin}–{dailyMax}{' '}
              <span className="text-xl font-semibold text-gray-500">ml/día</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">pecho + jeringa + biberón</p>
            {ref.isWeightBased && currentWeightKg && (
              <p className="text-xs text-gray-400 mt-0.5">
                {currentWeightKg} kg × 150–180 ml/kg/día
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">
                {ref.mlPerFeedMin}–{ref.mlPerFeedMax} ml
              </p>
              <p className="text-xs text-gray-500 mt-0.5">por toma</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">
                {ref.feedsPerDayMin}–{ref.feedsPerDayMax}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">tomas al día</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
            <p>
              Hoy llevas <strong>{todayMl} ml con jeringa-dedo y biberón</strong>
              {todayBreastMin > 0 && <> y <strong>{todayBreastMin} min de pecho</strong></>}.
            </p>
            <p className="mt-1 text-xs text-amber-800">
              La referencia de {dailyMin}–{dailyMax} ml/día es para la ingesta total. Lo que toma al pecho suma aunque no puedas medirlo en ml.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-2xl p-4 mb-6 text-sm text-gray-600">
          No hay referencia disponible para el día {daysOfLife}. Consulta con tu pediatra o matrona.
        </div>
      )}

      {/* ── Sueño orientativo ───────────────────────────────────────────── */}
      <div className="bg-taupe-50 border border-taupe-100 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-taupe-800">Sueño orientativo</h2>
          <span className="text-xs bg-taupe-100 text-taupe-600 font-medium px-2 py-0.5 rounded-full">
            📅 Por edad
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 text-center mb-3">
          <p className="text-3xl font-bold text-gray-900">
            {sleep.sleepHoursMin}–{sleep.sleepHoursMax}{' '}
            <span className="text-xl font-semibold text-gray-500">h/día</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">sueño total en 24 h (siestas + noche)</p>
        </div>

        <div className="bg-white rounded-xl p-3 text-center mb-3">
          <p className="text-lg font-bold text-gray-900">{formatGap(sleep.awakeWindowMaxMin)}</p>
          <p className="text-xs text-gray-500 mt-0.5">vigilia máx. (despierto antes de la siguiente siesta)</p>
        </div>

        <div className="bg-white rounded-xl p-3 mb-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            🔄 <strong>Ciclo de sueño:</strong> en bebés dura ~45–50 min. Es normal que se despierten al terminar un ciclo, así que las siestas cortas no son un problema en sí. Por eso no marcamos una duración "ideal" por siesta: lo que importa es el sueño total del día y la ventana de vigilia.
          </p>
        </div>

        <p className="text-xs text-taupe-700">
          El sueño se guía por la edad, no por el peso. Valores orientativos (NSF/AASM); cada bebé varía. El banner de "Hoy" avisa al superar la ventana de vigilia.
        </p>
      </div>

      {/* ── Sueño por edad ──────────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Sueño por edad
      </h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Días de vida</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Sueño/día</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Vigilia máx.</th>
            </tr>
          </thead>
          <tbody>
            {FEEDING_REFERENCE.map((r, i) => {
              const isCurrent = daysOfLife >= r.dayFrom && daysOfLife <= r.dayTo;
              return (
                <tr key={i} className={`border-b border-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                  <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>
                    {r.dayFrom === r.dayTo ? `Día ${r.dayFrom}` : `Días ${r.dayFrom}–${r.dayTo}`}
                    {isCurrent && <span className="ml-2 text-xs text-blue-500">← hoy</span>}
                  </td>
                  <td className={`px-4 py-3 text-right ${isCurrent ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                    {r.sleepHoursMin}–{r.sleepHoursMax} h
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>
                    {r.awakeWindowMaxMin != null ? formatGap(r.awakeWindowMaxMin) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Tiempo entre tomas ──────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Tiempo máximo entre tomas
      </h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {ref && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm text-blue-800">
              Hoy (día {daysOfLife}): máx.
            </span>
            <span className="text-base font-bold text-blue-700">
              {formatGap(Math.round((24 * 60) / ref.feedsPerDayMin))}
            </span>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Días de vida</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Tomas/día mín.</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Máx. entre tomas</th>
            </tr>
          </thead>
          <tbody>
            {FEEDING_REFERENCE.map((r, i) => {
              const isCurrent = daysOfLife >= r.dayFrom && daysOfLife <= r.dayTo;
              const maxGap = Math.round((24 * 60) / r.feedsPerDayMin);
              return (
                <tr key={i} className={`border-b border-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                  <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>
                    {r.dayFrom === r.dayTo ? `Día ${r.dayFrom}` : `Días ${r.dayFrom}–${r.dayTo}`}
                    {isCurrent && <span className="ml-2 text-xs text-blue-500">← hoy</span>}
                  </td>
                  <td className={`px-4 py-3 text-right ${isCurrent ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                    {r.feedsPerDayMin}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>
                    {formatGap(maxGap)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 px-4 py-3">
          Calculado como 24h ÷ tomas mínimas recomendadas (AAP/OMS). El banner de alerta en "Hoy" usa este valor.
        </p>
      </div>

      {/* ── Cómo se calcula ─────────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Cómo se calcula
      </h2>

      {isFirstWeek ? (
        // Primera semana: la capacidad gástrica limita más que el peso
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-600">
              <strong>Semana 1:</strong> el estómago crece muy rápido. La referencia sigue la capacidad gástrica del bebé, no el peso.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Día</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">ml/toma</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Tomas/día</th>
              </tr>
            </thead>
            <tbody>
              {FIRST_WEEK.map((r, i) => {
                const isCurrent = daysOfLife >= r.dayFrom && daysOfLife <= r.dayTo;
                return (
                  <tr key={i} className={`border-b border-gray-50 ${isCurrent ? 'bg-sage-50' : ''}`}>
                    <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-sage-800' : 'text-gray-700'}`}>
                      {r.dayFrom === r.dayTo ? `Día ${r.dayFrom}` : `Días ${r.dayFrom}–${r.dayTo}`}
                      {isCurrent && <span className="ml-2 text-xs text-sage-600">← hoy</span>}
                    </td>
                    <td className={`px-4 py-3 text-right ${isCurrent ? 'text-sage-800 font-semibold' : 'text-gray-600'}`}>
                      {r.mlPerFeedMin}–{r.mlPerFeedMax}
                    </td>
                    <td className={`px-4 py-3 text-right ${isCurrent ? 'text-sage-800 font-semibold' : 'text-gray-600'}`}>
                      {r.feedsPerDayMin}–{r.feedsPerDayMax}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3 text-center">
            A partir del día 7 la referencia pasa a calcularse por peso.
          </p>
        </div>
      ) : hasWeight ? (
        // Día 7+: fórmula por peso
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-3">
          <p className="text-sm text-gray-700">
            A partir de la primera semana la ingesta total se estima con la fórmula estándar pediátrica:
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-base font-mono font-semibold text-gray-800">
              peso (kg) × 150–180 ml = ml/día
            </p>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Con <strong>{currentWeightKg} kg</strong> actuales:
            </p>
            <p className="pl-3 text-gray-700">
              · Mínimo: {currentWeightKg} × 150 = <strong>{Math.round(currentWeightKg * 150)} ml/día</strong>
            </p>
            <p className="pl-3 text-gray-700">
              · Máximo: {currentWeightKg} × 180 = <strong>{Math.round(currentWeightKg * 180)} ml/día</strong>
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Esta fórmula es para leche total (pecho + biberón + jeringa-dedo). Cuando el bebé crezca y el peso cambie, actualízalo en la pestaña Mi bebé para que la referencia se ajuste.
          </p>
        </div>
      ) : (
        // Día 7+ sin peso: tabla genérica + aviso
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
            <p className="text-sm text-amber-900">
              <strong>Añade el peso</strong> del bebé en la pestaña <strong>Mi bebé</strong> para obtener una referencia personalizada. Sin peso, se usa una estimación genérica por días de vida.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-500">Estimación genérica por días (sin peso)</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Días</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">ml/toma</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Tomas/día</th>
                </tr>
              </thead>
              <tbody>
                {AFTER_WEEK_ONE.map((r, i) => {
                  const isCurrent = daysOfLife >= r.dayFrom && daysOfLife <= r.dayTo;
                  return (
                    <tr key={i} className={`border-b border-gray-50 ${isCurrent ? 'bg-sage-50' : ''}`}>
                      <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-sage-800' : 'text-gray-700'}`}>
                        Días {r.dayFrom}–{r.dayTo}
                        {isCurrent && <span className="ml-2 text-xs text-sage-600">← hoy</span>}
                      </td>
                      <td className={`px-4 py-3 text-right ${isCurrent ? 'text-sage-800 font-semibold' : 'text-gray-600'}`}>
                        {r.mlPerFeedMin}–{r.mlPerFeedMax}
                      </td>
                      <td className={`px-4 py-3 text-right ${isCurrent ? 'text-sage-800 font-semibold' : 'text-gray-600'}`}>
                        {r.feedsPerDayMin}–{r.feedsPerDayMax}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Correlación suplemento → sueño ───────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Jeringa-dedo → sueño
      </h2>
      {correlation.length === 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 text-center text-gray-400 text-sm">
          <p className="text-2xl mb-2">🌙</p>
          <p>Aún no hay datos suficientes.</p>
          <p className="text-xs mt-1">Registra el sueño tras las tomas con jeringa-dedo para ver patrones aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Jeringa-dedo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Tomas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Media sueño</th>
              </tr>
            </thead>
            <tbody>
              {correlation.map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{row.count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-taupe-700">
                    {row.avgRestMinutes} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3">
            Media de sueño por rango de ml con jeringa-dedo.
          </p>
        </div>
      )}

      {/* ── Estimación leche al pecho ───────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Estimación leche al pecho
      </h2>
      <BreastEstimationExplainer feedings={feedings} daysOfLife={daysOfLife} />

      {/* ── Aviso médico ─────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <p className="text-xs text-gray-500">
          ⚠️ Valores <strong>orientativos</strong> basados en guías pediátricas (OMS/AAP).
          No son diagnóstico médico ni pauta personalizada.
          Consulta con tu <strong>pediatra, matrona o asesora de lactancia</strong> si tienes dudas.
        </p>
      </div>
    </div>
  );
}

function BreastEstimationExplainer({ feedings, daysOfLife }: { feedings: Feeding[]; daysOfLife: number }) {
  const mlBase = (502 + 725) / 2; // 613.5 ml/día promedio
  const mlPerAvgFeed8_14 = Math.round(mlBase / 10);  // 10 tomas/día media días 8-14
  const mlPerAvgFeed15_28 = Math.round(mlBase / 9);  // 9 tomas/día media días 15-28
  const maxMlPerFeed = Math.round(725 / 8);           // tope máximo por toma

  // Media histórica de minutos del bebé
  const completedBreast = feedings.filter(
    (f) => f.hasBreast && ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0
  );
  const avgMin = completedBreast.length > 0
    ? Math.round(completedBreast.reduce(
        (s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0
      ) / completedBreast.length)
    : null;
  const hasDynamic = completedBreast.length >= 3;

  // Ejemplos con la media del bebé o con 15 min si no hay datos aún
  const exampleAvg = avgMin ?? 15;
  const mlPerAvgFeedCurrent = daysOfLife >= 15 ? mlPerAvgFeed15_28 : mlPerAvgFeed8_14;

  return (
    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-6 space-y-4">
      {/* Paso 1: referencia base */}
      <div>
        <p className="text-sm text-pink-900 font-semibold mb-1">Paso 1 — Referencia base de ml por toma</p>
        <p className="text-xs text-pink-800 leading-relaxed mb-2">
          Para días 8–28, la referencia es 502–725 ml/día. Dividiendo entre la media de tomas:
        </p>
        <div className="bg-white rounded-xl p-3 font-mono text-xs text-gray-700 text-center mb-2">
          (502 + 725) ÷ 2 ÷ media_tomas_día = ml_base/toma
        </div>
        <div className="space-y-1 text-xs text-pink-800">
          <p>· Días 8–14 (media 10 tomas/día): <strong>~{mlPerAvgFeed8_14} ml/toma base</strong></p>
          <p>· Días 15–28 (media 9 tomas/día): <strong>~{mlPerAvgFeed15_28} ml/toma base</strong></p>
        </div>
      </div>

      {/* Paso 2: ajuste por minutos */}
      <div>
        <p className="text-sm text-pink-900 font-semibold mb-1">Paso 2 — Ajuste por duración real de la toma</p>
        <p className="text-xs text-pink-800 leading-relaxed mb-2">
          El estimado se escala proporcionalmente a los minutos reales respecto a la media histórica del bebé:
        </p>
        <div className="bg-white rounded-xl p-3 font-mono text-xs text-gray-700 text-center mb-2">
          ml_est = ml_base × (min_esta_toma ÷ media_min_historial)
        </div>

        {/* Estado del historial */}
        {hasDynamic ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
            <p className="text-xs text-green-800 font-medium">
              ✓ Historial activo — {completedBreast.length} tomas de pecho registradas
            </p>
            <p className="text-xs text-green-700">
              Media actual del bebé: <strong>{avgMin} min/toma</strong>
            </p>
            <div className="space-y-1 text-xs text-green-700">
              <p>· Toma de 5 min → <strong>~{Math.max(1, Math.min(Math.round(mlPerAvgFeedCurrent * 5 / exampleAvg), maxMlPerFeed))} ml</strong></p>
              <p>· Toma de {avgMin} min → <strong>~{mlPerAvgFeedCurrent} ml</strong></p>
              <p>· Toma de {Math.round(exampleAvg * 1.8)} min → <strong>~{Math.max(1, Math.min(Math.round(mlPerAvgFeedCurrent * Math.round(exampleAvg * 1.8) / exampleAvg), maxMlPerFeed))} ml</strong></p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Sin historial suficiente</strong> ({completedBreast.length}/3 tomas mínimas).
            Hasta tener 3 tomas de pecho completadas se usa el estimado fijo de ~{mlPerAvgFeedCurrent} ml/toma.
          </div>
        )}

        <p className="text-xs text-pink-700 mt-2">
          Tope máximo: <strong>{maxMlPerFeed} ml/toma</strong> (725 ml/día ÷ 8 tomas mínimas).
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
        <strong>⚠️ Estimación, no medición.</strong> La fórmula asume que más tiempo = más leche, lo cual es orientativo pero no siempre correcto. La única medición real es el pesaje de control (antes/después de la toma).
      </div>
    </div>
  );
}
