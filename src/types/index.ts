export interface BabyConfig {
  id: string;
  daysOfLifeAtSetup: number;
  setupDate: string;
}

export interface WeightEntry {
  id: string;
  date: string;     // ISO date "YYYY-MM-DD"
  weightKg: number;
  notes?: string;
}

export interface Feeding {
  id: string;
  timestamp: string;
  hasBreast: boolean;
  breastMinLeft?: number;
  breastMinRight?: number;
  hasSupplement: boolean;
  supplementMl?: number;
  notes?: string;
}

export interface Rest {
  id: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

export type TimelineItem =
  | { type: 'feeding'; data: Feeding; sortKey: string }
  | { type: 'rest'; data: Rest; sortKey: string };
