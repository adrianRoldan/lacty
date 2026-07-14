import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { BabyConfig, Feeding, Rest, WeightEntry, HeightEntry, HeadCircEntry, VitaminDLog, ProbioticLog, MassageLog, MilestoneLog, VaccineLog, Consultation, CalendarEvent, DiaperChange } from './types';
import { getCurrentDaysOfLife, getBirthDate } from './utils/dateUtils';
import { calcBreastEstimatedMl, generateId } from './utils/feedingUtils';
import * as api from './api';
import BabyConfigScreen from './components/BabyConfig';
import BabyProfile from './components/BabyProfile';
import LoginScreen from './components/LoginScreen';
import DailySummary from './components/DailySummary';
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
import AppSettings from './components/AppSettings';
import MilestonesView from './components/MilestonesView';
import VaccinesView from './components/VaccinesView';
import PediatraSummary from './components/PediatraSummary';
import AdminView, { ActivityDashboard, PushBroadcastView } from './components/AdminView';
import ThemeSelector from './components/ThemeSelector';
import { Toaster, toast } from './toast';
const ChartsView = lazy(() => import('./components/ChartsView'));

type Tab = 'hoy' | 'graficas' | 'historial' | 'hitos' | 'vacunas' | 'referencia' | 'visitas' | 'consultas' | 'config' | 'familia' | 'admin-users' | 'admin-activity' | 'admin-push' | 'admin-settings';
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
  | 'ajustes'
  | 'resumen-pediatra'
  | 'nuevo-pañal'
  | 'editar-pañal';

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
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [familyRole, setFamilyRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [impersonating, setImpersonating] = useState(false);
  const [originalUsername, setOriginalUsername] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

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
  const [showExtraFabs, setShowExtraFabs] = useState(false);
  const [feedingPreset, setFeedingPreset] = useState<'bottle' | undefined>(undefined);

  // Abre la pestaña Gráficas y desplaza a la gráfica indicada (peso/talla).
  function openChart(anchor: string) {
    setChartTarget(anchor);
    navigate('graficas');
  }

  // Trae todos los datos del bebé activo (asume que api.setActiveBaby ya está fijado).
  async function loadBabyData() {
    const [fds, rsts, wts, hts, hcs, vdLogs, prLogs, mLogs, msLogs, vacLogs, cons, cal, dps] = await Promise.all([
      api.getFeedings(), api.getRests(), api.getWeights(), api.getHeights(), api.getHeadCircs(), api.getVitaminDLogs(),
      api.getProbioticLogs(), api.getMassageLogs(), api.getMilestones(), api.getVaccines(), api.getConsultations(), api.getCalendarEvents(),
      api.getDiapers(),
    ]);
    setFeedings(fds); setRests(rsts); setWeights(wts); setHeights(hts); setHeadCircs(hcs);
    setVitaminDLogs(vdLogs); setProbioticLogs(prLogs); setMassageLogs(mLogs);
    setMilestoneLogs(msLogs); setVaccineLogs(vacLogs); setConsultations(cons); setCalendarEvents(cal);
    setDiapers(dps);
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

  useEffect(() => {
    api.checkAuth().then((auth) => {
      setCurrentUser(auth?.username ?? null);
      setUserRole(auth?.role ?? 'user');
      setFamilyRole(auth?.familyRole ?? 'editor');
      setImpersonating(auth?.impersonating ?? false);
      setOriginalUsername(auth?.originalUsername ?? null);
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

  // ── Auth ─────────────────────────────────────────────────────────────────────

  if (!authChecked) return null; // espera silenciosa mientras verifica sesión

  if (!currentUser) {
    return <LoginScreen onLogin={(username, role, fRole) => {
      setCurrentUser(username);
      setUserRole(role);
      setFamilyRole(fRole);
      if (role === 'admin') { setActiveTab('admin-users'); setScreen('admin-users'); }
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

  const needsOnboarding = !isAdmin && (!config || !config.birthDate || !config.sex);

  if (needsOnboarding) {
    return (
      <BabyConfigScreen
        existing={config}
        username={currentUser}
        onLogout={() => { api.logout(); setCurrentUser(null); }}
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
    setScreen(activeTab);
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
    } else {
      const updated = await api.updateFeeding({ ...feeding, endTime });
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast(bottleIP ? 'Biberón finalizado' : 'Jeringa-dedo finalizada');
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
    setScreen(activeTab);
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
    navigate(activeTab);
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
    navigate(activeTab);
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
    navigate(activeTab);
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
    navigate(activeTab);
  }

  async function handleDeleteDiaper(id: string) {
    await api.deleteDiaper(id);
    setDiapers((prev) => prev.filter((d) => d.id !== id));
    toast('Pañal eliminado');
  }

  function navigate(tab: Tab) {
    setActiveTab(tab);
    setScreen(tab);
    setDrawerOpen(false);
  }

  const showForm = [
    'nueva-toma', 'editar-toma',
    'nuevo-sueño', 'editar-sueño',
    'editar-config',
    'nuevo-peso', 'editar-peso',
    'nuevo-altura', 'editar-altura',
    'nuevo-pc', 'editar-pc',
    'nuevo-pañal', 'editar-pañal',
    'resumen-pediatra',
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
              <SidebarButton label="Actividad" icon={ChartIcon} active={activeTab === 'admin-activity'} onClick={() => navigate('admin-activity')} />
              <SidebarButton label="Notificaciones" icon={BellIcon} active={activeTab === 'admin-push'} onClick={() => navigate('admin-push')} />
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
              onOpenSettings={isAdmin ? () => navigate('admin-settings') : () => setScreen('ajustes')}
              onLogout={async () => { await api.logout(); setCurrentUser(null); }}
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
          onOpenSettings={() => setScreen('ajustes')}
          onLogout={async () => { await api.logout(); setCurrentUser(null); }}
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
              onOpenSettings={() => navigate('admin-settings')}
              onLogout={async () => { await api.logout(); setCurrentUser(null); }}
            />
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto">

        {/* Toma forms */}
        {(screen === 'nueva-toma' || screen === 'editar-toma') && (
          <FeedingForm
            existing={editingFeeding}
            preset={feedingPreset}
            onSave={(f) => { setFeedingPreset(undefined); handleSaveFeeding(f); }}
            onCancel={() => { setFeedingPreset(undefined); setEditingFeeding(null); setScreen(activeTab); }}
          />
        )}

        {/* Rest forms */}
        {(screen === 'nuevo-sueño' || screen === 'editar-sueño') && (
          <RestForm
            existing={editingRest}
            onSave={handleSaveRest}
            onCancel={() => { setEditingRest(null); setScreen(activeTab); }}
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
            onCancel={() => { setEditingWeight(null); navigate(activeTab); }}
          />
        )}

        {/* Height forms */}
        {(screen === 'nuevo-altura' || screen === 'editar-altura') && (
          <HeightForm
            existing={editingHeight}
            onSave={handleSaveHeight}
            onCancel={() => { setEditingHeight(null); navigate(activeTab); }}
          />
        )}

        {(screen === 'nuevo-pc' || screen === 'editar-pc') && (
          <HeadCircForm
            existing={editingHeadCirc}
            onSave={handleSaveHeadCirc}
            onCancel={() => { setEditingHeadCirc(null); navigate(activeTab); }}
          />
        )}

        {/* Diaper forms */}
        {(screen === 'nuevo-pañal' || screen === 'editar-pañal') && (
          <DiaperForm
            existing={editingDiaper}
            onSave={handleSaveDiaper}
            onCancel={() => { setEditingDiaper(null); navigate(activeTab); }}
          />
        )}

        {/* Main tabs */}
        {screen === 'hoy' && config && (
          <DailySummary
            config={config}
            feedings={feedings}
            rests={rests}
            currentWeightKg={currentWeightKg}
            vitaminDLogs={vitaminDLogs}
            calendarEvents={calendarEvents}
            readOnly={isViewer}
            onOpenAgenda={() => navigate('visitas')}
            onNewFeeding={() => { setEditingFeeding(null); setScreen('nueva-toma'); }}
            onNewRest={() => { setEditingRest(null); setScreen('nuevo-sueño'); }}
            onEditFeeding={(f) => { setEditingFeeding(f); setScreen('editar-toma'); }}
            onEditRest={(r) => { setEditingRest(r); setScreen('editar-sueño'); }}
            onDeleteFeeding={handleDeleteFeeding}
            onDeleteRest={handleDeleteRest}
            onStopFeeding={handleStopFeeding}
            onStopRest={handleStopRest}
            onGiveVitaminD={handleGiveVitaminD}
            onRemoveVitaminD={handleRemoveVitaminD}
            probioticLogs={probioticLogs}
            onGiveProbiotic={handleGiveProbiotic}
            onRemoveProbiotic={handleRemoveProbiotic}
            onRecalculateTodayBreast={handleRecalculateTodayBreast}
            massageLogs={massageLogs}
            onAddMassage={handleAddMassage}
            onRemoveMassage={handleRemoveMassage}
            diapers={diapers}
            onNewDiaper={() => { setEditingDiaper(null); setScreen('nuevo-pañal'); }}
            onEditDiaper={(d) => { setEditingDiaper(d); setScreen('editar-pañal'); }}
            onDeleteDiaper={handleDeleteDiaper}
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
            readOnly={isViewer}

            onEditFeeding={(f) => { setEditingFeeding(f); setScreen('editar-toma'); }}
            onEditRest={(r) => { setEditingRest(r); setScreen('editar-sueño'); }}
            onDeleteFeeding={handleDeleteFeeding}
            onDeleteRest={handleDeleteRest}
            diapers={diapers}
            onEditDiaper={(d) => { setEditingDiaper(d); setScreen('editar-pañal'); }}
            onDeleteDiaper={handleDeleteDiaper}
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
            vitaminDLogs={vitaminDLogs}
            probioticLogs={probioticLogs}
            massageLogs={massageLogs}
            onOpenFamily={() => navigate('familia')}
            onOpenReference={() => navigate('referencia')}
            onNewWeight={() => { setEditingWeight(null); setScreen('nuevo-peso'); }}
            onEditWeight={(w) => { setEditingWeight(w); setScreen('editar-peso'); }}
            onDeleteWeight={handleDeleteWeight}
            onNewHeight={() => { setEditingHeight(null); setScreen('nuevo-altura'); }}
            onEditHeight={(h) => { setEditingHeight(h); setScreen('editar-altura'); }}
            onDeleteHeight={handleDeleteHeight}
            onNewHeadCirc={() => { setEditingHeadCirc(null); setScreen('nuevo-pc'); }}
            onEditHeadCirc={(h) => { setEditingHeadCirc(h); setScreen('editar-pc'); }}
            onDeleteHeadCirc={handleDeleteHeadCirc}
            onOpenWeightChart={() => openChart('chart-weight')}
            onOpenHeightChart={() => openChart('chart-height')}
            onOpenHeadCircChart={() => openChart('chart-headcirc')}
            onOpenMilestones={() => navigate('hitos')}
            onOpenVaccines={() => navigate('vacunas')}
            onOpenPediatraSummary={() => setScreen('resumen-pediatra')}
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
            onLogout={async () => { await api.logout(); setCurrentUser(null); }}
          />
        )}

        {screen === 'ajustes' && (
          <AppSettings onBack={() => setScreen(activeTab)} baby={config} />
        )}

        {screen === 'resumen-pediatra' && config && (
          <PediatraSummary
            config={config}
            feedings={feedings}
            rests={rests}
            weights={weights}
            heights={heights}
            milestoneLogs={milestoneLogs}
            onBack={() => setScreen(activeTab)}
          />
        )}

        {screen === 'admin-users' && (
          <AdminView />
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
        <div className="fixed right-5 bottom-20 lg:bottom-6 z-20 flex flex-col items-center gap-3">
          {/* FABs extra — visibles solo al expandir */}
          {showExtraFabs && (
            <>
              <button
                onClick={() => { setShowExtraFabs(false); setEditingWeight(null); setScreen('nuevo-peso'); }}
                aria-label="Añadir peso"
                className="w-14 h-14 rounded-full bg-yellow-600 text-white shadow-lg shadow-yellow-600/30 flex items-center justify-center text-2xl active:scale-95 active:bg-yellow-700 transition-transform touch-manipulation"
              >
                ⚖️
              </button>
              <button
                onClick={() => { setShowExtraFabs(false); setEditingDiaper(null); setScreen('nuevo-pañal'); }}
                aria-label="Añadir cambio de pañal"
                className="w-14 h-14 rounded-full bg-rose-400 text-white shadow-lg shadow-rose-400/30 flex items-center justify-center text-2xl active:scale-95 active:bg-rose-500 transition-transform touch-manipulation"
              >
                <DiaperIcon size={26} />
              </button>
              <button
                onClick={() => { setShowExtraFabs(false); setFeedingPreset('bottle'); setEditingFeeding(null); setScreen('nueva-toma'); }}
                aria-label="Añadir toma biberón"
                className="w-14 h-14 rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 flex items-center justify-center text-2xl active:scale-95 active:bg-sky-600 transition-transform touch-manipulation"
              >
                🍼
              </button>
            </>
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

      {!showForm && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex pb-safe">
          {isAdmin ? (<>
            <NavButton label="Usuarios" icon={FamilyIcon} active={activeTab === 'admin-users'} onClick={() => navigate('admin-users')} />
            <NavButton label="Actividad" icon={ChartIcon} active={activeTab === 'admin-activity'} onClick={() => navigate('admin-activity')} />
            <NavButton label="Push" icon={BellIcon} active={activeTab === 'admin-push'} onClick={() => navigate('admin-push')} />
            <NavButton label="Ajustes" icon={SettingsIcon} active={activeTab === 'admin-settings'} onClick={() => navigate('admin-settings')} />
          </>) : (<>
            <NavButton label="Hoy" icon={HomeIcon} active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
            <NavButton label="Gráficas" icon={ChartIcon} active={activeTab === 'graficas'} onClick={() => navigate('graficas')} />
            <NavButton label="Historial" icon={ListIcon} active={activeTab === 'historial'} onClick={() => navigate('historial')} />
            <NavButton label="Visitas" icon={CalendarIcon} active={activeTab === 'visitas'} onClick={() => navigate('visitas')} />
            <NavButton label={config?.name ?? 'Mi bebé'} icon={BabyIcon} active={activeTab === 'config' || activeTab === 'familia'} onClick={() => navigate('config')} />
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
                onOpenSettings={() => { setDrawerOpen(false); setScreen('ajustes'); }}
                onLogout={async () => { await api.logout(); setCurrentUser(null); }}
              />
            </div>
          </aside>
        </div>
      )}

      </div>
      <Toaster />
    </div>
    </>
  );
}

function AccountMenu({ variant, currentUser, onOpenSettings, onLogout }: {
  variant: 'sidebar' | 'avatar';
  currentUser: string | null;
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

function BabyBar({ babies, activeId, onSwitch, currentUser, onOpenSettings, onLogout, onOpenDrawer }: {
  babies: BabyConfig[];
  activeId: string;
  onSwitch: (id: string) => void;
  currentUser: string | null;
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
