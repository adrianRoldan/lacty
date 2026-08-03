import type { Rest, BabyConfig } from '../types';
import { localDateOf } from './dateUtils';

/**
 * Numeración de los sueños: «Siesta #2», «Sueño nocturno #1».
 *
 * Las siestas se cuentan por día natural. Los sueños nocturnos se cuentan por
 * NOCHE, no por día: si el bebé se duerme a las 22:00 y vuelve a dormirse a
 * las 3:00, ese segundo sueño es el #2 de la misma noche, no el #1 del día
 * siguiente. Por eso la franja nocturna es un rango y no un simple «a partir
 * de las 20:30»: sin la hora de fin, los despertares de madrugada se contarían
 * como la primera siesta del día.
 */

export const NOCHE_INICIO_POR_DEFECTO = '20:30';
export const NOCHE_FIN_POR_DEFECTO = '07:00';

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const diaAnterior = (dia: string): string => {
  const d = new Date(dia + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function ventanaNocturna(config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>) {
  return {
    inicio: config.nightSleepStart || NOCHE_INICIO_POR_DEFECTO,
    fin: config.nightSleepEnd || NOCHE_FIN_POR_DEFECTO,
  };
}

/** ¿Empieza este sueño dentro de la franja nocturna? */
export function esSuenoNocturno(
  startTime: string,
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>
): boolean {
  const { inicio, fin } = ventanaNocturna(config);
  const ini = aMinutos(inicio);
  const f = aMinutos(fin);
  const d = new Date(startTime);
  const min = d.getHours() * 60 + d.getMinutes();
  // La franja habitual cruza la medianoche (20:30 → 07:00).
  return ini > f ? (min >= ini || min < f) : (min >= ini && min < f);
}

export interface EtiquetaSueno {
  tipo: 'siesta' | 'nocturno';
  numero: number;
  /** «Siesta #2» o «Sueño nocturno #1». */
  texto: string;
}

/**
 * Etiqueta todos los sueños de una vez y devuelve un mapa por id, para no
 * recalcular la numeración en cada elemento de la lista.
 */
export function etiquetarSuenos(
  rests: Rest[],
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>
): Map<string, EtiquetaSueno> {
  const { fin } = ventanaNocturna(config);
  const minFin = aMinutos(fin);
  const ordenados = [...rests].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const contadores = new Map<string, number>();
  const salida = new Map<string, EtiquetaSueno>();

  for (const r of ordenados) {
    const nocturno = esSuenoNocturno(r.startTime, config);
    let clave: string;

    if (nocturno) {
      const d = new Date(r.startTime);
      const min = d.getHours() * 60 + d.getMinutes();
      // Lo que empieza de madrugada pertenece a la noche del día anterior.
      const dia = min < minFin ? diaAnterior(localDateOf(r.startTime)) : localDateOf(r.startTime);
      clave = `noche:${dia}`;
    } else {
      clave = `dia:${localDateOf(r.startTime)}`;
    }

    const numero = (contadores.get(clave) ?? 0) + 1;
    contadores.set(clave, numero);
    salida.set(r.id, {
      tipo: nocturno ? 'nocturno' : 'siesta',
      numero,
      texto: `${nocturno ? 'Sueño nocturno' : 'Siesta'} #${numero}`,
    });
  }

  return salida;
}

/** Cuántas siestas y cuántos sueños nocturnos empezaron un día concreto. */
export function contarPorTipo(
  rests: Rest[],
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>,
  dia: string
): { siestas: number; nocturnos: number } {
  let siestas = 0;
  let nocturnos = 0;
  for (const r of rests) {
    if (localDateOf(r.startTime) !== dia) continue;
    if (esSuenoNocturno(r.startTime, config)) nocturnos++;
    else siestas++;
  }
  return { siestas, nocturnos };
}
