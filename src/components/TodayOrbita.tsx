/**
 * «Hoy · Órbita»: el cuarto diseño de la pantalla de hoy. Sale de los mockups
 * de rediseño (A1, A4, A5 y A9) y convive con los otros tres mientras se
 * prueba (ver src/timelineDesign.tsx).
 *
 * La idea es que el día se entienda de un vistazo, sin leer:
 *
 *  1. El día es un reloj de 24 h (OrbitaDial): tomas por fuera, sueños por
 *     dentro, pañales como puntos y una aguja en «ahora». En el centro, solo
 *     el número que importa en cada momento: cuánto lleva sin comer, o el
 *     cronómetro de lo que esté en curso.
 *  2. El reloj cambia de estado solo. Durmiendo, el resto del día se apaga y
 *     la siesta crece; si pasa del máximo entre tomas, la espera se pinta en
 *     el propio anillo y baja una frase con qué hacer, no una caja roja.
 *  3. Un dock al alcance del pulgar sustituye a los botones flotantes, y su
 *     botón grande cambia según el momento: «Empezar toma · toca pecho
 *     derecho», «Terminar toma», «Se ha despertado».
 *  4. Al bajar, el reloj se queda arriba en miniatura con el número clave, y
 *     debajo va el registro del día de siempre (el rail compartido).
 */
import { useState, useEffect, useRef } from 'react';
import type {
  BabyConfig, Feeding, Rest, VitaminDLog, ProbioticLog, MassageLog, CalendarEvent,
  DiaperChange, MedicationLog, MedicationPlan, Walk, Bath, Extraction,
} from '../types';
import { getCurrentDaysOfLife, formatBabyAge, formatMinutes, formatTime, isSameDay, todayIso } from '../utils/dateUtils';
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
  minutosParaExtraer,
} from '../utils/feedingUtils';
import { getEffectiveReference, getSleepReference } from '../data/referenceTable';
import { etiquetarSuenos, contarPorTipo, esSuenoNocturno } from '../utils/sleepUtils';
import { cuidadosConAcciones } from './CareToday';
import { useElapsedTime } from '../hooks/useElapsedMinutes';
import { useModoMadrugada } from '../hooks/useModoMadrugada';
import { Rail } from './TimelineRail';
import NextEventBanner from './NextEventBanner';
import DayInsights from './DayInsights';
import WeekComparison from './WeekComparison';
import ExtractionsInsightCard from './ExtractionsInsightCard';
import OrbitaDial from './OrbitaDial';
import { LineaDeAviso, FichasDeCuidado, CajaMl, type Aviso } from './TodayAhora';
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
  onOpenExport: () => void;
  onAdd: (tipo: TipoRegistro) => void;
  onAbrirAñadir: () => void;
  onQuickBreast: () => void;
  onQuickBottle: () => void;
  onQuickRest: () => void;
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

export default function TodayOrbita({
  config, feedings, rests, currentWeightKg, vitaminDLogs,
  calendarEvents, readOnly,
  onOpenAgenda, onOpenExport,
  onAdd, onAbrirAñadir, onQuickBreast, onQuickBottle, onQuickRest,
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
  // Refresco por minuto: la aguja y los «2 h 05» no pueden quedarse quietos.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const ahora = new Date();

  const today = todayIso();
  const daysOfLife = getCurrentDaysOfLife(config);
  const reference = getEffectiveReference(daysOfLife, currentWeightKg);
  const sleepRef = getSleepReference(daysOfLife);

  const todayFeedings = getTodayFeedings(feedings);
  const todayRests = rests.filter((r) => isSameDay(r.startTime, today) || r.endTime == null);
  const todayDiapers = getTodayDiapers(diapers);
  const todayExtractions = extractions.filter((e) => isSameDay(e.timestamp, today));

  const totalMl = getTotalSupplementMl(todayFeedings);
  const totalBottleMl = getTotalBottleMl(todayFeedings);
  const totalEstimatedBreastMl = getTotalEstimatedBreastMl(todayFeedings);
  const totalRestMin = getTodayRestMinutes(rests);
  const wetCount = todayDiapers.filter((d) => d.content === 'wet' || d.content === 'both').length;
  const dirtyCount = todayDiapers.filter((d) => d.content === 'dirty' || d.content === 'both').length;
  const hasBreastWithMinutes = todayFeedings.some(
    (f) => f.hasBreast && ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0
  );
  const avgFeedsTarget = avgDailyFeeds(feedings);

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

  // ── Comer ─────────────────────────────────────────────────────────────────
  const lastFeeding = feedings.length > 0
    ? [...feedings].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
    : null;
  const feedingInProgress = lastFeeding != null && (
    (lastFeeding.hasBreast && lastFeeding.breastMinLeft == null && lastFeeding.breastMinRight == null) ||
    (lastFeeding.hasBottle && lastFeeding.bottleMl == null) ||
    (lastFeeding.hasSupplement && lastFeeding.supplementMl == null)
  );
  const lastFeedingElapsed = lastFeeding && !feedingInProgress
    ? Math.max(0, Math.floor((ahora.getTime() - new Date(lastFeeding.timestamp).getTime()) / 60000))
    : null;
  const feedingLimitMin = reference ? Math.round((24 * 60) / reference.feedsPerDayMin) : 180;
  const nivelToma = nivelDe(lastFeedingElapsed, feedingLimitMin);
  const siguiente = siguienteToma(feedings);

  // Cuándo suele pedir: su propio ritmo si ya hay datos, si no el de su edad.
  const avgGap = getAvgGapMinutes(feedings);
  const prevision = lastFeeding && !feedingInProgress
    ? new Date(new Date(lastFeeding.timestamp).getTime() + (avgGap ?? feedingLimitMin) * 60000)
    : null;
  const espera = lastFeeding && nivelToma === 'alerta'
    ? {
        desde: new Date(lastFeeding.timestamp),
        limite: new Date(new Date(lastFeeding.timestamp).getTime() + feedingLimitMin * 60000),
      }
    : null;

  // ── Dormir ────────────────────────────────────────────────────────────────
  const restInProgress = rests.find((r) => r.endTime == null) ?? null;
  const awakeMin = getAwakeMinutes(rests);
  const nocturno = restInProgress ? esSuenoNocturno(restInProgress.startTime, config) : false;
  const despierto = config.sex === 'female' ? 'Despierta' : config.sex === 'male' ? 'Despierto' : 'Sin dormir';

  // ── Avisos y cuidados ─────────────────────────────────────────────────────
  const avisos: Aviso[] = [];
  const pumpEnMin = minutosParaExtraer(feedings, extractions, lastFeeding, lastFeedingElapsed);
  if (pumpEnMin !== null && pumpEnMin <= 15 && !readOnly) {
    const urgente = pumpEnMin <= 0;
    avisos.push({
      key: 'extraccion',
      urgente,
      titulo: urgente ? 'Toca sacarte leche' : `Sácate leche en ~${pumpEnMin} min`,
      detalle: 'para que esté lista a tiempo',
      accion: 'Apuntar',
      onAccion: () => onAdd('extraccion'),
    });
  }

  const careItems = cuidadosConAcciones({
    config, today,
    ahoraMin: ahora.getHours() * 60 + ahora.getMinutes(),
    vitaminDLogs, probioticLogs, massageLogs, medications, medPlans,
  }, {
    today, massageLogs,
    onGiveVitaminD, onRemoveVitaminD,
    onGiveProbiotic, onRemoveProbiotic,
    onAddMassage, onRemoveMassage,
    onGiveMedicationDose, onUndoMedicationDose,
  });

  // El oscuro de madrugada lo fuerza App para toda la app; aquí solo se
  // aparta lo que a esa hora sobra.
  const madrugada = useModoMadrugada();
  const cuidadosVisibles = madrugada ? careItems.filter((c) => !c.done && c.urgent) : careItems;
  const avisosVisibles = madrugada ? avisos.filter((a) => a.urgente) : avisos;

  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [infoExtraccion, setInfoExtraccion] = useState(false);

  // ── Reloj en miniatura al bajar ───────────────────────────────────────────
  const relojRef = useRef<HTMLDivElement>(null);
  const [relojFuera, setRelojFuera] = useState(false);
  useEffect(() => {
    const el = relojRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setRelojFuera(!e.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dialProps = {
    feedings, rests, diapers, ahora,
    tomaEnCurso: feedingInProgress ? lastFeeding : null,
    enfoque: restInProgress ? 'sueno' as const : null,
  };

  const centro = (
    <CentroDelReloj
      feedingInProgress={feedingInProgress}
      lastFeeding={lastFeeding}
      lastFeedingElapsed={lastFeedingElapsed}
      nivelToma={nivelToma}
      feedingLimitMin={feedingLimitMin}
      prevision={prevision}
      restInProgress={restInProgress}
      nocturno={nocturno}
      awakeMin={awakeMin}
      despierto={despierto}
      ahora={ahora}
    />
  );

  return (
    <div className="p-4 pb-52 lg:pb-32">
      {/* ── Mini reloj fijo al bajar ───────────────────────────────────── */}
      {/* fixed y no sticky: lo que se desplaza es la ventana, no <main>, y un
          sticky dentro de un contenedor con overflow no llega a pegarse. */}
      <div aria-hidden={!relojFuera}>
        <div
          className={`fixed z-30 top-0 inset-x-0 lg:left-60 flex items-center gap-3 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] bg-cream-50 border-b border-gray-200 shadow-sm transition-all duration-200 ${
            relojFuera ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="w-12 shrink-0">
            <OrbitaDial {...dialProps} mini ariaLabel="Reloj de hoy en miniatura" />
          </div>
          <MiniResumen
            feedingInProgress={feedingInProgress}
            lastFeeding={lastFeeding}
            lastFeedingElapsed={lastFeedingElapsed}
            nivelToma={nivelToma}
            restInProgress={restInProgress}
            awakeMin={awakeMin}
            despierto={despierto}
            ahora={ahora}
          />
          <button
            onClick={() => relojRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="ml-auto w-10 h-10 shrink-0 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center touch-manipulation"
            aria-label="Volver al reloj"
            tabIndex={relojFuera ? 0 : -1}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 1. Cabecera ────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Hoy</h1>
        <p className="text-sm text-gray-500 truncate">
          {config.name ? `${config.name} · ` : ''}{formatBabyAge(daysOfLife)}
          {currentWeightKg ? ` · ${currentWeightKg.toLocaleString('es-ES')} kg` : ''}
          {' · '}
          {ahora.toLocaleDateString('es-ES', { weekday: 'long' })}
        </p>
      </div>

      {/* ── 2. El reloj ────────────────────────────────────────────────── */}
      <div ref={relojRef} className="mx-auto mt-3 w-full max-w-[320px]">
        <OrbitaDial
          {...dialProps}
          prevision={nivelToma !== 'alerta' ? prevision : null}
          espera={espera}
          ariaLabel="Reloj de 24 horas con las tomas, los sueños y los pañales de hoy"
        >
          {centro}
        </OrbitaDial>
      </div>

      {/* ── 3. Ya toca comer: una frase con qué hacer ──────────────────── */}
      {nivelToma === 'alerta' && !restInProgress && !feedingInProgress && !readOnly && (
        <div className="mt-4 rounded-2xl border border-coral-200 bg-coral-100 px-4 py-3 flex gap-3 items-start">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-coral-700" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900">
              Toca ofrecerle {siguiente.tipo === 'biberon' ? 'el biberón' : `el pecho ${siguiente.lado}`}
            </p>
            <p className="text-sm text-gray-600 mt-0.5 leading-snug">
              Pasa de las {formatElapsed(feedingLimitMin)} entre tomas que tocan a su edad.
            </p>
          </div>
        </div>
      )}

      {avisosVisibles.length > 0 && <LineaDeAviso aviso={avisosVisibles[0]} pendientes={avisosVisibles.length} />}

      {/* ── 4. Leyenda, que es a la vez el resumen del día ─────────────── */}
      {!madrugada && (
        <div className="mt-4">
          <button
            onClick={() => setResumenAbierto((o) => !o)}
            aria-expanded={resumenAbierto}
            className="w-full grid grid-cols-3 gap-2 text-left touch-manipulation"
          >
            <Leyenda color="var(--orb-toma)" etiqueta="Tomas" valor={String(todayFeedings.length)}
              nota={`${totalEstimatedBreastMl + totalBottleMl + totalMl > 0 ? '~' : ''}${totalEstimatedBreastMl + totalBottleMl + totalMl} ml`} />
            <Leyenda color="var(--orb-sueno)" etiqueta="Sueño" valor={formatMinutes(totalRestMin)}
              nota={conteoHoy.siestas === 1 ? '1 siesta' : `${conteoHoy.siestas} siestas`} />
            <Leyenda color="var(--orb-panal)" etiqueta="Pañales" valor={String(todayDiapers.length)}
              nota={`${wetCount} pis · ${dirtyCount} caca`} />
          </button>
          <button
            onClick={() => setResumenAbierto((o) => !o)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 mt-2 py-1 touch-manipulation"
          >
            {resumenAbierto ? 'Menos detalle' : 'Más detalle del día'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${resumenAbierto ? 'rotate-180' : ''}`} aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {resumenAbierto && (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <CajaMl
                  valor={totalEstimatedBreastMl > 0 ? `~${totalEstimatedBreastMl}` : '—'}
                  etiqueta="pecho ml"
                  color={totalEstimatedBreastMl > 0 ? 'text-pink-600' : 'text-gray-300'}
                  onRecalcular={hasBreastWithMinutes && !readOnly ? onRecalculateTodayBreast : undefined}
                />
                <CajaMl valor={String(totalBottleMl)} etiqueta="biberón ml" color="text-blue-600" />
                <CajaMl valor={String(totalMl)} etiqueta="jeringa ml" color="text-sage-700" />
              </div>
              <DayInsights
                feedings={todayFeedings} rests={todayRests} reference={reference} sleepRef={sleepRef}
                todayRestMinutes={totalRestMin} siestasHoy={conteoHoy.siestas} nocturnosHoy={conteoHoy.nocturnos}
                extractions={todayExtractions} avgFeedsTarget={avgFeedsTarget} baths={baths}
              />
              <WeekComparison feedings={feedings} rests={rests} />
            </div>
          )}
        </div>
      )}

      {/* ── 5. Cuidados: durmiendo, «mientras duerme» ──────────────────── */}
      {cuidadosVisibles.some((c) => !c.done) && (
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 -mb-1">
          {restInProgress ? 'Mientras duerme' : 'Pendiente hoy'}
        </h2>
      )}
      <FichasDeCuidado items={cuidadosVisibles} readOnly={readOnly} />

      {!madrugada && (
        <div className="mt-3">
          <NextEventBanner events={calendarEvents} onOpen={onOpenAgenda} />
        </div>
      )}

      {/* ── 6. Registro del día ────────────────────────────────────────── */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">
        {madrugada ? 'Esta noche' : 'Registros de hoy'}
      </h2>
      {timeline.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-base">Aún no hay registros hoy</p>
          {!readOnly && <p className="text-sm mt-1">Empieza con el botón de abajo.</p>}
        </div>
      ) : (
        <Rail
          variante="cajas"
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
          onInfoExtraction={() => setInfoExtraccion(true)}
        />
      )}

      {timeline.length > 0 && !madrugada && (
        <button
          onClick={onOpenExport}
          className="w-full mt-4 flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 text-left active:bg-gray-50 touch-manipulation"
        >
          <span className="shrink-0 text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4" /><path d="m8 8 4-4 4 4" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-gray-900">Compartir estos registros</span>
            <span className="block text-xs text-gray-500">Para el pediatra o para analizar los patrones con una IA</span>
          </span>
          <span className="text-gray-300 shrink-0">›</span>
        </button>
      )}

      {/* ── 7. El dock del pulgar ──────────────────────────────────────── */}
      {!readOnly && (
        <Dock
          feedingInProgress={feedingInProgress ? lastFeeding : null}
          restInProgress={restInProgress}
          siguiente={siguiente}
          urge={nivelToma === 'alerta'}
          onPanal={() => onAdd('panal')}
          onEmpezarToma={siguiente.tipo === 'biberon' ? onQuickBottle : onQuickBreast}
          onTerminarToma={onStopFeeding}
          onDormir={onQuickRest}
          onDespertar={onStopRest}
          onMas={onAbrirAñadir}
        />
      )}

      {infoExtraccion && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 sm:p-6"
          onClick={() => setInfoExtraccion(false)}
        >
          <div
            className="bg-cream-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Extracciones</h2>
              <button onClick={() => setInfoExtraccion(false)} className="text-gray-400 text-xl touch-manipulation">✕</button>
            </div>
            <ExtractionsInsightCard extractions={todayExtractions} avgFeedsTarget={avgFeedsTarget} reference={reference} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lo que toca después ─────────────────────────────────────────────────────

type Siguiente = { tipo: 'pecho'; lado: 'izquierdo' | 'derecho' } | { tipo: 'biberon' };

/**
 * Qué ofrecerle en la próxima toma. Si la última fue de biberón, biberón; si
 * fue de pecho, el lado contrario al de la última toma de pecho terminada, que
 * es el mismo al que App asigna los minutos al terminarla.
 */
function siguienteToma(feedings: Feeding[]): Siguiente {
  const orden = [...feedings].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const ultima = orden[0];
  if (ultima && ultima.hasBottle && !ultima.hasBreast) return { tipo: 'biberon' };
  const ultimoPecho = orden.find(
    (f) => f.hasBreast && ((f.breastMinLeft ?? 0) > 0 || (f.breastMinRight ?? 0) > 0)
  );
  const fueIzquierdo = ultimoPecho
    ? (ultimoPecho.breastMinLeft ?? 0) >= (ultimoPecho.breastMinRight ?? 0)
    : false;
  return { tipo: 'pecho', lado: fueIzquierdo ? 'derecho' : 'izquierdo' };
}

type Nivel = 'ok' | 'aviso' | 'alerta';

function nivelDe(minutos: number | null, limite: number): Nivel {
  if (minutos === null) return 'ok';
  const ratio = minutos / limite;
  if (ratio >= 1) return 'alerta';
  if (ratio >= 0.85) return 'aviso';
  return 'ok';
}

const COLOR_NIVEL: Record<Nivel, string> = {
  ok: 'text-[var(--orb-toma-texto)]',
  aviso: 'text-amber-700',
  alerta: 'text-[var(--orb-alerta-texto)]',
};

// ── El centro del reloj ─────────────────────────────────────────────────────

function CentroDelReloj({
  feedingInProgress, lastFeeding, lastFeedingElapsed, nivelToma, feedingLimitMin, prevision,
  restInProgress, nocturno, awakeMin, despierto, ahora,
}: {
  feedingInProgress: boolean;
  lastFeeding: Feeding | null;
  lastFeedingElapsed: number | null;
  nivelToma: Nivel;
  feedingLimitMin: number;
  prevision: Date | null;
  restInProgress: Rest | null;
  nocturno: boolean;
  awakeMin: number | null;
  despierto: string;
  ahora: Date;
}) {
  if (feedingInProgress && lastFeeding) {
    return (
      <>
        <Etiqueta>Toma en curso</Etiqueta>
        <CronometroGrande inicio={lastFeeding.timestamp} />
        <p className="text-sm text-gray-700 mt-1">desde las {formatTime(lastFeeding.timestamp)}</p>
      </>
    );
  }
  if (restInProgress) {
    const min = minutosDesde(restInProgress.startTime, ahora);
    return (
      <>
        <Etiqueta>{nocturno ? 'Durmiendo' : 'Siesta'}</Etiqueta>
        <NumeroGrande className="text-[var(--orb-sueno-texto)]">{formatCorto(min)}</NumeroGrande>
        <p className="text-sm text-gray-700 mt-1">desde las {formatTime(restInProgress.startTime)}</p>
      </>
    );
  }
  if (lastFeedingElapsed === null) {
    return (
      <>
        <Etiqueta>Sin tomas aún</Etiqueta>
        <p className="text-sm text-gray-500 mt-1">Apunta la primera con el botón de abajo</p>
      </>
    );
  }
  const pasado = lastFeedingElapsed - feedingLimitMin;
  return (
    <>
      <Etiqueta className={nivelToma === 'alerta' ? 'text-[var(--orb-alerta-texto)] font-bold' : undefined}>Sin comer</Etiqueta>
      <NumeroGrande className={COLOR_NIVEL[nivelToma]}>{formatCorto(lastFeedingElapsed)}</NumeroGrande>
      {nivelToma === 'alerta' ? (
        <p className="text-sm text-gray-700 mt-1">{formatCorto(pasado)} de más</p>
      ) : awakeMin !== null ? (
        <p className="text-sm text-gray-700 mt-1">{despierto} {formatCorto(awakeMin)}</p>
      ) : null}
      {nivelToma !== 'alerta' && prevision && prevision > ahora && (
        <p className="text-xs text-gray-500 mt-0.5">Suele pedir hacia las {formatTime(prevision.toISOString())}</p>
      )}
    </>
  );
}

function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] uppercase tracking-[0.12em] ${className ?? 'text-gray-500'}`}>{children}</p>
  );
}

function NumeroGrande({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <p className={`text-[44px] min-[380px]:text-[50px] font-extrabold leading-none tracking-tight tabular-nums mt-1 ${className}`}>
      {children}
    </p>
  );
}

function CronometroGrande({ inicio }: { inicio: string }) {
  const t = useElapsedTime(inicio);
  return <NumeroGrande className="text-[var(--orb-toma-texto)]">{t}</NumeroGrande>;
}

/** Cabecera fija al bajar: el reloj en pequeño y su número clave. */
function MiniResumen({
  feedingInProgress, lastFeeding, lastFeedingElapsed, nivelToma, restInProgress, awakeMin, despierto, ahora,
}: {
  feedingInProgress: boolean;
  lastFeeding: Feeding | null;
  lastFeedingElapsed: number | null;
  nivelToma: Nivel;
  restInProgress: Rest | null;
  awakeMin: number | null;
  despierto: string;
  ahora: Date;
}) {
  let etiqueta = 'Sin tomas aún';
  let valor: React.ReactNode = null;
  let nota: string | null = null;
  if (feedingInProgress && lastFeeding) {
    etiqueta = 'Toma en curso';
    valor = <MiniCronometro inicio={lastFeeding.timestamp} />;
  } else if (restInProgress) {
    etiqueta = 'Durmiendo';
    valor = <span className="text-[var(--orb-sueno-texto)]">
      {formatCorto(minutosDesde(restInProgress.startTime, ahora))}
    </span>;
  } else if (lastFeedingElapsed !== null) {
    etiqueta = 'Sin comer';
    valor = <span className={COLOR_NIVEL[nivelToma]}>{formatCorto(lastFeedingElapsed)}</span>;
    if (awakeMin !== null) nota = `${despierto.toLowerCase()} ${formatCorto(awakeMin)}`;
  }
  return (
    <div className="min-w-0 leading-tight">
      <p className="text-[11px] text-gray-500 truncate">{etiqueta}</p>
      {valor && <p className="text-xl font-extrabold tabular-nums">{valor}</p>}
      {nota && <p className="text-[11px] text-gray-500 truncate">{nota}</p>}
    </div>
  );
}

function MiniCronometro({ inicio }: { inicio: string }) {
  const t = useElapsedTime(inicio);
  return <span className="text-[var(--orb-toma-texto)]">{t}</span>;
}

function Leyenda({ color, etiqueta, valor, nota }: { color: string; etiqueta: string; valor: string; nota: string }) {
  return (
    <span className="block bg-white rounded-2xl shadow-sm px-3 py-2.5 min-w-0">
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
        {etiqueta}
      </span>
      <span className="block text-xl font-bold text-gray-900 tabular-nums mt-0.5 truncate">{valor}</span>
      <span className="block text-xs text-gray-500 truncate">{nota}</span>
    </span>
  );
}

// ── El dock ─────────────────────────────────────────────────────────────────

/**
 * Sustituye a los botones flotantes en este diseño (App los oculta). El botón
 * grande es lo siguiente que toca hacer; los laterales, lo segundo más común.
 */
function Dock({
  feedingInProgress, restInProgress, siguiente, urge,
  onPanal, onEmpezarToma, onTerminarToma, onDormir, onDespertar, onMas,
}: {
  feedingInProgress: Feeding | null;
  restInProgress: Rest | null;
  siguiente: Siguiente;
  urge: boolean;
  onPanal: () => void;
  onEmpezarToma: () => void;
  onTerminarToma: (f: Feeding) => void;
  onDormir: () => void;
  onDespertar: (r: Rest) => void;
  onMas: () => void;
}) {
  const textoSiguiente = siguiente.tipo === 'biberon' ? 'biberón' : `pecho ${siguiente.lado}`;

  let principal: { titulo: string; nota: React.ReactNode; tono: 'toma' | 'sueno'; onClick: () => void };
  if (feedingInProgress) {
    principal = {
      titulo: 'Terminar toma', tono: 'toma',
      nota: <MiniCronometroTinta inicio={feedingInProgress.timestamp} />,
      onClick: () => onTerminarToma(feedingInProgress),
    };
  } else if (restInProgress) {
    principal = {
      titulo: 'Se ha despertado', tono: 'sueno',
      nota: `durmiendo desde las ${formatTime(restInProgress.startTime)}`,
      onClick: () => onDespertar(restInProgress),
    };
  } else {
    principal = {
      titulo: siguiente.tipo === 'biberon' ? 'Empezar biberón' : 'Empezar toma',
      nota: siguiente.tipo === 'biberon' ? 'como la última' : `toca ${textoSiguiente}`,
      tono: 'toma',
      onClick: onEmpezarToma,
    };
  }

  const relleno = principal.tono === 'toma'
    ? 'bg-[var(--orb-toma)] text-[var(--orb-toma-tinta)]'
    : 'bg-[var(--orb-sueno)] text-[var(--orb-sueno-tinta)]';

  // Por encima del «+» central de la barra inferior, que sobresale de ella.
  return (
    <div className="fixed z-20 left-3 right-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:left-auto lg:right-6 lg:bottom-6 lg:w-[26rem]">
      <div className="bg-white border border-gray-200 rounded-[28px] shadow-lg p-2 flex items-center gap-2">
        <BotonLateral etiqueta="Apuntar pañal" color="var(--orb-panal)" onClick={onPanal}>
          <path d="M3 7h18v3a9 9 0 0 1-18 0V7z" /><path d="M8 7v3M16 7v3" />
        </BotonLateral>
        <button
          onClick={principal.onClick}
          className={`flex-1 min-w-0 h-14 rounded-[20px] flex flex-col items-center justify-center leading-tight touch-manipulation active:brightness-95 ${relleno} ${
            urge && !feedingInProgress && !restInProgress ? 'ring-2 ring-offset-2 ring-[var(--orb-alerta)] ring-offset-white' : ''
          }`}
        >
          <span className="text-base font-extrabold truncate max-w-full px-2">{principal.titulo}</span>
          <span className="text-xs opacity-80 truncate max-w-full px-2">{principal.nota}</span>
        </button>
        {restInProgress ? (
          <BotonLateral etiqueta={`Empezar toma (${textoSiguiente})`} color="var(--orb-toma)" onClick={onEmpezarToma}>
            <BreastPath />
          </BotonLateral>
        ) : (
          <BotonLateral etiqueta="Empezar sueño" color="var(--orb-sueno)" onClick={onDormir}>
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
          </BotonLateral>
        )}
        <BotonLateral etiqueta="Más registros" color="var(--color-gray-600)" onClick={onMas}>
          <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} />
        </BotonLateral>
      </div>
    </div>
  );
}

function BotonLateral({ etiqueta, color, onClick, children }: {
  etiqueta: string; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="w-12 h-14 shrink-0 rounded-[18px] bg-gray-100 flex items-center justify-center touch-manipulation active:brightness-95"
      style={{ color }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function MiniCronometroTinta({ inicio }: { inicio: string }) {
  return <>{useElapsedTime(inicio)}</>;
}

function BreastPath() {
  return (<>
    <path d="M5 4 Q16 4 19 12 Q16 20 5 20" />
    <circle cx="17" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </>);
}

// ── Formatos ────────────────────────────────────────────────────────────────

function minutosDesde(iso: string, ahora: Date): number {
  return Math.max(0, Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000));
}

/** «35 min», «2 h 05»: lo que cabe en grande en el centro del reloj. */
function formatCorto(minutos: number): string {
  const m = Math.max(0, minutos);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
