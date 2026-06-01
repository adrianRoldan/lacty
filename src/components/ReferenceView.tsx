import type { BabyConfig, Feeding, Rest } from '../types';
import { getCurrentDaysOfLife } from '../utils/dateUtils';
import { getTodayFeedings, getTotalSupplementMl, getTotalBreastMinutes, getRestCorrelation } from '../utils/feedingUtils';
import { FEEDING_REFERENCE, getEffectiveReference } from '../data/referenceTable';

interface Props {
  config: BabyConfig;
  feedings: Feeding[];
  rests: Rest[];
  currentWeightKg?: number;
}

const FIRST_WEEK = FEEDING_REFERENCE.filter(r => r.dayTo <= 7);
const AFTER_WEEK_ONE = FEEDING_REFERENCE.filter(r => r.dayFrom >= 8);

export default function ReferenceView({ config, feedings, rests, currentWeightKg }: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const ref = getEffectiveReference(daysOfLife, currentWeightKg);
  const todayFeedings = getTodayFeedings(feedings);
  const todayMl = getTotalSupplementMl(todayFeedings);
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
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-blue-800">Leche total orientativa</h2>
            {ref.isWeightBased ? (
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                ⚖️ Por peso ({currentWeightKg} kg)
              </span>
            ) : (
              <span className="text-xs bg-blue-100 text-blue-600 font-medium px-2 py-0.5 rounded-full">
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
              Hoy llevas <strong>{todayMl} ml con jeringa-dedo</strong>
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
                  <tr key={i} className={`border-b border-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                    <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>
                      {r.dayFrom === r.dayTo ? `Día ${r.dayFrom}` : `Días ${r.dayFrom}–${r.dayTo}`}
                      {isCurrent && <span className="ml-2 text-xs text-blue-600">← hoy</span>}
                    </td>
                    <td className={`px-4 py-3 text-right ${isCurrent ? 'text-blue-800 font-semibold' : 'text-gray-600'}`}>
                      {r.mlPerFeedMin}–{r.mlPerFeedMax}
                    </td>
                    <td className={`px-4 py-3 text-right ${isCurrent ? 'text-blue-800 font-semibold' : 'text-gray-600'}`}>
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
            Esta fórmula es para leche total (pecho + biberón + jeringa). Cuando el bebé crezca y el peso cambie, actualízalo en la pestaña Mi bebé para que la referencia se ajuste.
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
                    <tr key={i} className={`border-b border-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                      <td className={`px-4 py-3 font-medium ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>
                        Días {r.dayFrom}–{r.dayTo}
                        {isCurrent && <span className="ml-2 text-xs text-blue-600">← hoy</span>}
                      </td>
                      <td className={`px-4 py-3 text-right ${isCurrent ? 'text-blue-800 font-semibold' : 'text-gray-600'}`}>
                        {r.mlPerFeedMin}–{r.mlPerFeedMax}
                      </td>
                      <td className={`px-4 py-3 text-right ${isCurrent ? 'text-blue-800 font-semibold' : 'text-gray-600'}`}>
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

      {/* ── Correlación suplemento → descanso ───────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Jeringa-dedo → descanso
      </h2>
      {correlation.length === 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 text-center text-gray-400 text-sm">
          <p className="text-2xl mb-2">😴</p>
          <p>Aún no hay datos suficientes.</p>
          <p className="text-xs mt-1">Registra el descanso tras las tomas con jeringa-dedo para ver patrones aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Jeringa-dedo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Tomas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Media descanso</th>
              </tr>
            </thead>
            <tbody>
              {correlation.map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{row.count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-purple-700">
                    {row.avgRestMinutes} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3">
            Media de descanso por rango de ml con jeringa-dedo.
          </p>
        </div>
      )}

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
