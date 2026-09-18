/**
 * «Hoy» con el timeline en línea de tiempo. Es una de las tres versiones que
 * conviven mientras se decide cuál se queda (las otras son DailySummary y
 * TodayAhora); cada persona elige la suya y la preferencia se guarda en su
 * cuenta (ver src/timelineDesign.tsx).
 *
 * Todo lo que hay por encima del timeline —cabecera, barra de estado, alertas y
 * chips de cuidados— es idéntico al clásico a propósito: lo único que cambia es
 * el timeline. Cuando se elija una definitiva, la otra se borra.
 */
import { useState, useEffect } from 'react';
import type { BabyConfig, Feeding, Rest, VitaminDLog, ProbioticLog, MassageLog, CalendarEvent, DiaperChange, MedicationLog, MedicationPlan, Walk, Bath, Extraction } from '../types';
import { getCurrentDaysOfLife, formatBabyAge, formatMinutes, isSameDay, todayIso } from '../utils/dateUtils';
import {
  getTodayFeedings,
  getTotalSupplementMl,
  getTotalBottleMl,
  getTotalEstimatedBreastMl,
  getTodayRestMinutes,
  getAwakeMinutes,
  getTodayDiapers,
  buildTimeline,
  avgDailyFeeds,
  getAvgGapMinutes,
} from '../utils/feedingUtils';
import { getEffectiveReference, getSleepReference } from '../data/referenceTable';
import { etiquetarSuenos, contarPorTipo } from '../utils/sleepUtils';
import { cuidadosConAcciones, CareTodayBar } from './CareToday';
import { Rail } from './TimelineRail';
import NextEventBanner from './NextEventBanner';
import DayInsights from './DayInsights';
import ExtractionsInsightCard from './ExtractionsInsightCard';
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
  extractions: Extraction[];
  onEditExtraction: (e: Extraction) => void;
  onDeleteExtraction: (id: string) => void;
}


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
  extractions, onEditExtraction, onDeleteExtraction,
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
  const todayExtractions = extractions.filter((e) => isSameDay(e.timestamp, today));
  const avgFeedsTarget = avgDailyFeeds(feedings);
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
  }, walks, undefined, extractions);
  const etiquetasSueno = etiquetarSuenos(rests, config);
  const conteoHoy = contarPorTipo(rests, config, today);

  const reference = getEffectiveReference(daysOfLife, currentWeightKg);
  const sleepRef = getSleepReference(daysOfLife);

  // Los cuidados que tocan hoy (qué falta y a qué hora) los calcula una función
  // compartida; aquí solo se les enganchan las acciones de esta pantalla.
  const careItems = cuidadosConAcciones({
    config, today,
    ahoraMin: new Date().getHours() * 60 + new Date().getMinutes(),
    vitaminDLogs, probioticLogs, massageLogs, medications, medPlans,
  }, {
    today, massageLogs,
    onGiveVitaminD, onRemoveVitaminD,
    onGiveProbiotic, onRemoveProbiotic,
    onAddMassage, onRemoveMassage,
    onGiveMedicationDose, onUndoMedicationDose,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showExtractionInfo, setShowExtractionInfo] = useState(false);

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

  // Aviso de extracción: solo para quien ya usa alimentación diferida (si
  // nunca ha registrado una extracción, no aplica). Cuánto falta para que
  // toque sacarse leche = tiempo medio entre tomas de este bebé menos lo que
  // suele tardar en sacarse una toma completa, menos lo que lleva ya sin comer.
  const avgGap = getAvgGapMinutes(feedings);
  const pumpDurations = extractions
    .filter((e) => e.purpose === 'replace' && e.durationMin != null)
    .map((e) => e.durationMin!);
  const avgPumpDuration = pumpDurations.length > 0
    ? Math.round(pumpDurations.reduce((a, b) => a + b, 0) / pumpDurations.length)
    : 20;
  const alreadyPumpedThisCycle = lastFeeding != null && extractions.some(
    (e) => e.purpose === 'replace' && new Date(e.timestamp) > new Date(lastFeeding.timestamp)
  );
  const pumpAvisoEnMin = (extractions.length > 0 && !alreadyPumpedThisCycle && avgGap != null && lastFeedingElapsed != null)
    ? (avgGap - avgPumpDuration) - lastFeedingElapsed
    : null;
  const isPumpAlert = pumpAvisoEnMin !== null && pumpAvisoEnMin <= 15;
  const isPumpUrgent = pumpAvisoEnMin !== null && pumpAvisoEnMin <= 0;

  return (
    <div className="p-4 pb-24">
      {/* ── 1. Cabecera ────────────────────────────────────────────────── */}
      <div className="mb-3">
        {/* «Añadir» va en la línea del título: en la de abajo, junto a la edad,
            dejaba un renglón medio vacío y el botón quedaba más lejos del
            pulgar. La fecha puede saltar de línea si el móvil es estrecho. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Hoy</h1>
            <span className="text-base font-semibold text-gray-500">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {!readOnly && (
            <button
              onClick={onAbrirAñadir}
              className="shrink-0 bg-sage-600 text-white font-semibold px-4 py-2 rounded-xl text-sm active:bg-sage-700 touch-manipulation"
            >
              + Añadir
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{formatBabyAge(daysOfLife)}</p>
      </div>

      {/* ── 2. Barra de estado compacta ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
        <div className={`grid divide-x divide-gray-100 ${todayDiapers.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <MiniStat value={String(todayFeedings.length)} label="tomas" icono="🤱" />
          <MiniStat value={formatMinutes(totalRestMin)} label="sueño" color="text-taupe-600" icono="💤" />
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
            <DayInsights feedings={todayFeedings} rests={todayRests} reference={reference} sleepRef={sleepRef} todayRestMinutes={totalRestMin} siestasHoy={conteoHoy.siestas} nocturnosHoy={conteoHoy.nocturnos} extractions={todayExtractions} avgFeedsTarget={avgFeedsTarget} />
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
      {isPumpAlert && pumpAvisoEnMin !== null && (
        <div className={`border-2 rounded-xl p-3 mb-2 ${isPumpUrgent ? 'border-red-400 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🥛</span>
            <span className={`text-sm font-bold ${isPumpUrgent ? 'text-red-700' : 'text-amber-800'}`}>
              {isPumpUrgent ? 'Toca sacarte leche' : `Sácate leche en ~${pumpAvisoEnMin} min`}
            </span>
            <span className={`text-xs ml-auto ${isPumpUrgent ? 'text-red-400' : 'text-amber-600'}`}>
              para que esté lista a tiempo
            </span>
          </div>
        </div>
      )}
      <NextEventBanner events={calendarEvents} onOpen={onOpenAgenda} />

      {/* ── 4. Timeline en rail de tiempo ──────────────────────────────── */}
      <CareTodayBar items={careItems} readOnly={readOnly} />
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Registros de hoy</h2>

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
          onEditExtraction={onEditExtraction}
          onDeleteExtraction={onDeleteExtraction}
          onInfoExtraction={() => setShowExtractionInfo(true)}
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

      {showExtractionInfo && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 sm:p-6"
          onClick={() => setShowExtractionInfo(false)}
        >
          <div
            className="bg-cream-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Extracciones</h2>
              <button onClick={() => setShowExtractionInfo(false)} className="text-gray-400 text-xl touch-manipulation">✕</button>
            </div>
            <ExtractionsInsightCard extractions={todayExtractions} avgFeedsTarget={avgFeedsTarget} reference={reference} />
          </div>
        </div>
      )}
    </div>
  );
}


function MiniStat({ value, label, color, icono }: { value: string; label: string; color?: string; icono?: string }) {
  return (
    <div className="py-2.5 px-1 text-center">
      <p className={`text-lg font-bold leading-tight ${color ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{icono && <span className="mr-0.5">{icono}</span>}{label}</p>
    </div>
  );
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

