// Piezas visuales compartidas por las tarjetas de "Medias del día" (barra de
// progreso con semáforo y fila de media simple). Viven aparte para que se
// puedan reutilizar fuera de DayInsights, como en ExtractionsInsightCard.

export type Level = 'empty' | 'low' | 'mid' | 'ok' | 'over';

export function getLevel(value: number, min: number, max: number): Level {
  if (value === 0) return 'empty';
  if (value < min * 0.5) return 'low';
  if (value < min) return 'mid';
  if (value <= max) return 'ok';
  return 'over';
}

export const LEVEL_COLORS: Record<Level, { bar: string; text: string; bg: string }> = {
  empty: { bar: 'bg-gray-200',   text: 'text-gray-400',   bg: 'bg-gray-50'    },
  low:   { bar: 'bg-red-400',    text: 'text-red-600',    bg: 'bg-red-50'     },
  mid:   { bar: 'bg-amber-400',  text: 'text-amber-600',  bg: 'bg-amber-50'   },
  ok:    { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'   },
  over:  { bar: 'bg-sage-500',   text: 'text-sage-700',   bg: 'bg-sage-50'    },
};

export const LEVEL_LABELS: Record<Level, string> = {
  empty: 'sin datos',
  low:   'lejos',
  mid:   'cerca',
  ok:    'en rango',
  over:  'superado',
};

export function ProgressRow({
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

export function AverageRow({ icon, label, value }: { icon: string; label: string; value: string }) {
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
