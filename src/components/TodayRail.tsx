/**
 * «Hoy» con el timeline en línea de tiempo. Es una de las dos versiones que
 * conviven mientras se decide cuál se queda (la otra es DailySummary); cada
 * persona elige la suya y la preferencia se guarda (ver src/timelineDesign.tsx).
 *
 * Todo lo que hay por encima del timeline —cabecera, barra de estado, alertas y
 * chips de cuidados— es idéntico al clásico a propósito: lo único que cambia es
 * el timeline. Cuando se elija una definitiva, la otra se borra.
 */
import { useState, useEffect } from 'react';
import type { BabyConfig, Feeding, Rest, VitaminDLog, ProbioticLog, MassageLog, CalendarEvent, DiaperChange, MedicationLog, MedicationPlan, Walk, Bath, CareEntry } from '../types';
import { getCurrentDaysOfLife, formatBabyAge, formatMinutes, formatTime, gapMinutes, isSameDay, todayIso, startDayHint } from '../utils/dateUtils';
import {
  getTodayFeedings,
  getTotalSupplementMl,
  getTotalBottleMl,
  getTotalEstimatedBreastMl,
  getTodayRestMinutes,
  getAwakeMinutes,
  getTodayDiapers,
  getRestDurationMinutes,
  buildTimeline,
} from '../utils/feedingUtils';
import { getEffectiveReference, getSleepReference } from '../data/referenceTable';
import { etiquetarSuenos, contarPorTipo } from '../utils/sleepUtils';
import { cuidadosDeHoy } from '../utils/cuidadosHoy';
import { useElapsedTime } from '../hooks/useElapsedMinutes';
import { useConfirm } from './ConfirmDialog';
import { MedicineIcon, StrollerIcon } from './CareIcons';
import DayInsights from './DayInsights';
import WeekComparison from './WeekComparison';
import type { TipoRegistro } from './AddRecordSheet';

interface Props {
  config: BabyConfig;
  feedings: Feeding[];
  rests: Rest[];
  currentWeightKg?: number;
  vitaminDLogs: VitaminDLog[];
  calendarEvents: CalendarEvent[];
  readOnly?: boolean;
  onOpenAgenda: () => void;
  /** Abre la exportación de registros, para el pediatra o para una IA. */
  onOpenExport: () => void;
  onAdd: (tipo: TipoRegistro) => void;
  /** Abre la hoja de «Añadir registro», que vive en App para compartirla con la barra inferior. */
  onAbrirAñadir: () => void;
  onEditFeeding: (f: Feeding) => void;
  onEditRest: (r: Rest) => void;
  onDeleteFeeding: (id: string) => void;
  onDeleteRest: (id: string) => void;
  onStopFeeding: (f: Feeding) => void;
  onStopRest: (r: Rest) => void;
  onGiveVitaminD: (date: string) => void;
  onRemoveVitaminD: (date: string) => void;
  probioticLogs: ProbioticLog[];
  onGiveProbiotic: (date: string) => void;
  onRemoveProbiotic: (date: string) => void;
  onRecalculateTodayBreast: () => Promise<void>;
  massageLogs: MassageLog[];
  onAddMassage: (date: string) => void;
  onRemoveMassage: (id: string) => void;
  diapers: DiaperChange[];
  onEditDiaper: (d: DiaperChange) => void;
  onDeleteDiaper: (id: string) => void;
  medications: MedicationLog[];
  onEditMedication: (m: MedicationLog) => void;
  /** Pautas de medicación programadas: salen como chip mientras estén vigentes. */
  medPlans: MedicationPlan[];
  onGiveMedicationDose: (plan: MedicationPlan) => void;
  onUndoMedicationDose: (planId: string) => void;
  baths: Bath[];
  onEditBath: (b: Bath) => void;
  walks: Walk[];
  onEditWalk: (w: Walk) => void;
  onDeleteWalk: (id: string) => void;
  onStopWalk: (w: Walk) => void;
}

interface CareChip {
  key: string;
  icon: string;
  label: string;
  done: boolean;
  urgent: boolean;
  count?: { current: number; total: number };
  onAdd: () => void;
  onUndo?: () => void;
}

// ── Paleta del rail ─────────────────────────────────────────────────────────
// El color vive en el nodo y en el texto de acento, no en un bloque de fondo.
const ACENTO = {
  pecho:   { nodo: 'bg-pink-600',    chip: 'bg-pink-100 text-pink-700' },
  biberon: { nodo: 'bg-blue-600',    chip: 'bg-blue-100 text-blue-700' },
  formula: { nodo: 'bg-amber-600',   chip: 'bg-amber-100 text-amber-700' },
  jeringa: { nodo: 'bg-sage-600',    chip: 'bg-sage-100 text-sage-700' },
  sueno:   { nodo: 'bg-lagoon-300',  chip: 'bg-lagoon-100 text-lagoon-700' },
  panal:   { nodo: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-700' },
  paseo:   { nodo: 'bg-coral-300',   chip: 'bg-coral-100 text-coral-700' },
  cuidado: { nodo: 'bg-gray-300',    chip: 'bg-gray-100 text-gray-500' },
} as const;

type Acento = keyof typeof ACENTO;

export default function TodayRail({
  config, feedings, rests, currentWeightKg, vitaminDLogs,
  calendarEvents, readOnly,
  onOpenAgenda, onOpenExport,
  onAdd, onAbrirAñadir,
  onEditFeeding, onEditRest,
  onDeleteFeeding, onDeleteRest,
  onStopFeeding, onStopRest,
  onGiveVitaminD, onRemoveVitaminD,
  probioticLogs, onGiveProbiotic, onRemoveProbiotic,
  onRecalculateTodayBreast,
  massageLogs, onAddMassage, onRemoveMassage,
  diapers, onEditDiaper, onDeleteDiaper,
  medications, onEditMedication,
  medPlans, onGiveMedicationDose, onUndoMedicationDose,
  baths, onEditBath,
  walks, onEditWalk, onDeleteWalk, onStopWalk,
}: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const todayFeedings = getTodayFeedings(feedings);
  const today = todayIso();
  const todayRests = rests.filter((r) => isSameDay(r.startTime, today) || r.endTime == null);
  const totalMl = getTotalSupplementMl(todayFeedings);
  const totalBottleMl = getTotalBottleMl(todayFeedings);
  const totalEstimatedBreastMl = getTotalEstimatedBreastMl(todayFeedings);
  const totalRestMin = getTodayRestMinutes(rests);
  const hasBreastWithMinutes = todayFeedings.some(
    (f) => f.hasBreast && ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0
  );
  const todayDiapers = getTodayDiapers(diapers);
  const wetCount = todayDiapers.filter((d) => d.content === 'wet' || d.content === 'both').length;
  const dirtyCount = todayDiapers.filter((d) => d.content === 'dirty' || d.content === 'both').length;
  const timeline = buildTimeline(feedings, rests, diapers, {
    vitaminDLogs,
    vitaminDLabel: config.vitaminDMedName,
    probioticLogs,
    probioticLabel: config.probioticMedName,
    massageLogs,
    medications,
    baths,
  }, walks);
  const etiquetasSueno = etiquetarSuenos(rests, config);
  const conteoHoy = contarPorTipo(rests, config, today);

  const reference = getEffectiveReference(daysOfLife, currentWeightKg);
  const sleepRef = getSleepReference(daysOfLife);

  // Los cuidados que tocan hoy los calcula una única función compartida; aquí
  // solo se les enganchan las acciones de esta pantalla.
  const careChips: CareChip[] = cuidadosDeHoy({
    config, today,
    ahoraMin: new Date().getHours() * 60 + new Date().getMinutes(),
    vitaminDLogs, probioticLogs, massageLogs, medications, medPlans,
  }).map((c) => {
    const base = {
      key: c.key,
      icon: c.icono,
      label: c.etiqueta,
      done: c.hecho,
      urgent: c.urgente,
      count: c.total > 1 ? { current: c.hechas, total: c.total } : undefined,
    };
    switch (c.tipo) {
      case 'vitaminD':
        return { ...base,
          onAdd: () => onGiveVitaminD(today),
          onUndo: c.hecho ? () => onRemoveVitaminD(today) : undefined };
      case 'probiotic':
        return { ...base,
          onAdd: () => onGiveProbiotic(today),
          onUndo: c.hecho ? () => onRemoveProbiotic(today) : undefined };
      case 'massage': {
        const ultimo = massageLogs
          .filter((m) => m.date === today)
          .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
          .at(-1);
        return { ...base,
          count: { current: c.hechas, total: c.total },
          onAdd: () => onAddMassage(today),
          onUndo: ultimo ? () => onRemoveMassage(ultimo.id) : undefined };
      }
      default:
        return { ...base,
          count: { current: c.hechas, total: c.total },
          onAdd: () => onGiveMedicationDose(c.plan!),
          onUndo: c.hechas > 0 ? () => onUndoMedicationDose(c.plan!.id) : undefined };
    }
  });

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const lastFeeding = feedings.length > 0
    ? [...feedings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;
  const lastFeedingInProgress = lastFeeding != null && (
    (lastFeeding.hasBreast && lastFeeding.breastMinLeft == null && lastFeeding.breastMinRight == null) ||
    (lastFeeding.hasBottle && lastFeeding.bottleMl == null) ||
    (lastFeeding.hasSupplement && lastFeeding.supplementMl == null)
  );
  const lastFeedingElapsed = lastFeeding && !lastFeedingInProgress
    ? Math.floor((Date.now() - new Date(lastFeeding.timestamp).getTime()) / 60000)
    : null;
  const feedingAlertMin = reference ? Math.round((24 * 60) / reference.feedsPerDayMin) : 180;
  const isFeedingAlert = lastFeedingElapsed !== null && lastFeedingElapsed >= feedingAlertMin;

  const restInProgress = rests.some((r) => r.endTime == null);
  const lastCompletedRest = rests
    .filter((r) => r.endTime != null)
    .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime())[0] ?? null;
  const lastRestElapsed = lastCompletedRest && !restInProgress
    ? Math.floor((Date.now() - new Date(lastCompletedRest.endTime!).getTime()) / 60000)
    : null;

  const awakeMin = getAwakeMinutes(rests);
  const isAwakeAlert = awakeMin !== null && awakeMin >= sleepRef.awakeWindowMaxMin;
  const isAwakeSevere = awakeMin !== null && awakeMin >= sleepRef.awakeWindowMaxMin * 2;

  return (
    <div className="p-4 pb-24">
      {/* ── 1. Cabecera ────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Hoy</h1>
          <span className="text-base font-semibold text-gray-500">
            {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-gray-500">{formatBabyAge(daysOfLife)}</p>
          {!readOnly && (
            <button
              onClick={onAbrirAñadir}
              className="bg-sage-600 text-white font-semibold px-4 py-2 rounded-xl text-sm active:bg-sage-700 touch-manipulation"
            >
              + Añadir
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Barra de estado compacta ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
        <div className={`grid divide-x divide-gray-100 ${todayDiapers.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <MiniStat value={String(todayFeedings.length)} label="tomas" />
          <MiniStat value={formatMinutes(totalRestMin)} label="sueño" color="text-taupe-600" />
          {todayDiapers.length > 0 && (
            <MiniStat value={`${wetCount}·${dirtyCount}`} label="💧·💩" color="text-sky-600" />
          )}
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2.5 text-gray-500 min-w-0">
            <span className="shrink-0">
              {lastFeedingInProgress && (
                <span className="text-pink-500 font-medium animate-pulse">🤱 En curso…</span>
              )}
              {lastFeedingElapsed !== null && !isFeedingAlert && (
                <>🍽️ Hace <span className="font-semibold text-gray-700">{formatElapsed(lastFeedingElapsed)}</span></>
              )}
              {isFeedingAlert && lastFeedingElapsed !== null && (
                <span className="font-bold text-red-600">⚠️ {formatElapsed(lastFeedingElapsed)} sin comer</span>
              )}
              {!lastFeeding && <span className="text-gray-400">Sin tomas aún</span>}
            </span>
            {(lastRestElapsed !== null || restInProgress || rests.length === 0) && (
              <>
                <span className="text-gray-200">·</span>
                <span className="shrink-0">
                  {restInProgress && (
                    <span className="text-lagoon-600 font-medium animate-pulse">🌙 En curso…</span>
                  )}
                  {lastRestElapsed !== null && (
                    <>🌙 Hace <span className="font-semibold text-gray-700">{formatElapsed(lastRestElapsed)}</span></>
                  )}
                  {rests.length === 0 && <span className="text-gray-400">Sin siestas</span>}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            className="text-sage-600 font-semibold px-1.5 touch-manipulation shrink-0"
          >
            {detailsOpen ? 'menos' : 'ver más'}
          </button>
        </div>
        {detailsOpen && (
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="relative bg-gray-50 rounded-xl p-2.5 text-center">
                <span className="text-lg">🤱</span>
                <p className={`text-base font-bold leading-tight ${totalEstimatedBreastMl > 0 ? 'text-pink-500' : 'text-gray-300'}`}>
                  {totalEstimatedBreastMl > 0 ? `~${totalEstimatedBreastMl}` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">pecho ml</p>
                {hasBreastWithMinutes && (
                  <button
                    onClick={onRecalculateTodayBreast}
                    className="absolute top-1 right-1 text-xs text-pink-300 hover:text-pink-500 touch-manipulation"
                    title="Recalcular"
                  >↻</button>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <span className="text-sm">🍼</span>
                <p className="text-base font-bold text-blue-600 leading-tight">{totalBottleMl}</p>
                <p className="text-xs text-gray-400 mt-0.5">biberón ml</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <span className="text-sm">💉</span>
                <p className="text-base font-bold text-sage-600 leading-tight">{totalMl}</p>
                <p className="text-xs text-gray-400 mt-0.5">jeringa ml</p>
              </div>
            </div>
            <DayInsights feedings={todayFeedings} rests={todayRests} reference={reference} sleepRef={sleepRef} todayRestMinutes={totalRestMin} siestasHoy={conteoHoy.siestas} nocturnosHoy={conteoHoy.nocturnos} />
            <WeekComparison feedings={feedings} rests={rests} />
          </div>
        )}
      </div>

      {/* ── 3. Alertas urgentes ────────────────────────────────────────── */}
      {isFeedingAlert && lastFeedingElapsed !== null && (
        <div className="border-2 border-red-400 bg-red-50 rounded-xl p-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span className="text-sm font-bold text-red-700">¡{formatElapsed(lastFeedingElapsed)} sin comer!</span>
            <span className="text-xs text-red-400 ml-auto">máx. {formatElapsed(feedingAlertMin)}</span>
          </div>
        </div>
      )}
      {isAwakeAlert && awakeMin !== null && (
        <div className={`border-2 rounded-xl p-3 mb-2 ${isAwakeSevere ? 'border-red-400 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🌙</span>
            <span className={`text-sm font-bold ${isAwakeSevere ? 'text-red-700' : 'text-amber-800'}`}>
              Despierto {formatElapsed(awakeMin)}
            </span>
            <span className={`text-xs ml-auto ${isAwakeSevere ? 'text-red-400' : 'text-amber-600'}`}>
              máx. {formatElapsed(sleepRef.awakeWindowMaxMin)}
            </span>
          </div>
        </div>
      )}
      <NextEventBanner events={calendarEvents} onOpen={onOpenAgenda} />

      {/* ── 4. Timeline en rail de tiempo ──────────────────────────────── */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Registros de hoy</h2>
        {careChips.length > 0 && <CareChipsRow chips={careChips} readOnly={readOnly} />}
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🍼</p>
          <p className="text-base">Aún no hay registros hoy</p>
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={() => onAdd('toma')} className="text-mustard-600 font-medium touch-manipulation">+ Toma</button>
            <button onClick={() => onAdd('sueno')} className="text-lagoon-600 font-medium touch-manipulation">+ Sueño</button>
          </div>
        </div>
      ) : (
        <Rail
          timeline={timeline}
          today={today}
          etiquetasSueno={etiquetasSueno}
          readOnly={readOnly}
          onEditFeeding={onEditFeeding}
          onDeleteFeeding={onDeleteFeeding}
          onStopFeeding={onStopFeeding}
          onEditRest={onEditRest}
          onDeleteRest={onDeleteRest}
          onStopRest={onStopRest}
          onEditDiaper={onEditDiaper}
          onDeleteDiaper={onDeleteDiaper}
          onEditWalk={onEditWalk}
          onDeleteWalk={onDeleteWalk}
          onStopWalk={onStopWalk}
          onEditMedication={onEditMedication}
          onEditBath={onEditBath}
        />
      )}

      {/* Compartir: aparece al final del día, que es cuando surge la idea de
          enseñárselo a alguien. */}
      {timeline.length > 0 && (
        <button
          onClick={onOpenExport}
          className="w-full mt-4 flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 text-left active:bg-gray-50 touch-manipulation"
        >
          <span className="text-xl shrink-0" aria-hidden="true">📤</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-gray-900">Compartir estos registros</span>
            <span className="block text-xs text-gray-500">
              Para el pediatra o para analizar los patrones con una IA
            </span>
          </span>
          <span className="text-gray-300 shrink-0">›</span>
        </button>
      )}

    </div>
  );
}

// ── El rail ─────────────────────────────────────────────────────────────────

type Timeline = ReturnType<typeof buildTimeline>;

function Rail({
  timeline, today, etiquetasSueno, readOnly,
  onEditFeeding, onDeleteFeeding, onStopFeeding,
  onEditRest, onDeleteRest, onStopRest,
  onEditDiaper, onDeleteDiaper,
  onEditWalk, onDeleteWalk, onStopWalk,
  onEditMedication, onEditBath,
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
}) {
  const ahora = new Date();
  let franjaAnterior: string | null = null;

  return (
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
  );
}

/**
 * Fila base del rail: columna de hora + rail con nodo + contenido.
 * `duracion` convierte el nodo en una barra continua (sueño, paseo, toma con
 * minutos), que es lo que deja «ver» de un vistazo cuánto duró cada cosa.
 */
function Fila({
  horaInicio, horaFin, acento, esBarra, enCurso, avisoDia,
  icono, titulo, chips, detalle, cronometro,
  onClick, onStop, onDelete, etiquetaBorrar,
}: {
  horaInicio: string;
  horaFin?: string | null;
  acento: Acento;
  esBarra?: boolean;
  enCurso?: boolean;
  avisoDia?: string | null;
  icono: React.ReactNode;
  titulo: string;
  chips?: React.ReactNode;
  detalle?: React.ReactNode;
  cronometro?: string;
  onClick?: () => void;
  onStop?: () => void;
  onDelete?: () => void;
  etiquetaBorrar?: string;
}) {
  const { nodo } = ACENTO[acento];

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

      {/* Contenido */}
      <div
        onClick={onClick}
        className={`flex-1 min-w-0 flex items-start gap-2 rounded-xl px-2 py-1.5 mb-0.5 select-none
          ${onClick ? 'cursor-pointer active:bg-gray-100' : ''}
          ${enCurso ? 'bg-white shadow-sm' : ''}`}
      >
        <span className="shrink-0 w-5 flex justify-center pt-0.5 leading-none">{icono}</span>
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
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${ACENTO[tono].chip}`}>
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
      icono={<span className="text-base">🌙</span>}
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
  return (
    <div className="group flex gap-2">
      <div className="w-11 shrink-0 text-right pt-2">
        <p className="text-[11px] text-gray-400 tabular-nums leading-none">{formatTime(entry.timestamp)}</p>
      </div>
      <div className="w-4 shrink-0 relative">
        <span className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px bg-gray-300" />
        <span className="absolute left-1/2 -translate-x-1/2 top-2.5 w-1.5 h-1.5 rounded-full bg-gray-300 ring-2 ring-cream-50" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1">
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

// ── Piezas compartidas con el diseño actual ─────────────────────────────────

function CareChipsRow({ chips, readOnly }: { chips: CareChip[]; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {chips.map((chip) => {
        const countLabel = chip.count ? ` ${chip.count.current}/${chip.count.total}` : '';
        const canAdd = !readOnly && !chip.done;
        const canUndo = !readOnly && !!chip.onUndo;

        const colorClass = chip.done
          ? 'bg-green-100 text-green-700'
          : chip.urgent
            ? 'bg-amber-100 text-amber-800'
            : 'bg-gray-100 text-gray-500';

        return (
          <div key={chip.key} className="flex items-center rounded-full overflow-hidden">
            <button
              onClick={canAdd ? chip.onAdd : (!readOnly && chip.done && !chip.count ? chip.onUndo : undefined)}
              className={`flex items-center gap-1 pl-2.5 ${canUndo ? 'pr-1.5' : 'pr-2.5'} py-1 text-xs font-semibold touch-manipulation transition-colors
                ${colorClass} ${!readOnly ? 'active:brightness-95' : 'cursor-default'}`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}{countLabel}</span>
              {chip.done && !chip.count && <span className="ml-0.5">✓</span>}
            </button>
            {canUndo && (
              <button
                onClick={chip.onUndo}
                className={`pr-2 pl-1 py-1 text-xs touch-manipulation active:brightness-95 border-l border-white/40 ${colorClass}`}
                title="Deshacer"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="py-2.5 px-1 text-center">
      <p className={`text-lg font-bold leading-tight ${color ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const EVENT_CAT_META: Record<string, { icon: string; label: string }> = {
  pediatra: { icon: '🩺', label: 'Pediatra' },
  matrona:  { icon: '👩‍⚕️', label: 'Matrona' },
  fisio:    { icon: '💪', label: 'Fisio' },
  vacuna:   { icon: '💉', label: 'Vacuna' },
  analisis: { icon: '🔬', label: 'Análisis' },
  revision: { icon: '👶', label: 'Revisión' },
  otro:     { icon: '📌', label: 'Otro' },
};

function NextEventBanner({ events, onOpen }: { events: CalendarEvent[]; onOpen: () => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = todayIso();
  const now = Date.now();

  const candidates = events
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time ?? '99')).localeCompare(b.date + (b.time ?? '99')));

  const next = candidates.find((e) => {
    if (e.date !== today || !e.time) return true;
    const [h, m] = e.time.split(':').map(Number);
    const eventTime = new Date(today + 'T00:00:00');
    eventTime.setHours(h, m, 0, 0);
    return now - eventTime.getTime() < 2 * 60 * 60 * 1000;
  });
  if (!next) return null;

  const meta = EVENT_CAT_META[next.category] ?? EVENT_CAT_META.otro;
  const isToday = next.date === today;
  const isTomorrow = next.date === isoPlusDays(today, 1);
  const whenLabel = isToday ? 'Hoy' : isTomorrow ? 'Mañana'
    : new Date(next.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  let isPast = false;
  if (isToday && next.time) {
    const [h, m] = next.time.split(':').map(Number);
    const eventTime = new Date(today + 'T00:00:00');
    eventTime.setHours(h, m, 0, 0);
    isPast = now > eventTime.getTime();
  }

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left rounded-2xl p-3 mb-4 flex items-center gap-3 touch-manipulation active:opacity-80 ${
        isPast ? 'bg-gray-100 opacity-60' : isToday ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white shadow-sm'
      }`}
    >
      <span className="text-xl shrink-0">{isPast ? '✅' : '📅'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${
          isPast ? 'text-gray-500 line-through' : isToday ? 'font-bold text-blue-800' : 'font-semibold text-gray-800'
        }`}>
          {isPast ? 'Cita pasada' : isToday ? '¡Cita hoy!' : 'Próxima cita'} · {whenLabel}{next.time ? ` ${next.time}` : ''}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {meta.icon} {next.title || meta.label}
        </p>
      </div>
      <span className="text-gray-300 text-sm">›</span>
    </button>
  );
}

function isoPlusDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
