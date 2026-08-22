import type { Feeding, Rest, Extraction } from '../types';
import type { FeedingReference, SleepReference } from '../data/referenceTable';
import {
  getTotalSupplementMl,
  getTotalBottleMl,
  getTotalEstimatedBreastMl,
  getAvgGapMinutes,
  getAvgSupplementMl,
  getAvgRestMinutes,
  getAvgAwakeWindowMinutes,
} from '../utils/feedingUtils';
import { formatMinutes } from '../utils/dateUtils';
import { ProgressRow, AverageRow } from './InsightRows';
import ExtractionsInsightCard from './ExtractionsInsightCard';

interface Props {
  feedings: Feeding[];
  rests: Rest[];
  reference: FeedingReference | null;
  sleepRef: SleepReference | null;
  // Minutos de sueño de hoy, calculados una sola vez en DailySummary
  // (incluye el tramo de hoy de sueños que cruzan medianoche). Se reutiliza
  // aquí para que coincida con la tarjeta de estadísticas.
  todayRestMinutes: number;
  siestasHoy: number;
  nocturnosHoy: number;
  extractions: Extraction[];
  /** Media de tomas/día de la última semana (avgDailyFeeds), o null si aún
   *  no hay suficientes días con datos — entonces se usa `reference`. */
  avgFeedsTarget: number | null;
}

export default function DayInsights({ feedings, rests, reference, sleepRef, todayRestMinutes, siestasHoy, nocturnosHoy, extractions, avgFeedsTarget }: Props) {
  const totalMl = getTotalSupplementMl(feedings) + getTotalBottleMl(feedings) + getTotalEstimatedBreastMl(feedings);
  const totalFeedings = feedings.length;
  const avgGap = getAvgGapMinutes(feedings);
  const avgMl = getAvgSupplementMl(feedings);
  const avgRest = getAvgRestMinutes(rests);
  const avgAwakeWindow = getAvgAwakeWindowMinutes(rests);
  const totalRestToday = todayRestMinutes;

  const hasAnyData = totalFeedings > 0 || rests.length > 0 || extractions.length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Progress: tomas, ml y sueño */}
      {(reference || sleepRef) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Progreso del día
          </h3>

          {reference && (
            <ProgressRow
              label="Tomas"
              value={totalFeedings}
              refMin={reference.feedsPerDayMin}
              refMax={reference.feedsPerDayMax}
              formatValue={(v) => String(v)}
            />
          )}

          {reference && (
            <ProgressRow
              label="Mililitros totales"
              value={totalMl}
              refMin={reference.dailyMlMin ?? reference.mlPerFeedMin * reference.feedsPerDayMin}
              refMax={reference.dailyMlMax ?? reference.mlPerFeedMax * reference.feedsPerDayMax}
              formatValue={(v) => `${v} ml`}
            />
          )}

          {sleepRef && (
            <ProgressRow
              label="Sueño hoy"
              value={totalRestToday}
              refMin={sleepRef.sleepHoursMin * 60}
              refMax={sleepRef.sleepHoursMax * 60}
              refLabel={`${sleepRef.sleepHoursMin}–${sleepRef.sleepHoursMax} h`}
              formatValue={(v) => formatMinutes(v)}
            />
          )}

          {reference && (
            <p className="text-xs text-gray-400 leading-relaxed">
              ℹ️ Los ml incluyen jeringa-dedo (medido) + biberón (medido) + pecho estimado (~), un promedio orientativo. Las horas de sueño son orientativas por edad.
            </p>
          )}
        </div>
      )}

      {/* Averages */}
      {(avgGap !== null || avgMl !== null || avgRest !== null || avgAwakeWindow !== null || totalRestToday > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Medias del día
          </h3>
          <div className="space-y-2">
            {avgGap !== null && (
              <AverageRow icon="⏱" label="Entre tomas" value={formatMinutes(avgGap)} />
            )}
            {avgMl !== null && (
              <AverageRow icon="💧" label="ml por toma (total)" value={`${avgMl} ml`} />
            )}
            {avgRest !== null && (
              <AverageRow icon="🌙" label="Duración sueño medio" value={formatMinutes(avgRest)} />
            )}
            {avgAwakeWindow !== null && (
              <AverageRow icon="⏳" label="Ventana de sueño medio" value={formatMinutes(avgAwakeWindow)} />
            )}
            {totalRestToday > 0 && (
              <AverageRow icon="🌙" label="Dormido hoy" value={formatMinutes(totalRestToday)} />
            )}
            {siestasHoy > 0 && (
              <AverageRow icon="💤" label="Siestas hoy" value={String(siestasHoy)} />
            )}
            {nocturnosHoy > 0 && (
              <AverageRow icon="🌙" label="Sueños nocturnos hoy" value={String(nocturnosHoy)} />
            )}
          </div>
        </div>
      )}

      <ExtractionsInsightCard extractions={extractions} avgFeedsTarget={avgFeedsTarget} reference={reference} />
    </div>
  );
}
