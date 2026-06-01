// Tabla de referencia orientativa de alimentación por días de vida.
// Valores basados en guías pediátricas habituales (OMS/UNICEF y protocolos de suplementación).
// IMPORTANTE: Son valores orientativos. No constituyen diagnóstico médico.
// Edita este archivo para ajustar los rangos si tu pediatra, matrona o asesora de lactancia
// te indica valores distintos.

export interface FeedingReference {
  dayFrom: number;
  dayTo: number;
  mlPerFeedMin: number;
  mlPerFeedMax: number;
  feedsPerDayMin: number;
  feedsPerDayMax: number;
  // Populated when calculated from weight (día 7+)
  isWeightBased?: boolean;
  dailyMlMin?: number;
  dailyMlMax?: number;
}

export const FEEDING_REFERENCE: FeedingReference[] = [
  { dayFrom: 1,  dayTo: 1,  mlPerFeedMin: 5,   mlPerFeedMax: 10,  feedsPerDayMin: 8, feedsPerDayMax: 12 },
  { dayFrom: 2,  dayTo: 2,  mlPerFeedMin: 10,  mlPerFeedMax: 20,  feedsPerDayMin: 8, feedsPerDayMax: 12 },
  { dayFrom: 3,  dayTo: 3,  mlPerFeedMin: 20,  mlPerFeedMax: 30,  feedsPerDayMin: 8, feedsPerDayMax: 12 },
  { dayFrom: 4,  dayTo: 7,  mlPerFeedMin: 30,  mlPerFeedMax: 60,  feedsPerDayMin: 8, feedsPerDayMax: 12 },
  { dayFrom: 8,  dayTo: 14, mlPerFeedMin: 60,  mlPerFeedMax: 90,  feedsPerDayMin: 8, feedsPerDayMax: 12 },
  { dayFrom: 15, dayTo: 28, mlPerFeedMin: 80,  mlPerFeedMax: 120, feedsPerDayMin: 8, feedsPerDayMax: 10 },
  { dayFrom: 29, dayTo: 60, mlPerFeedMin: 100, mlPerFeedMax: 150, feedsPerDayMin: 7, feedsPerDayMax: 9  },
  { dayFrom: 61, dayTo: 90, mlPerFeedMin: 120, mlPerFeedMax: 180, feedsPerDayMin: 6, feedsPerDayMax: 8  },
];

export function getReferenceForDay(daysOfLife: number): FeedingReference | null {
  return FEEDING_REFERENCE.find(
    (r) => daysOfLife >= r.dayFrom && daysOfLife <= r.dayTo
  ) ?? null;
}

/**
 * Returns the best available reference for the given day and optional weight.
 *
 * - Days 1–6: always day-based table (stomach capacity is the limiting factor,
 *   not total daily intake).
 * - Day 7+: if weightKg is provided, uses the standard 150–180 ml/kg/day
 *   formula (WHO/AAP). Falls back to the day-based table otherwise.
 */
export function getEffectiveReference(
  daysOfLife: number,
  weightKg?: number
): FeedingReference | null {
  // First week: stomach-size table is more relevant than weight
  if (daysOfLife < 7 || !weightKg || weightKg <= 0) {
    return getReferenceForDay(daysOfLife);
  }

  const dayRef = getReferenceForDay(daysOfLife);
  const feedsMin = dayRef?.feedsPerDayMin ?? 6;
  const feedsMax = dayRef?.feedsPerDayMax ?? 9;

  // Standard formula: 150–180 ml/kg/day for term infants
  const dailyMlMin = Math.round(weightKg * 150);
  const dailyMlMax = Math.round(weightKg * 180);

  // Per-feed range: min ml = daily_min / most_feeds; max ml = daily_max / fewest_feeds
  const mlPerFeedMin = Math.round(dailyMlMin / feedsMax);
  const mlPerFeedMax = Math.round(dailyMlMax / feedsMin);

  return {
    dayFrom: daysOfLife,
    dayTo: daysOfLife,
    mlPerFeedMin,
    mlPerFeedMax,
    feedsPerDayMin: feedsMin,
    feedsPerDayMax: feedsMax,
    isWeightBased: true,
    dailyMlMin,
    dailyMlMax,
  };
}
