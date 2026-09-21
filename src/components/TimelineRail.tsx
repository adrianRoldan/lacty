/**
 * El rail de la línea de tiempo: la lista de registros del día con la hora en
 * una columna, un nodo por registro y una barra continua para lo que dura
 * (sueños, paseos, tomas con minutos).
 *
 * Vive aparte porque lo comparten los diseños de «Hoy» que enseñan el día en
 * orden cronológico: la línea de tiempo (TodayRail) y «Ahora» (TodayAhora).
 * Antes estaba dentro de TodayRail y el segundo no podía usarlo sin duplicar
 * el editar/borrar/finalizar de los seis tipos de registro.
 */
import React, { createContext, useContext } from 'react';
import type {
  Feeding, Rest, DiaperChange, Walk, Extraction, CareEntry, MedicationLog, Bath,
} from '../types';
import { formatTime, formatMinutes, gapMinutes, isSameDay, startDayHint } from '../utils/dateUtils';
import { buildTimeline, getRestDurationMinutes } from '../utils/feedingUtils';
import { useElapsedTime } from '../hooks/useElapsedMinutes';
import { useConfirm } from './ConfirmDialog';
import {
  MedicineIcon, StrollerIcon,
  BottleIcon, SyringeIcon, MoonIcon, NapIcon, DropIcon, PumpIcon, NappyIcon,
} from './CareIcons';
import { BreastIcon } from './FeedingItem';

// ── Paleta del rail ─────────────────────────────────────────────────────────
// Dos paletas para dos variantes, porque el color no se comporta igual de
// puntito que de fondo.
//
// `plano` (la línea de tiempo): el color vive en el nodo y en los chips, así
// que puede permitirse un tono por subtipo —pecho rosa, biberón azul,
// fórmula ámbar— sin cansar.
//
// `cajas` («Ahora»): el color pasa a ser el fondo del registro, y ocho tintes
// distintos en una pantalla se vuelven una macedonia. Se agrupa por CATEGORÍA
// con la paleta de la app —todas las tomas en mostaza, el sueño en lagoon, el
// pañal en taupe, el paseo en sage— y el subtipo lo cuenta el icono, que para
// eso está. Es lo que se validó en el mockup.
//
// Todos los tonos de `cajas` están redefinidos en el bloque `.dark` de
// index.css. No es un detalle: `sky-50` no lo está, y con él las cajas de
// pañal salían BLANCAS de noche con el texto encima sin contraste.
const ACENTO = {
  pecho:   { nodo: 'bg-pink-600',    chip: 'bg-pink-100 text-pink-700' },
  biberon: { nodo: 'bg-blue-600',    chip: 'bg-blue-100 text-blue-700' },
  formula: { nodo: 'bg-amber-600',   chip: 'bg-amber-100 text-amber-700' },
  jeringa: { nodo: 'bg-sage-600',    chip: 'bg-sage-100 text-sage-700' },
  sueno:   { nodo: 'bg-lagoon-300',  chip: 'bg-lagoon-100 text-lagoon-700' },
  panal:   { nodo: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-700' },
  paseo:   { nodo: 'bg-coral-300',   chip: 'bg-coral-100 text-coral-700' },
  extraccion: { nodo: 'bg-cyan-600', chip: 'bg-cyan-100 text-cyan-700' },
  cuidado: { nodo: 'bg-gray-300',    chip: 'bg-gray-100 text-gray-500' },
} as const;

type Acento = keyof typeof ACENTO;

const COMER = {
  nodo: 'bg-mustard-300', caja: 'bg-mustard-100',
  glifo: 'text-mustard-700', chip: 'bg-mustard-200 text-mustard-700',
} as const;

const CAJAS: Record<Acento, { nodo: string; caja: string; glifo: string; chip: string }> = {
  pecho: COMER,
  biberon: COMER,
  formula: COMER,
  jeringa: COMER,
  sueno:   { nodo: 'bg-lagoon-300', caja: 'bg-lagoon-100', glifo: 'text-lagoon-700', chip: 'bg-lagoon-200 text-lagoon-700' },
  // taupe-100 y no -50: sobre el fondo crema de la app, el -50 no llegaba a
  // leerse como una caja.
  panal:   { nodo: 'bg-taupe-200',  caja: 'bg-taupe-100',  glifo: 'text-taupe-700',  chip: 'bg-taupe-200 text-taupe-700' },
  paseo:   { nodo: 'bg-sage-600',   caja: 'bg-sage-50',    glifo: 'text-sage-700',   chip: 'bg-sage-100 text-sage-700' },
  // Rosa y no cian: el cian era el único tinte que gritaba entre los demás, y
  // además se confundía con el lagoon del sueño. El rosa queda libre porque
  // las tomas se han agrupado en mostaza, y la extracción es leche.
  extraccion: { nodo: 'bg-pink-600', caja: 'bg-pink-50',   glifo: 'text-pink-700',   chip: 'bg-pink-100 text-pink-700' },
  // `bg-white` y no un gris: sobre el fondo crema un gray-100 no se ve, y de
  // noche `.dark .bg-white` lo convierte en la superficie oscura de siempre.
  cuidado: { nodo: 'bg-gray-300',   caja: 'bg-white',      glifo: 'text-gray-500',   chip: 'bg-gray-100 text-gray-500' },
};

/**
 * Cómo se pinta cada registro:
 *
 *  - `plano`  — el de la «línea de tiempo»: fila transparente, color en el
 *               nodo y en los chips.
 *  - `cajas`  — el de «Ahora»: cada registro en una cajita del color de su
 *               categoría, con un icono SVG teñido en vez de un emoji.
 *
 * Va por contexto y no por prop para no atravesar con él las seis filas.
 */
export type VarianteRail = 'plano' | 'cajas';
const VarianteCtx = createContext<VarianteRail>('plano');

/** El juego de colores que toca, según la variante en la que se esté pintando. */
function usePaleta(acento: Acento) {
  const enCajas = useContext(VarianteCtx) === 'cajas';
  const p = enCajas ? CAJAS[acento] : ACENTO[acento];
  return { ...p, caja: enCajas ? CAJAS[acento].caja : '', glifo: enCajas ? CAJAS[acento].glifo : '', enCajas };
}

// ── El rail ─────────────────────────────────────────────────────────────────

export type Timeline = ReturnType<typeof buildTimeline>;

export function Rail({
  timeline, today, etiquetasSueno, readOnly,
  onEditFeeding, onDeleteFeeding, onStopFeeding,
  onEditRest, onDeleteRest, onStopRest,
  onEditDiaper, onDeleteDiaper,
  onEditWalk, onDeleteWalk, onStopWalk,
  onEditMedication, onEditBath,
  onEditExtraction, onDeleteExtraction, onInfoExtraction,
  variante = 'plano',
}: {
  timeline: Timeline;
  today: string;
  etiquetasSueno: Map<string, { texto: string }>;
  readOnly?: boolean;
  onEditFeeding: (f: Feeding) => void;
  onDeleteFeeding: (id: string) => void;
  onStopFeeding: (f: Feeding) => void;
  onEditRest: (r: Rest) => void;
  onDeleteRest: (id: string) => void;
  onStopRest: (r: Rest) => void;
  onEditDiaper: (d: DiaperChange) => void;
  onDeleteDiaper: (id: string) => void;
  onEditWalk: (w: Walk) => void;
  onDeleteWalk: (id: string) => void;
  onStopWalk: (w: Walk) => void;
  onEditMedication: (m: MedicationLog) => void;
  onEditBath: (b: Bath) => void;
  onEditExtraction: (e: Extraction) => void;
  onDeleteExtraction: (id: string) => void;
  onInfoExtraction: () => void;
  variante?: VarianteRail;
}) {
  const ahora = new Date();
  let franjaAnterior: string | null = null;

  return (
    <VarianteCtx.Provider value={variante}>
    <div className="relative">
      {/* Marcador de «ahora»: el timeline va de lo más reciente a lo más antiguo */}
      <div className="flex gap-2">
        <span className="w-11 shrink-0 text-right text-[11px] font-semibold text-sage-700 tabular-nums pt-px">
          {formatTime(ahora.toISOString())}
        </span>
        <span className="w-4 shrink-0 relative">
          <span className="absolute left-1/2 -translate-x-1/2 top-2 bottom-0 w-px bg-gray-300" />
          <span className="absolute left-1/2 top-1.5 -translate-x-1/2 w-2 h-2 rounded-full bg-sage-600 ring-2 ring-cream-50" />
        </span>
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-sage-700 pt-px">
          ahora
        </span>
      </div>

      {timeline.map((item, i) => {
        // Lo que empezó ayer y sigue hoy (el sueño nocturno, un paseo largo)
        // se separa bajo su propia cabecera en vez de mezclarse con la noche
        // de hoy, que aún no ha llegado.
        const franja = isSameDay(item.sortKey, today) ? franjaDe(item.sortKey) : 'Ayer';
        const cabecera = franja !== franjaAnterior ? franja : null;
        franjaAnterior = franja;

        const previoTs = anteriorTomaTimestamp(timeline, i);
        const hueco = item.type === 'feeding' && previoTs
          ? gapMinutes(item.data.timestamp, previoTs)
          : null;

        return (
          <div key={`${item.type}-${item.data.id}`}>
            {hueco !== null && <Hueco minutos={hueco} />}
            {cabecera && <FranjaHeader nombre={cabecera} />}
            {item.type === 'feeding' ? (
              <FilaToma feeding={item.data} today={today} readOnly={readOnly}
                onEdit={onEditFeeding} onDelete={onDeleteFeeding} onStop={onStopFeeding} />
            ) : item.type === 'rest' ? (
              <FilaSueno rest={item.data} today={today} readOnly={readOnly}
                etiqueta={etiquetasSueno.get(item.data.id)?.texto}
                onEdit={onEditRest} onDelete={onDeleteRest} onStop={onStopRest} />
            ) : item.type === 'diaper' ? (
              <FilaPanal diaper={item.data} readOnly={readOnly}
                onEdit={onEditDiaper} onDelete={onDeleteDiaper} />
            ) : item.type === 'walk' ? (
              <FilaPaseo walk={item.data} today={today} readOnly={readOnly}
                onEdit={onEditWalk} onDelete={onDeleteWalk} onStop={onStopWalk} />
            ) : item.type === 'extraction' ? (
              <FilaExtraccion extraction={item.data} readOnly={readOnly}
                onEdit={onEditExtraction} onDelete={onDeleteExtraction} onInfo={onInfoExtraction} />
            ) : (
              <FilaCuidado
                entry={item.data}
                onEdit={readOnly ? undefined
                  : item.data.medication ? () => onEditMedication(item.data.medication!)
                  : item.data.bath ? () => onEditBath(item.data.bath!)
                  : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
    </VarianteCtx.Provider>
  );
}

/**
 * Fila base del rail: columna de hora + rail con nodo + contenido.
 * `duracion` convierte el nodo en una barra continua (sueño, paseo, toma con
 * minutos), que es lo que deja «ver» de un vistazo cuánto duró cada cosa.
 */
function Fila({
  horaInicio, horaFin, acento, esBarra, enCurso, avisoDia,
  icono, glifo, titulo, chips, detalle, cronometro,
  onClick, onStop, onDelete, onInfo, etiquetaBorrar,
}: {
  horaInicio: string;
  horaFin?: string | null;
  acento: Acento;
  esBarra?: boolean;
  enCurso?: boolean;
  avisoDia?: string | null;
  icono: React.ReactNode;
  /** Icono SVG para la variante en cajas; sin él se usa el emoji de `icono`. */
  glifo?: React.ReactNode;
  titulo: string;
  chips?: React.ReactNode;
  detalle?: React.ReactNode;
  cronometro?: string;
  onClick?: () => void;
  onStop?: () => void;
  onDelete?: () => void;
  onInfo?: () => void;
  etiquetaBorrar?: string;
}) {
  const { nodo, caja, glifo: colorGlifo, enCajas } = usePaleta(acento);

  return (
    <div className="group flex gap-2">
      {/* Columna de horas: inicio arriba, fin debajo en gris */}
      <div className="w-11 shrink-0 text-right pt-2.5">
        <p className="text-[11px] font-semibold text-gray-600 tabular-nums leading-none">{horaInicio}</p>
        {horaFin && (
          <p className="text-[11px] text-gray-400 tabular-nums leading-none mt-1.5">{horaFin}</p>
        )}
      </div>

      {/* Rail */}
      <div className="w-4 shrink-0 relative">
        <span className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px bg-gray-300" />
        {esBarra ? (
          <span className={`absolute left-1/2 -translate-x-1/2 top-2.5 bottom-2.5 w-1.5 rounded-full ${nodo} ${enCurso ? 'animate-pulse' : ''}`} />
        ) : (
          <span className={`absolute left-1/2 -translate-x-1/2 top-3 w-2.5 h-2.5 rounded-full ring-2 ring-cream-50 ${nodo} ${enCurso ? 'animate-pulse' : ''}`} />
        )}
      </div>

      {/* Contenido. En cajas el color se va al fondo del registro; en plano
          la fila es transparente y el color vive solo en el nodo y los chips. */}
      <div
        onClick={onClick}
        className={`flex-1 min-w-0 flex items-start gap-2 select-none
          ${enCajas
            ? `rounded-xl px-2.5 py-2 mb-1.5 ${caja} ${enCurso ? 'ring-1 ring-gray-300' : ''}`
            : `rounded-xl px-2 py-1.5 mb-0.5 ${enCurso ? 'bg-white shadow-sm' : ''}`}
          ${onClick ? (enCajas ? 'cursor-pointer active:brightness-95' : 'cursor-pointer active:bg-gray-100') : ''}`}
      >
        <span className={`shrink-0 w-5 flex justify-center pt-0.5 leading-none ${enCajas ? colorGlifo : ''}`}>
          {enCajas ? (glifo ?? icono) : icono}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {avisoDia && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {avisoDia}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900">{titulo}</span>
            {chips}
          </div>
          {detalle && <div className="text-xs text-gray-400 mt-0.5 truncate">{detalle}</div>}
        </div>

        {cronometro && (
          <span className="text-xs text-gray-400 tabular-nums shrink-0 self-center">{cronometro}</span>
        )}
        {onStop && (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className="text-red-500 active:text-red-600 p-1.5 shrink-0 self-center touch-manipulation"
            aria-label="Finalizar"
            title="Finalizar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="3" />
            </svg>
          </button>
        )}
        {onInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            className={`p-1.5 shrink-0 self-center touch-manipulation ${
              enCajas ? 'text-gray-400 hover:text-gray-600' : 'text-cyan-400 hover:text-cyan-600'
            }`}
            aria-label="Ver información de extracciones"
            title="Ver información de extracciones"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-300 hover:text-red-400 p-1.5 shrink-0 self-center touch-manipulation
              opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity"
            aria-label={etiquetaBorrar ?? 'Eliminar'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ tono, children }: { tono: Acento; children: React.ReactNode }) {
  const { chip } = usePaleta(tono);
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${chip}`}>
      {children}
    </span>
  );
}

function FilaToma({ feeding, today, readOnly, onEdit, onDelete, onStop }: {
  feeding: Feeding; today: string; readOnly?: boolean;
  onEdit: (f: Feeding) => void; onDelete: (id: string) => void; onStop: (f: Feeding) => void;
}) {
  const confirm = useConfirm();
  const elapsed = useElapsedTime(feeding.timestamp);
  const totalBreastMin = (feeding.breastMinLeft ?? 0) + (feeding.breastMinRight ?? 0);

  const pechoEnCurso = !feeding.endTime && feeding.hasBreast && feeding.breastMinLeft == null && feeding.breastMinRight == null;
  const biberonEnCurso = !feeding.endTime && feeding.hasBottle && feeding.bottleMl == null;
  const jeringaEnCurso = !feeding.endTime && feeding.hasSupplement && feeding.supplementMl == null;
  const enCurso = pechoEnCurso || biberonEnCurso || jeringaEnCurso;

  const acento: Acento = feeding.hasBreast ? 'pecho'
    : feeding.hasBottle ? (feeding.bottleType === 'formula' ? 'formula' : 'biberon')
    : 'jeringa';

  const nombres = [
    feeding.hasBreast && 'Pecho',
    feeding.hasBottle && 'Biberón',
    feeding.hasSupplement && 'Jeringa',
  ].filter(Boolean) as string[];

  const finTs = !enCurso
    ? (feeding.hasBreast && totalBreastMin > 0
        ? new Date(new Date(feeding.timestamp).getTime() + totalBreastMin * 60000).toISOString()
        : feeding.endTime ?? null)
    : null;

  const detalle = [
    feeding.hasBreast && !pechoEnCurso && (feeding.breastMinLeft != null || feeding.breastMinRight != null)
      ? [feeding.breastMinLeft != null ? `izq ${feeding.breastMinLeft} min` : null,
         feeding.breastMinRight != null ? `der ${feeding.breastMinRight} min` : null].filter(Boolean).join(' · ')
      : null,
    feeding.notes ? `“${feeding.notes}”` : null,
    enCurso ? 'Toca para finalizar' : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <Fila
      horaInicio={formatTime(feeding.timestamp)}
      horaFin={finTs ? formatTime(finTs) : null}
      acento={acento}
      esBarra={finTs != null}
      enCurso={enCurso}
      avisoDia={startDayHint(feeding.timestamp, today)}
      icono={<span className="text-base">{feeding.hasBreast ? '🤱' : feeding.hasBottle ? '🍼' : '💉'}</span>}
      glifo={feeding.hasBreast ? <BreastIcon size={16} /> : feeding.hasBottle ? <BottleIcon /> : <SyringeIcon />}
      titulo={nombres.join(' + ') || 'Toma'}
      chips={<>
        {feeding.hasBreast && !pechoEnCurso && totalBreastMin > 0 && <Chip tono="pecho">{formatMinutes(totalBreastMin)}</Chip>}
        {feeding.hasBottle && !biberonEnCurso && (
          <Chip tono={feeding.bottleType === 'formula' ? 'formula' : 'biberon'}>
            {feeding.bottleMl} ml{feeding.bottleType === 'formula' ? ' · fórmula' : ''}
          </Chip>
        )}
        {feeding.hasSupplement && !jeringaEnCurso && <Chip tono="jeringa">{feeding.supplementMl} ml</Chip>}
        {enCurso && <Chip tono={acento}>En curso…</Chip>}
      </>}
      detalle={detalle || null}
      cronometro={enCurso ? elapsed : undefined}
      onClick={readOnly ? undefined : () => onEdit(feeding)}
      onStop={enCurso && !readOnly ? () => onStop(feeding) : undefined}
      onDelete={readOnly ? undefined : async () => {
        if (await confirm('¿Eliminar esta toma?')) onDelete(feeding.id);
      }}
      etiquetaBorrar="Eliminar toma"
    />
  );
}

function FilaSueno({ rest, today, etiqueta, readOnly, onEdit, onDelete, onStop }: {
  rest: Rest; today: string; etiqueta?: string; readOnly?: boolean;
  onEdit: (r: Rest) => void; onDelete: (id: string) => void; onStop: (r: Rest) => void;
}) {
  const confirm = useConfirm();
  const elapsed = useElapsedTime(rest.startTime);
  const duracion = getRestDurationMinutes(rest);
  const enCurso = duracion == null;

  return (
    <Fila
      horaInicio={formatTime(rest.startTime)}
      horaFin={rest.endTime ? formatTime(rest.endTime) : null}
      acento="sueno"
      esBarra
      enCurso={enCurso}
      avisoDia={startDayHint(rest.startTime, today)}
      icono={<span className="text-base">{etiqueta?.startsWith('Siesta') ? '💤' : '🌙'}</span>}
      glifo={etiqueta?.startsWith('Siesta') ? <NapIcon /> : <MoonIcon />}
      titulo={etiqueta ?? 'Sueño'}
      chips={duracion != null
        ? <Chip tono="sueno">{formatMinutes(duracion)}</Chip>
        : <Chip tono="sueno">En curso…</Chip>}
      detalle={rest.notes ? `“${rest.notes}”` : null}
      cronometro={enCurso ? elapsed : undefined}
      onClick={readOnly ? undefined : () => onEdit(rest)}
      onStop={enCurso && !readOnly ? () => onStop(rest) : undefined}
      onDelete={readOnly ? undefined : async () => {
        if (await confirm('¿Eliminar este sueño?')) onDelete(rest.id);
      }}
      etiquetaBorrar="Eliminar sueño"
    />
  );
}

const PANAL_LABEL: Record<string, string> = {
  wet: 'Pipí', dirty: 'Caca', both: 'Pipí + caca', dry: 'Limpio',
};
// Un solo emoji por fila: el título ya dice si hubo pipí, caca o ambos
const PANAL_ICON: Record<string, string> = {
  wet: '💧', dirty: '💩', both: '💩', dry: '✅',
};
const CACA_COLOR: Record<string, string> = {
  yellow: 'amarilla', brown: 'marrón', green: 'verde',
  orange: 'naranja', black: 'negra', red: 'roja ⚠', white: 'blanca ⚠',
};
const CACA_TEXTURA: Record<string, string> = {
  liquid: 'líquida', soft: 'blanda', pasty: 'pastosa', solid: 'sólida',
};

function FilaPanal({ diaper, readOnly, onEdit, onDelete }: {
  diaper: DiaperChange; readOnly?: boolean;
  onEdit: (d: DiaperChange) => void; onDelete: (id: string) => void;
}) {
  const confirm = useConfirm();
  const alarma = diaper.poopColor === 'red' || diaper.poopColor === 'white';
  const detalle = [
    diaper.poopColor ? CACA_COLOR[diaper.poopColor] : null,
    diaper.poopConsistency ? CACA_TEXTURA[diaper.poopConsistency] : null,
    diaper.notes ? `“${diaper.notes}”` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Fila
      horaInicio={formatTime(diaper.timestamp)}
      acento="panal"
      icono={<span className="text-base">{PANAL_ICON[diaper.content]}</span>}
      glifo={diaper.content === 'wet' ? <DropIcon /> : <NappyIcon />}
      titulo={PANAL_LABEL[diaper.content]}
      chips={alarma ? <span className="bg-red-100 text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded-full">⚠ revisar</span> : null}
      detalle={detalle || null}
      onClick={readOnly ? undefined : () => onEdit(diaper)}
      onDelete={readOnly ? undefined : async () => {
        if (await confirm('¿Eliminar este cambio de pañal?')) onDelete(diaper.id);
      }}
      etiquetaBorrar="Eliminar pañal"
    />
  );
}

const LADO_LABEL: Record<Extraction['side'], string> = { left: 'Izquierdo', right: 'Derecho', both: 'Ambos' };

function FilaExtraccion({ extraction, readOnly, onEdit, onDelete, onInfo }: {
  extraction: Extraction; readOnly?: boolean;
  onEdit: (e: Extraction) => void; onDelete: (id: string) => void; onInfo: () => void;
}) {
  const confirm = useConfirm();
  const detalle = [
    extraction.purpose === 'extra' ? 'Extra (banco)' : null,
    extraction.durationMin != null ? `${extraction.durationMin} min` : null,
    extraction.notes ? `“${extraction.notes}”` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Fila
      horaInicio={formatTime(extraction.timestamp)}
      acento="extraccion"
      icono={<span className="text-base">🥛</span>}
      glifo={<PumpIcon />}
      titulo={LADO_LABEL[extraction.side]}
      chips={extraction.ml != null ? <Chip tono="extraccion">{extraction.ml} ml</Chip> : null}
      detalle={detalle || null}
      onClick={readOnly ? undefined : () => onEdit(extraction)}
      onDelete={readOnly ? undefined : async () => {
        if (await confirm('¿Eliminar esta extracción?')) onDelete(extraction.id);
      }}
      onInfo={onInfo}
      etiquetaBorrar="Eliminar extracción"
    />
  );
}

function FilaPaseo({ walk, today, readOnly, onEdit, onDelete, onStop }: {
  walk: Walk; today: string; readOnly?: boolean;
  onEdit: (w: Walk) => void; onDelete: (id: string) => void; onStop: (w: Walk) => void;
}) {
  const confirm = useConfirm();
  const elapsed = useElapsedTime(walk.startTime);
  const duracion = walk.endTime
    ? Math.round((new Date(walk.endTime).getTime() - new Date(walk.startTime).getTime()) / 60000)
    : null;
  const enCurso = duracion == null;

  return (
    <Fila
      horaInicio={formatTime(walk.startTime)}
      horaFin={walk.endTime ? formatTime(walk.endTime) : null}
      acento="paseo"
      esBarra
      enCurso={enCurso}
      avisoDia={startDayHint(walk.startTime, today)}
      icono={<span className="text-coral-700"><StrollerIcon size={16} /></span>}
      glifo={<StrollerIcon size={16} />}
      titulo="Paseo"
      chips={duracion != null
        ? <Chip tono="paseo">{formatMinutes(duracion)}</Chip>
        : <Chip tono="paseo">De paseo…</Chip>}
      detalle={walk.notes ? `“${walk.notes}”` : null}
      cronometro={enCurso ? elapsed : undefined}
      onClick={readOnly ? undefined : () => onEdit(walk)}
      onStop={enCurso && !readOnly ? () => onStop(walk) : undefined}
      onDelete={readOnly ? undefined : async () => {
        if (await confirm('¿Eliminar este paseo?')) onDelete(walk.id);
      }}
      etiquetaBorrar="Eliminar paseo"
    />
  );
}

/** Cuidados puntuales (vitamina, probiótico, masaje, medicamento, baño). */
function FilaCuidado({ entry, onEdit }: { entry: CareEntry; onEdit?: () => void }) {
  const enCajas = useContext(VarianteCtx) === 'cajas';
  return (
    <div className="group flex gap-2">
      <div className="w-11 shrink-0 text-right pt-2">
        <p className="text-[11px] text-gray-400 tabular-nums leading-none">{formatTime(entry.timestamp)}</p>
      </div>
      <div className="w-4 shrink-0 relative">
        <span className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px bg-gray-300" />
        <span className="absolute left-1/2 -translate-x-1/2 top-2.5 w-1.5 h-1.5 rounded-full bg-gray-300 ring-2 ring-cream-50" />
      </div>
      {/* Los cuidados se quedan discretos también en cajas: son el apunte de
          que algo se dio, no un registro que se consulte. */}
      <div className={`flex-1 min-w-0 flex items-center gap-1.5 ${
        enCajas ? `${CAJAS.cuidado.caja} rounded-xl px-2.5 py-1.5 mb-1.5` : 'px-2 py-1'
      }`}>
        <span className="shrink-0 text-xs leading-none">
          {entry.kind === 'medication'
            ? <span className="text-violet-500"><MedicineIcon size={13} /></span>
            : entry.icon}
        </span>
        <span className="text-xs text-gray-500 truncate">{entry.label}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-gray-300 hover:text-sage-600 p-1 shrink-0 touch-manipulation
              opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity"
            aria-label="Editar"
            title="Editar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/** Tiempo transcurrido entre dos tomas, dibujado sobre el propio rail. */
function Hueco({ minutos }: { minutos: number }) {
  return (
    <div className="flex gap-2">
      <span className="w-11 shrink-0" />
      <span className="w-4 shrink-0 relative">
        <span className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px border-l border-dashed border-gray-300" />
      </span>
      <span className="flex-1 text-[11px] text-gray-400 px-2 py-1">
        {formatMinutes(minutos)} sin comer
      </span>
    </div>
  );
}

const FRANJAS: { nombre: string; desde: number }[] = [
  { nombre: 'Noche',     desde: 21 },
  { nombre: 'Tarde',     desde: 14 },
  { nombre: 'Mediodía',  desde: 12 },
  { nombre: 'Mañana',    desde: 6 },
  { nombre: 'Madrugada', desde: 0 },
];

function franjaDe(iso: string): string {
  const hora = new Date(iso).getHours();
  return FRANJAS.find((f) => hora >= f.desde)!.nombre;
}

function FranjaHeader({ nombre }: { nombre: string }) {
  return (
    <div className="flex gap-2 sticky top-0 z-10 bg-cream-50/95 backdrop-blur-sm">
      <span className="w-11 shrink-0" />
      <span className="w-4 shrink-0 relative">
        <span className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px bg-gray-300" />
      </span>
      <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">
        {nombre}
      </span>
    </div>
  );
}

function anteriorTomaTimestamp(timeline: Timeline, index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (timeline[i].type === 'feeding') return (timeline[i].data as Feeding).timestamp;
  }
  return null;
}
