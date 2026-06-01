import type { BabyConfig } from '../types';

export function getCurrentDaysOfLife(config: BabyConfig): number {
  const setup = new Date(config.setupDate);
  const today = new Date();
  // Compare only calendar dates, ignoring time
  const setupDay = new Date(setup.getFullYear(), setup.getMonth(), setup.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayDay.getTime() - setupDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return config.daysOfLifeAtSetup + diffDays;
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

// Formats a minute count as "X min" (<60) or "Xh Ym" (≥60).
export function formatMinutes(totalMin: number): string {
  if (totalMin === 0) return '0';
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Minutes elapsed between two ISO timestamps. Returns null if negative or unknown.
export function gapMinutes(fromIso: string | undefined, toIso: string): number | null {
  if (!fromIso) return null;
  const diff = Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000
  );
  return diff >= 0 ? diff : null;
}
