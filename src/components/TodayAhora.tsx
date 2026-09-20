/**
 * «Hoy · Ahora»: el tercer diseño de la pantalla de hoy, y el que se propone
 * dejar. Convive con el clásico y con la línea de tiempo mientras se valida
 * (ver src/timelineDesign.tsx).
 *
 * Lo que cambia respecto a los otros dos no es el registro del día —abajo va
 * el mismo rail compartido— sino todo lo que hay encima:
 *
 *  1. Una sola tarjeta responde lo que de verdad se mira con el bebé en
 *     brazos: cuánto lleva sin comer y cuánto lleva despierto, en grande y con
 *     su barra contra la referencia de su edad. En los otros diseños eso vive
 *     en una línea gris de 11px debajo de las mini-estadísticas.
 *  2. Los avisos dejan de apilarse. Pasarse de hora tiñe el propio número
 *     (ámbar, y coral cuando se pasa del todo) en vez de añadir una caja
 *     roja; solo baja una línea cuando hay algo que HACER, y si hubiera más
 *     de una, esperan detrás con su contador.
 *  3. Registrar toma y sueño son dos botones grandes dentro de la tarjeta;
 *     el resto de tipos siguen en la hoja de «Añadir».
 *  4. Los cuidados son una fila de fichas que se lee de un vistazo, no un
 *     chip resumen que hay que abrir para saber qué falta.
 *  5. De 23:00 a 7:00 entra en MODO MADRUGADA: la pantalla se queda en lo
 *     único que se usa a esa hora —el cronómetro de lo que está en curso y un
 *     botón grande para terminarlo— y fuerza el oscuro aunque el tema sea
 *     claro. Se va el resumen del día, la próxima cita y los cuidados que no
 *     corren prisa; los que ya tocaban se quedan, porque una dosis de
 *     medicación de madrugada es justo lo que no se puede esconder.
 */
import { useState, useEffect } from 'react';
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
} from '../utils/feedingUtils';
import { getEffectiveReference, getSleepReference } from '../data/referenceTable';
import { etiquetarSuenos, contarPorTipo } from '../utils/sleepUtils';
import { cuidadosConAcciones, CareSheet, type CareItem } from './CareToday';
import { useElapsedTime } from '../hooks/useElapsedMinutes';
import { useModoMadrugada, MADRUGADA_DESDE } from '../hooks/useModoMadrugada';
import { Rail } from './TimelineRail';
import NextEventBanner from './NextEventBanner';
import DayInsights from './DayInsights';
import WeekComparison from './WeekComparison';
import ExtractionsInsightCard from './ExtractionsInsightCard';
import { MedicineIcon } from './CareIcons';
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

export default function TodayAhora({
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
  // Refresco por minuto: los «hace 2 h 05» son la pantalla, así que no pueden
  // quedarse congelados mientras se mira.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

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

  // ── Reloj de la izquierda: comer ──────────────────────────────────────────
  const lastFeeding = feedings.length > 0
    ? [...feedings].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
    : null;
  const feedingInProgress = lastFeeding != null && (
    (lastFeeding.hasBreast && lastFeeding.breastMinLeft == null && lastFeeding.breastMinRight == null) ||
    (lastFeeding.hasBottle && lastFeeding.bottleMl == null) ||
    (lastFeeding.hasSupplement && lastFeeding.supplementMl == null)
  );
  // Math.max: una toma apuntada con hora futura (un dedazo en el formulario)
  // daría un número negativo, y el número grande es toda la pantalla.
  const lastFeedingElapsed = lastFeeding && !feedingInProgress
    ? Math.max(0, Math.floor((Date.now() - new Date(lastFeeding.timestamp).getTime()) / 60000))
    : null;
  const feedingLimitMin = reference ? Math.round((24 * 60) / reference.feedsPerDayMin) : 180;

  // ── Reloj de la derecha: dormir ───────────────────────────────────────────
  const restInProgress = rests.find((r) => r.endTime == null) ?? null;
  const awakeMin = getAwakeMinutes(rests);

  // ── Aviso accionable: sacarse leche a tiempo ──────────────────────────────
  // Solo para quien ya usa alimentación diferida: cuánto falta para que toque
  // sacarse leche = tiempo medio entre tomas menos lo que tarda en sacarse una
  // toma completa, menos lo que lleva ya sin comer.
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
  const pumpEnMin = (extractions.length > 0 && !alreadyPumpedThisCycle && avgGap != null && lastFeedingElapsed != null)
    ? (avgGap - avgPumpDuration) - lastFeedingElapsed
    : null;

  const avisos: Aviso[] = [];
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
    ahoraMin: new Date().getHours() * 60 + new Date().getMinutes(),
    vitaminDLogs, probioticLogs, massageLogs, medications, medPlans,
  }, {
    today, massageLogs,
    onGiveVitaminD, onRemoveVitaminD,
    onGiveProbiotic, onRemoveProbiotic,
    onAddMassage, onRemoveMassage,
    onGiveMedicationDose, onUndoMedicationDose,
  });

  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [infoExtraccion, setInfoExtraccion] = useState(false);

  // ── Modo madrugada ────────────────────────────────────────────────────────
  // Aquí solo se decide el CONTENIDO. El oscuro lo fuerza App para toda la app:
  // si lo hiciera esta pantalla, al tocar «Historial» a las tres de la mañana
  // se volvería blanca de golpe.
  const madrugada = useModoMadrugada();

  const enCurso: EnCurso | null = feedingInProgress && lastFeeding
    ? { tipo: 'toma', inicio: lastFeeding.timestamp, detalle: detalleDeToma(lastFeeding),
        onTerminar: () => onStopFeeding(lastFeeding) }
    : restInProgress
      ? { tipo: 'sueno', inicio: restInProgress.startTime, detalle: null,
          onTerminar: () => onStopRest(restInProgress) }
      : null;

  // La toma de ANTES de la que está en curso. Sin esto, la tarjeta de contexto
  // repetía la hora de inicio del propio cronómetro.
  const tomaPrevia = feedingInProgress
    ? [...feedings].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).find((f) => f.id !== lastFeeding?.id) ?? null
    : lastFeeding;
  const previaHaceMin = tomaPrevia
    ? Math.max(0, Math.floor((Date.now() - new Date(tomaPrevia.timestamp).getTime()) / 60000))
    : null;

  // Cuántas veces ha comido desde que empezó esta noche: es la pregunta de las
  // cuatro de la mañana, y no depende de dónde caiga la medianoche.
  const desdeLaNoche = inicioDeLaNoche().getTime();
  const tomasDeLaNoche = feedings.filter((f) => new Date(f.timestamp).getTime() >= desdeLaNoche).length;

  const cuidadosVisibles = madrugada ? careItems.filter((c) => !c.done && c.urgent) : careItems;
  const avisosVisibles = madrugada ? avisos.filter((a) => a.urgente) : avisos;

  return (
    <div className="p-4 pb-24">
      {/* ── 1. Cabecera ────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {madrugada ? 'Madrugada' : 'Hoy'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {madrugada
              ? new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            {config.name ? ` · ${config.name}, ` : ' · '}
            {formatBabyAge(daysOfLife)}
          </p>
        </div>
        {madrugada && (
          <span
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500"
            title={`De ${MADRUGADA_DESDE}:00 a 7:00 la pantalla se simplifica y la app se pone oscura`}
          >
            <MoonGlyph />
            Modo noche
          </span>
        )}
      </div>

      {/* ── 2. La tarjeta «Ahora» ──────────────────────────────────────── */}
      {madrugada && enCurso ? (
        <TarjetaEnCurso enCurso={enCurso} readOnly={readOnly} />
      ) : (
      <TarjetaAhora
        feedingInProgress={feedingInProgress}
        lastFeedingStart={lastFeeding?.timestamp}
        lastFeedingElapsed={lastFeedingElapsed}
        feedingLimitMin={feedingLimitMin}
        hayTomas={feedings.length > 0}
        restInProgress={restInProgress}
        awakeMin={awakeMin}
        awakeLimitMin={sleepRef.awakeWindowMaxMin}
        haySuenos={rests.length > 0}
        sexo={config.sex}
        readOnly={readOnly}
        onAddToma={() => onAdd('toma')}
        onAddSueno={() => onAdd('sueno')}
        onAbrirAñadir={onAbrirAñadir}
      />
      )}

      {/* ── 3. Una sola línea de acción, con cola si hiciera falta ─────── */}
      {avisosVisibles.length > 0 && <LineaDeAviso aviso={avisosVisibles[0]} pendientes={avisosVisibles.length} />}

      {/* ── 4. Cuidados del día ────────────────────────────────────────── */}
      <FichasDeCuidado items={cuidadosVisibles} readOnly={readOnly} />

      {/* ── 5. Resumen del día, plegado ────────────────────────────────── */}
      {madrugada ? (
        <div className="flex gap-2 mt-3">
          {enCurso && (
            <TarjetaContexto
              etiqueta="Toma anterior"
              valor={tomaPrevia ? formatTime(tomaPrevia.timestamp) : '—'}
              nota={previaHaceMin !== null ? `hace ${formatElapsed(previaHaceMin)}` : undefined}
            />
          )}
          <TarjetaContexto
            etiqueta="Esta noche"
            valor={tomasDeLaNoche === 1 ? '1 toma' : `${tomasDeLaNoche} tomas`}
            nota={enCurso ? undefined : 'desde las 23:00'}
          />
        </div>
      ) : (
      <div className="bg-white rounded-2xl shadow-sm mt-3 overflow-hidden">
        <button
          onClick={() => setResumenAbierto((o) => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left touch-manipulation active:bg-gray-50"
        >
          <Dato valor={String(todayFeedings.length)} unidad="tomas" color="text-mustard-700" />
          <Separador />
          <Dato valor={String(totalEstimatedBreastMl + totalBottleMl + totalMl)} unidad="ml" color="text-mustard-700" />
          <Separador />
          <Dato valor={formatMinutes(totalRestMin)} unidad="sueño" color="text-lagoon-700" />
          {todayDiapers.length > 0 && (
            <>
              <Separador />
              <Dato valor={`${wetCount}·${dirtyCount}`} unidad="pañales" color="text-taupe-700" />
            </>
          )}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 ml-auto text-gray-300 transition-transform ${resumenAbierto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {resumenAbierto && (
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3">
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
              extractions={todayExtractions} avgFeedsTarget={avgFeedsTarget}
            />
            <WeekComparison feedings={feedings} rests={rests} />
          </div>
        )}
      </div>
      )}

      {/* ── 6. Próxima cita ────────────────────────────────────────────── */}
      {/* A las cuatro de la mañana, una cita del jueves no pinta nada. */}
      {!madrugada && (
        <div className="mt-3">
          <NextEventBanner events={calendarEvents} onOpen={onOpenAgenda} />
        </div>
      )}

      {/* ── 7. Registro del día ────────────────────────────────────────── */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-2">
        {madrugada ? 'Esta noche' : 'Registros de hoy'}
      </h2>
      {timeline.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-base">{madrugada ? 'Nada apuntado esta noche' : 'Aún no hay registros hoy'}</p>
          {!readOnly && (
            <p className="text-sm mt-1">Empieza por los dos botones de arriba.</p>
          )}
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
            <span className="block text-xs text-gray-500">
              Para el pediatra o para analizar los patrones con una IA
            </span>
          </span>
          <span className="text-gray-300 shrink-0">›</span>
        </button>
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

// ── Modo madrugada ──────────────────────────────────────────────────────────

interface EnCurso {
  tipo: 'toma' | 'sueno';
  inicio: string;
  detalle: string | null;
  onTerminar: () => void;
}

/**
 * De madrugada, lo que está en curso ES la pantalla: un cronómetro que se lee
 * a un metro y un botón que ocupa todo el ancho. Nada más, porque a esa hora
 * no se consulta nada, se termina una toma y se vuelve a la cama.
 */
function TarjetaEnCurso({ enCurso, readOnly }: { enCurso: EnCurso; readOnly?: boolean }) {
  const esToma = enCurso.tipo === 'toma';
  // Una toma se cronometra —los minutos de cada pecho cuentan—, un sueño no:
  // ahí «48:01» se lee como horas y los segundos solo son ruido.
  const cronometro = useElapsedTime(enCurso.inicio);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(enCurso.inicio).getTime()) / 60000));
  const t = esToma ? cronometro : formatElapsed(minutos);
  const acento = esToma ? 'text-mustard-700' : 'text-lagoon-700';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${esToma ? 'bg-mustard-300' : 'bg-lagoon-300'}`} aria-hidden="true" />
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${acento}`}>
          {esToma ? 'Toma en curso' : 'Durmiendo'}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          desde las {formatTime(enCurso.inicio)}
        </span>
      </div>

      <p className={`font-bold tracking-tight tabular-nums text-gray-900 mt-2 ${
        esToma ? 'text-[54px] leading-[58px]' : 'text-[44px] leading-[50px]'
      }`}>
        {t}
      </p>

      {enCurso.detalle && (
        <p className="text-sm text-gray-500 mt-1.5">{enCurso.detalle}</p>
      )}

      {!readOnly && (
        <button
          onClick={enCurso.onTerminar}
          className="w-full h-14 rounded-2xl bg-sage-600 text-white text-base font-bold mt-4 touch-manipulation active:bg-sage-700"
        >
          {esToma ? 'Terminar toma' : 'Terminar sueño'}
        </button>
      )}
    </div>
  );
}

function TarjetaContexto({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm px-3 py-2.5">
      <p className="text-[11px] text-gray-400 truncate">{etiqueta}</p>
      <p className="text-[15px] font-semibold text-gray-900 mt-0.5 truncate tabular-nums">{valor}</p>
      {nota && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{nota}</p>}
    </div>
  );
}

/** Qué se está dando en una toma abierta, para no tener que abrirla. */
function detalleDeToma(f: Feeding): string | null {
  const partes = [
    f.hasBreast && 'pecho',
    f.hasBottle && 'biberón',
    f.hasSupplement && 'jeringa',
  ].filter(Boolean) as string[];
  if (partes.length === 0) return null;
  return partes.join(' + ').replace(/^./, (c) => c.toUpperCase());
}

/**
 * Cuándo empezó la noche en curso: si aún no han dado las 7, la de ayer;
 * si ya es de día, la que viene.
 */
function inicioDeLaNoche(ahora: Date = new Date()): Date {
  const d = new Date(ahora);
  if (d.getHours() < MADRUGADA_DESDE) d.setDate(d.getDate() - 1);
  d.setHours(MADRUGADA_DESDE, 0, 0, 0);
  return d;
}

// ── La tarjeta «Ahora» ──────────────────────────────────────────────────────

/**
 * Tres niveles en vez de una alerta que sale o no sale: mientras va bien el
 * número es negro sobre su color; al acercarse al límite se pone ámbar y al
 * pasarlo, coral. Así el aviso ocupa el sitio que ya ocupaba.
 */
type Nivel = 'ok' | 'aviso' | 'alerta';

function nivelDe(minutos: number | null, limite: number): Nivel {
  if (minutos === null) return 'ok';
  const ratio = minutos / limite;
  if (ratio >= 1) return 'alerta';
  if (ratio >= 0.85) return 'aviso';
  return 'ok';
}

const NIVEL = {
  ok:     { numero: 'text-gray-900', pista: 'text-gray-400', etiqueta: 'text-gray-400' },
  aviso:  { numero: 'text-amber-700', pista: 'text-amber-700', etiqueta: 'text-amber-700' },
  alerta: { numero: 'text-coral-700', pista: 'text-coral-700', etiqueta: 'text-coral-700' },
} as const;

const BARRA = {
  toma:  { ok: 'bg-mustard-300', aviso: 'bg-amber-500', alerta: 'bg-coral-600', fondo: 'bg-mustard-100' },
  sueno: { ok: 'bg-lagoon-300',  aviso: 'bg-amber-500', alerta: 'bg-coral-600', fondo: 'bg-lagoon-100' },
} as const;

function TarjetaAhora({
  feedingInProgress, lastFeedingStart, lastFeedingElapsed, feedingLimitMin, hayTomas,
  restInProgress, awakeMin, awakeLimitMin, haySuenos, sexo,
  readOnly, onAddToma, onAddSueno, onAbrirAñadir,
}: {
  feedingInProgress: boolean;
  lastFeedingStart?: string;
  lastFeedingElapsed: number | null;
  feedingLimitMin: number;
  hayTomas: boolean;
  restInProgress: Rest | null;
  awakeMin: number | null;
  awakeLimitMin: number;
  haySuenos: boolean;
  sexo?: 'male' | 'female';
  readOnly?: boolean;
  onAddToma: () => void;
  onAddSueno: () => void;
  onAbrirAñadir: () => void;
}) {
  const nivelToma = feedingInProgress ? 'ok' : nivelDe(lastFeedingElapsed, feedingLimitMin);
  const nivelSueno = restInProgress ? 'ok' : nivelDe(awakeMin, awakeLimitMin);
  const hayAlerta = nivelToma === 'alerta' || nivelSueno === 'alerta';
  const urgencia = nivelToma === 'alerta' ? 'toma' : nivelSueno === 'alerta' ? 'sueno' : null;

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-3.5 ${hayAlerta ? 'ring-1 ring-coral-200' : ''}`}>
      <div className="flex items-stretch gap-3.5">
        <RelojToma
          enCurso={feedingInProgress}
          inicio={lastFeedingStart}
          minutos={lastFeedingElapsed}
          limite={feedingLimitMin}
          nivel={nivelToma}
          hay={hayTomas}
        />
        <div className="w-px bg-gray-100 shrink-0" />
        <RelojSueno
          durmiendo={restInProgress}
          minutos={awakeMin}
          limite={awakeLimitMin}
          nivel={nivelSueno}
          hay={haySuenos}
          sexo={sexo}
        />
      </div>

      {!readOnly && (
        <div className="flex gap-2 mt-3.5">
          {/* Solo uno se pone sólido: con los dos en coral se pierde cuál es
              lo siguiente que hacer. Comer manda sobre dormir. */}
          <BotonRegistro tono="toma" etiqueta="Toma" urge={urgencia === 'toma'} onClick={onAddToma} />
          <BotonRegistro tono="sueno" etiqueta="Sueño" urge={urgencia === 'sueno'} onClick={onAddSueno} />
          <button
            onClick={onAbrirAñadir}
            className="w-12 h-12 shrink-0 rounded-xl bg-taupe-50 text-taupe-700 flex items-center justify-center touch-manipulation active:brightness-95"
            aria-label="Añadir otro tipo de registro"
            title="Añadir otro tipo de registro"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function RelojToma({ enCurso, inicio, minutos, limite, nivel, hay }: {
  enCurso: boolean; inicio?: string; minutos: number | null; limite: number; nivel: Nivel; hay: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <Encabezado nivel={nivel} texto={enCurso ? 'Toma en curso' : 'Última toma'}>
        <BreastGlyph />
      </Encabezado>
      {enCurso && inicio
        ? <Cronometro inicio={inicio} />
        : <Duracion minutos={minutos} nivel={nivel} vacio={!hay} />}
      <Barra tono="toma" nivel={nivel} ratio={enCurso ? 0 : razon(minutos, limite)} />
      <p className={`text-[11px] leading-4 mt-1 truncate ${NIVEL[nivel].pista}`}>
        {enCurso ? 'apúntala al terminar'
          : !hay ? 'sin tomas aún'
          : nivel === 'alerta' ? `pasa de las ${formatElapsed(limite)} de su edad`
          : `suele comer cada ${formatElapsed(limite)}`}
      </p>
    </div>
  );
}

function RelojSueno({ durmiendo, minutos, limite, nivel, hay, sexo }: {
  durmiendo: Rest | null; minutos: number | null; limite: number; nivel: Nivel; hay: boolean;
  sexo?: 'male' | 'female';
}) {
  // Sin sexo apuntado no se adivina: «sin dormir» dice lo mismo y no falla.
  const despierto = sexo === 'female' ? 'Despierta' : sexo === 'male' ? 'Despierto' : 'Sin dormir';
  return (
    <div className="flex-1 min-w-0">
      <Encabezado nivel={nivel} texto={durmiendo ? 'Durmiendo' : despierto}>
        <MoonGlyph />
      </Encabezado>
      {durmiendo
        ? <Cronometro inicio={durmiendo.startTime} />
        : <Duracion minutos={minutos} nivel={nivel} vacio={!hay} />}
      <Barra tono="sueno" nivel={nivel} ratio={durmiendo ? 0 : razon(minutos, limite)} />
      <p className={`text-[11px] leading-4 mt-1 truncate ${NIVEL[nivel].pista}`}>
        {durmiendo ? 'en curso'
          : !hay ? 'sin sueños aún'
          : nivel === 'alerta' ? `pasada la ventana de ${formatElapsed(limite)}`
          : `ventana de ${formatElapsed(limite)} a su edad`}
      </p>
    </div>
  );
}

function Encabezado({ nivel, texto, children }: { nivel: Nivel; texto: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-1.5 ${NIVEL[nivel].etiqueta}`}>
      <span className="shrink-0">{children}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide truncate">{texto}</span>
    </div>
  );
}

/** El número grande: es lo único que se lee de lejos. */
function Duracion({ minutos, nivel, vacio }: { minutos: number | null; nivel: Nivel; vacio: boolean }) {
  if (vacio || minutos === null) {
    return <p className="text-2xl font-bold text-gray-300 leading-8 mt-0.5">—</p>;
  }
  const total = Math.max(0, minutos);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return (
    <p className={`leading-8 mt-0.5 tabular-nums ${NIVEL[nivel].numero}`}>
      {h > 0 && (<>
        <span className="text-[26px] font-bold tracking-tight">{h}</span>
        <span className="text-sm font-semibold opacity-60"> h </span>
      </>)}
      <span className="text-[26px] font-bold tracking-tight">{h > 0 ? String(m).padStart(2, '0') : m}</span>
      {h === 0 && <span className="text-sm font-semibold opacity-60"> min</span>}
    </p>
  );
}

function Cronometro({ inicio }: { inicio: string }) {
  const t = useElapsedTime(inicio);
  return <p className="text-[26px] font-bold tracking-tight leading-8 mt-0.5 tabular-nums text-sage-700">{t}</p>;
}

function Barra({ tono, nivel, ratio }: { tono: 'toma' | 'sueno'; nivel: Nivel; ratio: number }) {
  const c = BARRA[tono];
  return (
    <div className={`h-1.5 rounded-full overflow-hidden mt-2 ${c.fondo}`}>
      <div
        className={`h-full rounded-full transition-all ${c[nivel]}`}
        style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%` }}
      />
    </div>
  );
}

function BotonRegistro({ tono, etiqueta, urge, onClick }: {
  tono: 'toma' | 'sueno'; etiqueta: string; urge?: boolean; onClick: () => void;
}) {
  // Los tonos -800 de la paleta no tienen equivalente en modo noche (ver el
  // bloque `.dark` de src/index.css): sobre el tinte oscuro el texto se
  // volvía ilegible. Los -700 sí se redefinen y contrastan en ambos temas.
  const estilo = urge
    ? 'bg-coral-600 text-white'
    : tono === 'toma'
      ? 'bg-mustard-100 text-mustard-700'
      : 'bg-lagoon-100 text-lagoon-700';
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-1.5 touch-manipulation active:brightness-95 ${estilo}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {etiqueta}
    </button>
  );
}

// ── La línea de aviso ───────────────────────────────────────────────────────

interface Aviso {
  key: string;
  urgente: boolean;
  titulo: string;
  detalle: string;
  accion: string;
  onAccion: () => void;
}

/**
 * Baja una sola línea, y solo cuando hay algo que hacer. Si en el futuro
 * hubiera más de un aviso a la vez, los demás esperan detrás con su contador
 * en lugar de apilar cajas hasta comerse la pantalla.
 */
function LineaDeAviso({ aviso, pendientes }: { aviso: Aviso; pendientes: number }) {
  const tono = aviso.urgente
    ? 'bg-coral-100 text-coral-700'
    : 'bg-amber-50 text-amber-800';
  return (
    <div className={`rounded-2xl px-3 py-2.5 mt-2 flex items-center gap-2.5 ${tono}`}>
      <span className="shrink-0 opacity-80">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[13px] font-semibold truncate">{aviso.titulo}</p>
        <p className="text-[11px] opacity-75 truncate">{aviso.detalle}</p>
      </div>
      <button
        onClick={aviso.onAccion}
        className="shrink-0 h-8 px-3 rounded-full bg-white text-[12.5px] font-semibold touch-manipulation active:brightness-95 shadow-sm"
      >
        {aviso.accion}
      </button>
      {pendientes > 1 && (
        <span className="shrink-0 text-[11px] font-bold opacity-50 tabular-nums">1/{pendientes}</span>
      )}
    </div>
  );
}

// ── Fichas de cuidado ───────────────────────────────────────────────────────

/**
 * Fila de fichas con desplazamiento lateral: lo pendiente y lo que ya tocaba
 * va primero, y lo hecho se queda al final en verde. Tocar la ficha abre la
 * hoja de siempre; el botón redondo apunta la dosis sin abrir nada.
 */
function FichasDeCuidado({ items, readOnly }: { items: CareItem[]; readOnly?: boolean }) {
  const [hoja, setHoja] = useState(false);
  if (items.length === 0) return null;

  const orden = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });

  return (
    <>
      {/* Los -mx-4 px-4 dejan que las fichas se deslicen hasta el borde de la
          pantalla en vez de cortarse contra el margen del contenido. */}
      <div className="-mx-4 px-4 mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {orden.map((item) => (
          <FichaCuidado key={item.key} item={item} readOnly={readOnly} onAbrir={() => setHoja(true)} />
        ))}
      </div>
      {hoja && <CareSheet items={orden} readOnly={readOnly} onClose={() => setHoja(false)} />}
    </>
  );
}

function FichaCuidado({ item, readOnly, onAbrir }: {
  item: CareItem; readOnly?: boolean; onAbrir: () => void;
}) {
  const estilo = item.done
    ? 'bg-sage-50 border-sage-100'
    : item.urgent
      ? 'bg-white border-amber-300'
      : 'bg-white border-gray-100';

  const pie = item.done
    ? (item.count ? `${item.count.current} de ${item.count.total}` : (item.time ?? 'hecho'))
    : item.urgent
      ? `tocaba a las ${item.time ?? '—'}`
      : item.time ? `toca a las ${item.time}` : (item.dose ?? 'pendiente');

  return (
    <div className={`shrink-0 h-14 pl-3 pr-2 rounded-2xl border flex items-center gap-2.5 shadow-sm ${estilo}`}>
      <button onClick={onAbrir} className="flex items-center gap-2.5 min-w-0 text-left touch-manipulation">
        <span className="shrink-0 text-base leading-none" aria-hidden="true">
          {item.key.startsWith('med') ? <MedicineIcon size={17} /> : item.icon}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[13px] font-semibold text-gray-900 truncate max-w-[9rem]">{item.label}</span>
          <span className={`block text-[11px] truncate max-w-[9rem] ${
            item.done ? 'text-sage-700' : item.urgent ? 'text-amber-700 font-semibold' : 'text-gray-400'
          }`}>
            {pie}
          </span>
        </span>
      </button>
      {!readOnly && !item.done && (
        <button
          onClick={item.onAdd}
          aria-label={`Apuntar ${item.label}`}
          title={`Apuntar ${item.label}`}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center touch-manipulation active:brightness-95 ${
            item.urgent ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
      )}
      {item.done && (
        <span className="shrink-0 w-9 h-9 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      )}
    </div>
  );
}

// ── Piezas menudas ──────────────────────────────────────────────────────────

/**
 * Un dato del resumen. Sin `flex-1`: repartiendo el ancho por igual, «3 h 5 min
 * sueño» se cortaba en un móvil estrecho mientras a «4 tomas» le sobraba sitio.
 */
function Dato({ valor, unidad, color }: { valor: string; unidad: string; color: string }) {
  return (
    <span className="shrink-0 flex items-baseline gap-1 whitespace-nowrap">
      <span className={`text-[17px] font-bold tabular-nums ${color}`}>{valor}</span>
      <span className="text-[11px] text-gray-400">{unidad}</span>
    </span>
  );
}

function Separador() {
  return <span className="w-px h-5 bg-gray-100 shrink-0" />;
}

function CajaMl({ valor, etiqueta, color, onRecalcular }: {
  valor: string; etiqueta: string; color: string; onRecalcular?: () => void;
}) {
  return (
    <div className="relative bg-gray-50 rounded-xl p-2.5 text-center">
      <p className={`text-base font-bold leading-tight ${color}`}>{valor}</p>
      <p className="text-xs text-gray-400 mt-0.5">{etiqueta}</p>
      {onRecalcular && (
        <button
          onClick={onRecalcular}
          className="absolute top-1 right-1.5 text-xs text-gray-300 hover:text-pink-600 touch-manipulation"
          aria-label="Recalcular los ml estimados al pecho"
          title="Recalcular"
        >↻</button>
      )}
    </div>
  );
}

function BreastGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4 Q16 4 19 12 Q16 20 5 20" />
      <circle cx="17" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </svg>
  );
}

function razon(minutos: number | null, limite: number): number {
  if (minutos === null || limite <= 0) return 0;
  return minutos / limite;
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
