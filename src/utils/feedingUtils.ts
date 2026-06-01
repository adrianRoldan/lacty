import type { Feeding, Rest, TimelineItem } from '../types';
import { isSameDay, todayIso, localDateOf } from './dateUtils';

export function getTodayFeedings(feedings: Feeding[]): Feeding[] {
  const today = todayIso();
  return feedings
    .filter((f) => isSameDay(f.timestamp, today))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getTotalSupplementMl(feedings: Feeding[]): number {
  return feedings.reduce((sum, f) => sum + (f.supplementMl ?? 0), 0);
}

export function getTotalBreastMinutes(feedings: Feeding[]): number {
  return feedings.reduce(
    (sum, f) => sum + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0),
    0
  );
}

// Average gap in minutes between consecutive feedings (sorted). Returns null if < 2 feedings.
export function getAvgGapMinutes(feedings: Feeding[]): number | null {
  const sorted = [...feedings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (sorted.length < 2) return null;
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += (new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime()) / 60000;
  }
  return Math.round(total / (sorted.length - 1));
}

// Average ml per feeding (only feedings that recorded supplement ml).
export function getAvgSupplementMl(feedings: Feeding[]): number | null {
  const withMl = feedings.filter((f) => f.supplementMl != null && f.supplementMl > 0);
  if (withMl.length === 0) return null;
  return Math.round(withMl.reduce((s, f) => s + (f.supplementMl ?? 0), 0) / withMl.length);
}

// Average completed rest duration in minutes. Returns null if no completed rests.
export function getAvgRestMinutes(rests: Rest[]): number | null {
  const completed = rests.filter((r) => r.endTime != null);
  if (completed.length === 0) return null;
  const total = completed.reduce((s, r) => {
    const d = Math.round((new Date(r.endTime!).getTime() - new Date(r.startTime).getTime()) / 60000);
    return s + d;
  }, 0);
  return Math.round(total / completed.length);
}

export function getRestDurationMinutes(rest: Rest): number | null {
  if (!rest.endTime) return null;
  return Math.round(
    (new Date(rest.endTime).getTime() - new Date(rest.startTime).getTime()) / 60000
  );
}

export function getTodayRestMinutes(rests: Rest[]): number {
  const today = todayIso();
  return rests
    .filter((r) => isSameDay(r.startTime, today))
    .reduce((sum, r) => sum + (getRestDurationMinutes(r) ?? 0), 0);
}

export function buildTimeline(
  feedings: Feeding[],
  rests: Rest[],
  dayFilter?: string
): TimelineItem[] {
  const day = dayFilter ?? todayIso();
  const items: TimelineItem[] = [
    ...feedings
      .filter((f) => isSameDay(f.timestamp, day))
      .map((f) => ({ type: 'feeding' as const, data: f, sortKey: f.timestamp })),
    ...rests
      .filter((r) => isSameDay(r.startTime, day))
      .map((r) => ({ type: 'rest' as const, data: r, sortKey: r.startTime })),
  ];
  return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export interface RestCorrelationRow {
  label: string;
  mlMin: number;
  mlMax: number;
  count: number;
  avgRestMinutes: number;
}

export function getRestCorrelation(
  feedings: Feeding[],
  rests: Rest[]
): RestCorrelationRow[] {
  const ranges = [
    { label: '1–10 ml',  mlMin: 1,  mlMax: 10  },
    { label: '11–20 ml', mlMin: 11, mlMax: 20  },
    { label: '21–35 ml', mlMin: 21, mlMax: 35  },
    { label: '36–60 ml', mlMin: 36, mlMax: 60  },
    { label: '61–90 ml', mlMin: 61, mlMax: 90  },
    { label: '91+ ml',   mlMin: 91, mlMax: Infinity },
  ];

  // For each completed rest, find the last feeding with supplement before it
  const pairs = rests
    .filter((r) => r.endTime != null)
    .map((r) => {
      const duration = getRestDurationMinutes(r)!;
      const prior = feedings
        .filter((f) => f.supplementMl != null && f.timestamp < r.startTime)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return prior ? { ml: prior.supplementMl!, restMin: duration } : null;
    })
    .filter((p): p is { ml: number; restMin: number } => p !== null);

  return ranges
    .map((r) => {
      const matching = pairs.filter((p) => p.ml >= r.mlMin && p.ml <= r.mlMax);
      const avg =
        matching.length > 0
          ? Math.round(matching.reduce((s, p) => s + p.restMin, 0) / matching.length)
          : 0;
      return { ...r, count: matching.length, avgRestMinutes: avg };
    })
    .filter((r) => r.count > 0);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function groupTimelineByDay(
  feedings: Feeding[],
  rests: Rest[]
): Record<string, TimelineItem[]> {
  const groups: Record<string, TimelineItem[]> = {};

  for (const f of feedings) {
    const day = localDateOf(f.timestamp);
    if (!groups[day]) groups[day] = [];
    groups[day].push({ type: 'feeding', data: f, sortKey: f.timestamp });
  }
  for (const r of rests) {
    const day = localDateOf(r.startTime);
    if (!groups[day]) groups[day] = [];
    groups[day].push({ type: 'rest', data: r, sortKey: r.startTime });
  }

  for (const day of Object.keys(groups)) {
    groups[day].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  return groups;
}
