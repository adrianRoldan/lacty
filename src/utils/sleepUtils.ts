import type { Rest, BabyConfig, RestWaking, WakingSoothe } from '../types';
import { localDateOf } from './dateUtils';

/**
 * Numeración de los sueños: «Siesta #2», «Sueño #1».
 *
 * Las siestas se cuentan por día natural. Los sueños nocturnos se cuentan por
 * NOCHE, no por día: si el bebé se duerme a las 22:00 y vuelve a dormirse a
 * las 3:00, ese segundo sueño es el #2 de la misma noche, no el #1 del día
 * siguiente. Por eso la franja nocturna es un rango y no un simple «a partir
 * de las 20:30»: sin la hora de fin, los despertares de madrugada se contarían
 * como la primera siesta del día.
 */

// La franja por defecto vive en lib/reference-data.mjs: también la usan los
// avisos push del servidor para saber cuándo es de noche.
import { NOCHE_INICIO_POR_DEFECTO, NOCHE_FIN_POR_DEFECTO, esFranjaNocturna } from '../../lib/reference-data.mjs';
export { NOCHE_INICIO_POR_DEFECTO, NOCHE_FIN_POR_DEFECTO };

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
  /** «Siesta #2» o «Sueño #1». */
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
    const clave = nocturno
      ? `noche:${nocheDeHora(r.startTime, minFin)}`
      : `dia:${localDateOf(r.startTime)}`;

    const numero = (contadores.get(clave) ?? 0) + 1;
    contadores.set(clave, numero);
    salida.set(r.id, {
      tipo: nocturno ? 'nocturno' : 'siesta',
      numero,
      texto: `${nocturno ? 'Sueño' : 'Siesta'} #${numero}`,
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

/** La noche (fecha de la tarde en que empieza) a la que pertenece una hora. */
function nocheDeHora(iso: string, minFin: number): string {
  const d = new Date(iso);
  const min = d.getHours() * 60 + d.getMinutes();
  // Lo que pasa de madrugada pertenece a la noche del día anterior.
  return min < minFin ? diaAnterior(localDateOf(iso)) : localDateOf(iso);
}

// ── Despertares ─────────────────────────────────────────────────────────────

/**
 * Un despertar sin «ya duerme» se da por cerrado pasado este tiempo: si nadie
 * lo marcó, se vuelve a ofrecer «se despierta» para el siguiente.
 */
export const DESPERTAR_ABIERTO_MAX_MIN = 30;

export const ETIQUETA_CALMA: Record<WakingSoothe, string> = {
  solo: 'solo',
  chupete: 'chupete',
  brazos: 'brazos',
  pecho: 'pecho',
};

/** El despertar en curso de un sueño abierto, si lo hay. */
export function despertarAbierto(rest: Rest, ahora: Date = new Date()): RestWaking | null {
  if (rest.endTime) return null;
  const ultimo = rest.wakings?.[rest.wakings.length - 1];
  if (!ultimo || ultimo.endAt) return null;
  const min = (ahora.getTime() - new Date(ultimo.at).getTime()) / 60000;
  return min <= DESPERTAR_ABIERTO_MAX_MIN ? ultimo : null;
}

/** Minutos que duró un despertar, si se marcó «ya duerme». */
export function minutosDespierto(w: RestWaking): number | null {
  if (!w.endAt) return null;
  return Math.max(0, Math.round((new Date(w.endAt).getTime() - new Date(w.at).getTime()) / 60000));
}

export interface ResumenNoche {
  /** Fecha de la tarde en que empezó la noche (YYYY-MM-DD). */
  noche: string;
  /** Despertares en total: los apuntados dentro de los sueños más los que lo cortaron. */
  despertares: number;
  /** Los apuntados con «se despierta» sin terminar el sueño. */
  dentroDelSueno: number;
  /** Veces que el sueño se cortó (por una toma, por ejemplo) y se volvió a dormir. */
  cortes: number;
  /** Minutos despierto sumando los despertares con «ya duerme». */
  minutosDespierto: number;
}

/**
 * Resumen de los despertares de una noche. Un despertar es tanto el que se
 * apunta dentro de un sueño como cada vez que el sueño se cortó y volvió a
 * empezar: a las cuatro de la mañana la pregunta es «¿cuántas veces se ha
 * despertado?», no «¿cuántos sueños lleva?».
 */
export function resumenNoche(
  rests: Rest[],
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>,
  noche: string,
): ResumenNoche | null {
  const minFin = aMinutos(ventanaNocturna(config).fin);
  const suenos = rests.filter((r) => esSuenoNocturno(r.startTime, config) && nocheDeHora(r.startTime, minFin) === noche);
  if (suenos.length === 0) return null;
  const wakings = suenos.flatMap((r) => r.wakings ?? []);
  const cortes = suenos.length - 1;
  return {
    noche,
    despertares: wakings.length + cortes,
    dentroDelSueno: wakings.length,
    cortes,
    minutosDespierto: wakings.reduce((s, w) => s + (minutosDespierto(w) ?? 0), 0),
  };
}

/**
 * La noche que importa ahora: la que está en curso si es de noche, o la que
 * acaba de terminar si ya es de día.
 */
export function nocheActualOAnterior(
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>,
  ahora: Date = new Date(),
): string {
  const { inicio, fin } = ventanaNocturna(config);
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  const hoy = localDateOf(ahora.toISOString());
  if (min < aMinutos(fin)) return diaAnterior(hoy); // madrugada: la noche empezó ayer
  if (min >= aMinutos(inicio)) return hoy;            // ya es de noche
  return diaAnterior(hoy);                            // de día: la de anoche
}

/** Despertares por noche de las noches con sueño nocturno entre dos fechas (incluidas). */
export function despertaresPorNoche(
  rests: Rest[],
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>,
  desde: string,
  hasta: string,
): ResumenNoche[] {
  const minFin = aMinutos(ventanaNocturna(config).fin);
  const noches = new Set(
    rests
      .filter((r) => esSuenoNocturno(r.startTime, config))
      .map((r) => nocheDeHora(r.startTime, minFin))
      .filter((n) => n >= desde && n <= hasta),
  );
  return [...noches].sort().map((n) => resumenNoche(rests, config, n)!).filter(Boolean);
}

/** «1 despertar», «3 despertares». */
export function textoDespertares(n: number): string {
  return n === 1 ? '1 despertar' : `${n} despertares`;
}

/**
 * Lo que se enseña en «Hoy»: los despertares de esta noche (si es de noche) o
 * de anoche (si ya es de día), con su etiqueta. null si no hubo sueño nocturno.
 */
export function nocheParaMostrar(
  rests: Rest[],
  config: Pick<BabyConfig, 'nightSleepStart' | 'nightSleepEnd'>,
  ahora: Date = new Date(),
): { etiqueta: 'Esta noche' | 'Anoche'; resumen: ResumenNoche } | null {
  const resumen = resumenNoche(rests, config, nocheActualOAnterior(config, ahora));
  if (!resumen) return null;
  const { inicio, fin } = ventanaNocturna(config);
  return { etiqueta: esFranjaNocturna(ahora, inicio, fin) ? 'Esta noche' : 'Anoche', resumen };
}
