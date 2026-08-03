import type {
  BabyConfig, Feeding, Rest, DiaperChange, Walk, MedicationLog,
  VitaminDLog, ProbioticLog, MassageLog, WeightEntry, TimelineItem, Bath,
} from '../types';
import { buildTimeline, getRestDurationMinutes, getWalkDurationMinutes, restMinutesOnDay, formatDose } from './feedingUtils';
import { formatTime, formatMinutes, localDateOf, getCurrentDaysOfLife, getBirthDate, formatBabyAge } from './dateUtils';
import { etiquetarSuenos } from './sleepUtils';

/**
 * Exportación del historial para compartirlo con un profesional o pegarlo en
 * una IA. Se genera desde los mismos registros que muestra la app, sin
 * resúmenes propios: lo que se lee aquí es lo que hay guardado.
 */

export interface DatosExportacion {
  config: BabyConfig;
  feedings: Feeding[];
  rests: Rest[];
  diapers: DiaperChange[];
  walks: Walk[];
  medications: MedicationLog[];
  vitaminDLogs: VitaminDLog[];
  probioticLogs: ProbioticLog[];
  massageLogs: MassageLog[];
  weights: WeightEntry[];
  baths: Bath[];
}

export interface OpcionesExportacion {
  desde: string;          // YYYY-MM-DD
  hasta: string;          // YYYY-MM-DD
  ocultarNombre: boolean;
  pregunta: string;       // vacío = sin pregunta inicial
}

export const PREGUNTA_POR_DEFECTO =
  'Estos son los registros de mi bebé. ¿Los horarios y la duración de las tomas y ' +
  'las siestas son normales para su edad? Me preocupa especialmente el número de ' +
  'siestas, cuánto duran y si aguanta despierto más de lo que debería. Señálame ' +
  'cualquier patrón que llame la atención y qué convendría comentar con la pediatra.';

// ── Utilidades de fechas ─────────────────────────────────────────────────────

/** Todos los días del rango, en orden ascendente. */
export function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const d = new Date(desde + 'T12:00:00');
  const fin = new Date(hasta + 'T12:00:00');
  while (d <= fin) {
    dias.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

const fechaLarga = (dia: string) =>
  new Date(dia + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const fechaCorta = (dia: string) =>
  new Date(dia + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/** Días de vida del bebé en una fecha concreta. */
function diaDeVida(config: BabyConfig, dia: string): number | null {
  const nacimiento = getBirthDate(config);
  if (!nacimiento) return null;
  const dif = (new Date(dia + 'T12:00:00').getTime() - new Date(nacimiento + 'T12:00:00').getTime()) / 86400000;
  return Math.round(dif) + 1;
}

// ── Siestas y ventanas de vigilia ────────────────────────────────────────────

export interface SiestaExportada {
  restId: string;
  dia: string;
  inicio: string;
  fin: string | null;
  duracionMin: number | null;
  /** Minutos despierto desde que terminó el sueño anterior. */
  vigiliaPreviaMin: number | null;
}

/**
 * Sueños del rango con su duración y el rato despierto previo.
 *
 * La vigilia se calcula contra el sueño anterior aunque sea de un día antes,
 * porque si no la primera siesta de cada día saldría siempre sin dato.
 */
export function siestasDelRango(rests: Rest[], desde: string, hasta: string): SiestaExportada[] {
  const ordenados = [...rests].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const salida: SiestaExportada[] = [];

  for (let i = 0; i < ordenados.length; i++) {
    const r = ordenados[i];
    const dia = localDateOf(r.startTime);
    if (dia < desde || dia > hasta) continue;

    const anterior = ordenados.slice(0, i).reverse().find((x) => x.endTime != null);
    const vigilia = anterior?.endTime
      ? Math.round((new Date(r.startTime).getTime() - new Date(anterior.endTime).getTime()) / 60000)
      : null;

    salida.push({
      restId: r.id,
      dia,
      inicio: r.startTime,
      fin: r.endTime ?? null,
      duracionMin: getRestDurationMinutes(r),
      vigiliaPreviaMin: vigilia != null && vigilia >= 0 ? vigilia : null,
    });
  }
  return salida;
}

// ── Resumen de un día ────────────────────────────────────────────────────────

interface ResumenDia {
  tomas: number;
  mlTotal: number;
  minutosPecho: number;
  suenoMin: number;
  siestas: number;
  vigiliaMediaMin: number | null;
  vigiliaMaxMin: number | null;
  pipis: number;
  cacas: number;
  medicamentos: number;
  paseos: number;
}

function resumirDia(datos: DatosExportacion, dia: string, siestas: SiestaExportada[]): ResumenDia {
  const tomas = datos.feedings.filter((f) => localDateOf(f.timestamp) === dia);
  const panales = datos.diapers.filter((d) => localDateOf(d.timestamp) === dia);
  const delDia = siestas.filter((s) => s.dia === dia);
  const vigilias = delDia.map((s) => s.vigiliaPreviaMin).filter((v): v is number => v != null);

  return {
    tomas: tomas.length,
    mlTotal: Math.round(tomas.reduce((s, f) => s + (f.supplementMl ?? 0) + (f.bottleMl ?? 0) + (f.breastEstimatedMl ?? 0), 0)),
    minutosPecho: tomas.reduce((s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0),
    suenoMin: datos.rests.reduce((s, r) => s + restMinutesOnDay(r, dia), 0),
    siestas: delDia.length,
    vigiliaMediaMin: vigilias.length ? Math.round(vigilias.reduce((a, b) => a + b, 0) / vigilias.length) : null,
    vigiliaMaxMin: vigilias.length ? Math.max(...vigilias) : null,
    pipis: panales.filter((d) => d.content === 'wet' || d.content === 'both').length,
    cacas: panales.filter((d) => d.content === 'dirty' || d.content === 'both').length,
    medicamentos: datos.medications.filter((m) => localDateOf(m.timestamp) === dia).length,
    paseos: datos.walks.filter((w) => localDateOf(w.startTime) === dia).length,
  };
}

// ── Descripción de cada registro ─────────────────────────────────────────────

const CONTENIDO_PANAL: Record<string, string> = {
  wet: 'pipí', dirty: 'caca', both: 'pipí y caca', dry: 'limpio',
};
const COLOR_CACA: Record<string, string> = {
  yellow: 'amarilla', brown: 'marrón', green: 'verde', orange: 'naranja',
  black: 'negra', red: 'roja', white: 'blanca',
};
const CONSISTENCIA_CACA: Record<string, string> = {
  liquid: 'líquida', soft: 'blanda', pasty: 'pastosa', solid: 'sólida',
};

function describirToma(f: Feeding): string {
  const partes: string[] = [];
  const min = (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0);
  if (f.hasBreast) {
    const lados = f.breastMinLeft != null || f.breastMinRight != null
      ? ` (izq ${f.breastMinLeft ?? 0} / der ${f.breastMinRight ?? 0})` : '';
    partes.push(min > 0 ? `Pecho ${min} min${lados}` : 'Pecho (sin minutos registrados)');
    if (f.breastEstimatedMl != null) partes.push(`~${f.breastEstimatedMl} ml estimados`);
  }
  if (f.hasBottle) {
    const tipo = f.bottleType === 'formula' ? 'fórmula' : 'leche materna';
    partes.push(f.bottleMl != null ? `Biberón ${f.bottleMl} ml (${tipo})` : `Biberón (${tipo}, sin ml)`);
  }
  if (f.hasSupplement) {
    partes.push(f.supplementMl != null ? `Jeringa-dedo ${f.supplementMl} ml` : 'Jeringa-dedo (sin ml)');
  }
  return partes.join(' + ') || 'Toma';
}

function describirPanal(d: DiaperChange): string {
  const detalles = [
    d.poopColor ? COLOR_CACA[d.poopColor] : null,
    d.poopConsistency ? CONSISTENCIA_CACA[d.poopConsistency] : null,
  ].filter(Boolean);
  const extra = detalles.length ? ` (${detalles.join(', ')})` : '';
  return `Pañal: ${CONTENIDO_PANAL[d.content] ?? d.content}${extra}`;
}

/** Una línea de texto por registro, ya con su hora. */
function describirRegistro(item: TimelineItem, vigiliaPrevia: number | null, etiquetaSueno?: string): string {
  switch (item.type) {
    case 'feeding': {
      const fin = item.data.endTime ? ` → ${formatTime(item.data.endTime)}` : '';
      return `${formatTime(item.data.timestamp)}${fin}  ${describirToma(item.data)}`;
    }
    case 'rest': {
      const dur = getRestDurationMinutes(item.data);
      const fin = item.data.endTime ? ` → ${formatTime(item.data.endTime)}` : '';
      const vig = vigiliaPrevia != null ? `  [despierto ${formatMinutes(vigiliaPrevia)} antes]` : '';
      const duracion = dur != null ? formatMinutes(dur) : '(en curso)';
      // Con etiqueta se omite el «Sueño» inicial: «Sueño 5h 30m · Sueño
      // nocturno #1» se repetía. La etiqueta ya dice de qué se trata.
      const cuerpo = etiquetaSueno ? `${duracion} · ${etiquetaSueno}` : `Sueño ${duracion}`;
      return `${formatTime(item.data.startTime)}${fin}  ${cuerpo}${vig}`;
    }
    case 'diaper':
      return `${formatTime(item.data.timestamp)}  ${describirPanal(item.data)}`;
    case 'walk': {
      const dur = getWalkDurationMinutes(item.data);
      const fin = item.data.endTime ? ` → ${formatTime(item.data.endTime)}` : '';
      return `${formatTime(item.data.startTime)}${fin}  Paseo ${dur != null ? formatMinutes(dur) : '(en curso)'}`;
    }
    case 'care':
      return `${formatTime(item.data.timestamp)}  ${item.data.label}`;
  }
}

// ── Texto ────────────────────────────────────────────────────────────────────

export function construirTexto(datos: DatosExportacion, op: OpcionesExportacion): string {
  const { config } = datos;
  const nombre = op.ocultarNombre ? 'El bebé' : (config.name?.trim() || 'El bebé');
  const dias = diasDelRango(op.desde, op.hasta);
  const siestas = siestasDelRango(datos.rests, op.desde, op.hasta);
  const etiquetas = etiquetarSuenos(datos.rests, config);
  const pesoReciente = [...datos.weights].sort((a, b) => b.date.localeCompare(a.date))[0];

  const l: string[] = [];

  if (op.pregunta.trim()) {
    l.push(op.pregunta.trim(), '');
  }

  l.push(`REGISTROS DE ${nombre.toUpperCase()}`);
  l.push(`Del ${fechaCorta(op.desde)} al ${fechaCorta(op.hasta)} · ${dias.length} ${dias.length === 1 ? 'día' : 'días'}`);
  const sexo = config.sex === 'male' ? 'Niño' : config.sex === 'female' ? 'Niña' : 'Sin especificar';
  l.push(`${sexo}, ${formatBabyAge(getCurrentDaysOfLife(config))} a día de hoy`);
  if (pesoReciente) l.push(`Peso más reciente: ${formatDose(pesoReciente.weightKg)} kg (${fechaCorta(pesoReciente.date)})`);
  l.push('');

  l.push('CÓMO LEER ESTOS DATOS');
  l.push('- Los minutos al pecho están medidos; los mililitros del pecho son una');
  l.push('  estimación por duración, no una medición real.');
  l.push('- "Sueño" incluye siestas y sueño nocturno. Se numeran por separado:');
  l.push('  las siestas se reinician cada día y los sueños nocturnos, cada noche.');
  l.push('- "Despierto X antes" es el rato que pasó despierto desde que terminó');
  l.push('  el sueño anterior (la ventana de vigilia).');
  l.push('- Solo aparece lo que se registró: un hueco puede significar que no se');
  l.push('  apuntó, no necesariamente que no ocurriera.');
  l.push('');

  // ── Día a día ──────────────────────────────────────────────────────────────
  // Los días sin nada registrado se agrupan en una línea: son información
  // (hubo un hueco), pero un bloque entero por cada uno solo estorba.
  let vacíosSeguidos: string[] = [];
  const volcarVacíos = () => {
    if (vacíosSeguidos.length === 0) return;
    const rango = vacíosSeguidos.length === 1
      ? fechaCorta(vacíosSeguidos[0])
      : `${fechaCorta(vacíosSeguidos[0])} a ${fechaCorta(vacíosSeguidos[vacíosSeguidos.length - 1])}`;
    l.push(`— Sin registros: ${rango} (${vacíosSeguidos.length} ${vacíosSeguidos.length === 1 ? 'día' : 'días'})`);
    l.push('');
    vacíosSeguidos = [];
  };

  for (const dia of dias) {
    const eventos = buildTimeline(
      datos.feedings, datos.rests, datos.diapers,
      {
        vitaminDLogs: datos.vitaminDLogs,
        vitaminDLabel: config.vitaminDMedName,
        probioticLogs: datos.probioticLogs,
        probioticLabel: config.probioticMedName,
        massageLogs: datos.massageLogs,
        medications: datos.medications,
        baths: datos.baths,
      },
      datos.walks,
      dia,
    ).reverse(); // buildTimeline devuelve del más reciente al más antiguo

    if (eventos.length === 0) {
      vacíosSeguidos.push(dia);
      continue;
    }
    volcarVacíos();

    const dv = diaDeVida(config, dia);
    l.push('='.repeat(60));
    l.push(`${fechaLarga(dia).toUpperCase()}${dv != null ? `  (día ${dv} de vida)` : ''}`);

    const r = resumirDia(datos, dia, siestas);
    const resumen = [
      `${r.tomas} ${r.tomas === 1 ? 'toma' : 'tomas'}`,
      r.mlTotal > 0 ? `${r.mlTotal} ml` : null,
      r.minutosPecho > 0 ? `${formatMinutes(r.minutosPecho)} de pecho` : null,
      `${formatMinutes(r.suenoMin)} de sueño en ${r.siestas} ${r.siestas === 1 ? 'sueño' : 'sueños'}`,
      r.vigiliaMediaMin != null ? `vigilia media ${formatMinutes(r.vigiliaMediaMin)} (máx. ${formatMinutes(r.vigiliaMaxMin!)})` : null,
      r.pipis + r.cacas > 0 ? `${r.pipis} pipí / ${r.cacas} caca` : null,
      r.medicamentos > 0 ? `${r.medicamentos} ${r.medicamentos === 1 ? 'medicamento' : 'medicamentos'}` : null,
      r.paseos > 0 ? `${r.paseos} ${r.paseos === 1 ? 'paseo' : 'paseos'}` : null,
    ].filter(Boolean).join(' · ');
    l.push(`Resumen: ${resumen}`);
    l.push('');

    for (const ev of eventos) {
      const vigilia = ev.type === 'rest'
        ? siestas.find((s) => s.inicio === ev.data.startTime)?.vigiliaPreviaMin ?? null
        : null;
      l.push(describirRegistro(ev, vigilia, ev.type === 'rest' ? etiquetas.get(ev.data.id)?.texto : undefined));
    }
    l.push('');
  }

  volcarVacíos();

  // ── Todas las siestas juntas ───────────────────────────────────────────────
  const siestasCerradas = siestas.filter((s) => s.duracionMin != null);
  if (siestasCerradas.length > 0) {
    l.push('='.repeat(60));
    l.push('TODOS LOS SUEÑOS DEL PERIODO');
    l.push('(para ver el patrón de duración y de vigilia de un vistazo)');
    l.push('');
    for (const s of siestasCerradas) {
      const vig = s.vigiliaPreviaMin != null ? `despierto ${formatMinutes(s.vigiliaPreviaMin)} antes` : 'sin dato de vigilia previa';
      const et = s.restId ? etiquetas.get(s.restId)?.texto : undefined;
      l.push(`${fechaCorta(s.dia)}  ${formatTime(s.inicio)} → ${formatTime(s.fin!)}  ${formatMinutes(s.duracionMin!)}` +
        `${et ? `  ·  ${et}` : ''}  ·  ${vig}`);
    }
    const dur = siestasCerradas.map((s) => s.duracionMin!);
    const vigs = siestasCerradas.map((s) => s.vigiliaPreviaMin).filter((v): v is number => v != null);
    l.push('');
    l.push(`Total: ${siestasCerradas.length} sueños · duración media ${formatMinutes(Math.round(dur.reduce((a, b) => a + b, 0) / dur.length))} ` +
      `(de ${formatMinutes(Math.min(...dur))} a ${formatMinutes(Math.max(...dur))})`);
    if (vigs.length) {
      l.push(`Vigilia entre sueños: media ${formatMinutes(Math.round(vigs.reduce((a, b) => a + b, 0) / vigs.length))} ` +
        `(de ${formatMinutes(Math.min(...vigs))} a ${formatMinutes(Math.max(...vigs))})`);
    }
    l.push('');
  }

  l.push('='.repeat(60));
  l.push('Exportado desde Lacty (lacty.es). Los datos los introduce la familia');
  l.push('y son un registro doméstico, no una historia clínica.');

  return l.join('\n');
}

// ── CSV ──────────────────────────────────────────────────────────────────────

const csvCampo = (v: string | number | null | undefined): string => {
  if (v == null || v === '') return '';
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function construirCsv(datos: DatosExportacion, op: OpcionesExportacion): string {
  const dias = diasDelRango(op.desde, op.hasta);
  const siestas = siestasDelRango(datos.rests, op.desde, op.hasta);
  const etiquetas = etiquetarSuenos(datos.rests, datos.config);
  // Punto y coma: es lo que espera Excel en configuración regional española.
  const filas: string[] = [
    ['fecha', 'dia_de_vida', 'hora_inicio', 'hora_fin', 'tipo', 'detalle', 'duracion_min', 'ml', 'vigilia_previa_min', 'notas']
      .join(';'),
  ];

  for (const dia of dias) {
    const eventos = buildTimeline(
      datos.feedings, datos.rests, datos.diapers,
      {
        vitaminDLogs: datos.vitaminDLogs,
        vitaminDLabel: datos.config.vitaminDMedName,
        probioticLogs: datos.probioticLogs,
        probioticLabel: datos.config.probioticMedName,
        massageLogs: datos.massageLogs,
        medications: datos.medications,
        baths: datos.baths,
      },
      datos.walks,
      dia,
    ).reverse();

    const dv = diaDeVida(datos.config, dia);

    for (const ev of eventos) {
      let tipo = '', detalle = '', inicio = '', fin = '', duracion: number | null = null;
      let ml: number | null = null, vigilia: number | null = null, notas = '';

      switch (ev.type) {
        case 'feeding': {
          const f = ev.data;
          tipo = f.hasBreast ? 'pecho' : f.hasBottle ? 'biberon' : 'jeringa';
          detalle = describirToma(f);
          inicio = formatTime(f.timestamp);
          fin = f.endTime ? formatTime(f.endTime) : '';
          const min = (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0);
          duracion = min > 0 ? min : null;
          ml = (f.supplementMl ?? 0) + (f.bottleMl ?? 0) + (f.breastEstimatedMl ?? 0) || null;
          notas = f.notes ?? '';
          break;
        }
        case 'rest': {
          const r = ev.data;
          tipo = 'sueno';
          detalle = etiquetas.get(r.id)?.texto ?? 'Sueño';
          inicio = formatTime(r.startTime);
          fin = r.endTime ? formatTime(r.endTime) : '';
          duracion = getRestDurationMinutes(r);
          vigilia = siestas.find((s) => s.inicio === r.startTime)?.vigiliaPreviaMin ?? null;
          notas = r.notes ?? '';
          break;
        }
        case 'diaper':
          tipo = 'panal';
          detalle = describirPanal(ev.data);
          inicio = formatTime(ev.data.timestamp);
          notas = ev.data.notes ?? '';
          break;
        case 'walk':
          tipo = 'paseo';
          detalle = 'Paseo';
          inicio = formatTime(ev.data.startTime);
          fin = ev.data.endTime ? formatTime(ev.data.endTime) : '';
          duracion = getWalkDurationMinutes(ev.data);
          notas = ev.data.notes ?? '';
          break;
        case 'care': {
          const c = ev.data;
          tipo = c.kind === 'medication' ? 'medicamento' : c.kind === 'massage' ? 'masaje'
            : c.kind === 'bath' ? 'bano' : 'suplemento';
          detalle = c.label;
          inicio = formatTime(c.timestamp);
          if (c.medication?.doseMl != null) ml = c.medication.doseMl;
          notas = c.medication?.notes ?? c.bath?.notes ?? '';
          break;
        }
      }

      filas.push([dia, dv, inicio, fin, tipo, detalle, duracion, ml != null ? formatDose(ml) : '', vigilia, notas]
        .map(csvCampo).join(';'));
    }
  }

  return filas.join('\n');
}
