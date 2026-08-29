import type { BabyConfig, VitaminDLog, ProbioticLog, MassageLog, MedicationLog, MedicationPlan } from '../types';
import { massagesPerDay, frenectomyEndDate, getRecommendedMassageTimes } from './careUtils';
import { pautaVigente, dosisDelDia, dosisPendiente } from './medicationUtils';

/**
 * Estado de los cuidados que tocan hoy: vitamina D, probiótico, masajes de la
 * frenectomía y cada medicación programada.
 *
 * Solo calcula «qué falta»; las acciones las pone cada pantalla, que las tiene
 * a mano de forma distinta. Lo consumen los chips de los dos diseños de «Hoy»
 * y la hoja de «Añadir un registro», para que las tres cuenten lo mismo.
 */
export interface CuidadoHoy {
  key: string;
  tipo: 'vitaminD' | 'probiotic' | 'massage' | 'medplan';
  icono: string;
  /** Nombre corto, para el chip. */
  etiqueta: string;
  /** Contexto de una línea, para la hoja de añadir. */
  detalle: string;
  hechas: number;
  total: number;
  /** Terminado por hoy. */
  hecho: boolean;
  /** Ya pasó la hora prevista y sigue pendiente. */
  urgente: boolean;
  /** Hora (HH:MM) de la siguiente toma pendiente; sin definir si ya está hecho. */
  proximaHora?: string;
  /** Solo en las medicaciones programadas. */
  plan?: MedicationPlan;
}

interface Entrada {
  config: BabyConfig;
  today: string;
  /** Minutos desde medianoche, para saber si una hora ya ha pasado. */
  ahoraMin: number;
  vitaminDLogs: VitaminDLog[];
  probioticLogs: ProbioticLog[];
  massageLogs: MassageLog[];
  medications: MedicationLog[];
  medPlans: MedicationPlan[];
}

const aHora = (h: number) => `${String(h).padStart(2, '0')}:00`;

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

export function cuidadosDeHoy({
  config, today, ahoraMin,
  vitaminDLogs, probioticLogs, massageLogs, medications, medPlans,
}: Entrada): CuidadoHoy[] {
  const cuidados: CuidadoHoy[] = [];
  const ahoraHora = Math.floor(ahoraMin / 60);

  if (config.vitaminDEnabled) {
    const dado = vitaminDLogs.some((l) => l.date === today);
    cuidados.push({
      key: 'vitaminD',
      tipo: 'vitaminD',
      icono: '💊',
      etiqueta: config.vitaminDMedName || 'Vit. D',
      detalle: '2 gotas diarias',
      hechas: dado ? 1 : 0,
      total: 1,
      hecho: dado,
      urgente: !dado && config.vitaminDReminderHour !== undefined && ahoraHora >= config.vitaminDReminderHour,
      proximaHora: !dado && config.vitaminDReminderHour !== undefined ? aHora(config.vitaminDReminderHour) : undefined,
    });
  }

  if (config.probioticEnabled) {
    const dado = probioticLogs.some((l) => l.date === today);
    cuidados.push({
      key: 'probiotic',
      tipo: 'probiotic',
      icono: '🦠',
      etiqueta: config.probioticMedName || 'Probiótico',
      detalle: '5 gotas diarias',
      hechas: dado ? 1 : 0,
      total: 1,
      hecho: dado,
      urgente: !dado && config.probioticReminderHour !== undefined && ahoraHora >= config.probioticReminderHour,
      proximaHora: !dado && config.probioticReminderHour !== undefined ? aHora(config.probioticReminderHour) : undefined,
    });
  }

  if (config.frenectomyEnabled && config.frenectomyDate) {
    const fin = frenectomyEndDate(config);
    if (fin != null && today <= fin) {
      const objetivo = massagesPerDay(config);
      const hechas = massageLogs.filter((m) => m.date === today).length;
      const horas = getRecommendedMassageTimes(
        config.frenectomyStartTime ?? '08:30',
        config.frenectomyEndTime ?? '22:30',
        objetivo
      );
      const siguiente = Math.min(hechas, objetivo - 1);
      cuidados.push({
        key: 'massage',
        tipo: 'massage',
        icono: '👅',
        etiqueta: 'Masajes',
        detalle: `Post-frenectomía · ${objetivo} al día`,
        hechas,
        total: objetivo,
        hecho: hechas >= objetivo,
        urgente: hechas < objetivo && ahoraMin >= aMinutos(horas[siguiente]),
        proximaHora: hechas < objetivo ? horas[siguiente] : undefined,
      });
    }
  }

  for (const plan of medPlans) {
    if (!pautaVigente(plan, today)) continue;
    const hechas = dosisDelDia(medications, plan.id, today);
    const total = plan.times.length;
    const horas = [...plan.times].sort();
    const horario = horas.join(', ');
    cuidados.push({
      key: `medplan-${plan.id}`,
      tipo: 'medplan',
      icono: '💊',
      etiqueta: plan.name,
      detalle: plan.doseMl != null
        ? `${String(plan.doseMl).replace('.', ',')} ml · ${horario}`
        : horario,
      hechas,
      total,
      hecho: hechas >= total,
      urgente: dosisPendiente(plan, hechas, ahoraMin) >= 0,
      proximaHora: hechas < total ? horas[hechas] : undefined,
      plan,
    });
  }

  return cuidados;
}
