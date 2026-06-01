import { useState, useEffect } from 'react';
import type { BabyConfig, Feeding, Rest, WeightEntry } from './types';
import * as api from './api';
import BabyConfigScreen from './components/BabyConfig';
import BabyProfile from './components/BabyProfile';
import DailySummary from './components/DailySummary';
import FeedingForm from './components/FeedingForm';
import RestForm from './components/RestForm';
import WeightForm from './components/WeightForm';
import FeedingList from './components/FeedingList';
import ReferenceView from './components/ReferenceView';

type Tab = 'hoy' | 'historial' | 'referencia' | 'config';
type Screen =
  | Tab
  | 'nueva-toma'
  | 'editar-toma'
  | 'nuevo-descanso'
  | 'editar-descanso'
  | 'editar-config'
  | 'nuevo-peso'
  | 'editar-peso';

export default function App() {
  const [config, setConfig] = useState<BabyConfig | null>(null);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [rests, setRests] = useState<Rest[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('hoy');
  const [screen, setScreen] = useState<Screen>('hoy');
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);
  const [editingRest, setEditingRest] = useState<Rest | null>(null);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);

  useEffect(() => {
    Promise.all([api.getConfig(), api.getFeedings(), api.getRests(), api.getWeights()])
      .then(([cfg, fds, rsts, wts]) => {
        setConfig(cfg);
        setFeedings(fds);
        setRests(rsts);
        setWeights(wts);
        setApiError(false);
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  }, []);

  // Current weight = most recent entry by date
  const currentWeightKg = weights.length > 0
    ? [...weights].sort((a, b) => b.date.localeCompare(a.date))[0].weightKg
    : undefined;

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">👶</div>
          <p className="text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No se puede conectar al servidor</h2>
          <p className="text-sm text-gray-500 mb-6">Asegúrate de que el servidor está en marcha con:</p>
          <code className="block bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 mb-6">npm run start</code>
          <button
            onClick={() => { setLoading(true); setApiError(false); window.location.reload(); }}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl touch-manipulation"
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
          const saved = await api.saveConfig(c);
          setConfig(saved);
          setScreen('hoy');
        }}
      />
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  // Finaliza automáticamente cualquier toma o descanso que esté en curso.
  // Se llama antes de crear un nuevo elemento (no al editar).
  async function finalizeInProgress() {
    const now = new Date().toISOString();

    // Descansos sin hora de fin
    const openRests = rests.filter((r) => r.endTime == null);
    for (const rest of openRests) {
      const updated = await api.updateRest({ ...rest, endTime: now });
      setRests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }

    // Tomas con pecho iniciado pero sin minutos: calcular tiempo transcurrido
    const openBreast = feedings.filter(
      (f) => f.hasBreast && f.breastMinLeft == null && f.breastMinRight == null
    );
    for (const feeding of openBreast) {
      const elapsed = Math.max(
        0,
        Math.round((new Date(now).getTime() - new Date(feeding.timestamp).getTime()) / 60000)
      );
      const updated = await api.updateFeeding({ ...feeding, breastMinLeft: elapsed });
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
  }

  async function handleSaveFeeding(feeding: Feeding) {
    if (editingFeeding) {
      const updated = await api.updateFeeding(feeding);
      setFeedings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } else {
      await finalizeInProgress();
      const created = await api.createFeeding(feeding);
      setFeedings((prev) => [...prev, created]);
    }
    setEditingFeeding(null);
    setScreen(activeTab);
  }

  async function handleDeleteFeeding(id: string) {
    await api.deleteFeeding(id);
    setFeedings((prev) => prev.filter((f) => f.id !== id));
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
    setEditingRest(null);
    setScreen(activeTab);
  }

  async function handleDeleteRest(id: string) {
    await api.deleteRest(id);
    setRests((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSaveWeight(entry: WeightEntry) {
    if (editingWeight) {
      const updated = await api.updateWeight(entry);
      setWeights((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } else {
      const created = await api.createWeight(entry);
      setWeights((prev) => [...prev, created]);
    }
    setEditingWeight(null);
    navigate('config');
  }

  async function handleDeleteWeight(id: string) {
    await api.deleteWeight(id);
    setWeights((prev) => prev.filter((w) => w.id !== id));
  }

  function navigate(tab: Tab) {
    setActiveTab(tab);
    setScreen(tab);
  }

  const showForm = [
    'nueva-toma', 'editar-toma',
    'nuevo-descanso', 'editar-descanso',
    'editar-config',
    'nuevo-peso', 'editar-peso',
  ].includes(screen);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-svh bg-gray-50 lg:w-1/2 lg:mx-auto lg:border-x lg:border-gray-200">
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
        {(screen === 'nuevo-descanso' || screen === 'editar-descanso') && (
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
              <button onClick={() => navigate('config')} className="text-blue-600 text-lg p-1 touch-manipulation">
                ← Atrás
              </button>
              <h2 className="text-xl font-bold text-gray-900">Días de vida</h2>
            </div>
            <BabyConfigScreen
              existing={config}
              onSave={async (c) => {
                const saved = await api.saveConfig(c);
                setConfig(saved);
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
            onNewFeeding={() => { setEditingFeeding(null); setScreen('nueva-toma'); }}
            onNewRest={() => { setEditingRest(null); setScreen('nuevo-descanso'); }}
            onEditFeeding={(f) => { setEditingFeeding(f); setScreen('editar-toma'); }}
            onEditRest={(r) => { setEditingRest(r); setScreen('editar-descanso'); }}
            onDeleteFeeding={handleDeleteFeeding}
            onDeleteRest={handleDeleteRest}
          />
        )}

        {screen === 'historial' && (
          <FeedingList
            feedings={feedings}
            rests={rests}
            onEditFeeding={(f) => { setEditingFeeding(f); setScreen('editar-toma'); }}
            onEditRest={(r) => { setEditingRest(r); setScreen('editar-descanso'); }}
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

        {screen === 'config' && (
          <BabyProfile
            config={config}
            weights={weights}
            onEditConfig={() => setScreen('editar-config')}
            onNewWeight={() => { setEditingWeight(null); setScreen('nuevo-peso'); }}
            onEditWeight={(w) => { setEditingWeight(w); setScreen('editar-peso'); }}
            onDeleteWeight={handleDeleteWeight}
          />
        )}
      </main>

      {!showForm && (
        <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex pb-safe lg:left-1/4 lg:right-1/4">
          <NavButton label="Hoy" icon="🏠" active={activeTab === 'hoy'} onClick={() => navigate('hoy')} />
          <NavButton label="Historial" icon="📋" active={activeTab === 'historial'} onClick={() => navigate('historial')} />
          <NavButton label="Referencia" icon="📊" active={activeTab === 'referencia'} onClick={() => navigate('referencia')} />
          <NavButton label="Mi bebé" icon="👶" active={activeTab === 'config'} onClick={() => navigate('config')} />
        </nav>
      )}
    </div>
  );
}

function NavButton({ label, icon, active, onClick }: {
  label: string; icon: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center py-3 gap-0.5 touch-manipulation transition-colors ${
        active ? 'text-blue-600' : 'text-gray-400'
      }`}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
