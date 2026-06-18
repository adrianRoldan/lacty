import { useState, useEffect, useRef } from 'react';
import type { BabyConfig, Feeding, Rest, WeightEntry, VitaminDLog, ProbioticLog, MassageLog, Consultation, CalendarEvent } from './types';
import { getCurrentDaysOfLife } from './utils/dateUtils';
import { calcBreastEstimatedMl, generateId } from './utils/feedingUtils';
import * as api from './api';
import BabyConfigScreen from './components/BabyConfig';
import BabyProfile from './components/BabyProfile';
import LoginScreen from './components/LoginScreen';
import DailySummary from './components/DailySummary';
import FeedingForm from './components/FeedingForm';
import RestForm from './components/RestForm';
import WeightForm from './components/WeightForm';
import FeedingList from './components/FeedingList';
import ReferenceView from './components/ReferenceView';
import VisitasView from './components/VisitasView';
import ConsultationsView from './components/ConsultationsView';
import FamilyView from './components/FamilyView';
import AppSettings from './components/AppSettings';
import { Toaster, toast } from './toast';

type Tab = 'hoy' | 'historial' | 'referencia' | 'visitas' | 'consultas' | 'config' | 'familia';
type Screen =
  | Tab
  | 'nueva-toma'
  | 'editar-toma'
  | 'nuevo-sueño'
  | 'editar-sueño'
  | 'editar-config'
  | 'nuevo-peso'
  | 'editar-peso'
  | 'ajustes';

export default function App() {
  const [config, setConfig] = useState<BabyConfig | null>(null);
  const [babies, setBabies] = useState<BabyConfig[]>([]);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [rests, setRests] = useState<Rest[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [vitaminDLogs, setVitaminDLogs] = useState<VitaminDLog[]>([]);
  const [probioticLogs, setProbioticLogs] = useState<ProbioticLog[]>([]);
  const [massageLogs, setMassageLogs] = useState<MassageLog[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('hoy');
  const [screen, setScreen] = useState<Screen>('hoy');
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);
  const [editingRest, setEditingRest] = useState<Rest | null>(null);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);

  // Trae todos los datos del bebé activo (asume que api.setActiveBaby ya está fijado).
  async function loadBabyData() {
    const [fds, rsts, wts, vdLogs, prLogs, mLogs, cons, cal] = await Promise.all([
      api.getFeedings(), api.getRests(), api.getWeights(), api.getVitaminDLogs(),
      api.getProbioticLogs(), api.getMassageLogs(), api.getConsultations(), api.getCalendarEvents(),
    ]);
    setFeedings(fds); setRests(rsts); setWeights(wts);
    setVitaminDLogs(vdLogs); setProbioticLogs(prLogs); setMassageLogs(mLogs);
    setConsultations(cons); setCalendarEvents(cal);
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
        case 'babies':     api.getBabies().then((list) => {
          setBabies(list);
          setConfig((prev) => list.find((b) => b.id === prev?.id) ?? list[0] ?? null);
        }); break;
        case 'vitamind':   api.getVitaminDLogs().then(setVitaminDLogs); break;
        case 'probiotics': api.getProbioticLogs().then(setProbioticLogs); break;
        case 'massages':   api.getMassageLogs().then(setMassageLogs); break;
        case 'consultations': api.getConsultations().then(setConsultations); break;
        case 'calendar':   api.getCalendarEvents().then(setCalendarEvents); break;
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
    return <LoginScreen onLogin={(username) => {
      setCurrentUser(username);
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

  // ── First setup ──────────────────────────────────────────────────────────────

  if (!config) {
    return (
      <BabyConfigScreen
        onSave={async (c) => {
          const saved = await api.createBaby(c);
          api.setActiveBaby(saved.id);
          setBabies((prev) => [...prev, saved]);
          setConfig(saved);
          setScreen('hoy');
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
      const estimatedMl = calcBreastEstimatedMl(daysOfLife, elapsed, feedings);
      const updated = await api.updateFeeding({
        ...feeding,
        breastMinLeft: elapsed,
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

  // Finaliza una toma de pecho en curso (igual que al cortarla por un nuevo registro).
  async function handleStopFeeding(feeding: Feeding) {
    if (!(feeding.hasBreast && feeding.breastMinLeft == null && feeding.breastMinRight == null)) return;
    const elapsed = Math.max(
      0,
      Math.round((Date.now() - new Date(feeding.timestamp).getTime()) / 60000)
    );
    const daysOfLife = getCurrentDaysOfLife(config!);
    const estimatedMl = calcBreastEstimatedMl(daysOfLife, elapsed, feedings);
    const updated = await api.updateFeeding({
      ...feeding,
      breastMinLeft: elapsed,
      ...(estimatedMl != null ? { breastEstimatedMl: estimatedMl } : {}),
    });
    setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    toast('Toma de pecho finalizada');
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
    navigate('config');
  }

  async function handleDeleteWeight(id: string) {
    await api.deleteWeight(id);
    setWeights((prev) => prev.filter((w) => w.id !== id));
    toast('Peso eliminado');
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

  function navigate(tab: Tab) {
    setActiveTab(tab);
    setScreen(tab);
  }

  const showForm = [
    'nueva-toma', 'editar-toma',
    'nuevo-sueño', 'editar-sueño',
    'editar-config',
    'nuevo-peso', 'editar-peso',
  ].includes(screen);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row min-h-svh bg-cream-50">
      {/* Sidebar — solo desktop */}
      {!showForm && (
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-svh bg-white border-r border-gray-200 px-3 py-5">
          <div className="flex items-center gap-2.5 px-3 mb-6">
            <span className="text-3xl">👶</span>
            <div className="leading-tight">
              <p className="font-bold text-gray-900">Lacty</p>
              {config.name && <p className="text-xs text-gray-400">{config.name}</p>}
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <SidebarButton label="Hoy" icon={HomeIcon} active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
            <SidebarButton label="Historial" icon={ListIcon} active={activeTab === 'historial'} onClick={() => navigate('historial')} />
            <SidebarButton label="Visitas" icon={CalendarIcon} active={activeTab === 'visitas'} onClick={() => navigate('visitas')} />
            <SidebarButton label="Dudas" icon={NotesIcon} active={activeTab === 'consultas'} onClick={() => navigate('consultas')} />
            <SidebarButton label="Referencia" icon={ChartIcon} active={activeTab === 'referencia'} onClick={() => navigate('referencia')} />
            <SidebarButton label={config.name ?? 'Mi bebé'} icon={BabyIcon} active={activeTab === 'config'} onClick={() => navigate('config')} />
            <SidebarButton label="Familia" icon={FamilyIcon} active={activeTab === 'familia'} onClick={() => navigate('familia')} />
          </nav>

          {/* Cuenta + menú, abajo del todo */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <AccountMenu
              variant="sidebar"
              currentUser={currentUser}
              onOpenSettings={() => setScreen('ajustes')}
              onLogout={async () => { await api.logout(); setCurrentUser(null); }}
            />
          </div>
        </aside>
      )}

      {/* Columna principal */}
      <div className="flex flex-col flex-1 min-w-0 w-full lg:max-w-5xl lg:mx-auto">
      {!showForm && config && (
        <BabyBar
          babies={babies}
          activeId={config.id}
          onSwitch={switchBaby}
          currentUser={currentUser}
          onOpenSettings={() => setScreen('ajustes')}
          onLogout={async () => { await api.logout(); setCurrentUser(null); }}
        />
      )}
      <main className="flex-1 overflow-y-auto">

        {/* Toma forms */}
        {(screen === 'nueva-toma' || screen === 'editar-toma') && (
          <FeedingForm
            existing={editingFeeding}
            onSave={handleSaveFeeding}
            onCancel={() => { setEditingFeeding(null); setScreen(activeTab); }}
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
        {screen === 'editar-config' && (
          <div className="p-4 pb-24">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => navigate('config')} className="text-sage-600 text-lg p-1 touch-manipulation">
                ← Atrás
              </button>
              <h2 className="text-xl font-bold text-gray-900">Días de vida</h2>
            </div>
            <BabyConfigScreen
              existing={config}
              onSave={async (c) => {
                const updated = await api.updateBaby({ ...config, ...c });
                setConfig(updated);
                setBabies((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
                navigate('config');
              }}
            />
          </div>
        )}

        {/* Weight forms */}
        {(screen === 'nuevo-peso' || screen === 'editar-peso') && (
          <WeightForm
            existing={editingWeight}
            onSave={handleSaveWeight}
            onCancel={() => { setEditingWeight(null); navigate('config'); }}
          />
        )}

        {/* Main tabs */}
        {screen === 'hoy' && (
          <DailySummary
            config={config}
            feedings={feedings}
            rests={rests}
            currentWeightKg={currentWeightKg}
            vitaminDLogs={vitaminDLogs}
            calendarEvents={calendarEvents}
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
          />
        )}

        {screen === 'historial' && (
          <FeedingList
            feedings={feedings}
            rests={rests}
            weights={weights}
            vitaminDLogs={vitaminDLogs}
            vitaminDEnabled={config.vitaminDEnabled ?? false}
            probioticLogs={probioticLogs}
            probioticEnabled={config.probioticEnabled ?? false}
            massageLogs={massageLogs}
            frenectomyEnabled={config.frenectomyEnabled ?? false}
            frenectomyDate={config.frenectomyDate}

            onEditFeeding={(f) => { setEditingFeeding(f); setScreen('editar-toma'); }}
            onEditRest={(r) => { setEditingRest(r); setScreen('editar-sueño'); }}
            onDeleteFeeding={handleDeleteFeeding}
            onDeleteRest={handleDeleteRest}
          />
        )}

        {screen === 'referencia' && (
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
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onCreateConsultation={handleCreateConsultation}
            onUpdateConsultation={handleUpdateConsultation}
            onDeleteConsultation={handleDeleteConsultation}
          />
        )}

        {screen === 'consultas' && (
          <div className="pt-4">
            <h1 className="text-2xl font-bold text-gray-900 px-4 mb-1">Dudas</h1>
            <p className="text-sm text-gray-500 px-4 mb-2">Para las visitas con profesionales</p>
            <ConsultationsView
              consultations={consultations}
              onCreate={handleCreateConsultation}
              onUpdate={handleUpdateConsultation}
              onDelete={handleDeleteConsultation}
            />
          </div>
        )}

        {screen === 'config' && (
          <BabyProfile
            config={config}
            weights={weights}
            vitaminDLogs={vitaminDLogs}
            probioticLogs={probioticLogs}
            massageLogs={massageLogs}
            onOpenFamily={() => navigate('familia')}
            onOpenReference={() => navigate('referencia')}
            onNewWeight={() => { setEditingWeight(null); setScreen('nuevo-peso'); }}
            onEditWeight={(w) => { setEditingWeight(w); setScreen('editar-peso'); }}
            onDeleteWeight={handleDeleteWeight}
            onUpdateConfig={handleUpdateConfig}
          />
        )}

        {screen === 'familia' && (
          <FamilyView
            babies={babies}
            activeId={config.id}
            currentUser={currentUser}
            onSwitchBaby={switchBaby}
            onCreateBaby={handleCreateBaby}
            onDeleteBaby={handleDeleteBaby}
            onLogout={async () => { await api.logout(); setCurrentUser(null); }}
          />
        )}

        {screen === 'ajustes' && (
          <AppSettings onBack={() => setScreen(activeTab)} baby={config} />
        )}
      </main>

      {/* FABs — inicio rápido de sueño y toma de pecho (solo en Hoy) */}
      {screen === 'hoy' && (
        <div className="fixed right-5 bottom-20 lg:bottom-6 z-20 flex flex-col items-center gap-3">
          {!restInProgress && (
            <button
              onClick={handleQuickRest}
              aria-label="Iniciar sueño"
              className="w-14 h-14 rounded-full bg-taupe-600 text-white shadow-lg shadow-taupe-600/30 flex items-center justify-center text-2xl active:scale-95 active:bg-taupe-700 transition-transform touch-manipulation"
            >
              😴
            </button>
          )}
          {!breastInProgress && (
            <button
              onClick={handleQuickBreast}
              aria-label="Iniciar toma de pecho"
              className="w-14 h-14 rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/30 flex items-center justify-center text-2xl active:scale-95 active:bg-pink-600 transition-transform touch-manipulation"
            >
              🤱
            </button>
          )}
        </div>
      )}

      {!showForm && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex pb-safe">
          <NavButton label="Hoy" icon={HomeIcon} active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
          <NavButton label="Historial" icon={ListIcon} active={activeTab === 'historial'} onClick={() => navigate('historial')} />
          <NavButton label="Visitas" icon={CalendarIcon} active={activeTab === 'visitas'} onClick={() => navigate('visitas')} />
          <NavButton label="Dudas" icon={NotesIcon} active={activeTab === 'consultas'} onClick={() => navigate('consultas')} />
          <NavButton label={config.name ?? 'Mi bebé'} icon={BabyIcon} active={activeTab === 'config' || activeTab === 'familia'} onClick={() => navigate('config')} />
        </nav>
      )}
      </div>
      <Toaster />
    </div>
  );
}

function AccountMenu({ variant, currentUser, onOpenSettings, onLogout }: {
  variant: 'sidebar' | 'avatar';
  currentUser: string | null;
  onOpenSettings: () => void;
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
            onClick={() => { setOpen(false); onOpenSettings(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 active:bg-gray-50 touch-manipulation"
          >
            <span>⚙️</span> Configuración
          </button>
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

function BabyBar({ babies, activeId, onSwitch, currentUser, onOpenSettings, onLogout }: {
  babies: BabyConfig[];
  activeId: string;
  onSwitch: (id: string) => void;
  currentUser: string | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = babies.find((b) => b.id === activeId);
  if (!active) return null;
  const multi = babies.length > 1;

  return (
    <div className="relative shrink-0 border-b border-gray-200 bg-white">
      {/* Avatar de cuenta — solo móvil (en escritorio está en la barra lateral) */}
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

function BabyIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...navIconProps(active)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 10h.01M15 10h.01" />
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
    </svg>
  );
}
