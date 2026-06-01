import type { Feeding, Rest } from '../types';
import type { FeedingReference } from '../data/referenceTable';
import {
  getTotalSupplementMl,
  getAvgGapMinutes,
  getAvgSupplementMl,
  getAvgRestMinutes,
} from '../utils/feedingUtils';
import { formatMinutes } from '../utils/dateUtils';

interface Props {
  feedings: Feeding[];
  rests: Rest[];
  reference: FeedingReference | null;
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
  over:  { bar: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50'    },
};

const LEVEL_LABELS: Record<Level, string> = {
  empty: 'sin datos',
  low:   'lejos',
  mid:   'cerca',
  ok:    'en rango',
  over:  'superado',
};

export default function DayInsights({ feedings, rests, reference }: Props) {
  const totalMl = getTotalSupplementMl(feedings);
  const totalFeedings = feedings.length;
  const avgGap = getAvgGapMinutes(feedings);
  const avgMl = getAvgSupplementMl(feedings);
  const avgRest = getAvgRestMinutes(rests);

  const hasAnyData = totalFeedings > 0 || rests.length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Progress: tomas y ml (only when reference available) */}
      {reference && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Progreso del día
          </h3>

          <ProgressRow
            label="Tomas"
            value={totalFeedings}
            unit="tomas"
            refMin={reference.feedsPerDayMin}
            refMax={reference.feedsPerDayMax}
            formatValue={(v) => String(v)}
          />

          <ProgressRow
            label="Jeringa-dedo registrado"
            value={totalMl}
            unit="ml"
            refMin={reference.dailyMlMin ?? reference.mlPerFeedMin * reference.feedsPerDayMin}
            refMax={reference.dailyMlMax ?? reference.mlPerFeedMax * reference.feedsPerDayMax}
            formatValue={(v) => `${v} ml`}
          />

          <p className="text-xs text-gray-400 leading-relaxed">
            ℹ️ La referencia es de leche total (pecho + jeringa + biberón). La jeringa-dedo registrada es lo medible; la leche de pecho suma aunque no aparezca aquí en ml.
          </p>
        </div>
      )}

      {/* Averages */}
      {(avgGap !== null || avgMl !== null || avgRest !== null) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Medias del día
          </h3>
          <div className="space-y-2">
            {avgGap !== null && (
              <AverageRow icon="⏱" label="Entre tomas" value={formatMinutes(avgGap)} />
            )}
            {avgMl !== null && (
              <AverageRow icon="💉" label="ml por toma" value={`${avgMl} ml`} />
            )}
            {avgRest !== null && (
              <AverageRow icon="😴" label="Duración descanso" value={formatMinutes(avgRest)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  label, value, refMin, refMax, formatValue,
}: {
  label: string;
  value: number;
  unit: string;
  refMin: number;
  refMax: number;
  formatValue: (v: number) => string;
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
          <span className="text-xs text-gray-400">/ {refMin}–{refMax}</span>
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
