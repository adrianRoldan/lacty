/**
 * Calendario de vacunación e inmunización de los primeros 15 meses.
 *
 * Revisado en octubre de 2026 contra:
 * - Calendario común de vacunación e inmunización a lo largo de toda la vida,
 *   año 2026 (Consejo Interterritorial del SNS, 12 de diciembre de 2025).
 * - Calendario de vacunaciones e inmunizaciones de la AEP 2026 (CAV-AEP).
 *
 * Cada comunidad autónoma concreta su pauta, así que las dosis que dependen de
 * la vacuna usada o de la situación del bebé van marcadas como `condicional`:
 * se pueden apuntar, pero no cuentan como pendientes ni salen como «próxima».
 */
export interface VaccineEntry {
  id: string;
  name: string;
  ageMonths: number;
  dose: string;
  description: string;
  /** Si solo aplica en algunos casos: explica cuándo. */
  condicional?: string;
}

export interface VaccineGroup {
  id: string;
  name: string;
  description: string;
  entries: VaccineEntry[];
}

export const VACCINE_SCHEDULE: VaccineGroup[] = [
  {
    id: 'vrs',
    name: 'Virus respiratorio sincitial (VRS)',
    description: 'Bronquiolitis. Anticuerpo monoclonal, no vacuna',
    entries: [
      {
        id: 'vrs-1', name: 'VRS (nirsevimab)', ageMonths: 0, dose: 'Dosis única',
        description: 'Anticuerpo monoclonal frente al VRS',
        condicional: 'Si nace de octubre a marzo, en las primeras 24–48 h; si nace de abril a septiembre, al empezar la temporada (antes de los 6 meses)',
      },
    ],
  },
  {
    id: 'hexavalente',
    name: 'Hexavalente (DTPa-VPI-Hib-HB)',
    description: 'Difteria, tétanos, tosferina, polio, Haemophilus influenzae b y hepatitis B',
    entries: [
      { id: 'hexa-1', name: 'Hexavalente', ageMonths: 2, dose: '1ª dosis', description: 'DTPa + Polio + Hib + Hepatitis B' },
      { id: 'hexa-2', name: 'Hexavalente', ageMonths: 4, dose: '2ª dosis', description: 'DTPa + Polio + Hib + Hepatitis B' },
      { id: 'hexa-3', name: 'Hexavalente', ageMonths: 11, dose: '3ª dosis', description: 'DTPa + Polio + Hib + Hepatitis B' },
    ],
  },
  {
    id: 'neumococo',
    name: 'Neumococo conjugada (VNC)',
    description: 'Enfermedad neumocócica invasiva, neumonía, otitis',
    entries: [
      { id: 'vnc-1', name: 'Neumococo', ageMonths: 2, dose: '1ª dosis', description: 'Neumococo conjugada (VNC20 o VNC15)' },
      { id: 'vnc-2', name: 'Neumococo', ageMonths: 4, dose: '2ª dosis', description: 'Neumococo conjugada' },
      {
        id: 'vnc-6m', name: 'Neumococo', ageMonths: 6, dose: '3ª dosis', description: 'Neumococo conjugada',
        condicional: 'Solo con la VNC20, que se pone a los 2, 4, 6 y 11 meses (con la VNC15 son 2, 4 y 11)',
      },
      { id: 'vnc-3', name: 'Neumococo', ageMonths: 11, dose: 'Refuerzo', description: 'Neumococo conjugada' },
    ],
  },
  {
    id: 'meningo-b',
    name: 'Meningococo B',
    description: 'Enfermedad meningocócica por serogrupo B',
    entries: [
      { id: 'menb-1', name: 'Meningococo B', ageMonths: 2, dose: '1ª dosis', description: 'Bexsero (4CMenB)' },
      { id: 'menb-2', name: 'Meningococo B', ageMonths: 4, dose: '2ª dosis', description: 'Meningococo B' },
      { id: 'menb-3', name: 'Meningococo B', ageMonths: 12, dose: '3ª dosis (refuerzo)', description: 'Meningococo B' },
    ],
  },
  {
    id: 'rotavirus',
    name: 'Rotavirus',
    description: 'Gastroenteritis por rotavirus. Vacuna oral',
    entries: [
      { id: 'rota-1', name: 'Rotavirus', ageMonths: 2, dose: '1ª dosis', description: 'Rotarix o RotaTeq (desde las 6 semanas)' },
      { id: 'rota-2', name: 'Rotavirus', ageMonths: 3, dose: '2ª dosis', description: 'Rotavirus oral (a los 3–4 meses)' },
      {
        id: 'rota-3', name: 'Rotavirus', ageMonths: 4, dose: '3ª dosis', description: 'Rotavirus oral',
        condicional: 'Solo con RotaTeq, que lleva 3 dosis (2, 3 y 4 meses, o 2, 4 y 6 según la comunidad). Rotarix lleva 2',
      },
    ],
  },
  {
    id: 'meningo-acwy',
    name: 'Meningococo ACWY (o C)',
    description: 'Enfermedad meningocócica por serogrupos A, C, W e Y',
    entries: [
      { id: 'macwy-1', name: 'Meningococo ACWY', ageMonths: 4, dose: '1ª dosis', description: 'MenACWY, o MenC en las comunidades que aún la usan' },
      { id: 'macwy-2', name: 'Meningococo ACWY', ageMonths: 12, dose: '2ª dosis (refuerzo)', description: 'MenACWY, o MenC en las comunidades que aún la usan' },
    ],
  },
  {
    id: 'triple-virica',
    name: 'Triple vírica (SRP)',
    description: 'Sarampión, rubeola y parotiditis',
    entries: [
      { id: 'srp-1', name: 'Triple vírica', ageMonths: 12, dose: '1ª dosis', description: 'Sarampión + Rubeola + Parotiditis' },
    ],
  },
  {
    id: 'varicela',
    name: 'Varicela',
    description: 'Varicela',
    entries: [
      { id: 'var-1', name: 'Varicela', ageMonths: 15, dose: '1ª dosis', description: 'Virus varicela-zóster atenuado' },
    ],
  },
  {
    id: 'gripe',
    name: 'Gripe',
    description: 'Gripe estacional: una dosis cada temporada desde los 6 meses',
    entries: [
      { id: 'gripe-1', name: 'Gripe', ageMonths: 6, dose: '1ª temporada', description: 'Gripe estacional (campaña de otoño)' },
      {
        id: 'gripe-2', name: 'Gripe', ageMonths: 7, dose: '2ª dosis', description: 'Cuatro semanas después de la primera',
        condicional: 'Solo en grupos de riesgo que se vacunan por primera vez',
      },
    ],
  },
];

/** Dosis que tocan a todos los bebés (las condicionales no cuentan). */
export const esDosisSistematica = (e: VaccineEntry) => !e.condicional;
