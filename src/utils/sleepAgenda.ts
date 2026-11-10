import type { Feeding, NoteEntry, Rest } from '../types';
import { localDateOf } from './dateUtils';
import { diasDelRango } from './exportUtils';

/**
 * La «agenda de sueño» que pide el pediatra: una fila por día y una casilla por
 * cada 10 minutos. Aquí solo se decide qué va en cada casilla; dibujarlo es
 * cosa de sleepAgendaPdf.ts.
 */

export const MINUTOS_POR_CASILLA = 10;
export const CASILLAS_POR_DIA = (24 * 60) / MINUTOS_POR_CASILLA;

/** Una casilla se rellena si durmió al menos la mitad de sus minutos. */
const MINUTOS_PARA_RELLENAR = MINUTOS_POR_CASILLA / 2;

export const FILTRO_FLECHAS_POR_DEFECTO = 'ofrezco sueño, ofrecer sueño, ofrecí sueño';

export interface FilaAgenda {
  dia: string;            // YYYY-MM-DD
  domingo: boolean;
  dormido: boolean[];     // una entrada por casilla
  flechas: number[];      // casillas con flecha
  microdespertares: number[]; // casillas con ojo
  biberones: number[];    // casillas con «B»
}

export interface Agenda {
  filas: FilaAgenda[];
  /** Las notas que han dado lugar a una flecha, de la más reciente a la más antigua. */
  notasConFlecha: NoteEntry[];
  numMicrodespertares: number;
  numBiberones: number;
}

export interface RegistrosAgenda {
  rests: Rest[];
  notes: NoteEntry[];
  feedings: Feeding[];
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Los términos van separados por comas y basta con que coincida uno. Dentro de
 * un término valen todas las palabras en cualquier orden, para que «ofrezco
 * sueño» también encuentre «le ofrezco el sueño».
 */
export function notaCoincide(texto: string, filtro: string): boolean {
  const nota = normalizar(texto);
  return filtro
    .split(',')
    .map((termino) => normalizar(termino).split(/\s+/).filter(Boolean))
    .some((palabras) => palabras.length > 0 && palabras.every((p) => nota.includes(p)));
}

const minutoDelDia = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

const casillaDe = (minuto: number) =>
  Math.min(CASILLAS_POR_DIA - 1, Math.floor(minuto / MINUTOS_POR_CASILLA));

/**
 * La parte de un intervalo que cae en un día, en minutos de reloj. Se usa la
 * hora de reloj y no la distancia a medianoche para que los días de cambio de
 * hora no descuadren las columnas.
 */
function tramoEnDia(inicio: Date, fin: Date, dia: string): [number, number] | null {
  const [a, m, d] = dia.split('-').map(Number);
  const inicioDia = new Date(a, m - 1, d);
  const finDia = new Date(a, m - 1, d + 1);
  if (fin <= inicioDia || inicio >= finDia) return null;
  const desde = inicio > inicioDia ? minutoDelDia(inicio) : 0;
  const hasta = fin < finDia ? minutoDelDia(fin) : 24 * 60;
  return hasta > desde ? [desde, hasta] : null;
}

/** Suma a cada casilla los minutos del tramo que caen en ella. */
function sumarMinutos(casillas: number[], [desde, hasta]: [number, number], signo: 1 | -1) {
  for (let i = casillaDe(desde); i <= casillaDe(hasta - 0.001); i++) {
    const solape = Math.min(hasta, (i + 1) * MINUTOS_POR_CASILLA) - Math.max(desde, i * MINUTOS_POR_CASILLA);
    casillas[i] += signo * Math.max(0, solape);
  }
}

function casillasDelDia(dia: string, horas: string[]): number[] {
  return [...new Set(
    horas
      .filter((iso) => localDateOf(iso) === dia)
      .map((iso) => casillaDe(minutoDelDia(new Date(iso)))),
  )];
}

function filaDelDia(
  dia: string,
  rests: Rest[],
  notasConFlecha: NoteEntry[],
  tomasConBiberon: Feeding[],
  ahora: Date,
): FilaAgenda {
  const dormido = new Array<boolean>(CASILLAS_POR_DIA).fill(false);
  const ojos = new Set<number>();

  for (const r of rests) {
    const tramo = tramoEnDia(new Date(r.startTime), r.endTime ? new Date(r.endTime) : ahora, dia);
    if (!tramo) continue;

    const minutos = new Array<number>(CASILLAS_POR_DIA).fill(0);
    sumarMinutos(minutos, tramo, 1);

    for (const w of r.wakings ?? []) {
      const despertar = new Date(w.at);
      if (localDateOf(w.at) === dia) ojos.add(casillaDe(minutoDelDia(despertar)));
      // Si duró lo bastante, la casilla queda en blanco: en esos minutos estaba despierto.
      const despierto = w.endAt ? tramoEnDia(despertar, new Date(w.endAt), dia) : null;
      if (!despierto) continue;
      const desde = Math.max(despierto[0], tramo[0]);
      const hasta = Math.min(despierto[1], tramo[1]);
      if (hasta > desde) sumarMinutos(minutos, [desde, hasta], -1);
    }

    let algunaRellena = false;
    minutos.forEach((m, i) => {
      if (m >= MINUTOS_PARA_RELLENAR) {
        dormido[i] = true;
        algunaRellena = true;
      }
    });
    // Un sueño corto repartido entre dos casillas no llena ninguna, y no puede
    // desaparecer de la hoja.
    if (!algunaRellena) dormido[casillaDe((tramo[0] + tramo[1]) / 2)] = true;
  }

  return {
    dia,
    domingo: new Date(dia + 'T12:00:00').getDay() === 0,
    dormido,
    flechas: casillasDelDia(dia, notasConFlecha.map((n) => n.timestamp)),
    microdespertares: [...ojos],
    biberones: casillasDelDia(dia, tomasConBiberon.map((f) => f.timestamp)),
  };
}

export function construirAgenda(
  { rests, notes, feedings }: RegistrosAgenda,
  desde: string,
  hasta: string,
  filtroFlechas: string,
  ahora: Date = new Date(),
): Agenda {
  const enRango = (iso: string) => {
    const dia = localDateOf(iso);
    return dia >= desde && dia <= hasta;
  };

  const notasConFlecha = notes
    .filter((n) => enRango(n.timestamp) && notaCoincide(n.text, filtroFlechas))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const tomasConBiberon = feedings.filter((f) => f.hasBottle && enRango(f.timestamp));

  const filas = diasDelRango(desde, hasta).map((dia) =>
    filaDelDia(dia, rests, notasConFlecha, tomasConBiberon, ahora),
  );

  return {
    filas,
    notasConFlecha,
    numMicrodespertares: rests.flatMap((r) => r.wakings ?? []).filter((w) => enRango(w.at)).length,
    numBiberones: tomasConBiberon.length,
  };
}
