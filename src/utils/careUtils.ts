import type { BabyConfig } from '../types';
import { getBirthDate } from './dateUtils';

/**
 * Valores por defecto y cálculos de los cuidados configurables.
 *
 * Antes estaban repetidos como números sueltos en DailySummary, BabyProfile,
 * FeedingList y el servidor, lo que hacía imposible que la familia los
 * cambiara. Aquí viven una sola vez y respetan lo que haya configurado.
 */

/** Masajes al día del protocolo post-frenectomía. */
export const MASAJES_POR_DIA_POR_DEFECTO = 5;

/** Duración habitual del protocolo de masajes, en días. */
export const DIAS_DE_MASAJES_POR_DEFECTO = 21;

export function massagesPerDay(config: Pick<BabyConfig, 'frenectomyMassagesPerDay'>): number {
  const n = config.frenectomyMassagesPerDay;
  return n != null && n > 0 ? n : MASAJES_POR_DIA_POR_DEFECTO;
}

const sumarDias = (iso: string, dias: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const sumarAnios = (iso: string, anios: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setFullYear(d.getFullYear() + anios);
  return d.toISOString().slice(0, 10);
};

/** Último día de masajes: el configurado o, si no, 21 días tras la intervención. */
export function frenectomyEndDate(
  config: Pick<BabyConfig, 'frenectomyDate' | 'frenectomyEndDate'>
): string | null {
  if (config.frenectomyEndDate) return config.frenectomyEndDate;
  if (!config.frenectomyDate) return null;
  return sumarDias(config.frenectomyDate, DIAS_DE_MASAJES_POR_DEFECTO);
}

/** Fecha de fin sugerida al activar la frenectomía, para precargar el campo. */
export function suggestedFrenectomyEnd(frenectomyDate: string): string {
  return sumarDias(frenectomyDate, DIAS_DE_MASAJES_POR_DEFECTO);
}

/** ¿Sigue vigente el protocolo de masajes en la fecha dada? */
export function isFrenectomyActive(config: BabyConfig, day = todayIsoLocal()): boolean {
  if (!config.frenectomyEnabled || !config.frenectomyDate) return false;
  const fin = frenectomyEndDate(config);
  return fin != null && day >= config.frenectomyDate && day <= fin;
}

/**
 * Último día de administración de vitamina D: el configurado o, si no, hasta
 * que el bebé cumple un año, que es la pauta habitual.
 */
export function vitaminDEndDate(config: BabyConfig): string | null {
  if (config.vitaminDEndDate) return config.vitaminDEndDate;
  const nacimiento = getBirthDate(config);
  return nacimiento ? sumarAnios(nacimiento, 1) : null;
}

/** Fecha de fin sugerida al activar la vitamina D, para precargar el campo. */
export function suggestedVitaminDEnd(birthDate: string): string {
  return sumarAnios(birthDate, 1);
}

/** ¿Sigue vigente la vitamina D? Sin fecha de fin se considera indefinida. */
export function isVitaminDActive(config: BabyConfig, day = todayIsoLocal()): boolean {
  if (!config.vitaminDEnabled) return false;
  const fin = vitaminDEndDate(config);
  return fin == null || day <= fin;
}

/**
 * Horas recomendadas para repartir los masajes entre la primera y la última
 * toma del día, distribuidas de forma uniforme.
 */
export function getRecommendedMassageTimes(startTime: string, endTime: string, count: number): string[] {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toStr = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const start = toMin(startTime);
  const end = toMin(endTime);
  if (count <= 1) return [toStr(start)];
  const interval = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => toStr(Math.round(start + interval * i)));
}

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
