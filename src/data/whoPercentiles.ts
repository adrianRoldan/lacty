export interface PercentileRow {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export const WEIGHT_BOYS: PercentileRow[] = [
  { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { month: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { month: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { month: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { month: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
];

export const WEIGHT_GIRLS: PercentileRow[] = [
  { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { month: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
  { month: 2, p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 },
  { month: 3, p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
  { month: 4, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 },
  { month: 5, p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 },
  { month: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
];

export const LENGTH_BOYS: PercentileRow[] = [
  { month: 0, p3: 46.1, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.7 },
  { month: 1, p3: 50.8, p15: 52.7, p50: 54.7, p85: 56.7, p97: 58.6 },
  { month: 2, p3: 54.4, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.4 },
  { month: 3, p3: 57.3, p15: 59.4, p50: 61.4, p85: 63.5, p97: 65.5 },
  { month: 4, p3: 59.7, p15: 61.8, p50: 63.9, p85: 66.0, p97: 68.0 },
  { month: 5, p3: 61.7, p15: 63.8, p50: 65.9, p85: 68.0, p97: 70.1 },
  { month: 6, p3: 63.3, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.9 },
];

export const LENGTH_GIRLS: PercentileRow[] = [
  { month: 0, p3: 45.4, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.9 },
  { month: 1, p3: 49.8, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.6 },
  { month: 2, p3: 53.0, p15: 55.0, p50: 57.1, p85: 59.1, p97: 61.1 },
  { month: 3, p3: 55.6, p15: 57.7, p50: 59.8, p85: 61.9, p97: 64.0 },
  { month: 4, p3: 57.8, p15: 59.9, p50: 62.1, p85: 64.3, p97: 66.4 },
  { month: 5, p3: 59.6, p15: 61.8, p50: 64.0, p85: 66.2, p97: 68.5 },
  { month: 6, p3: 61.2, p15: 63.5, p50: 65.7, p85: 68.0, p97: 70.3 },
];

export const HEAD_CIRC_BOYS: PercentileRow[] = [
  { month: 0, p3: 31.9, p15: 33.2, p50: 34.5, p85: 35.8, p97: 37.0 },
  { month: 1, p3: 34.4, p15: 35.7, p50: 37.0, p85: 38.3, p97: 39.5 },
  { month: 2, p3: 36.0, p15: 37.3, p50: 38.6, p85: 40.0, p97: 41.2 },
  { month: 3, p3: 37.3, p15: 38.6, p50: 40.0, p85: 41.3, p97: 42.5 },
  { month: 4, p3: 38.3, p15: 39.6, p50: 41.0, p85: 42.3, p97: 43.5 },
  { month: 5, p3: 39.1, p15: 40.4, p50: 41.7, p85: 43.1, p97: 44.3 },
  { month: 6, p3: 39.7, p15: 41.0, p50: 42.4, p85: 43.7, p97: 44.9 },
];

export const HEAD_CIRC_GIRLS: PercentileRow[] = [
  { month: 0, p3: 31.5, p15: 32.7, p50: 33.9, p85: 35.1, p97: 36.2 },
  { month: 1, p3: 33.9, p15: 35.1, p50: 36.3, p85: 37.5, p97: 38.7 },
  { month: 2, p3: 35.4, p15: 36.7, p50: 37.9, p85: 39.2, p97: 40.4 },
  { month: 3, p3: 36.6, p15: 37.9, p50: 39.2, p85: 40.5, p97: 41.7 },
  { month: 4, p3: 37.6, p15: 38.9, p50: 40.2, p85: 41.5, p97: 42.7 },
  { month: 5, p3: 38.4, p15: 39.7, p50: 41.0, p85: 42.3, p97: 43.5 },
  { month: 6, p3: 39.0, p15: 40.3, p50: 41.6, p85: 42.9, p97: 44.1 },
];

export function getWeightPercentiles(sex: 'male' | 'female'): PercentileRow[] {
  return sex === 'male' ? WEIGHT_BOYS : WEIGHT_GIRLS;
}

export function getLengthPercentiles(sex: 'male' | 'female'): PercentileRow[] {
  return sex === 'male' ? LENGTH_BOYS : LENGTH_GIRLS;
}

export function getHeadCircPercentiles(sex: 'male' | 'female'): PercentileRow[] {
  return sex === 'male' ? HEAD_CIRC_BOYS : HEAD_CIRC_GIRLS;
}
