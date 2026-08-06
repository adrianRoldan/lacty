import type { MedicationPlan, MedicationLog } from '../types';
import { localDateOf } from './dateUtils';

/**
 * Horas propuestas al elegir cuántas veces al día. Se reparten dentro de la
 * jornada del bebé (8:00–22:00) para no programar tomas de madrugada.
 */
export function horasPorDefecto(veces: number): string[] {
  switch (veces) {
    case 1:  return ['09:00'];
    case 2:  return ['09:00', '21:00'];
    case 3:  return ['08:00', '15:00', '22:00'];
    case 4:  return ['08:00', '13:00', '18:00', '22:00'];
    case 5:  return ['08:00', '11:30', '15:00', '18:30', '22:00'];
    default: return ['09:00'];
  }
}

/** ¿La pauta está vigente en la fecha indicada? */
export function pautaVigente(plan: MedicationPlan, diaIso: string): boolean {
  return plan.startDate <= diaIso && diaIso <= plan.endDate;
}

/** Dosis ya registradas de esa pauta en el día indicado. */
export function dosisDelDia(logs: MedicationLog[], planId: string, diaIso: string): number {
  return logs.filter((m) => m.planId === planId && localDateOf(m.timestamp) === diaIso).length;
}

/** Minutos desde medianoche de una hora "HH:MM". */
export function minutosDeHora(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Índice de la siguiente dosis pendiente cuya hora ya ha pasado, o -1 si no
 * toca ninguna. Se cuentan las dadas por orden: si van 2 de 3, la pendiente es
 * la tercera hora.
 */
export function dosisPendiente(plan: MedicationPlan, dadas: number, minutosAhora: number): number {
  if (dadas >= plan.times.length) return -1;
  const horas = [...plan.times].sort();
  return minutosAhora >= minutosDeHora(horas[dadas]) ? dadas : -1;
}

/** «1 vez al día a las 09:00» / «3 veces al día: 08:00, 15:00, 22:00». */
export function resumenPauta(plan: MedicationPlan): string {
  const horas = [...plan.times].sort();
  if (horas.length === 1) return `1 vez al día a las ${horas[0]}`;
  return `${horas.length} veces al día: ${horas.join(', ')}`;
}

/** Días que le quedan a la pauta contando desde hoy (0 = termina hoy). */
export function diasRestantes(plan: MedicationPlan, hoyIso: string): number {
  const fin = new Date(plan.endDate + 'T12:00:00').getTime();
  const hoy = new Date(hoyIso + 'T12:00:00').getTime();
  return Math.round((fin - hoy) / 86400000);
}

/** Fecha ISO a N días vista, para proponer «2 semanas» y compañía. */
export function isoMasDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
