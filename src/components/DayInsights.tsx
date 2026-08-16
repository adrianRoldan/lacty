import type { Feeding, Rest } from '../types';
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
}

// Semaphore levels for the progress bars
type Level = 'empty' | 'low' | 'mid' | 'ok' | 'over';

function getLevel(value: number, min: number, max: number): Level {
  if (value === 0) return 'empty';
  if (value < min * 0.5) return 'low';
  if (value < min) return 'mid';
  if (value <= max) return 'ok';
  return 'over';
}

const LEVEL_COLORS: Record<Level, { bar: string; text: string; bg: string }> = {
  empty: { bar: 'bg-gray-200',   text: 'text-gray-400',   bg: 'bg-gray-50'    },
  low:   { bar: 'bg-red-400',    text: 'text-red-600',    bg: 'bg-red-50'     },
  mid:   { bar: 'bg-amber-400',  text: 'text-amber-600',  bg: 'bg-amber-50'   },
  ok:    { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'   },
  over:  { bar: 'bg-sage-500',   text: 'text-sage-700',   bg: 'bg-sage-50'    },
};

const LEVEL_LABELS: Record<Level, string> = {
  empty: 'sin datos',
  low:   'lejos',
  mid:   'cerca',
  ok:    'en rango',
  over:  'superado',
};

export default function DayInsights({ feedings, rests, reference, sleepRef, todayRestMinutes, siestasHoy, nocturnosHoy }: Props) {
  const totalMl = getTotalSupplementMl(feedings) + getTotalBottleMl(feedings) + getTotalEstimatedBreastMl(feedings);
  const totalFeedings = feedings.length;
  const avgGap = getAvgGapMinutes(feedings);
  const avgMl = getAvgSupplementMl(feedings);
  const avgRest = getAvgRestMinutes(rests);
  const avgAwakeWindow = getAvgAwakeWindowMinutes(rests);
  const totalRestToday = todayRestMinutes;

  const hasAnyData = totalFeedings > 0 || rests.length > 0;
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
    </div>
  );
}

function ProgressRow({
  label, value, refMin, refMax, formatValue, refLabel,
}: {
  label: string;
  value: number;
  refMin: number;
  refMax: number;
  formatValue: (v: number) => string;
  refLabel?: string;
}) {
  const level = getLevel(value, refMin, refMax);
  const colors = LEVEL_COLORS[level];
  // Bar width relative to refMax, capped at 100%
  const fillPct = Math.min((value / refMax) * 100, 100);
  // Tick position for the minimum reference
  const minTickPct = (refMin / refMax) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${colors.text}`}>{formatValue(value)}</span>
          <span className="text-xs text-gray-400">/ {refLabel ?? `${refMin}–${refMax}`}</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {LEVEL_LABELS[level]}
          </span>
        </div>
      </div>
      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* Tick at refMin */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/70"
          style={{ left: `${minTickPct}%` }}
        />
      </div>
    </div>
  );
}

function AverageRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}
