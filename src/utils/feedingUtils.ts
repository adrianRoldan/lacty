import type { Feeding, Rest, TimelineItem, DiaperChange, VitaminDLog, ProbioticLog, MassageLog } from '../types';
import { isSameDay, todayIso, localDateOf } from './dateUtils';
import { getReferenceForDay } from '../data/referenceTable';

function isFeedingInProgress(f: Feeding): boolean {
  if (f.endTime) return false;
  return (f.hasBreast && f.breastMinLeft == null && f.breastMinRight == null) ||
         (f.hasBottle && f.bottleMl == null) ||
         (f.hasSupplement && f.supplementMl == null);
}

export function getTodayFeedings(feedings: Feeding[]): Feeding[] {
  const today = todayIso();
  return feedings
    .filter((f) => isSameDay(f.timestamp, today) || isFeedingInProgress(f))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getTotalSupplementMl(feedings: Feeding[]): number {
  return feedings.reduce((sum, f) => sum + (f.supplementMl ?? 0), 0);
}

export function getTotalBottleMl(feedings: Feeding[]): number {
  return feedings.reduce((sum, f) => sum + (f.bottleMl ?? 0), 0);
}

export function getTotalBreastMinutes(feedings: Feeding[]): number {
  return feedings.reduce(
    (sum, f) => sum + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0),
    0
  );
}

export function getTotalEstimatedBreastMl(feedings: Feeding[]): number {
  return feedings.reduce((sum, f) => sum + (f.breastEstimatedMl ?? 0), 0);
}

/**
 * Estima los ml transferidos en una toma de pecho según su duración real.
 * Usa la media histórica de minutos por toma del propio bebé como referencia.
 * Con < 3 tomas completadas en el historial cae al estimado fijo de la referencia.
 * Devuelve null si no hay datos de referencia para ese rango de edad.
 */
export function calcBreastEstimatedMl(
  daysOfLife: number,
  currentMinutes: number,
  historicalFeedings: Feeding[]
): number | null {
  if (currentMinutes <= 0) return null;
  const ref = getReferenceForDay(daysOfLife);
  if (!ref?.breastDailyMlMin || !ref?.breastDailyMlMax) return null;

  const mlPerAvgFeed = (ref.breastDailyMlMin + ref.breastDailyMlMax) / 2
    / ((ref.feedsPerDayMin + ref.feedsPerDayMax) / 2);
  const maxMlPerFeed = Math.round(ref.breastDailyMlMax / ref.feedsPerDayMin);

  const completedBreast = historicalFeedings.filter(
    (f) => f.hasBreast && ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0
  );

  if (completedBreast.length < 3) {
    return Math.round(mlPerAvgFeed);
  }

  const avgMin = completedBreast.reduce(
    (s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0
  ) / completedBreast.length;

  const estimated = Math.round(mlPerAvgFeed * (currentMinutes / avgMin));
  return Math.max(1, Math.min(estimated, maxMlPerFeed));
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

// Average ml per feeding (only feedings that recorded any ml).
export function getAvgSupplementMl(feedings: Feeding[]): number | null {
  const withMl = feedings.filter(
    (f) => (f.supplementMl != null && f.supplementMl > 0) || (f.bottleMl != null && f.bottleMl > 0) || (f.breastEstimatedMl != null && f.breastEstimatedMl > 0)
  );
  if (withMl.length === 0) return null;
  const total = withMl.reduce((s, f) => s + (f.supplementMl ?? 0) + (f.bottleMl ?? 0) + (f.breastEstimatedMl ?? 0), 0);
  return Math.round(total / withMl.length);
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

// Ventana de sueño media: minutos despierto entre el final de un sueño y el
// inicio del siguiente. Solo considera sueños completados (con endTime).
export function getAvgAwakeWindowMinutes(rests: Rest[]): number | null {
  const completed = [...rests]
    .filter((r) => r.endTime != null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (completed.length < 2) return null;
  let total = 0;
  let count = 0;
  for (let i = 1; i < completed.length; i++) {
    const gap = (new Date(completed[i].startTime).getTime() - new Date(completed[i - 1].endTime!).getTime()) / 60000;
    if (gap >= 0) { total += gap; count++; }
  }
  return count > 0 ? Math.round(total / count) : null;
}

export function getRestDurationMinutes(rest: Rest): number | null {
  if (!rest.endTime) return null;
  return Math.round(
    (new Date(rest.endTime).getTime() - new Date(rest.startTime).getTime()) / 60000
  );
}

/**
 * Minutos de un sueño que caen DENTRO de un día concreto (ISO local "YYYY-MM-DD").
 * Reparte los sueños que cruzan la medianoche: cada día recibe solo su parte.
 * Si el sueño no ha terminado, usa `now` como fin.
 */
export function restMinutesOnDay(rest: Rest, isoDay: string, now: number = Date.now()): number {
  const start = new Date(rest.startTime).getTime();
  const end = rest.endTime ? new Date(rest.endTime).getTime() : now;
  const dayStart = new Date(isoDay + 'T00:00:00').getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const overlapStart = Math.max(start, dayStart);
  const overlapEnd = Math.min(end, dayEnd);
  if (overlapEnd <= overlapStart) return 0;
  return Math.round((overlapEnd - overlapStart) / 60000);
}

/**
 * Lista de días locales ("YYYY-MM-DD") que abarca un sueño, de inicio a fin.
 * Para sueños en curso, hasta `now`.
 */
export function restSpanDays(rest: Rest, now: number = Date.now()): string[] {
  const startDay = localDateOf(rest.startTime);
  const endDay = localDateOf(rest.endTime ?? new Date(now).toISOString());
  const days = [startDay];
  const cursor = new Date(startDay + 'T12:00:00');
  while (localDateOf(cursor.toISOString()) < endDay) {
    cursor.setDate(cursor.getDate() + 1);
    days.push(localDateOf(cursor.toISOString()));
  }
  return days;
}

/**
 * Minutos que el bebé lleva despierto desde que terminó la última siesta.
 * Devuelve null si está durmiendo ahora (siesta en curso) o si no hay siestas
 * completadas registradas (en ambos casos no procede avisar).
 */
export function getAwakeMinutes(rests: Rest[]): number | null {
  if (rests.some((r) => r.endTime == null)) return null;
  const endedTimes = rests
    .filter((r) => r.endTime != null)
    .map((r) => new Date(r.endTime!).getTime());
  if (endedTimes.length === 0) return null;
  const lastEnded = Math.max(...endedTimes);
  return Math.floor((Date.now() - lastEnded) / 60000);
}

export function getTodayRestMinutes(rests: Rest[]): number {
  const today = todayIso();
  // Cuenta solo la parte de cada sueño que cae en el día de hoy (los que
  // cruzan medianoche aportan únicamente su tramo de hoy).
  return rests.reduce((sum, r) => sum + restMinutesOnDay(r, today), 0);
}

export function getTodayDiapers(diapers: DiaperChange[], day?: string): DiaperChange[] {
  const d = day ?? todayIso();
  return diapers.filter((diaper) => isSameDay(diaper.timestamp, d));
}

export interface CareLogInputs {
  vitaminDLogs?: VitaminDLog[];
  vitaminDLabel?: string;
  probioticLogs?: ProbioticLog[];
  probioticLabel?: string;
  massageLogs?: MassageLog[];
}

function buildCareItems(careLogs: CareLogInputs): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const l of careLogs.vitaminDLogs ?? []) {
    items.push({
      type: 'care',
      data: { id: `vitd-${l.id}`, icon: '💊', label: `Administrado ${careLogs.vitaminDLabel || 'Vitamina D3'}`, timestamp: l.givenAt },
      sortKey: l.givenAt,
    });
  }
  for (const l of careLogs.probioticLogs ?? []) {
    items.push({
      type: 'care',
      data: { id: `prob-${l.id}`, icon: '🦠', label: `Administrado ${careLogs.probioticLabel || 'Probiótico'}`, timestamp: l.givenAt },
      sortKey: l.givenAt,
    });
  }

  // Numerar los masajes según su orden dentro de cada día (Masaje #1, #2, ...)
  const massagesByDate = new Map<string, MassageLog[]>();
  for (const m of careLogs.massageLogs ?? []) {
    if (!massagesByDate.has(m.date)) massagesByDate.set(m.date, []);
    massagesByDate.get(m.date)!.push(m);
  }
  for (const dayMassages of massagesByDate.values()) {
    const sorted = [...dayMassages].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
    sorted.forEach((m, idx) => {
      items.push({
        type: 'care',
        data: { id: `mas-${m.id}`, icon: '👅', label: `Masaje #${idx + 1} realizado`, timestamp: m.performedAt },
        sortKey: m.performedAt,
      });
    });
  }

  return items;
}

export function buildTimeline(
  feedings: Feeding[],
  rests: Rest[],
  diapers: DiaperChange[],
  careLogs?: CareLogInputs,
  dayFilter?: string
): TimelineItem[] {
  const day = dayFilter ?? todayIso();
  const items: TimelineItem[] = [
    ...feedings
      .filter((f) => isSameDay(f.timestamp, day) || (!dayFilter && isFeedingInProgress(f)))
      .map((f) => ({ type: 'feeding' as const, data: f, sortKey: f.timestamp })),
    ...rests
      .filter((r) => isSameDay(r.startTime, day) || (!dayFilter && r.endTime == null))
      .map((r) => ({ type: 'rest' as const, data: r, sortKey: r.startTime })),
    ...diapers
      .filter((d) => isSameDay(d.timestamp, day))
      .map((d) => ({ type: 'diaper' as const, data: d, sortKey: d.timestamp })),
    ...buildCareItems(careLogs ?? {}).filter((c) => isSameDay(c.sortKey, day)),
  ];
  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
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

export interface HistorySummary {
  totalDays: number;
  avgFeedingsPerDay: number;
  avgBreastFeedsPerDay: number;  // tomas de pecho / días con pecho
  avgBottleFeedsPerDay: number;  // tomas de biberón / días con biberón
  avgSyringeFeedsPerDay: number; // tomas de jeringa / días con jeringa
  avgTotalMlPerDay: number;
  avgTotalMlPerFeeding: number;
  avgBreastMinPerDay: number;
  avgRestMinutes: number;
  avgRestMinPerDay: number;
  avgSleepsPerDay: number; // nº de sueños/siestas por día con sueño
  avgAwakeWindowMin: number; // ventana de sueño media (minutos despierto entre siestas)
}

export function getHistorySummary(feedings: Feeding[], rests: Rest[]): HistorySummary | null {
  if (feedings.length === 0 && rests.length === 0) return null;

  // Unique days with feedings
  const feedingDays = new Set(feedings.map((f) => localDateOf(f.timestamp)));
  const totalDays = feedingDays.size || 1;

  const avgFeedingsPerDay = feedingDays.size > 0
    ? Math.round((feedings.length / feedingDays.size) * 10) / 10
    : 0;

  // Days with any ml recorded (jeringa, biberón, or breast estimated)
  const mlFeedings = feedings.filter(
    (f) => (f.supplementMl != null && f.supplementMl > 0) || (f.bottleMl != null && f.bottleMl > 0) || (f.breastEstimatedMl != null && f.breastEstimatedMl > 0)
  );
  const mlDays = new Set(mlFeedings.map((f) => localDateOf(f.timestamp)));
  const totalMl = mlFeedings.reduce((s, f) => s + (f.supplementMl ?? 0) + (f.bottleMl ?? 0) + (f.breastEstimatedMl ?? 0), 0);
  const avgTotalMlPerDay = mlDays.size > 0
    ? Math.round(totalMl / mlDays.size)
    : 0;
  const avgTotalMlPerFeeding = mlFeedings.length > 0
    ? Math.round(totalMl / mlFeedings.length)
    : 0;

  // Breast vs bottle vs syringe feed counts
  const breastFeedings = feedings.filter((f) => f.hasBreast);
  const bottleFeedings = feedings.filter((f) => f.hasBottle && (f.bottleMl ?? 0) > 0);
  const syringeFeedings = feedings.filter((f) => f.hasSupplement && (f.supplementMl ?? 0) > 0);
  const breastFeedDays = new Set(breastFeedings.map((f) => localDateOf(f.timestamp)));
  const bottleFeedDays = new Set(bottleFeedings.map((f) => localDateOf(f.timestamp)));
  const syringeFeedDays = new Set(syringeFeedings.map((f) => localDateOf(f.timestamp)));
  const avgBreastFeedsPerDay = breastFeedDays.size > 0
    ? Math.round((breastFeedings.length / breastFeedDays.size) * 10) / 10
    : 0;
  const avgBottleFeedsPerDay = bottleFeedDays.size > 0
    ? Math.round((bottleFeedings.length / bottleFeedDays.size) * 10) / 10
    : 0;
  const avgSyringeFeedsPerDay = syringeFeedDays.size > 0
    ? Math.round((syringeFeedings.length / syringeFeedDays.size) * 10) / 10
    : 0;

  // Days with breast recorded
  const breastDays = new Set(
    feedings
      .filter((f) => f.hasBreast && ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0)
      .map((f) => localDateOf(f.timestamp))
  );
  const totalBreastMin = feedings.reduce(
    (s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0
  );
  const avgBreastMinPerDay = breastDays.size > 0
    ? Math.round(totalBreastMin / breastDays.size)
    : 0;

  // Sueño: duración media por siesta (completa) y media por día.
  // Los sueños que cruzan medianoche reparten sus minutos en cada día.
  const completedRests = rests.filter((r) => r.endTime != null);
  const totalRestMin = completedRests.reduce(
    (s, r) => s + (getRestDurationMinutes(r) ?? 0), 0
  );
  const avgRestMinutes = completedRests.length > 0
    ? Math.round(totalRestMin / completedRests.length)
    : 0;
  // Minutos y nº de sueños atribuidos a cada día (partiendo en medianoche).
  const restMinByDay = new Map<string, number>();
  const restCountByDay = new Map<string, number>();
  for (const r of completedRests) {
    for (const day of restSpanDays(r)) {
      const mins = restMinutesOnDay(r, day);
      if (mins <= 0) continue;
      restMinByDay.set(day, (restMinByDay.get(day) ?? 0) + mins);
      restCountByDay.set(day, (restCountByDay.get(day) ?? 0) + 1);
    }
  }
  const restDayCount = restMinByDay.size;
  const totalRestMinByDay = [...restMinByDay.values()].reduce((s, m) => s + m, 0);
  const avgRestMinPerDay = restDayCount > 0
    ? Math.round(totalRestMinByDay / restDayCount)
    : 0;
  const totalSleepsByDay = [...restCountByDay.values()].reduce((s, n) => s + n, 0);
  const avgSleepsPerDay = restDayCount > 0
    ? Math.round((totalSleepsByDay / restDayCount) * 10) / 10
    : 0;
  const avgAwakeWindowMin = getAvgAwakeWindowMinutes(rests) ?? 0;

  return { totalDays, avgFeedingsPerDay, avgBreastFeedsPerDay, avgBottleFeedsPerDay, avgSyringeFeedsPerDay, avgTotalMlPerDay, avgTotalMlPerFeeding, avgBreastMinPerDay, avgRestMinutes, avgRestMinPerDay, avgSleepsPerDay, avgAwakeWindowMin };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function groupTimelineByDay(
  feedings: Feeding[],
  rests: Rest[],
  diapers: DiaperChange[],
  careLogs?: CareLogInputs
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
  for (const d of diapers) {
    const day = localDateOf(d.timestamp);
    if (!groups[day]) groups[day] = [];
    groups[day].push({ type: 'diaper', data: d, sortKey: d.timestamp });
  }
  for (const c of buildCareItems(careLogs ?? {})) {
    const day = localDateOf(c.sortKey);
    if (!groups[day]) groups[day] = [];
    groups[day].push(c);
  }

  for (const day of Object.keys(groups)) {
    groups[day].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }

  return groups;
}
