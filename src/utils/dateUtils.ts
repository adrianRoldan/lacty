import type { BabyConfig } from '../types';

export function getCurrentDaysOfLife(config: BabyConfig): number {
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Preferir la fecha de nacimiento si está disponible (día de nacimiento = día 1)
  if (config.birthDate) {
    const birth = new Date(config.birthDate + 'T00:00:00');
    const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
    const diffDays = Math.floor((todayDay.getTime() - birthDay.getTime()) / 86400000);
    return diffDays + 1;
  }

  // Legacy: días de vida al configurar + días transcurridos
  const setup = new Date(config.setupDate);
  const setupDay = new Date(setup.getFullYear(), setup.getMonth(), setup.getDate());
  const diffDays = Math.floor((todayDay.getTime() - setupDay.getTime()) / 86400000);
  return config.daysOfLifeAtSetup + diffDays;
}

// Deriva la fecha de nacimiento (YYYY-MM-DD) de un bebé, ya sea de birthDate
// o calculándola desde el método legacy (setupDate - díasAlConfigurar).
export function getBirthDate(config: BabyConfig): string {
  if (config.birthDate) return config.birthDate;
  // Mediodía y fecha local: con medianoche, toISOString devolvía el día
  // anterior en cualquier zona al este de UTC (en España, siempre).
  const setup = new Date(config.setupDate + 'T12:00:00');
  setup.setDate(setup.getDate() - (config.daysOfLifeAtSetup - 1));
  return localDateString(setup.toISOString());
}

export function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatDateShort(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Returns the LOCAL calendar date of an ISO datetime string as "YYYY-MM-DD".
// Using getFullYear/Month/Date ensures local time, not UTC.
export function localDateOf(isoString: string): string {
  return localDateString(isoString);
}

function localDateString(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isSameDay(isoA: string, isoB: string): boolean {
  return localDateString(isoA) === localDateString(isoB);
}

// Returns today's LOCAL date as "YYYY-MM-DD".
export function todayIso(): string {
  return localDateString(new Date().toISOString());
}

/**
 * Etiqueta del día de inicio relativa al día bajo el que se lista un registro.
 * Devuelve null si empezó el mismo día (no hay nada que indicar), "ayer" si fue
 * el día anterior, o una fecha corta ("17 jun") para días más lejanos.
 * Pensado para marcar tomas/sueños en curso que arrancaron en un día anterior.
 */
export function startDayHint(startIso: string, listDayIso: string): string | null {
  const startDay = localDateString(startIso);
  if (startDay === listDayIso) return null;
  const a = new Date(startDay + 'T12:00:00').getTime();
  const b = new Date(listDayIso + 'T12:00:00').getTime();
  const diffDays = Math.round((b - a) / 86400000);
  if (diffDays === 1) return 'ayer';
  return new Date(startDay + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Formats a minute count as "X min" (<60) or "Xh Ym" (≥60).
export function formatMinutes(totalMin: number): string {
  if (totalMin === 0) return '0m';
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h 0m` : `${h}h ${m}m`;
}

// Formats baby age as "día X de vida" (<30 days) or "X mes(es) y Y semana(s) (Z días)" (≥30 days).
export function formatBabyAge(days: number): string {
  if (days < 7) return `día ${days} de vida`;
  if (days < 112) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    const wLabel = weeks === 1 ? 'semana' : 'semanas';
    return rem === 0 ? `${weeks} ${wLabel}` : `${weeks} ${wLabel} y ${rem} días`;
  }
  const months = Math.floor(days / 30);
  const remaining = days - months * 30;
  const weeks = Math.floor(remaining / 7);
  const mLabel = months === 1 ? 'mes' : 'meses';
  if (weeks === 0) return `${months} ${mLabel} (${days} días)`;
  const wLabel = weeks === 1 ? 'semana' : 'semanas';
  return `${months} ${mLabel} y ${weeks} ${wLabel} (${days} días)`;
}

// Minutes elapsed between two ISO timestamps. Returns null if negative or unknown.
export function gapMinutes(fromIso: string | undefined, toIso: string): number | null {
  if (!fromIso) return null;
  const diff = Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000
  );
  return diff >= 0 ? diff : null;
}
