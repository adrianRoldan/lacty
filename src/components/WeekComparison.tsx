import type { Feeding, Rest } from '../types';
import { localDateOf, formatMinutes } from '../utils/dateUtils';
import { restMinutesOnDay } from '../utils/feedingUtils';

interface Props {
  feedings: Feeding[];
  rests: Rest[];
}

export default function WeekComparison({ feedings, rests }: Props) {
  const today = new Date();
  const dow = today.getDay();
  const startThisWeek = new Date(today);
  startThisWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const startLastWeek = new Date(startThisWeek);
  startLastWeek.setDate(startLastWeek.getDate() - 7);

  const thisWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startThisWeek);
    d.setDate(d.getDate() + i);
    return localDateOf(d.toISOString());
  }).filter(d => d <= localDateOf(today.toISOString()));

  const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startLastWeek);
    d.setDate(d.getDate() + i);
    return localDateOf(d.toISOString());
  });

  function weekStats(days: string[]) {
    const wFeedings = feedings.filter(f => days.includes(localDateOf(f.timestamp)));
    const daysWithData = new Set(wFeedings.map(f => localDateOf(f.timestamp))).size || 1;
    const totalMl = wFeedings.reduce((s, f) => s + (f.supplementMl ?? 0) + (f.bottleMl ?? 0) + (f.breastEstimatedMl ?? 0), 0);
    const breastMin = wFeedings.reduce((s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0);
    const sleepMin = days.reduce((s, day) => s + rests.reduce((rs, r) => rs + restMinutesOnDay(r, day), 0), 0);
    return {
      feedingsPerDay: Math.round((wFeedings.length / daysWithData) * 10) / 10,
      mlPerDay: Math.round(totalMl / daysWithData),
      breastMinPerDay: Math.round(breastMin / daysWithData),
      sleepMinPerDay: Math.round(sleepMin / days.length),
    };
  }

  const thisW = weekStats(thisWeekDays);
  const lastW = weekStats(lastWeekDays);

  if (thisWeekDays.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📊 Esta semana vs anterior</h4>
      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-1.5">
        <span className="text-gray-400">Indicador</span>
        <span className="text-gray-400">Anterior</span>
        <span className="text-gray-400">Esta</span>
      </div>
      <div className="space-y-1.5">
        <CompRow label="Tomas/día" prev={String(lastW.feedingsPerDay)} curr={String(thisW.feedingsPerDay)} better={thisW.feedingsPerDay >= lastW.feedingsPerDay} />
        <CompRow label="ml/día" prev={`${lastW.mlPerDay}`} curr={`${thisW.mlPerDay}`} better={thisW.mlPerDay >= lastW.mlPerDay} />
        <CompRow label="Pecho min/día" prev={`${lastW.breastMinPerDay}`} curr={`${thisW.breastMinPerDay}`} better={thisW.breastMinPerDay >= lastW.breastMinPerDay} />
        <CompRow label="Sueño h/día" prev={formatMinutes(lastW.sleepMinPerDay)} curr={formatMinutes(thisW.sleepMinPerDay)} better={thisW.sleepMinPerDay >= lastW.sleepMinPerDay} />
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">
        Semana actual ({thisWeekDays.length}d) vs anterior (7d)
      </p>
    </div>
  );
}

function CompRow({ label, prev, curr, better }: { label: string; prev: string; curr: string; better?: boolean }) {
  const diff = better === undefined ? null : better;
  return (
    <div className="grid grid-cols-3 gap-2 items-center">
      <span className="text-xs text-gray-600 text-left">{label}</span>
      <span className="text-xs text-gray-500 text-center">{prev}</span>
      <span className={`text-xs font-semibold text-center ${diff === true ? 'text-green-600' : diff === false ? 'text-amber-600' : 'text-gray-800'}`}>
        {curr}
        {diff === true && ' ↑'}
        {diff === false && ' ↓'}
      </span>
    </div>
  );
}
