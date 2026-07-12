export interface BabyConfig {
  id: string;
  name?: string;
  sex?: 'male' | 'female';
  birthDate?: string;        // YYYY-MM-DD — fecha de nacimiento (preferida para calcular la edad)
  daysOfLifeAtSetup: number; // legacy: usado si no hay birthDate
  setupDate: string;
  vitaminDEnabled?: boolean;
  vitaminDReminderHour?: number;
  vitaminDMedName?: string;     // nombre del medicamento (ej. Deltius)
  probioticEnabled?: boolean;
  probioticReminderHour?: number;
  probioticMedName?: string;    // nombre del medicamento (ej. Reuteri)
  frenectomyEnabled?: boolean;
  frenectomyDate?: string;      // YYYY-MM-DD — fecha de la intervención
  frenectomyStartTime?: string; // "HH:MM" — primera toma del día
  frenectomyEndTime?: string;   // "HH:MM" — última toma del día
}

export interface ProbioticLog {
  id: string;    // ISO date "YYYY-MM-DD"
  date: string;
  givenAt: string;
}

export interface MassageLog {
  id: string;
  date: string;        // YYYY-MM-DD
  performedAt: string; // ISO timestamp
}

export interface VitaminDLog {
  id: string;    // ISO date "YYYY-MM-DD" — clave única por día
  date: string;
  givenAt: string; // ISO timestamp
}

export interface WeightEntry {
  id: string;
  date: string;     // ISO date "YYYY-MM-DD"
  weightKg: number;
  notes?: string;
}

export interface HeightEntry {
  id: string;
  date: string;     // ISO date "YYYY-MM-DD"
  heightCm: number;
  notes?: string;
}

export interface Feeding {
  id: string;
  timestamp: string;
  endTime?: string;           // ISO — hora fin de la toma
  hasBreast: boolean;
  breastMinLeft?: number;
  breastMinRight?: number;
  breastEstimatedMl?: number; // ml estimados al pecho según referencia — solo en tomas nuevas
  hasBottle?: boolean;
  bottleMl?: number;
  bottleType?: 'breast' | 'formula';
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

export interface MilestoneLog {
  id: string;          // same as milestone id (m0-1, m1-3, etc.)
  achievedAt: string;  // ISO timestamp
  notes?: string;
}

export interface HeadCircEntry {
  id: string;
  date: string;     // ISO date "YYYY-MM-DD"
  headCm: number;
  notes?: string;
}

export interface VaccineLog {
  id: string;          // same as vaccine entry id (hexa-1, vnc-2, etc.)
  date: string;        // YYYY-MM-DD — fecha de administración
  notes?: string;
}

export type DiaperContent = 'wet' | 'dirty' | 'both' | 'dry';
export type PoopColor = 'yellow' | 'brown' | 'green' | 'orange' | 'black' | 'red' | 'white';
export type PoopConsistency = 'liquid' | 'soft' | 'pasty' | 'solid';
export type PoopAmount = 'little' | 'normal' | 'much';

export interface DiaperChange {
  id: string;
  timestamp: string;
  content: DiaperContent;
  poopColor?: PoopColor;
  poopConsistency?: PoopConsistency;
  poopAmount?: PoopAmount;
  notes?: string;
}

export type TimelineItem =
  | { type: 'feeding'; data: Feeding; sortKey: string }
  | { type: 'rest'; data: Rest; sortKey: string }
  | { type: 'diaper'; data: DiaperChange; sortKey: string };

export type EventCategory = 'pediatra' | 'matrona' | 'fisio' | 'vacuna' | 'analisis' | 'revision' | 'otro';

export interface CalendarEvent {
  id: string;
  date: string;          // YYYY-MM-DD
  time?: string;         // HH:MM (opcional)
  title: string;         // asunto
  category: EventCategory;
  description?: string;
  notes?: string;        // notas post-visita
  createdAt: string;
}

export type ConsultationCategory = 'pediatra' | 'matrona' | 'fisio' | 'otro';

export interface Consultation {
  id: string;
  text: string;                    // la duda/pregunta
  category: ConsultationCategory;
  answer?: string;                 // respuesta del profesional
  resolved: boolean;               // si ya se ha comentado en la visita
  createdAt: string;               // ISO
  resolvedAt?: string;             // ISO
}
