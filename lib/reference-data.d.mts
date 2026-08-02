// Tipos de lib/reference-data.mjs, que es JavaScript plano para que también
// pueda importarlo el servidor (no pasa por el compilador de TypeScript).

export interface FeedingReferenceRow {
  dayFrom: number;
  dayTo: number;
  mlPerFeedMin: number;
  mlPerFeedMax: number;
  feedsPerDayMin: number;
  feedsPerDayMax: number;
  breastDailyMlMin?: number;
  breastDailyMlMax?: number;
  sleepHoursMin?: number;
  sleepHoursMax?: number;
  awakeWindowMaxMin?: number;
}

export const FEEDING_REFERENCE: FeedingReferenceRow[];

export const SLEEP_REFERENCE_FALLBACK: {
  sleepHoursMin: number;
  sleepHoursMax: number;
  awakeWindowMaxMin: number;
};

export const WEIGHT_FORMULA: {
  mlPerKgMin: number;
  mlPerKgMax: number;
  desdeDia: number;
};

export const REFERENCE_SOURCES: {
  bloque: string;
  detalle: string;
  organizaciones: string[];
}[];
