export interface VaccineEntry {
  id: string;
  name: string;
  ageMonths: number;
  dose: string;
  description: string;
}

export interface VaccineGroup {
  id: string;
  name: string;
  description: string;
  entries: VaccineEntry[];
}

export const VACCINE_SCHEDULE: VaccineGroup[] = [
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
      { id: 'vnc-1', name: 'Neumococo', ageMonths: 2, dose: '1ª dosis', description: 'Neumococo conjugada (VNC15 o VNC20)' },
      { id: 'vnc-2', name: 'Neumococo', ageMonths: 4, dose: '2ª dosis', description: 'Neumococo conjugada' },
      { id: 'vnc-3', name: 'Neumococo', ageMonths: 11, dose: '3ª dosis (refuerzo)', description: 'Neumococo conjugada' },
    ],
  },
  {
    id: 'meningo-b',
    name: 'Meningococo B',
    description: 'Enfermedad meningocócica por serogrupo B',
    entries: [
      { id: 'menb-1', name: 'Meningococo B', ageMonths: 2, dose: '1ª dosis', description: 'Bexsero / Trumenba' },
      { id: 'menb-2', name: 'Meningococo B', ageMonths: 4, dose: '2ª dosis', description: 'Meningococo B' },
      { id: 'menb-3', name: 'Meningococo B', ageMonths: 12, dose: '3ª dosis (refuerzo)', description: 'Meningococo B' },
    ],
  },
  {
    id: 'rotavirus',
    name: 'Rotavirus',
    description: 'Gastroenteritis por rotavirus',
    entries: [
      { id: 'rota-1', name: 'Rotavirus', ageMonths: 2, dose: '1ª dosis', description: 'Vacuna oral (Rotateq/Rotarix)' },
      { id: 'rota-2', name: 'Rotavirus', ageMonths: 3, dose: '2ª dosis', description: 'Rotavirus oral' },
      { id: 'rota-3', name: 'Rotavirus', ageMonths: 4, dose: '3ª dosis (solo Rotateq)', description: 'Rotavirus oral (si pauta 3 dosis)' },
    ],
  },
  {
    id: 'meningo-acwy',
    name: 'Meningococo ACWY',
    description: 'Enfermedad meningocócica por serogrupos A, C, W e Y',
    entries: [
      { id: 'macwy-1', name: 'Meningococo ACWY', ageMonths: 4, dose: '1ª dosis', description: 'MenACWY conjugada' },
      { id: 'macwy-2', name: 'Meningococo ACWY', ageMonths: 12, dose: '2ª dosis (refuerzo)', description: 'MenACWY conjugada' },
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
    description: 'Gripe estacional (recomendada a partir de 6 meses)',
    entries: [
      { id: 'gripe-1', name: 'Gripe', ageMonths: 6, dose: '1ª dosis', description: 'Gripe estacional (anual, campaña otoño)' },
      { id: 'gripe-2', name: 'Gripe', ageMonths: 7, dose: '2ª dosis', description: 'Segunda dosis (4 semanas después, solo primer año)' },
    ],
  },
];
