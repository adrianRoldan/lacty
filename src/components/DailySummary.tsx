import { useState, useEffect } from 'react';
import type { BabyConfig, Feeding, Rest, VitaminDLog, ProbioticLog, MassageLog, CalendarEvent, DiaperChange, MedicationLog, MedicationPlan, Walk, Bath, Extraction, CareKind } from '../types';
import { getCurrentDaysOfLife, formatBabyAge, formatMinutes, formatTime, gapMinutes, isSameDay, todayIso } from '../utils/dateUtils';
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
} from '../utils/feedingUtils';
import { getEffectiveReference, getSleepReference } from '../data/referenceTable';
import { etiquetarSuenos, contarPorTipo } from '../utils/sleepUtils';
import { cuidadosDeHoy } from '../utils/cuidadosHoy';
import FeedingItem from './FeedingItem';
import RestItem from './RestItem';
import DiaperItem from './DiaperItem';
import WalkItem from './WalkItem';
import ExtractionItem from './ExtractionItem';
import { MedicineIcon } from './CareIcons';
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
  /**
   * Aviso de la nueva línea de tiempo. Solo llega mientras no se haya ofrecido:
   * al probarla o al cerrarlo, deja de aparecer para siempre.
   */
  avisoLineaDeTiempo?: { onProbar: () => void; onCerrar: () => void };
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

function prevFeedingTimestamp(timeline: ReturnType<typeof buildTimeline>, index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (timeline[i].type === 'feeding') return (timeline[i].data as import('../types').Feeding).timestamp;
  }
  return null;
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

export default function DailySummary({
  config, feedings, rests, currentWeightKg, vitaminDLogs,
  calendarEvents, readOnly,
  onOpenAgenda, onOpenExport, avisoLineaDeTiempo,
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
  const wetCount = todayDiapers.filter((d) => d.content === 'wet' || d.content === 'both').length;
  const dirtyCount = todayDiapers.filter((d) => d.content === 'dirty' || d.content === 'both').length;
  const todayExtractions = extractions.filter((e) => isSameDay(e.timestamp, today));
  const avgFeedsTarget = avgDailyFeeds(feedings);
  const timeline = buildTimeline(feedings, rests, diapers, {
    vitaminDLogs: vitaminDLogs,
    vitaminDLabel: config.vitaminDMedName,
    probioticLogs: probioticLogs,
    probioticLabel: config.probioticMedName,
    massageLogs: massageLogs,
    medications: medications,
    baths: baths,
  }, walks, undefined, extractions);
  // Se numeran sobre todos los sueños, no solo los de hoy: la numeración
  // nocturna necesita ver la noche completa aunque cruce la medianoche.
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
      {/* ── 0. Aviso de la nueva línea de tiempo (una sola vez) ────────── */}
      {avisoLineaDeTiempo && <AvisoLineaDeTiempo {...avisoLineaDeTiempo} />}

      {/* ── 1. Header ──────────────────────────────────────────────────── */}
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
      <NextEventBanner events={calendarEvents} onOpen={onOpenAgenda} />

      {/* ── 4. Timeline — contenido principal ──────────────────────────── */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Registros de hoy</h2>
        {careChips.length > 0 && (
          <CareChipsRow chips={careChips} readOnly={readOnly} />
        )}
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
        <div className="mt-1">
          {timeline.map((item, i) => {
            const morerecentTs = prevFeedingTimestamp(timeline, i);
            const gap =
              item.type === 'feeding' && morerecentTs
                ? gapMinutes(item.data.timestamp, morerecentTs)
                : null;
            return (
              <div key={`${item.type}-${item.data.id}`}>
                {gap !== null && <GapLine minutes={gap} />}
                {item.type === 'feeding' ? (
                  <FeedingItem feeding={item.data} onEdit={onEditFeeding} onDelete={onDeleteFeeding} onStop={onStopFeeding} listDay={today} readOnly={readOnly} />
                ) : item.type === 'rest' ? (
                  <RestItem rest={item.data} onEdit={onEditRest} onDelete={onDeleteRest} onStop={onStopRest} etiqueta={etiquetasSueno.get(item.data.id)?.texto} listDay={today} readOnly={readOnly} />
                ) : item.type === 'diaper' ? (
                  <DiaperItem diaper={item.data} onEdit={onEditDiaper} onDelete={onDeleteDiaper} readOnly={readOnly} />
                ) : item.type === 'walk' ? (
                  <WalkItem walk={item.data} onEdit={onEditWalk} onDelete={onDeleteWalk} onStop={onStopWalk} listDay={today} readOnly={readOnly} />
                ) : item.type === 'extraction' ? (
                  <ExtractionItem extraction={item.data} onEdit={onEditExtraction} onDelete={onDeleteExtraction} readOnly={readOnly} />
                ) : (
                  <CareLine
                    kind={item.data.kind}
                    icon={item.data.icon}
                    label={item.data.label}
                    time={formatTime(item.data.timestamp)}
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

// ── Aviso de la nueva línea de tiempo ───────────────────────────────────────

/**
 * Barra de lado a lado sobre la cabecera. Se ofrece una sola vez: tanto probarla
 * como cerrarla la retiran para siempre, y a partir de ahí se cambia en Ajustes.
 */
function AvisoLineaDeTiempo({ onProbar, onCerrar }: { onProbar: () => void; onCerrar: () => void }) {
  return (
    <div className="-mx-4 -mt-4 mb-4 bg-sage-100 border-b border-sage-200">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onProbar} className="flex items-start gap-3 flex-1 min-w-0 text-left touch-manipulation">
          <span className="text-lg shrink-0 leading-none mt-0.5">✨</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-sage-800">
              Prueba la nueva vista de los registros
            </span>
            <span className="block text-xs text-sage-700 mt-0.5">
              Una línea de tiempo con las horas a un lado y una barra por cada sueño o paseo.
              Puedes volver a la de ahora cuando quieras desde Ajustes.
            </span>
          </span>
        </button>
        <button
          onClick={onCerrar}
          aria-label="No, gracias"
          title="No, gracias"
          className="text-sage-700/60 hover:text-sage-800 p-1 shrink-0 self-start touch-manipulation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Care chips row ──────────────────────────────────────────────────────────

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
                ${colorClass}
                ${!readOnly ? 'active:brightness-95' : 'cursor-default'}`}
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

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function GapLine({ minutes }: { minutes: number }) {
  return (
    <div className="flex items-center gap-2 my-1 px-1">
      <div className="flex-1 border-t border-dashed border-gray-200" />
      <span className="text-xs text-gray-400 shrink-0">{formatMinutes(minutes)} desde la última toma</span>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  );
}

function CareLine({ kind, icon, label, time, onEdit }: {
  kind: CareKind; icon: string; label: string; time: string; onEdit?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pl-4 pr-3 py-1 my-0.5">
      <span className="text-xs text-gray-400 shrink-0 inline-flex items-center gap-1.5">
        {/* Los medicamentos usan icono propio: el emoji 💊 ya lo ocupa la vitamina D */}
        {kind === 'medication'
          ? <span className="text-violet-500"><MedicineIcon size={14} /></span>
          : <span>{icon}</span>}
        <span className="font-medium text-gray-500">{time}</span>
        <span>{label}</span>
      </span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-gray-300 hover:text-sage-600 active:text-sage-700 p-1 shrink-0 touch-manipulation"
          aria-label={kind === 'bath' ? 'Editar baño' : 'Editar medicamento'}
          title="Editar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  );
}
