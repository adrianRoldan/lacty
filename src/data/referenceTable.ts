// Referencia orientativa de alimentación y sueño.
//
// Los DATOS viven en lib/reference-data.mjs, que comparten la app y la página
// pública lacty.es/referencias. Aquí solo se añaden los tipos y los cálculos,
// para que un cambio de rangos no haya que hacerlo en dos sitios.
//
// IMPORTANTE: son valores orientativos. No constituyen diagnóstico médico.

import {
  FEEDING_REFERENCE as DATOS_ALIMENTACION,
  SLEEP_REFERENCE_FALLBACK as DATOS_SUENO_FUERA_DE_TABLA,
  WEIGHT_FORMULA,
} from '../../lib/reference-data.mjs';

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
  // Referencia de leche materna al pecho (ml/día) para estimación orientativa.
  // Días 8–28: 502–725 ml/día. A partir del primer mes la producción se
  // estabiliza en una meseta (~750–800 ml/día de media en LME), por lo que
  // los días 29–90 usan 600–900 ml/día como rango orientativo.
  breastDailyMlMin?: number;
  breastDailyMlMax?: number;
  // Sueño orientativo por EDAD (no depende del peso).
  // Fuente: guías habituales (National Sleep Foundation / AASM).
  sleepHoursMin?: number;
  sleepHoursMax?: number;
  // Ventana de vigilia máxima: minutos despierto antes de que toque dormir.
  awakeWindowMaxMin?: number;
}

export const FEEDING_REFERENCE: FeedingReference[] = DATOS_ALIMENTACION;

// Referencia de sueño para edades fuera de la tabla (>3 meses): orientativa.
export const SLEEP_REFERENCE_FALLBACK = DATOS_SUENO_FUERA_DE_TABLA;

export interface SleepReference {
  sleepHoursMin: number;
  sleepHoursMax: number;
  awakeWindowMaxMin: number;
}

/**
 * Devuelve la referencia de sueño orientativa para un día de vida dado.
 * El sueño se guía por edad (no por peso). Usa la tabla por tramos y, para
 * edades fuera de rango (>90 días), un fallback orientativo.
 */
export function getSleepReference(daysOfLife: number): SleepReference {
  const row = getReferenceForDay(daysOfLife);
  if (row?.sleepHoursMin != null && row.sleepHoursMax != null && row.awakeWindowMaxMin != null) {
    return {
      sleepHoursMin: row.sleepHoursMin,
      sleepHoursMax: row.sleepHoursMax,
      awakeWindowMaxMin: row.awakeWindowMaxMin,
    };
  }
  return { ...SLEEP_REFERENCE_FALLBACK };
}

export function getReferenceForDay(daysOfLife: number): FeedingReference | null {
  return FEEDING_REFERENCE.find(
    (r) => daysOfLife >= r.dayFrom && daysOfLife <= r.dayTo
  ) ?? null;
}

/**
 * Calcula los ml estimados por toma al pecho para un día de vida dado.
 * Usa los datos de referencia breastDailyMl divididos entre la media de tomas/día.
 * Devuelve null si no hay datos de referencia para ese rango de edad.
 */
export function getEstimatedBreastMlPerFeed(daysOfLife: number): number | null {
  const ref = getReferenceForDay(daysOfLife);
  if (!ref?.breastDailyMlMin || !ref?.breastDailyMlMax) return null;
  const dailyAvg = (ref.breastDailyMlMin + ref.breastDailyMlMax) / 2;
  const feedsAvg = (ref.feedsPerDayMin + ref.feedsPerDayMax) / 2;
  return Math.round(dailyAvg / feedsAvg);
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

  // Fórmula estándar para lactantes a término (ver lib/reference-data.mjs)
  const dailyMlMin = Math.round(weightKg * WEIGHT_FORMULA.mlPerKgMin);
  const dailyMlMax = Math.round(weightKg * WEIGHT_FORMULA.mlPerKgMax);

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
    // Mantener datos de referencia de pecho del rango de días base
    breastDailyMlMin: dayRef?.breastDailyMlMin,
    breastDailyMlMax: dayRef?.breastDailyMlMax,
  };
}
