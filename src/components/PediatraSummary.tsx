import type { BabyConfig, Feeding, Rest, WeightEntry, HeightEntry, MilestoneLog, MedicationLog } from '../types';
import { getCurrentDaysOfLife, getBirthDate, formatMinutes, localDateOf } from '../utils/dateUtils';
import { getTotalSupplementMl, getTotalBottleMl, getTotalBreastMinutes, getTotalEstimatedBreastMl, restMinutesOnDay, formatDose } from '../utils/feedingUtils';
import { MILESTONES } from '../data/milestones';
import { contarPorTipo } from '../utils/sleepUtils';

interface Props {
  config: BabyConfig;
  feedings: Feeding[];
  rests: Rest[];
  weights: WeightEntry[];
  heights: HeightEntry[];
  milestoneLogs: MilestoneLog[];
  medications: MedicationLog[];
  onBack: () => void;
}

function avgGapMin(sortedTimestamps: string[]): number | null {
  if (sortedTimestamps.length < 2) return null;
  let total = 0;
  for (let i = 1; i < sortedTimestamps.length; i++) {
    total += (new Date(sortedTimestamps[i]).getTime() - new Date(sortedTimestamps[i - 1]).getTime()) / 60000;
  }
  return Math.round(total / (sortedTimestamps.length - 1));
}

function getPastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return localDateOf(d.toISOString());
  });
}

export default function PediatraSummary({ config, feedings, rests, weights, heights, milestoneLogs, medications, onBack }: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const birthDate = getBirthDate(config);
  const days = getPastDays(14);

  const periodFeedings = feedings.filter(f => days.includes(localDateOf(f.timestamp)));
  const daysWithFeedings = new Set(periodFeedings.map(f => localDateOf(f.timestamp)));

  const avgFeedingsPerDay = daysWithFeedings.size > 0
    ? Math.round((periodFeedings.length / daysWithFeedings.size) * 10) / 10
    : 0;

  const totalSyringeMl = getTotalSupplementMl(periodFeedings);
  const totalBottleMl = getTotalBottleMl(periodFeedings);
  const totalBreastMl = getTotalEstimatedBreastMl(periodFeedings);
  const totalBreastMin = getTotalBreastMinutes(periodFeedings);
  const breastFeedings = periodFeedings.filter(f => f.hasBreast).length;
  const bottleFeedings = periodFeedings.filter(f => f.hasBottle).length;
  const syringeFeedings = periodFeedings.filter(f => f.hasSupplement).length;

  const avgMlPerDay = daysWithFeedings.size > 0
    ? Math.round((totalSyringeMl + totalBottleMl + totalBreastMl) / daysWithFeedings.size)
    : 0;

  // Sleep stats
  const sleepByDay = days.map(day => rests.reduce((s, r) => s + restMinutesOnDay(r, day), 0));
  const daysWithSleep = sleepByDay.filter(m => m > 0);
  const avgSleepPerDay = daysWithSleep.length > 0
    ? Math.round(daysWithSleep.reduce((s, m) => s + m, 0) / daysWithSleep.length)
    : 0;

  // Weight
  const sortedWeights = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const latestWeight = sortedWeights[0];
  const prevWeight = sortedWeights.find(w => w.date < days[0]);
  const weightDiff = latestWeight && prevWeight
    ? Math.round((latestWeight.weightKg - prevWeight.weightKg) * 1000)
    : null;

  // Height
  const sortedHeights = [...heights].sort((a, b) => b.date.localeCompare(a.date));
  const latestHeight = sortedHeights[0];

  // Siestas y sueño nocturno se cuentan por separado: mezclarlos oculta si el
  // problema está en las siestas o en las noches.
  const conteoSueno = days.reduce((acc, d) => {
    const c = contarPorTipo(rests, config, d);
    return { siestas: acc.siestas + c.siestas, nocturnos: acc.nocturnos + c.nocturnos };
  }, { siestas: 0, nocturnos: 0 });

  // Medicación de los últimos 14 días, de la más reciente a la más antigua.
  const recentMedications = medications
    .filter(m => days.includes(localDateOf(m.timestamp)))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Recent milestones (last 30 days)
  const recentMilestones = milestoneLogs
    .filter(l => {
      const daysAgo = (Date.now() - new Date(l.achievedAt).getTime()) / 86400000;
      return daysAgo <= 30;
    })
    .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt));

  const allMilestones = MILESTONES.flatMap(g => g.milestones);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <button
          onClick={handlePrint}
          className="bg-sage-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm active:bg-sage-700 touch-manipulation"
        >
          📄 Imprimir / PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Resumen para el pediatra</h1>
          <p className="text-sm text-gray-500 mt-1">
            {config.name ?? 'Bebé'} · {daysOfLife} días de vida · Nacimiento: {birthDate}
          </p>
          <p className="text-sm text-gray-500">
            Período: últimos 14 días ({days[0]} a {days[days.length - 1]})
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Generado: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Antropometría */}
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Antropometría</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm print:shadow-none print:border print:border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Peso actual</p>
                <p className="text-lg font-bold text-gray-900">
                  {latestWeight ? `${latestWeight.weightKg} kg` : '—'}
                </p>
                {latestWeight && <p className="text-xs text-gray-400">{latestWeight.date}</p>}
                {weightDiff !== null && (
                  <p className={`text-xs font-medium mt-0.5 ${weightDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {weightDiff >= 0 ? '+' : ''}{weightDiff} g vs anterior
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Talla actual</p>
                <p className="text-lg font-bold text-gray-900">
                  {latestHeight ? `${latestHeight.heightCm} cm` : '—'}
                </p>
                {latestHeight && <p className="text-xs text-gray-400">{latestHeight.date}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Alimentación */}
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Alimentación (14 días)</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm print:shadow-none print:border print:border-gray-200 space-y-2">
            <Row label="Tomas/día (media)" value={String(avgFeedingsPerDay)} />
            <Row label="ml/día (media total)" value={`~${avgMlPerDay} ml`} />
            {breastFeedings > 0 && <Row label="Tomas de pecho" value={`${breastFeedings} (${formatMinutes(totalBreastMin)} total)`} />}
            {totalBreastMl > 0 && <Row label="Pecho estimado" value={`~${totalBreastMl} ml`} />}
            {bottleFeedings > 0 && <Row label="Tomas biberón" value={`${bottleFeedings} (${totalBottleMl} ml)`} />}
            {syringeFeedings > 0 && <Row label="Tomas jeringa-dedo" value={`${syringeFeedings} (${totalSyringeMl} ml)`} />}
          </div>
        </section>

        {/* Sueño */}
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Sueño (14 días)</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm print:shadow-none print:border print:border-gray-200 space-y-2">
            <Row label="Sueño/día (media)" value={formatMinutes(avgSleepPerDay)} />
            <Row label="Siestas registradas" value={String(conteoSueno.siestas)} />
            <Row label="Sueños nocturnos" value={String(conteoSueno.nocturnos)} />
          </div>
        </section>

        {/* Medicación administrada — lo primero que suele preguntar la pediatra */}
        {recentMedications.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Medicación (14 días)</h2>
            <div className="bg-white rounded-xl p-4 shadow-sm print:shadow-none print:border print:border-gray-200">
              <ul className="space-y-1.5">
                {recentMedications.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 text-sm">
                    <span className="text-violet-500 shrink-0">•</span>
                    <span className="text-gray-700">
                      {m.name}
                      {m.doseMl != null && <span className="text-gray-500"> · {formatDose(m.doseMl)} ml</span>}
                      {m.notes && <span className="text-gray-400 italic"> — {m.notes}</span>}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0 tabular-nums">
                      {new Date(m.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Hitos recientes */}
        {recentMilestones.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Hitos alcanzados (último mes)</h2>
            <div className="bg-white rounded-xl p-4 shadow-sm print:shadow-none print:border print:border-gray-200">
              <ul className="space-y-1.5">
                {recentMilestones.map(log => {
                  const milestone = allMilestones.find(m => m.id === log.id);
                  if (!milestone) return null;
                  return (
                    <li key={log.id} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 shrink-0">✓</span>
                      <span className="text-gray-700">{milestone.text}</span>
                      <span className="text-xs text-gray-400 ml-auto shrink-0">
                        {new Date(log.achievedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Tabla diaria */}
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Detalle diario</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden print:shadow-none print:border print:border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Día</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-500">Tomas</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-500">ml</th>
                  <th className="text-right px-2 py-2 font-semibold text-gray-500">Δ tomas</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-500">Sueño</th>
                  <th className="text-right px-2 py-2 font-semibold text-gray-500">Δ sueños</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((day) => {
                  const i = days.indexOf(day);
                  const dayF = feedings.filter(f => localDateOf(f.timestamp) === day)
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                  const dayMl = dayF.reduce((s, f) => s + (f.supplementMl ?? 0) + (f.bottleMl ?? 0) + (f.breastEstimatedMl ?? 0), 0);
                  const daySleep = sleepByDay[i];
                  const feedingGap = avgGapMin(dayF.map(f => f.timestamp));
                  const dayR = rests.filter(r => localDateOf(r.startTime) === day && r.endTime != null)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const sleepGap = avgGapMin(dayR.map(r => r.startTime));
                  return (
                    <tr key={day} className="border-b border-gray-50">
                      <td className="px-3 py-1.5 text-gray-700">
                        {new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{dayF.length || '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{dayMl > 0 ? dayMl : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{feedingGap ? formatMinutes(feedingGap) : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{daySleep > 0 ? formatMinutes(daySleep) : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{sleepGap ? formatMinutes(sleepGap) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center print:mt-8">
          Generado con Lacty · Los datos de pecho son estimados (~). Consultar con el profesional para interpretación.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
