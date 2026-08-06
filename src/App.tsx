import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { BabyConfig, Feeding, Rest, WeightEntry, HeightEntry, HeadCircEntry, VitaminDLog, ProbioticLog, MassageLog, MilestoneLog, VaccineLog, Consultation, CalendarEvent, DiaperChange, MedicationLog, MedicationPlan, Walk, Bath } from './types';
import { getCurrentDaysOfLife, getBirthDate, todayIso, localDateOf } from './utils/dateUtils';
import { calcBreastEstimatedMl, generateId } from './utils/feedingUtils';
import * as api from './api';
import BabyConfigScreen from './components/BabyConfig';
import BabyProfile from './components/BabyProfile';
import GrowthView from './components/GrowthView';
import TodayRail from './components/TodayRail';
import CareSettings from './components/CareSettings';
import LoginScreen from './components/LoginScreen';
import DailySummary from './components/DailySummary';
import AddRecordSheet from './components/AddRecordSheet';
import type { TipoRegistro } from './components/AddRecordSheet';
import FeedingForm from './components/FeedingForm';
import RestForm from './components/RestForm';
import WeightForm from './components/WeightForm';
import HeightForm from './components/HeightForm';
import HeadCircForm from './components/HeadCircForm';
import DiaperForm from './components/DiaperForm';
import { DiaperIcon } from './components/DiaperItem';
import FeedingList from './components/FeedingList';
import ReferenceView from './components/ReferenceView';
import VisitasView from './components/VisitasView';
import ConsultationsView from './components/ConsultationsView';
import FamilyView from './components/FamilyView';
import MyDataView from './components/MyDataView';
import WelcomeScreen from './components/WelcomeScreen';
import ExportView from './components/ExportView';
import MedicationForm from './components/MedicationForm';
import WalkForm from './components/WalkForm';
import BathForm from './components/BathForm';
import { MedicineIcon, StrollerIcon, ScaleIcon } from './components/CareIcons';
import { useAmount } from './components/AmountDialog';
import { getEffectiveReference } from './data/referenceTable';
import { massagesPerDay, frenectomyEndDate } from './utils/careUtils';
import { cuidadosDeHoy, type CuidadoHoy } from './utils/cuidadosHoy';
import AppSettings from './components/AppSettings';
import MilestonesView from './components/MilestonesView';
import VaccinesView from './components/VaccinesView';
import PediatraSummary from './components/PediatraSummary';
import AdminView, { ActivityDashboard, PushBroadcastView, BabiesAdminView } from './components/AdminView';
import GuiasAdminView from './components/GuiasAdminView';
import ThemeSelector from './components/ThemeSelector';
import { Toaster, toast } from './toast';
import { useTimelineDesign } from './timelineDesign';
const ChartsView = lazy(() => import('./components/ChartsView'));

type Tab = 'hoy' | 'graficas' | 'historial' | 'hitos' | 'vacunas' | 'referencia' | 'visitas' | 'consultas' | 'config' | 'familia' | 'admin-users' | 'admin-babies' | 'admin-activity' | 'admin-push' | 'admin-guias' | 'admin-settings';
type Screen =
  | Tab
  | 'nueva-toma'
  | 'editar-toma'
  | 'nuevo-sueño'
  | 'editar-sueño'
  | 'editar-config'
  | 'nuevo-peso'
  | 'editar-peso'
  | 'nuevo-altura'
  | 'editar-altura'
  | 'nuevo-pc'
  | 'editar-pc'
  // Subpáginas de «Mi bebé»: no son pestañas, así que activeTab sigue en 'config'
  | 'crecimiento'
  | 'cuidados'
  | 'ajustes'
  | 'mis-datos'
  | 'resumen-pediatra'
  | 'exportar'
  | 'nuevo-pañal'
  | 'editar-pañal'
  | 'nuevo-medicamento'
  | 'editar-medicamento'
  | 'nuevo-paseo'
  | 'editar-paseo'
  | 'nuevo-bano'
  | 'editar-bano';

export default function App() {
  const [config, setConfig] = useState<BabyConfig | null>(null);
  const [babies, setBabies] = useState<BabyConfig[]>([]);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [rests, setRests] = useState<Rest[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [heights, setHeights] = useState<HeightEntry[]>([]);
  const [headCircs, setHeadCircs] = useState<HeadCircEntry[]>([]);
  const [vitaminDLogs, setVitaminDLogs] = useState<VitaminDLog[]>([]);
  const [probioticLogs, setProbioticLogs] = useState<ProbioticLog[]>([]);
  const [massageLogs, setMassageLogs] = useState<MassageLog[]>([]);
  const [milestoneLogs, setMilestoneLogs] = useState<MilestoneLog[]>([]);
  const [vaccineLogs, setVaccineLogs] = useState<VaccineLog[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [diapers, setDiapers] = useState<DiaperChange[]>([]);
  const [editingDiaper, setEditingDiaper] = useState<DiaperChange | null>(null);
  const [medications, setMedications] = useState<MedicationLog[]>([]);
  const [medPlans, setMedPlans] = useState<MedicationPlan[]>([]);
  const [editingMedication, setEditingMedication] = useState<MedicationLog | null>(null);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [editingWalk, setEditingWalk] = useState<Walk | null>(null);
  const [baths, setBaths] = useState<Bath[]>([]);
  const [editingBath, setEditingBath] = useState<Bath | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [familyRole, setFamilyRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [impersonating, setImpersonating] = useState(false);
  const [originalUsername, setOriginalUsername] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Se acaba de entrar con un código de invitación: se saluda antes de empezar.
  const [justJoined, setJustJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const {
    design: timelineDesign,
    promptSeen: timelinePromptSeen,
    setDesign: setTimelineDesign,
    dismissPrompt: dismissTimelinePrompt,
    hydrate: hydrateTimelineDesign,
  } = useTimelineDesign();
  const [activeTab, setActiveTab] = useState<Tab>('hoy');
  const [screen, setScreen] = useState<Screen>('hoy');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAdmin = userRole === 'admin';
  const isViewer = familyRole === 'viewer';
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);
  const [editingRest, setEditingRest] = useState<Rest | null>(null);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [editingHeight, setEditingHeight] = useState<HeightEntry | null>(null);
  const [editingHeadCirc, setEditingHeadCirc] = useState<HeadCircEntry | null>(null);
  const [chartTarget, setChartTarget] = useState<string | null>(null);
  // Pantalla a la que volver al cerrar un formulario. Hace falta para las
  // subpáginas de «Mi bebé», que no son pestañas y no se recuperan con activeTab.
  const [returnTo, setReturnTo] = useState<Screen | null>(null);
  const [showExtraFabs, setShowExtraFabs] = useState(false);
  // La hoja de «Añadir registro» vive aquí: la abren tanto la cabecera de «Hoy»
  // como el botón central de la barra inferior.
  const [añadirAbierto, setAñadirAbierto] = useState(false);
  const askAmount = useAmount();

  // Abre un formulario recordando desde dónde se abrió.
  function openForm(target: Screen) {
    setReturnTo(screen);
    setScreen(target);
  }

  // Cierra el formulario actual y vuelve a la pantalla de origen.
  function closeForm() {
    setScreen(returnTo ?? activeTab);
    setReturnTo(null);
  }

  // Abre la pestaña Gráficas y desplaza a la gráfica indicada (peso/talla).
  function openChart(anchor: string) {
    setChartTarget(anchor);
    navigate('graficas');
  }

  // Trae todos los datos del bebé activo (asume que api.setActiveBaby ya está fijado).
  async function loadBabyData() {
    const [fds, rsts, wts, hts, hcs, vdLogs, prLogs, mLogs, msLogs, vacLogs, cons, cal, dps, meds, plans, wks, bths] = await Promise.all([
      api.getFeedings(), api.getRests(), api.getWeights(), api.getHeights(), api.getHeadCircs(), api.getVitaminDLogs(),
      api.getProbioticLogs(), api.getMassageLogs(), api.getMilestones(), api.getVaccines(), api.getConsultations(), api.getCalendarEvents(),
      api.getDiapers(), api.getMedications(), api.getMedicationPlans(), api.getWalks(), api.getBaths(),
    ]);
    setFeedings(fds); setRests(rsts); setWeights(wts); setHeights(hts); setHeadCircs(hcs);
    setVitaminDLogs(vdLogs); setProbioticLogs(prLogs); setMassageLogs(mLogs);
    setMilestoneLogs(msLogs); setVaccineLogs(vacLogs); setConsultations(cons); setCalendarEvents(cal);
    setDiapers(dps); setMedications(meds); setMedPlans(plans); setWalks(wks); setBaths(bths);
  }

  // Carga los bebés de la cuenta, fija el activo (el último usado si existe) y sus datos.
  async function loadAllData() {
    const list = await api.getBabies();
    setBabies(list);
    const savedId = localStorage.getItem('lacty-active-baby');
    const active = list.find((b) => b.id === savedId) ?? list[0] ?? null;
    setConfig(active);
    if (!active) return;
    api.setActiveBaby(active.id);
    localStorage.setItem('lacty-active-baby', active.id);
    await loadBabyData();
  }

  // Cambia el bebé activo y recarga sus datos.
  async function switchBaby(id: string) {
    const baby = babies.find((b) => b.id === id);
    if (!baby || baby.id === config?.id) return;
    api.setActiveBaby(id);
    localStorage.setItem('lacty-active-baby', id);
    setConfig(baby);
    setLoading(true);
    try { await loadBabyData(); } finally { setLoading(false); }
    toast(`Cambiado a ${baby.name ?? 'el otro bebé'}`);
  }

  async function handleCreateBaby(data: Omit<BabyConfig, 'id'>) {
    const baby = await api.createBaby(data);
    setBabies((prev) => [...prev, baby]);
    api.setActiveBaby(baby.id);
    localStorage.setItem('lacty-active-baby', baby.id);
    setConfig(baby);
    setLoading(true);
    try { await loadBabyData(); } finally { setLoading(false); }
    toast('Bebé añadido');
  }

  async function handleDeleteBaby(id: string) {
    await api.deleteBaby(id);
    const remaining = babies.filter((b) => b.id !== id);
    setBabies(remaining);
    toast('Bebé eliminado');
    if (config?.id === id) {
      const next = remaining[0] ?? null;
      setConfig(next);
      if (next) {
        api.setActiveBaby(next.id);
        localStorage.setItem('lacty-active-baby', next.id);
        setLoading(true);
        try { await loadBabyData(); } finally { setLoading(false); }
      } else {
        localStorage.removeItem('lacty-active-baby');
      }
    }
  }

  async function handleLogout() {
    await api.logout();
    // Si se entró desde el enlace «/?registro» de la landing, el parámetro sigue
    // en la URL: hay que quitarlo para que al salir se vea el login, no el alta.
    if (window.location.search.includes('registro')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setCurrentUser(null);
  }

  useEffect(() => {
    api.checkAuth().then((auth) => {
      setCurrentUser(auth?.username ?? null);
      setUserRole(auth?.role ?? 'user');
      setFamilyRole(auth?.familyRole ?? 'editor');
      setImpersonating(auth?.impersonating ?? false);
      setOriginalUsername(auth?.originalUsername ?? null);
      hydrateTimelineDesign({
        design: auth?.timelineDesign ?? 'clasico',
        promptSeen: auth?.timelinePromptSeen ?? true,
      });
      if (auth?.role === 'admin') { setActiveTab('admin-users'); setScreen('admin-users'); }
      setAuthChecked(true);
      if (!auth) { setLoading(false); return; }
      loadAllData()
        .then(() => setApiError(false))
        .catch(() => setApiError(true))
        .finally(() => setLoading(false));
    });
  }, []);

  // Sincronización entre dispositivos: SSE (instantáneo en local) + polling de
  // respaldo cada 5s (robusto a través de túneles/proxies que bufferean el SSE).
  useEffect(() => {
    if (!currentUser) return;

    const refetch = (resource: string) => {
      switch (resource) {
        case 'feedings':   api.getFeedings().then(setFeedings); break;
        case 'rests':      api.getRests().then(setRests); break;
        case 'weights':    api.getWeights().then(setWeights); break;
        case 'heights':    api.getHeights().then(setHeights); break;
        case 'headcircs':  api.getHeadCircs().then(setHeadCircs); break;
        case 'babies':     api.getBabies().then((list) => {
          setBabies(list);
          setConfig((prev) => list.find((b) => b.id === prev?.id) ?? list[0] ?? null);
        }); break;
        case 'vitamind':   api.getVitaminDLogs().then(setVitaminDLogs); break;
        case 'probiotics': api.getProbioticLogs().then(setProbioticLogs); break;
        case 'massages':   api.getMassageLogs().then(setMassageLogs); break;
        case 'milestones': api.getMilestones().then(setMilestoneLogs); break;
        case 'vaccines':   api.getVaccines().then(setVaccineLogs); break;
        case 'consultations': api.getConsultations().then(setConsultations); break;
        case 'calendar':   api.getCalendarEvents().then(setCalendarEvents); break;
        case 'diapers':    api.getDiapers().then(setDiapers); break;
        case 'medications': api.getMedications().then(setMedications); break;
        case 'medplans':   api.getMedicationPlans().then(setMedPlans); break;
        case 'walks':      api.getWalks().then(setWalks); break;
        case 'baths':      api.getBaths().then(setBaths); break;
      }
    };

    const unsubscribe = api.subscribeToChanges(refetch);

    // Polling de respaldo: compara versiones y refetchea solo lo que cambió.
    let lastRevs: api.Revs | null = null;
    const poll = async () => {
      try {
        const revs = await api.getVersions();
        if (lastRevs) {
          for (const resource of Object.keys(revs)) {
            if (revs[resource] !== lastRevs[resource]) refetch(resource);
          }
        }
        lastRevs = revs;
      } catch { /* sin conexión: reintenta en el siguiente ciclo */ }
    };
    poll();
    const id = setInterval(poll, 5000);

    return () => { unsubscribe(); clearInterval(id); };
  }, [currentUser]);

  // Current weight = most recent entry by date
  const currentWeightKg = weights.length > 0
    ? [...weights].sort((a, b) => b.date.localeCompare(a.date))[0].weightKg
    : undefined;

  // ¿Hay algo en curso? (para ocultar el FAB correspondiente)
  const breastInProgress = feedings.some(
    (f) => f.hasBreast && f.breastMinLeft == null && f.breastMinRight == null
  );
  const restInProgress = rests.some((r) => r.endTime == null);
  const walkInProgress = walks.find((w) => w.endTime == null) ?? null;

  // ── Auth ─────────────────────────────────────────────────────────────────────

  if (!authChecked) return null; // espera silenciosa mientras verifica sesión

  if (!currentUser) {
    return <LoginScreen onLogin={(username, role, fRole, joined) => {
      setCurrentUser(username);
      setUserRole(role);
      setFamilyRole(fRole);
      if (joined) setJustJoined(true);
      if (role === 'admin') { setActiveTab('admin-users'); setScreen('admin-users'); }
      else { setActiveTab('hoy'); setScreen('hoy'); }
      // El diseño del timeline viaja con la cuenta: se recupera al entrar.
      api.checkAuth().then((auth) => hydrateTimelineDesign({
        design: auth?.timelineDesign ?? 'clasico',
        promptSeen: auth?.timelinePromptSeen ?? true,
      }));
      setLoading(true);
      loadAllData()
        .then(() => setApiError(false))
        .catch(() => setApiError(true))
        .finally(() => setLoading(false));
    }} />;
  }

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-cream-50">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">👶</div>
          <p className="text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-cream-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No se puede conectar al servidor</h2>
          <p className="text-sm text-gray-500 mb-6">Asegúrate de que el servidor está en marcha con:</p>
          <code className="block bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 mb-6">npm run start</code>
          <button
            onClick={() => { setLoading(true); setApiError(false); window.location.reload(); }}
            className="w-full bg-sage-600 text-white font-semibold py-3 rounded-xl touch-manipulation"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── First setup / onboarding incompleto ──────────────────────────────────────

  // Sin peso la referencia de ml/día no se ajusta al bebé, así que también
  // cuenta como alta incompleta (p. ej. bebés creados desde el panel de admin).
  const needsOnboarding = !isAdmin && (!config || !config.birthDate || !config.sex || weights.length === 0);

  if (needsOnboarding) {
    return (
      <BabyConfigScreen
        existing={config}
        initialWeight={currentWeightKg}
        username={currentUser}
        onLogout={handleLogout}
        onSave={async (c) => {
          if (config) {
            const updated = await api.updateBaby({ ...config, ...c });
            setConfig(updated);
            setBabies((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          } else {
            const saved = await api.createBaby(c);
            api.setActiveBaby(saved.id);
            setBabies((prev) => [...prev, saved]);
            setConfig(saved);
          }
          setScreen('hoy');
        }}
        onSaveWeight={async (kg) => {
          const entry = { id: generateId(), date: new Date().toISOString().slice(0, 10), weightKg: kg };
          const created = await api.createWeight(entry);
          setWeights((prev) => [...prev, created]);
        }}
      />
    );
  }

  if (justJoined) {
    return <WelcomeScreen baby={config} onStart={() => setJustJoined(false)} />;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  // Finaliza automáticamente cualquier toma o sueño que esté en curso.
  // Se llama antes de crear un nuevo elemento (no al editar).
  async function finalizeInProgress() {
    const now = new Date().toISOString();

    // Sueños sin hora de fin
    const openRests = rests.filter((r) => r.endTime == null);
    for (const rest of openRests) {
      const updated = await api.updateRest({ ...rest, endTime: now });
      setRests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }

    // Tomas con pecho iniciado pero sin minutos: calcular tiempo transcurrido
    const openBreast = feedings.filter(
      (f) => f.hasBreast && f.breastMinLeft == null && f.breastMinRight == null
    );
    const daysOfLife = getCurrentDaysOfLife(config!);
    for (const feeding of openBreast) {
      const elapsed = Math.max(
        0,
        Math.round((new Date(now).getTime() - new Date(feeding.timestamp).getTime()) / 60000)
      );
      const lastBreast = [...feedings]
        .filter(f => f.id !== feeding.id && f.hasBreast && ((f.breastMinLeft ?? 0) > 0 || (f.breastMinRight ?? 0) > 0))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const lastWasLeft = lastBreast ? (lastBreast.breastMinLeft ?? 0) >= (lastBreast.breastMinRight ?? 0) : false;
      const estimatedMl = calcBreastEstimatedMl(daysOfLife, elapsed, feedings);
      const updated = await api.updateFeeding({
        ...feeding,
        ...(lastWasLeft ? { breastMinRight: elapsed } : { breastMinLeft: elapsed }),
        ...(estimatedMl != null ? { breastEstimatedMl: estimatedMl } : {}),
      });
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
  }

  async function handleSaveFeeding(feeding: Feeding) {
    const daysOfLife = getCurrentDaysOfLife(config!);
    const mins = (feeding.breastMinLeft ?? 0) + (feeding.breastMinRight ?? 0);

    if (editingFeeding) {
      let feedingToUpdate = feeding;
      // Recalcular estimado si la toma es de hoy y tiene minutos
      if (feeding.hasBreast && feeding.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10)) {
        const estimatedMl = calcBreastEstimatedMl(daysOfLife, mins, feedings);
        if (estimatedMl != null) feedingToUpdate = { ...feeding, breastEstimatedMl: estimatedMl };
      }
      const updated = await api.updateFeeding(feedingToUpdate);
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } else {
      await finalizeInProgress();
      let feedingToSave = feeding;
      if (feeding.hasBreast) {
        const estimatedMl = calcBreastEstimatedMl(daysOfLife, mins, feedings);
        if (estimatedMl != null) feedingToSave = { ...feeding, breastEstimatedMl: estimatedMl };
      }
      const created = await api.createFeeding(feedingToSave);
      setFeedings((prev) => [...prev, created]);
    }
    toast(editingFeeding ? 'Toma actualizada' : 'Toma registrada');
    setEditingFeeding(null);
    closeForm();
  }

  async function handleDeleteFeeding(id: string) {
    await api.deleteFeeding(id);
    setFeedings((prev) => prev.filter((f) => f.id !== id));
    toast('Toma eliminada');
  }

  // Inicia una toma de pecho en curso al instante (sin formulario).
  async function handleQuickBreast() {
    await finalizeInProgress();
    const feeding: Feeding = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      hasBreast: true,
      hasSupplement: false,
    };
    const created = await api.createFeeding(feeding);
    setFeedings((prev) => [...prev, created]);
    toast('Toma de pecho iniciada');
  }

  // Inicia un biberón al instante: sin mililitros y con leche materna, que es
  // lo habitual. Los ml se piden al finalizarlo, cuando ya se saben.
  async function handleQuickBottle() {
    await finalizeInProgress();
    const feeding: Feeding = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      hasBreast: false,
      hasBottle: true,
      bottleType: 'breast',
      hasSupplement: false,
    };
    const created = await api.createFeeding(feeding);
    setFeedings((prev) => [...prev, created]);
    toast('Biberón iniciado');
  }

  // Cantidades sugeridas en el diálogo de fin de biberón, tomadas de la
  // referencia por edad y peso del propio bebé.
  function suggestedBottleMl(): number[] {
    const ref = config ? getEffectiveReference(getCurrentDaysOfLife(config), currentWeightKg) : null;
    if (!ref) return [30, 60, 90, 120];
    const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
    return [...new Set([
      r5(ref.mlPerFeedMin),
      r5((ref.mlPerFeedMin + ref.mlPerFeedMax) / 2),
      r5(ref.mlPerFeedMax),
    ])];
  }

  // Finaliza una toma de pecho en curso. Asigna los minutos al pecho contrario
  // al de la última toma completada (alternancia automática).
  async function handleStopFeeding(feeding: Feeding) {
    const breastIP = feeding.hasBreast && feeding.breastMinLeft == null && feeding.breastMinRight == null;
    const bottleIP = feeding.hasBottle && feeding.bottleMl == null;
    const suppIP   = feeding.hasSupplement && feeding.supplementMl == null;
    if (!breastIP && !bottleIP && !suppIP) return;

    const endTime = new Date().toISOString();

    if (breastIP) {
      const elapsed = Math.max(0, Math.round((Date.now() - new Date(feeding.timestamp).getTime()) / 60000));
      const lastBreast = [...feedings]
        .filter(f => f.id !== feeding.id && f.hasBreast && ((f.breastMinLeft ?? 0) > 0 || (f.breastMinRight ?? 0) > 0))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const lastWasLeft = lastBreast ? (lastBreast.breastMinLeft ?? 0) >= (lastBreast.breastMinRight ?? 0) : false;
      const daysOfLife = getCurrentDaysOfLife(config!);
      const estimatedMl = calcBreastEstimatedMl(daysOfLife, elapsed, feedings);
      const updated = await api.updateFeeding({
        ...feeding,
        endTime,
        ...(lastWasLeft ? { breastMinRight: elapsed } : { breastMinLeft: elapsed }),
        ...(estimatedMl != null ? { breastEstimatedMl: estimatedMl } : {}),
      });
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast(`Pecho ${lastWasLeft ? 'derecho' : 'izquierdo'} · ${elapsed} min`);
    } else if (bottleIP) {
      const ml = await askAmount({
        title: '¿Cuántos ml ha tomado?',
        hint: 'Después puedes ajustarlo editando la toma',
        unit: 'ml',
        quick: suggestedBottleMl(),
        confirmLabel: 'Finalizar',
      });
      if (ml == null) return; // cancelado: el biberón sigue en curso
      const updated = await api.updateFeeding({ ...feeding, endTime, bottleMl: ml });
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast(`Biberón · ${ml} ml`);
    } else {
      const updated = await api.updateFeeding({ ...feeding, endTime });
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast('Jeringa-dedo finalizada');
    }
  }

  // Finaliza un sueño en curso poniendo la hora de fin a ahora.
  async function handleStopRest(rest: Rest) {
    if (rest.endTime != null) return;
    const updated = await api.updateRest({ ...rest, endTime: new Date().toISOString() });
    setRests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    toast('Sueño finalizado');
  }

  // Inicia un sueño en curso al instante (sin formulario).
  async function handleQuickRest() {
    await finalizeInProgress();
    const rest: Rest = {
      id: generateId(),
      startTime: new Date().toISOString(),
    };
    const created = await api.createRest(rest);
    setRests((prev) => [...prev, created]);
    toast('Sueño iniciado');
  }

  async function handleSaveRest(rest: Rest) {
    if (editingRest) {
      const updated = await api.updateRest(rest);
      setRests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      await finalizeInProgress();
      const created = await api.createRest(rest);
      setRests((prev) => [...prev, created]);
    }
    toast(editingRest ? 'Sueño actualizado' : 'Sueño registrado');
    setEditingRest(null);
    closeForm();
  }

  async function handleDeleteRest(id: string) {
    await api.deleteRest(id);
    setRests((prev) => prev.filter((r) => r.id !== id));
    toast('Sueño eliminado');
  }

  async function handleSaveWeight(entry: WeightEntry) {
    if (editingWeight) {
      const updated = await api.updateWeight(entry);
      setWeights((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } else {
      const created = await api.createWeight(entry);
      setWeights((prev) => [...prev, created]);
    }
    toast(editingWeight ? 'Peso actualizado' : 'Peso registrado');
    setEditingWeight(null);
    closeForm();
  }

  async function handleDeleteWeight(id: string) {
    await api.deleteWeight(id);
    setWeights((prev) => prev.filter((w) => w.id !== id));
    toast('Peso eliminado');
  }

  async function handleSaveHeight(entry: HeightEntry) {
    if (editingHeight) {
      const updated = await api.updateHeight(entry);
      setHeights((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } else {
      const created = await api.createHeight(entry);
      setHeights((prev) => [...prev, created]);
    }
    toast(editingHeight ? 'Altura actualizada' : 'Altura registrada');
    setEditingHeight(null);
    closeForm();
  }

  async function handleDeleteHeight(id: string) {
    await api.deleteHeight(id);
    setHeights((prev) => prev.filter((h) => h.id !== id));
    toast('Altura eliminada');
  }

  async function handleSaveHeadCirc(entry: HeadCircEntry) {
    if (editingHeadCirc) {
      const updated = await api.updateHeadCirc(entry);
      setHeadCircs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } else {
      const created = await api.createHeadCirc(entry);
      setHeadCircs((prev) => [...prev, created]);
    }
    toast(editingHeadCirc ? 'Perímetro actualizado' : 'Perímetro registrado');
    setEditingHeadCirc(null);
    closeForm();
  }

  async function handleDeleteHeadCirc(id: string) {
    await api.deleteHeadCirc(id);
    setHeadCircs((prev) => prev.filter((h) => h.id !== id));
    toast('Perímetro eliminado');
  }

  async function handleUpdateConfig(partial: Partial<Omit<BabyConfig, 'id'>>) {
    const updated = await api.updateBaby({ ...config!, ...partial });
    setConfig(updated);
    setBabies((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function handleRecalculateTodayBreast() {
    const today = new Date().toISOString().slice(0, 10);
    const daysOfLife = getCurrentDaysOfLife(config!);
    const todayBreast = feedings.filter(
      (f) => f.hasBreast &&
        f.timestamp.slice(0, 10) === today &&
        ((f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0)) > 0
    );
    for (const feed of todayBreast) {
      const mins = (feed.breastMinLeft ?? 0) + (feed.breastMinRight ?? 0);
      const estimatedMl = calcBreastEstimatedMl(daysOfLife, mins, feedings);
      if (estimatedMl != null && estimatedMl !== feed.breastEstimatedMl) {
        const updated = await api.updateFeeding({ ...feed, breastEstimatedMl: estimatedMl });
        setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      }
    }
  }

  async function handleGiveVitaminD(date: string) {
    const log = await api.giveVitaminD(date);
    setVitaminDLogs((prev) => [...prev.filter((l) => l.date !== date), log]);
    toast('Vitamina D3 suministrada');
  }

  async function handleRemoveVitaminD(date: string) {
    await api.removeVitaminD(date);
    setVitaminDLogs((prev) => prev.filter((l) => l.date !== date));
    toast('Vitamina D3 desmarcada');
  }

  async function handleGiveProbiotic(date: string) {
    const log = await api.giveProbiotic(date);
    setProbioticLogs((prev) => [...prev.filter((l) => l.date !== date), log]);
    toast('Probiótico suministrado');
  }

  async function handleRemoveProbiotic(date: string) {
    await api.removeProbiotic(date);
    setProbioticLogs((prev) => prev.filter((l) => l.date !== date));
    toast('Probiótico desmarcado');
  }

  async function handleAddMassage(date: string) {
    const todayCount = massageLogs.filter((m) => m.date === date).length;
    if (todayCount >= 5) return;
    const log = await api.createMassageLog(date);
    setMassageLogs((prev) => [...prev, log]);
    toast('Masaje registrado');
  }

  async function handleRemoveMassage(id: string) {
    await api.deleteMassageLog(id);
    setMassageLogs((prev) => prev.filter((m) => m.id !== id));
    toast('Masaje eliminado');
  }

  async function handleToggleMilestone(milestoneId: string) {
    const existing = milestoneLogs.find((l) => l.id === milestoneId);
    if (existing) {
      await api.deleteMilestone(milestoneId);
      setMilestoneLogs((prev) => prev.filter((l) => l.id !== milestoneId));
    } else {
      const log: MilestoneLog = { id: milestoneId, achievedAt: new Date().toISOString() };
      const saved = await api.saveMilestone(log);
      setMilestoneLogs((prev) => [...prev, saved]);
    }
  }

  async function handleToggleVaccine(vaccineId: string, date: string) {
    const log: VaccineLog = { id: vaccineId, date };
    const saved = await api.saveVaccine(log);
    setVaccineLogs((prev) => [...prev.filter(l => l.id !== vaccineId), saved]);
  }

  async function handleDeleteVaccine(vaccineId: string) {
    await api.deleteVaccine(vaccineId);
    setVaccineLogs((prev) => prev.filter(l => l.id !== vaccineId));
  }

  async function handleCreateConsultation(c: Consultation) {
    const created = await api.createConsultation(c);
    setConsultations((prev) => [...prev, created]);
    toast('Duda añadida');
  }

  async function handleUpdateConsultation(c: Consultation) {
    const updated = await api.updateConsultation(c);
    setConsultations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleDeleteConsultation(id: string) {
    await api.deleteConsultation(id);
    setConsultations((prev) => prev.filter((x) => x.id !== id));
    toast('Duda eliminada');
  }

  async function handleCreateEvent(e: CalendarEvent) {
    const created = await api.createCalendarEvent(e);
    setCalendarEvents((prev) => [...prev, created]);
    toast('Evento creado');
  }

  async function handleUpdateEvent(e: CalendarEvent) {
    const updated = await api.updateCalendarEvent(e);
    setCalendarEvents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    toast('Evento actualizado');
  }

  async function handleDeleteEvent(id: string) {
    await api.deleteCalendarEvent(id);
    setCalendarEvents((prev) => prev.filter((x) => x.id !== id));
    toast('Evento eliminado');
  }

  async function handleSaveDiaper(entry: DiaperChange) {
    if (editingDiaper) {
      const updated = await api.updateDiaper(entry);
      setDiapers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } else {
      const created = await api.createDiaper(entry);
      setDiapers((prev) => [...prev, created]);
    }
    toast(editingDiaper ? 'Pañal actualizado' : 'Pañal registrado');
    setEditingDiaper(null);
    closeForm();
  }

  async function handleDeleteDiaper(id: string) {
    await api.deleteDiaper(id);
    setDiapers((prev) => prev.filter((d) => d.id !== id));
    toast('Pañal eliminado');
  }

  // ── Medicamentos ───────────────────────────────────────────────────────────

  async function handleSaveMedication(entry: MedicationLog, plan?: MedicationPlan) {
    if (plan) {
      const creado = await api.createMedicationPlan(plan);
      setMedPlans((prev) => [...prev, creado]);
    }
    if (editingMedication) {
      const updated = await api.updateMedication(entry);
      setMedications((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } else {
      const created = await api.createMedication(entry);
      setMedications((prev) => [...prev, created]);
    }
    toast(plan ? 'Pauta programada' : editingMedication ? 'Medicamento actualizado' : 'Medicamento registrado');
    setEditingMedication(null);
    closeForm();
  }

  /** Apunta una dosis de una pauta con la hora actual, desde el chip de «Hoy». */
  async function handleGiveMedicationDose(plan: MedicationPlan) {
    const created = await api.createMedication({
      id: generateId(),
      timestamp: new Date().toISOString(),
      name: plan.name,
      ...(plan.doseMl != null ? { doseMl: plan.doseMl } : {}),
      planId: plan.id,
    });
    setMedications((prev) => [...prev, created]);
    toast(`${plan.name} registrado`);
  }

  /** Deshace la última dosis de la pauta apuntada hoy. */
  async function handleUndoMedicationDose(planId: string) {
    const hoy = todayIso();
    const ultima = medications
      .filter((m) => m.planId === planId && localDateOf(m.timestamp) === hoy)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    if (!ultima) return;
    await api.deleteMedication(ultima.id);
    setMedications((prev) => prev.filter((m) => m.id !== ultima.id));
    toast('Dosis deshecha');
  }

  /** Apunta un cuidado del día desde la hoja de «Añadir un registro». */
  function registrarCuidado(c: CuidadoHoy) {
    const hoy = todayIso();
    switch (c.tipo) {
      case 'vitaminD': handleGiveVitaminD(hoy); break;
      case 'probiotic': handleGiveProbiotic(hoy); break;
      case 'massage':  handleAddMassage(hoy); break;
      case 'medplan':  if (c.plan) handleGiveMedicationDose(c.plan); break;
    }
  }

  async function handleDeleteMedicationPlan(id: string) {
    await api.deleteMedicationPlan(id);
    setMedPlans((prev) => prev.filter((p) => p.id !== id));
    toast('Pauta eliminada');
  }

  async function handleDeleteMedication(id: string) {
    await api.deleteMedication(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
    toast('Medicamento eliminado');
    setEditingMedication(null);
    closeForm();
  }

  // ── Baños ──────────────────────────────────────────────────────────────────

  // El baño es puntual: el botón flotante lo registra con la hora actual y los
  // detalles (piel, notas) se añaden luego editándolo desde el timeline.
  async function handleQuickBath() {
    const bath: Bath = { id: generateId(), timestamp: new Date().toISOString() };
    const created = await api.createBath(bath);
    setBaths((prev) => [...prev, created]);
    toast('Baño registrado');
  }

  async function handleSaveBath(entry: Bath) {
    if (editingBath) {
      const updated = await api.updateBath(entry);
      setBaths((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } else {
      const created = await api.createBath(entry);
      setBaths((prev) => [...prev, created]);
    }
    toast(editingBath ? 'Baño actualizado' : 'Baño registrado');
    setEditingBath(null);
    closeForm();
  }

  async function handleDeleteBath(id: string) {
    await api.deleteBath(id);
    setBaths((prev) => prev.filter((b) => b.id !== id));
    toast('Baño eliminado');
    setEditingBath(null);
    closeForm();
  }

  // ── Paseos ─────────────────────────────────────────────────────────────────

  async function handleSaveWalk(entry: Walk) {
    if (editingWalk) {
      const updated = await api.updateWalk(entry);
      setWalks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } else {
      const created = await api.createWalk(entry);
      setWalks((prev) => [...prev, created]);
    }
    toast(editingWalk ? 'Paseo actualizado' : 'Paseo registrado');
    setEditingWalk(null);
    closeForm();
  }

  async function handleDeleteWalk(id: string) {
    await api.deleteWalk(id);
    setWalks((prev) => prev.filter((w) => w.id !== id));
    toast('Paseo eliminado');
  }

  // Inicia un paseo al instante. A diferencia de las tomas y los sueños, no
  // cierra lo que haya en curso: el bebé puede dormir o mamar durante el paseo.
  async function handleQuickWalk() {
    const walk: Walk = { id: generateId(), startTime: new Date().toISOString() };
    const created = await api.createWalk(walk);
    setWalks((prev) => [...prev, created]);
    toast('Paseo iniciado');
  }

  async function handleStopWalk(walk: Walk) {
    if (walk.endTime != null) return;
    const updated = await api.updateWalk({ ...walk, endTime: new Date().toISOString() });
    setWalks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    toast('Paseo finalizado');
  }

  function navigate(tab: Tab) {
    setActiveTab(tab);
    setScreen(tab);
    setDrawerOpen(false);
  }

  // La preferencia se guarda en la cuenta; se vuelve al clásico desde Ajustes.
  function activarTimelineNuevo() {
    setTimelineDesign('rail');
    toast('Línea de tiempo activada · puedes volver al diseño anterior en Ajustes');
  }

  // Props de la pantalla «Hoy». Se comparten con la propuesta de rediseño
  // (TodayRail) para que ambas se comporten igual y la comparación sea justa.
  const propsHoy = config ? {
    config,
    feedings,
    rests,
    currentWeightKg,
    vitaminDLogs,
    calendarEvents,
    readOnly: isViewer,
    onOpenAgenda: () => navigate('visitas'),
    onAbrirAñadir: () => setAñadirAbierto(true),
    onAdd: (tipo: TipoRegistro) => {
      switch (tipo) {
        case 'toma':        setEditingFeeding(null);    openForm('nueva-toma'); break;
        case 'sueno':       setEditingRest(null);       openForm('nuevo-sueño'); break;
        case 'panal':       setEditingDiaper(null);     openForm('nuevo-pañal'); break;
        case 'bano':        setEditingBath(null);       openForm('nuevo-bano'); break;
        case 'paseo':       setEditingWalk(null);       openForm('nuevo-paseo'); break;
        case 'medicamento': setEditingMedication(null); openForm('nuevo-medicamento'); break;
        case 'peso':        setEditingWeight(null);     openForm('nuevo-peso'); break;
        case 'altura':      setEditingHeight(null);     openForm('nuevo-altura'); break;
        case 'perimetro':   setEditingHeadCirc(null);   openForm('nuevo-pc'); break;
      }
    },
    onEditFeeding: (f: Feeding) => { setEditingFeeding(f); openForm('editar-toma'); },
    onEditRest: (r: Rest) => { setEditingRest(r); openForm('editar-sueño'); },
    onDeleteFeeding: handleDeleteFeeding,
    onDeleteRest: handleDeleteRest,
    onStopFeeding: handleStopFeeding,
    onStopRest: handleStopRest,
    onGiveVitaminD: handleGiveVitaminD,
    onRemoveVitaminD: handleRemoveVitaminD,
    probioticLogs,
    onGiveProbiotic: handleGiveProbiotic,
    onRemoveProbiotic: handleRemoveProbiotic,
    onRecalculateTodayBreast: handleRecalculateTodayBreast,
    massageLogs,
    onAddMassage: handleAddMassage,
    onRemoveMassage: handleRemoveMassage,
    diapers,
    onEditDiaper: (d: DiaperChange) => { setEditingDiaper(d); openForm('editar-pañal'); },
    onDeleteDiaper: handleDeleteDiaper,
    medications,
    onEditMedication: (m: MedicationLog) => { setEditingMedication(m); openForm('editar-medicamento'); },
    medPlans,
    onGiveMedicationDose: handleGiveMedicationDose,
    onUndoMedicationDose: handleUndoMedicationDose,
    walks,
    onEditWalk: (w: Walk) => { setEditingWalk(w); openForm('editar-paseo'); },
    onDeleteWalk: handleDeleteWalk,
    onStopWalk: handleStopWalk,
    baths,
    onEditBath: (b: Bath) => { setEditingBath(b); openForm('editar-bano'); },
  } : null;

  const showForm = [
    'nueva-toma', 'editar-toma',
    'nuevo-sueño', 'editar-sueño',
    'editar-config',
    'nuevo-peso', 'editar-peso',
    'nuevo-altura', 'editar-altura',
    'nuevo-pc', 'editar-pc',
    'nuevo-pañal', 'editar-pañal',
    'nuevo-medicamento', 'editar-medicamento',
    'nuevo-paseo', 'editar-paseo',
    'nuevo-bano', 'editar-bano',
    'resumen-pediatra',
    'exportar',
    'admin',
  ].includes(screen);

  // ── Render ───────────────────────────────────────────────────────────────────

  async function handleExitImpersonation() {
    await api.exitImpersonation();
    window.location.reload();
  }

  return (
    <>
    {impersonating && (
      <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs flex items-center justify-between px-4 py-2">
        <span>Viendo la app como <strong>{currentUser}</strong> (admin: {originalUsername})</span>
        <button onClick={handleExitImpersonation} className="font-semibold underline touch-manipulation ml-4">
          Salir
        </button>
      </div>
    )}
    <div className={`flex flex-col lg:flex-row min-h-svh bg-cream-50${impersonating ? ' pt-8' : ''}`}>
      {/* Sidebar — solo desktop */}
      {!showForm && (
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-svh bg-white border-r border-gray-200 px-3 py-5">
          <div className="flex items-center gap-2.5 px-3 mb-6">
            <span className="text-3xl">{isAdmin ? '🛡️' : '👶'}</span>
            <div className="leading-tight">
              <p className="font-bold text-gray-900">Lacty</p>
              <p className="text-xs text-gray-400">{isAdmin ? 'Administración' : config?.name ?? ''}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {isAdmin ? (<>
              <SidebarButton label="Usuarios" icon={FamilyIcon} active={activeTab === 'admin-users'} onClick={() => navigate('admin-users')} />
              <SidebarButton label="Bebés" icon={BabyIcon} active={activeTab === 'admin-babies'} onClick={() => navigate('admin-babies')} />
              <SidebarButton label="Actividad" icon={ChartIcon} active={activeTab === 'admin-activity'} onClick={() => navigate('admin-activity')} />
              <SidebarButton label="Notificaciones" icon={BellIcon} active={activeTab === 'admin-push'} onClick={() => navigate('admin-push')} />
              <SidebarButton label="Guías" icon={NotesIcon} active={activeTab === 'admin-guias'} onClick={() => navigate('admin-guias')} />
              <SidebarButton label="Ajustes" icon={SettingsIcon} active={activeTab === 'admin-settings'} onClick={() => navigate('admin-settings')} />
            </>) : (<>
              <SidebarButton label="Hoy" icon={HomeIcon} active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
              <SidebarButton label="Gráficas" icon={ChartIcon} active={activeTab === 'graficas'} onClick={() => navigate('graficas')} />
              <SidebarButton label="Historial" icon={ListIcon} active={activeTab === 'historial'} onClick={() => navigate('historial')} />
              <SidebarButton label="Hitos" icon={MilestoneIcon} active={activeTab === 'hitos'} onClick={() => navigate('hitos')} />
              <SidebarButton label="Vacunas" icon={VaccineIcon} active={activeTab === 'vacunas'} onClick={() => navigate('vacunas')} />
              <SidebarButton label="Visitas" icon={CalendarIcon} active={activeTab === 'visitas'} onClick={() => navigate('visitas')} />
              <SidebarButton label="Dudas" icon={NotesIcon} active={activeTab === 'consultas'} onClick={() => navigate('consultas')} />
              <SidebarButton label="Referencia" icon={ChartIcon} active={activeTab === 'referencia'} onClick={() => navigate('referencia')} />
              <SidebarButton label={config?.name ?? 'Mi bebé'} icon={BabyIcon} active={activeTab === 'config'} onClick={() => navigate('config')} />
              <SidebarButton label="Familia" icon={FamilyIcon} active={activeTab === 'familia'} onClick={() => navigate('familia')} />
            </>)}
          </nav>

          {/* Cuenta + menú, abajo del todo */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <AccountMenu
              variant="sidebar"
              currentUser={currentUser}
              onOpenProfile={() => setScreen('mis-datos')}
              onOpenSettings={isAdmin ? () => navigate('admin-settings') : () => setScreen('ajustes')}
              onLogout={handleLogout}
            />
          </div>
        </aside>
      )}

      {/* Columna principal */}
      <div className="flex flex-col flex-1 min-w-0 w-full lg:max-w-5xl lg:mx-auto">
      {!showForm && !isAdmin && config && (
        <BabyBar
          babies={babies}
          activeId={config.id}
          onSwitch={switchBaby}
          currentUser={currentUser}
          onOpenProfile={() => setScreen('mis-datos')}
          onOpenSettings={() => setScreen('ajustes')}
          onLogout={handleLogout}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      )}
      {!showForm && isAdmin && (
        <div className="lg:hidden shrink-0 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <span className="text-sm font-bold text-gray-800">Lacty Admin</span>
            </div>
            <AccountMenu
              variant="avatar"
              currentUser={currentUser}
              onOpenProfile={() => setScreen('mis-datos')}
              onOpenSettings={() => navigate('admin-settings')}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto">

        {/* Toma forms */}
        {(screen === 'nueva-toma' || screen === 'editar-toma') && (
          <FeedingForm
            existing={editingFeeding}
            onSave={handleSaveFeeding}
            onCancel={() => { setEditingFeeding(null); closeForm(); }}
          />
        )}

        {/* Rest forms */}
        {(screen === 'nuevo-sueño' || screen === 'editar-sueño') && (
          <RestForm
            existing={editingRest}
            onSave={handleSaveRest}
            onCancel={() => { setEditingRest(null); closeForm(); }}
          />
        )}

        {/* Config form */}
        {screen === 'editar-config' && config && (
          <BabyConfigScreen
            existing={config}
            onSave={async (c) => {
              const updated = await api.updateBaby({ ...config, ...c });
              setConfig(updated);
              setBabies((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
              navigate('config');
            }}
          />
        )}

        {/* Weight forms */}
        {(screen === 'nuevo-peso' || screen === 'editar-peso') && (
          <WeightForm
            existing={editingWeight}
            onSave={handleSaveWeight}
            onCancel={() => { setEditingWeight(null); closeForm(); }}
          />
        )}

        {/* Height forms */}
        {(screen === 'nuevo-altura' || screen === 'editar-altura') && (
          <HeightForm
            existing={editingHeight}
            onSave={handleSaveHeight}
            onCancel={() => { setEditingHeight(null); closeForm(); }}
          />
        )}

        {(screen === 'nuevo-pc' || screen === 'editar-pc') && (
          <HeadCircForm
            existing={editingHeadCirc}
            onSave={handleSaveHeadCirc}
            onCancel={() => { setEditingHeadCirc(null); closeForm(); }}
          />
        )}

        {/* Diaper forms */}
        {(screen === 'nuevo-pañal' || screen === 'editar-pañal') && (
          <DiaperForm
            existing={editingDiaper}
            onSave={handleSaveDiaper}
            onCancel={() => { setEditingDiaper(null); closeForm(); }}
          />
        )}

        {/* Medication forms */}
        {(screen === 'nuevo-medicamento' || screen === 'editar-medicamento') && (
          <MedicationForm
            existing={editingMedication}
            medPlans={medPlans}
            medications={medications}
            onSave={handleSaveMedication}
            onDelete={handleDeleteMedication}
            onCancel={() => { setEditingMedication(null); closeForm(); }}
          />
        )}

        {/* Walk forms */}
        {(screen === 'nuevo-paseo' || screen === 'editar-paseo') && (
          <WalkForm
            existing={editingWalk}
            onSave={handleSaveWalk}
            onDelete={async (id) => { await handleDeleteWalk(id); setEditingWalk(null); closeForm(); }}
            onCancel={() => { setEditingWalk(null); closeForm(); }}
          />
        )}

        {(screen === 'nuevo-bano' || screen === 'editar-bano') && (
          <BathForm
            existing={editingBath}
            onSave={handleSaveBath}
            onDelete={handleDeleteBath}
            onCancel={() => { setEditingBath(null); closeForm(); }}
          />
        )}

        {/* Main tabs */}
        {screen === 'hoy' && propsHoy && (
          timelineDesign === 'rail'
            ? <TodayRail {...propsHoy} />
            : <DailySummary
                {...propsHoy}
                avisoLineaDeTiempo={timelinePromptSeen ? undefined : {
                  onProbar: activarTimelineNuevo,
                  onCerrar: dismissTimelinePrompt,
                }}
              />
        )}

        {screen === 'graficas' && config && (
          <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Gráficas</h1>
            <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Cargando gráficas…</div>}>
              <ChartsView feedings={feedings} rests={rests} weights={weights} heights={heights} headCircs={headCircs} birthDate={getBirthDate(config)} sex={config.sex} onGoToProfile={() => navigate('config')} scrollTo={chartTarget} onScrolled={() => setChartTarget(null)} />
            </Suspense>
          </div>
        )}

        {screen === 'historial' && config && (
          <FeedingList
            feedings={feedings}
            rests={rests}
            vitaminDLogs={vitaminDLogs}
            vitaminDEnabled={config.vitaminDEnabled ?? false}
            probioticLogs={probioticLogs}
            probioticEnabled={config.probioticEnabled ?? false}
            massageLogs={massageLogs}
            frenectomyEnabled={config.frenectomyEnabled ?? false}
            frenectomyDate={config.frenectomyDate}
            frenectomyEnd={frenectomyEndDate(config) ?? undefined}
            massagesTarget={massagesPerDay(config)}
            nightSleepStart={config.nightSleepStart}
            nightSleepEnd={config.nightSleepEnd}
            readOnly={isViewer}

            onEditFeeding={(f) => { setEditingFeeding(f); setScreen('editar-toma'); }}
            onEditRest={(r) => { setEditingRest(r); setScreen('editar-sueño'); }}
            onDeleteFeeding={handleDeleteFeeding}
            onDeleteRest={handleDeleteRest}
            diapers={diapers}
            onEditDiaper={(d) => { setEditingDiaper(d); setScreen('editar-pañal'); }}
            onDeleteDiaper={handleDeleteDiaper}
            medications={medications}
            onEditMedication={(m) => { setEditingMedication(m); setScreen('editar-medicamento'); }}
            walks={walks}
            onEditWalk={(w) => { setEditingWalk(w); setScreen('editar-paseo'); }}
            onDeleteWalk={handleDeleteWalk}
            baths={baths}
            onEditBath={(b) => { setEditingBath(b); setScreen('editar-bano'); }}
          />
        )}

        {screen === 'referencia' && config && (
          <ReferenceView
            config={config}
            feedings={feedings}
            rests={rests}
            currentWeightKg={currentWeightKg}
          />
        )}

        {screen === 'visitas' && (
          <VisitasView
            events={calendarEvents}
            consultations={consultations}
            readOnly={isViewer}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onCreateConsultation={handleCreateConsultation}
            onUpdateConsultation={handleUpdateConsultation}
            onDeleteConsultation={handleDeleteConsultation}
          />
        )}

        {screen === 'hitos' && config && (
          <MilestonesView
            milestoneLogs={milestoneLogs}
            babyAgeMonths={(getCurrentDaysOfLife(config) - 1) / 30.4375}
            onToggle={isViewer ? () => {} : handleToggleMilestone}
            readOnly={isViewer}
          />
        )}

        {screen === 'vacunas' && config && (
          <VaccinesView
            vaccineLogs={vaccineLogs}
            babyAgeMonths={(getCurrentDaysOfLife(config) - 1) / 30.4375}
            onToggle={isViewer ? () => {} : handleToggleVaccine}
            onDelete={isViewer ? () => {} : handleDeleteVaccine}
            readOnly={isViewer}
          />
        )}

        {screen === 'consultas' && (
          <div className="pt-4">
            <h1 className="text-2xl font-bold text-gray-900 px-4 mb-1">Dudas</h1>
            <p className="text-sm text-gray-500 px-4 mb-2">Para las visitas con profesionales</p>
            <ConsultationsView
              consultations={consultations}
              readOnly={isViewer}
              onCreate={handleCreateConsultation}
              onUpdate={handleUpdateConsultation}
              onDelete={handleDeleteConsultation}
            />
          </div>
        )}

        {screen === 'config' && config && (
          <BabyProfile
            config={config}
            weights={weights}
            heights={heights}
            headCircs={headCircs}
            onOpenGrowth={() => setScreen('crecimiento')}
            onOpenCare={() => setScreen('cuidados')}
            onOpenFamily={() => navigate('familia')}
            onOpenReference={() => navigate('referencia')}
            onOpenMilestones={() => navigate('hitos')}
            onOpenVaccines={() => navigate('vacunas')}
            onOpenPediatraSummary={() => setScreen('resumen-pediatra')}
            onOpenExport={() => setScreen('exportar')}
            onUpdateConfig={handleUpdateConfig}
            readOnly={isViewer}
          />
        )}

        {screen === 'crecimiento' && config && (
          <GrowthView
            weights={weights}
            heights={heights}
            headCircs={headCircs}
            onBack={() => setScreen('config')}
            onNewWeight={() => { setEditingWeight(null); openForm('nuevo-peso'); }}
            onEditWeight={(w) => { setEditingWeight(w); openForm('editar-peso'); }}
            onDeleteWeight={handleDeleteWeight}
            onNewHeight={() => { setEditingHeight(null); openForm('nuevo-altura'); }}
            onEditHeight={(h) => { setEditingHeight(h); openForm('editar-altura'); }}
            onDeleteHeight={handleDeleteHeight}
            onNewHeadCirc={() => { setEditingHeadCirc(null); openForm('nuevo-pc'); }}
            onEditHeadCirc={(h) => { setEditingHeadCirc(h); openForm('editar-pc'); }}
            onDeleteHeadCirc={handleDeleteHeadCirc}
            onOpenWeightChart={() => openChart('chart-weight')}
            onOpenHeightChart={() => openChart('chart-height')}
            onOpenHeadCircChart={() => openChart('chart-headcirc')}
            readOnly={isViewer}
          />
        )}

        {screen === 'cuidados' && config && (
          <CareSettings
            config={config}
            vitaminDLogs={vitaminDLogs}
            probioticLogs={probioticLogs}
            massageLogs={massageLogs}
            medications={medications}
            medPlans={medPlans}
            onDeleteMedicationPlan={handleDeleteMedicationPlan}
            onBack={() => setScreen('config')}
            onUpdateConfig={handleUpdateConfig}
            readOnly={isViewer}
          />
        )}

        {screen === 'familia' && config && (
          <FamilyView
            babies={babies}
            activeId={config.id}
            currentUser={currentUser}
            readOnly={isViewer}
            onSwitchBaby={switchBaby}
            onCreateBaby={handleCreateBaby}
            onDeleteBaby={handleDeleteBaby}
            onLogout={handleLogout}
          />
        )}

        {screen === 'ajustes' && (
          <AppSettings onBack={() => setScreen(activeTab)} baby={config} />
        )}

        {screen === 'mis-datos' && (
          <MyDataView onBack={() => setScreen(activeTab)} onUpdateUsername={setCurrentUser} />
        )}

        {screen === 'exportar' && config && (
          <ExportView
            datos={{
              config, feedings, rests, diapers, walks, medications,
              vitaminDLogs, probioticLogs, massageLogs, weights, baths,
            }}
            onBack={() => setScreen(activeTab)}
          />
        )}

        {screen === 'resumen-pediatra' && config && (
          <PediatraSummary
            config={config}
            feedings={feedings}
            rests={rests}
            weights={weights}
            heights={heights}
            milestoneLogs={milestoneLogs}
            medications={medications}
            onBack={() => setScreen(activeTab)}
          />
        )}

        {screen === 'admin-users' && (
          <AdminView />
        )}

        {screen === 'admin-babies' && (
          <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Bebés</h1>
            <BabiesAdminView />
          </div>
        )}

        {screen === 'admin-activity' && (
          <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Actividad</h1>
            <ActivityDashboard />
          </div>
        )}

        {screen === 'admin-push' && (
          <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Notificaciones</h1>
            <PushBroadcastView />
          </div>
        )}

        {screen === 'admin-guias' && (
          <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Guías</h1>
            <GuiasAdminView />
          </div>
        )}

        {screen === 'admin-settings' && (
          <div className="p-4 pb-24">
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <button onClick={() => navigate('admin-users')} className="text-sage-600 text-lg p-1 touch-manipulation">
                ← Atrás
              </button>
              <h2 className="text-xl font-bold text-gray-900">Ajustes</h2>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4 hidden lg:block">Ajustes</h1>
            <ThemeSelector />
          </div>
        )}
      </main>

      {/* FABs — inicio rápido (solo en Hoy, no admin, no viewer) */}
      {screen === 'hoy' && !isAdmin && !isViewer && (
        <div className="fixed right-5 bottom-20 lg:bottom-6 z-20 flex flex-col items-end gap-3">
          {/* FABs extra — visibles solo al expandir, algo más pequeños que los
              principales. En una columna la pila mide 552 px: con la cabecera
              de 64 px hacen falta unos 700 px de alto, así que por debajo de
              720 px (un iPhone SE, por ejemplo) se reparten en dos columnas. */}
          {showExtraFabs && (
            <div className="grid grid-cols-2 [@media(min-height:720px)]:grid-cols-1 gap-x-2 gap-y-3 justify-items-end">
              {/* Gris pizarra: el amarillo se confundía con el mostaza del pecho,
                  y el emoji ⚖️ (marrón) quedaba embarrado sobre él. */}
              <ExtraFab
                label="Peso" color="bg-slate-600 active:bg-slate-700 shadow-slate-600/30"
                onClick={() => { setShowExtraFabs(false); setEditingWeight(null); openForm('nuevo-peso'); }}
              >
                <ScaleIcon size={23} />
              </ExtraFab>
              <ExtraFab
                label="Pañal" color="bg-rose-400 active:bg-rose-500 shadow-rose-400/30"
                onClick={() => { setShowExtraFabs(false); setEditingDiaper(null); setScreen('nuevo-pañal'); }}
              >
                <DiaperIcon size={23} />
              </ExtraFab>
              <ExtraFab
                label="Biberón" color="bg-sky-500 active:bg-sky-600 shadow-sky-500/30"
                onClick={() => { setShowExtraFabs(false); handleQuickBottle(); }}
              >
                <span className="text-xl">🍼</span>
              </ExtraFab>
              <ExtraFab
                label="Medicamento" color="bg-violet-500 active:bg-violet-600 shadow-violet-500/30"
                onClick={() => { setShowExtraFabs(false); setEditingMedication(null); setScreen('nuevo-medicamento'); }}
              >
                <MedicineIcon size={22} />
              </ExtraFab>
              {/* Con un paseo en curso, el botón pasa a finalizarlo: así se
                  empieza y se termina desde el mismo sitio. */}
              <ExtraFab
                label={walkInProgress ? 'Fin del paseo' : 'Paseo'}
                color="bg-coral-600 active:bg-coral-700 shadow-coral-600/30"
                onClick={() => {
                  setShowExtraFabs(false);
                  walkInProgress ? handleStopWalk(walkInProgress) : handleQuickWalk();
                }}
              >
                <StrollerIcon size={23} />
              </ExtraFab>
              <ExtraFab
                label="Baño" color="bg-teal-500 active:bg-teal-600 shadow-teal-500/30"
                onClick={() => { setShowExtraFabs(false); handleQuickBath(); }}
              >
                <span className="text-xl">🛁</span>
              </ExtraFab>
            </div>
          )}
          {/* FABs principales */}
          {!restInProgress && (
            <button
              onClick={handleQuickRest}
              aria-label="Iniciar sueño"
              className="w-14 h-14 rounded-full bg-lagoon-600 text-white shadow-lg shadow-lagoon-600/30 flex items-center justify-center text-2xl active:scale-95 active:bg-lagoon-700 transition-transform touch-manipulation"
            >
              🌙
            </button>
          )}
          {!breastInProgress && (
            <button
              onClick={handleQuickBreast}
              aria-label="Iniciar toma de pecho"
              className="w-14 h-14 rounded-full bg-mustard-600 text-white shadow-lg shadow-mustard-600/30 flex items-center justify-center text-2xl active:scale-95 active:bg-mustard-700 transition-transform touch-manipulation"
            >
              🤱
            </button>
          )}
          {/* Botón toggle "más" */}
          <button
            onClick={() => setShowExtraFabs(v => !v)}
            aria-label={showExtraFabs ? 'Cerrar más opciones' : 'Más opciones'}
            className="w-14 h-14 rounded-full bg-sage-600 text-white shadow-lg shadow-sage-600/30 flex items-center justify-center text-xl font-bold active:scale-95 active:bg-sage-700 transition-transform touch-manipulation"
          >
            {showExtraFabs ? '✕' : '⋯'}
          </button>
        </div>
      )}

      {/* z-30: las cabeceras de franja del timeline son `sticky z-10` y, al estar
          siempre posicionadas, se pintaban por encima de esta barra. */}
      {!showForm && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex pb-safe">
          {isAdmin ? (<>
            <NavButton label="Usuarios" icon={FamilyIcon} active={activeTab === 'admin-users'} onClick={() => navigate('admin-users')} />
            <NavButton label="Bebés" icon={BabyIcon} active={activeTab === 'admin-babies'} onClick={() => navigate('admin-babies')} />
            <NavButton label="Actividad" icon={ChartIcon} active={activeTab === 'admin-activity'} onClick={() => navigate('admin-activity')} />
            <NavButton label="Push" icon={BellIcon} active={activeTab === 'admin-push'} onClick={() => navigate('admin-push')} />
            <NavButton label="Guías" icon={NotesIcon} active={activeTab === 'admin-guias'} onClick={() => navigate('admin-guias')} />
            <NavButton label="Ajustes" icon={SettingsIcon} active={activeTab === 'admin-settings'} onClick={() => navigate('admin-settings')} />
          </>) : (<>
            {/* El botón central registra, que es lo que más se hace. El resto de
                secciones (Visitas, Dudas, Hitos, Vacunas, Mi bebé…) cuelgan de
                «Más», al alcance del pulgar en vez de en la esquina de arriba. */}
            <NavButton label="Hoy" icon={HomeIcon} active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
            <NavButton label="Historial" icon={ListIcon} active={activeTab === 'historial'} onClick={() => navigate('historial')} />
            {!isViewer && <NavAddButton onClick={() => setAñadirAbierto(true)} />}
            <NavButton label="Gráficas" icon={ChartIcon} active={activeTab === 'graficas'} onClick={() => navigate('graficas')} />
            <NavButton
              label="Más"
              icon={MenuIcon}
              active={drawerOpen || !['hoy', 'historial', 'graficas'].includes(activeTab)}
              onClick={() => setDrawerOpen(true)}
            />
          </>)}
        </nav>
      )}
      {/* Drawer móvil — menú completo */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl animate-slide-in">
            <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
              <span className="text-2xl">👶</span>
              <div className="leading-tight">
                <p className="font-bold text-gray-900">Lacty</p>
                <p className="text-xs text-gray-400">{config?.name ?? ''}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="ml-auto p-1 text-gray-400 active:text-gray-600 touch-manipulation">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3 py-3 flex-1 overflow-y-auto">
              <SidebarButton label="Hoy" icon={HomeIcon} active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
              <SidebarButton label="Gráficas" icon={ChartIcon} active={activeTab === 'graficas'} onClick={() => navigate('graficas')} />
              <SidebarButton label="Historial" icon={ListIcon} active={activeTab === 'historial'} onClick={() => navigate('historial')} />
              <SidebarButton label="Hitos" icon={MilestoneIcon} active={activeTab === 'hitos'} onClick={() => navigate('hitos')} />
              <SidebarButton label="Vacunas" icon={VaccineIcon} active={activeTab === 'vacunas'} onClick={() => navigate('vacunas')} />
              <SidebarButton label="Visitas" icon={CalendarIcon} active={activeTab === 'visitas'} onClick={() => navigate('visitas')} />
              <SidebarButton label="Dudas" icon={NotesIcon} active={activeTab === 'consultas'} onClick={() => navigate('consultas')} />
              <SidebarButton label="Referencia" icon={ChartIcon} active={activeTab === 'referencia'} onClick={() => navigate('referencia')} />
              <SidebarButton label={config?.name ?? 'Mi bebé'} icon={BabyIcon} active={activeTab === 'config'} onClick={() => navigate('config')} />
              <SidebarButton label="Familia" icon={FamilyIcon} active={activeTab === 'familia'} onClick={() => navigate('familia')} />
            </nav>
            <div className="px-3 py-3 border-t border-gray-100">
              <AccountMenu
                variant="sidebar"
                currentUser={currentUser}
                onOpenProfile={() => { setDrawerOpen(false); setScreen('mis-datos'); }}
                onOpenSettings={() => { setDrawerOpen(false); setScreen('ajustes'); }}
                onLogout={handleLogout}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Hoja de «Añadir registro»: la abren la cabecera de «Hoy» y el botón
          central de la barra inferior, así que vive aquí y no dentro de «Hoy». */}
      {añadirAbierto && propsHoy && config && (
        <AddRecordSheet
          onSelect={(tipo) => { setAñadirAbierto(false); propsHoy.onAdd(tipo); }}
          onClose={() => setAñadirAbierto(false)}
          cuidados={isViewer ? [] : cuidadosDeHoy({
            config, today: todayIso(),
            ahoraMin: new Date().getHours() * 60 + new Date().getMinutes(),
            vitaminDLogs, probioticLogs, massageLogs, medications, medPlans,
          })}
          onRegistrarCuidado={(c) => { setAñadirAbierto(false); registrarCuidado(c); }}
        />
      )}

      </div>
      <Toaster />
    </div>
    </>
  );
}

function AccountMenu({ variant, currentUser, onOpenProfile, onOpenSettings, onLogout }: {
  variant: 'sidebar' | 'avatar';
  currentUser: string | null;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (currentUser ?? '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {variant === 'sidebar' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 touch-manipulation"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-100 text-sage-700 text-sm font-bold shrink-0">
              {initial}
            </span>
            <span className="text-sm text-gray-600 truncate">{currentUser}</span>
          </div>
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Cuenta"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-100 text-sage-700 text-sm font-bold touch-manipulation"
        >
          {initial}
        </button>
      )}

      {open && (
        <div
          className={`absolute z-40 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 min-w-[200px] ${
            variant === 'sidebar' ? 'bottom-full mb-2 left-0' : 'right-0 top-full mt-2'
          }`}
        >
          {variant === 'avatar' && currentUser && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser}</p>
              <p className="text-xs text-gray-500">Sesión iniciada</p>
            </div>
          )}
          <button
            onClick={() => { setOpen(false); onOpenProfile(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 active:bg-gray-50 touch-manipulation"
          >
            <span>🪪</span> Mis datos
          </button>
          {onOpenSettings && (
            <button
              onClick={() => { setOpen(false); onOpenSettings(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 active:bg-gray-50 touch-manipulation"
            >
              <span>⚙️</span> Configuración
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 active:bg-red-50 touch-manipulation"
          >
            <span>🚪</span> Salir
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Botón flotante secundario: algo más pequeño que los principales y con la
 * etiqueta al lado. Al haber cinco, a tamaño completo la columna no cabía en
 * pantallas pequeñas; la etiqueta además evita depender solo del color.
 */
function ExtraFab({ label, color, onClick, children }: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-2 active:scale-95 transition-transform touch-manipulation"
    >
      {/* `bg-white` a secas, sin opacidad: el modo noche oscurece esa clase, y
          `bg-white/95` genera otra distinta que se quedaba blanca. */}
      <span className="bg-white text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
        {label}
      </span>
      <span className={`w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center shrink-0 ${color}`}>
        {children}
      </span>
    </button>
  );
}

function BabyBar({ babies, activeId, onSwitch, currentUser, onOpenProfile, onOpenSettings, onLogout, onOpenDrawer }: {
  babies: BabyConfig[];
  activeId: string;
  onSwitch: (id: string) => void;
  currentUser: string | null;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenDrawer: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = babies.find((b) => b.id === activeId);
  if (!active) return null;
  const multi = babies.length > 1;

  return (
    <div className="relative shrink-0 border-b border-gray-200 bg-white">
      {/* Hamburguesa — solo móvil */}
      <button
        onClick={onOpenDrawer}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 lg:hidden p-2 text-gray-500 active:text-gray-700 touch-manipulation"
        aria-label="Menú"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {/* Avatar de cuenta — solo móvil */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 lg:hidden">
        <AccountMenu
          variant="avatar"
          currentUser={currentUser}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
        />
      </div>
      <button
        onClick={() => multi && setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 py-2.5 touch-manipulation"
      >
        <span className="text-lg">👶</span>
        <span className="text-sm font-bold text-gray-800">{active.name ?? 'Mi bebé'}</span>
        {multi && (
          <span className={`flex items-center justify-center w-6 h-6 rounded-full bg-sage-100 text-sage-700 transition-transform ${open ? 'rotate-180' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        )}
      </button>

      {open && multi && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-full z-40 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 min-w-[200px]">
            {babies.map((b) => (
              <button
                key={b.id}
                onClick={() => { onSwitch(b.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 touch-manipulation ${
                  b.id === activeId ? 'bg-sage-50' : 'active:bg-gray-50'
                }`}
              >
                <span>👶</span>
                <span className={`flex-1 text-left text-sm ${b.id === activeId ? 'font-bold text-sage-700' : 'text-gray-600'}`}>
                  {b.name ?? 'Mi bebé'}
                </span>
                {b.id === activeId && <span className="text-sage-600 text-sm">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NavButton({ label, icon: Icon, active, onClick }: {
  label: string; icon: (p: { active: boolean }) => React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center py-2.5 gap-1 touch-manipulation transition-colors ${
        active ? 'text-sage-600' : 'text-gray-400'
      }`}
    >
      <Icon active={active} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

/**
 * Botón central de la barra: abre la hoja de «Añadir registro». Sobresale por
 * encima de la barra para que se distinga de las secciones, que solo navegan.
 */
function NavAddButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex-1 flex justify-center">
      <button
        onClick={onClick}
        aria-label="Añadir registro"
        className="-mt-5 w-14 h-14 rounded-full bg-sage-600 text-white text-2xl font-bold shadow-lg shadow-sage-600/30 ring-4 ring-white flex items-center justify-center active:scale-95 active:bg-sage-700 transition-transform touch-manipulation"
      >
        +
      </button>
    </div>
  );
}

function SidebarButton({ label, icon: Icon, active, onClick }: {
  label: string; icon: (p: { active: boolean }) => React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium touch-manipulation transition-colors ${
        active ? 'bg-sage-50 text-sage-700' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-sage-600" />}
      <Icon active={active} />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ── Iconos de navegación (estilo línea, Lucide) ────────────────────────────────

function navIconProps(active: boolean) {
  return {
    width: 24, height: 24, viewBox: '0 0 24 24',
    fill: active ? 'currentColor' : 'none',
    fillOpacity: active ? 0.12 : 0,
    stroke: 'currentColor', strokeWidth: active ? 2.2 : 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
}

function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)} fill="none">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1.2" />
      <circle cx="3.5" cy="12" r="1.2" />
      <circle cx="3.5" cy="18" r="1.2" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" />
      <rect x="12" y="7" width="3" height="10" />
      <rect x="17" y="13" width="3" height="4" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

function NotesIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <path d="M9 3h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z" />
      <path d="M7 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function VaccineIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <path d="M18 2l-2 2M14.5 5.5L18 2M7 12l-2 2M12 7l-5 5 7 7 5-5-7-7z" />
      <path d="M5 14l-2 2a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2-2" />
    </svg>
  );
}

function MilestoneIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FamilyIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1" />
      <path d="M14.5 20v-1a4.5 4.5 0 0 1 7-3.7" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BabyIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 10h.01M15 10h.01" />
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
    </svg>
  );
}
