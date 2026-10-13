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

export const ULTIMO_DIA_TABLA: number;

export const MAX_ENTRE_TOMAS_FUERA_DE_TABLA_MIN: number;

export const MIN_SIN_COMER_DE_NOCHE_MIN: number;
export const NOCHE_INICIO_POR_DEFECTO: string;
export const NOCHE_FIN_POR_DEFECTO: string;

/** ¿Cae esta hora dentro de la franja nocturna («HH:MM» a «HH:MM»)? */
export function esFranjaNocturna(fecha: Date, inicio?: string, fin?: string): boolean;

/** Minutos máximos sin comer antes de avisar, según los días de vida y si es de noche. */
export function maxMinutosEntreTomas(diasDeVida: number, opciones?: { deNoche?: boolean }): number;

/** Ventana de vigilia máxima (minutos) según los días de vida. */
export function ventanaVigiliaMaxima(diasDeVida: number): number;

export const WEIGHT_FORMULA: {
  mlPerKgMin: number;
  mlPerKgMax: number;
  desdeDia: number;
  /** Tope diario (AAP): no más de unos 960 ml en 24 h. */
  maxDailyMl: number;
};

export const REFERENCE_SOURCES: {
  bloque: string;
  detalle: string;
  fuentes: { texto: string; url: string }[];
}[];
