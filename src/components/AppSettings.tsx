import { useState, useEffect, useCallback } from 'react';
import ThemeSelector from './ThemeSelector';
import type { BabyConfig } from '../types';
import * as api from '../api';
import { isPushSupported, subscribe, unsubscribe, getSubscription } from '../utils/pushNotifications';
import { getCurrentDaysOfLife, } from '../utils/dateUtils';
import { getReferenceForDay, getSleepReference } from '../data/referenceTable';

interface Props {
  onBack: () => void;
  baby: BabyConfig | null;
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

function getReferenceDefaults(baby: BabyConfig) {
  const days = getCurrentDaysOfLife(baby);
  const ref   = getReferenceForDay(days);
  const sleep = getSleepReference(days);
  const feedsMin = ref?.feedsPerDayMin ?? 8;
  return {
    feedingThresholdMins: Math.round(24 * 60 / feedsMin),
    restThresholdMins:    sleep.awakeWindowMaxMin,
  };
}

export default function AppSettings({ onBack, baby }: Props) {


  const [pushState, setPushState]       = useState<PushState>('loading');
  const [toggling, setToggling]         = useState(false);
  const [feedingMins, setFeedingMins]   = useState(180);
  const [restMins, setRestMins]         = useState(120);
  const [massageMins, setMassageMins]   = useState(15);
  const [savingPrefs, setSavingPrefs]   = useState(false);
  const [testing, setTesting]           = useState(false);
  const [testResult, setTestResult]     = useState<{ ok: boolean; message: string } | null>(null);

  // Detectar estado inicial de push
  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return; }
    if (Notification.permission === 'denied') { setPushState('denied'); return; }
    getSubscription().then((sub) => setPushState(sub ? 'subscribed' : 'unsubscribed'));
  }, []);

  // Cargar umbrales cuando hay suscripción activa
  useEffect(() => {
    if (pushState !== 'subscribed' || !baby) return;
    const defaults = getReferenceDefaults(baby);
    api.getNotificationPrefs(baby.id).then((prefs) => {
      setFeedingMins(prefs.feedingThresholdMins ?? defaults.feedingThresholdMins);
      setRestMins(prefs.restThresholdMins ?? defaults.restThresholdMins);
      setMassageMins(prefs.massageThresholdMins ?? 15);
    }).catch(() => {
      setFeedingMins(defaults.feedingThresholdMins);
      setRestMins(defaults.restThresholdMins);
      setMassageMins(15);
    });
  }, [pushState, baby]);

  const handleToggle = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      if (pushState === 'subscribed') {
        const sub = await getSubscription();
        if (sub) {
          await api.deletePushSubscription(sub.endpoint);
          await unsubscribe();
        }
        setPushState('unsubscribed');
      } else {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') { setPushState('denied'); return; }
        const vapidKey = await api.getPushVapidKey();
        const sub = await subscribe(vapidKey);
        if (sub) {
          await api.savePushSubscription(sub);
          // Si no hay prefs guardadas, inicializar con los valores de referencia
          if (baby) {
            const savedPrefs = await api.getNotificationPrefs(baby.id).catch(() => ({ feedingThresholdMins: null, restThresholdMins: null }));
            if (savedPrefs.feedingThresholdMins === null) {
              const defaults = getReferenceDefaults(baby);
              await api.updateNotificationPrefs(baby.id, {
                feedingThresholdMins: defaults.feedingThresholdMins,
                restThresholdMins: defaults.restThresholdMins,
                massageThresholdMins: 15,
              }).catch(() => {});
            }
          }
          setPushState('subscribed');
        }
      }
    } finally {
      setToggling(false);
    }
  }, [pushState, toggling]);

  const savePrefs = useCallback(async (feeding: number, rest: number, massage: number) => {
    if (!baby?.id) return;
    setSavingPrefs(true);
    try {
      await api.updateNotificationPrefs(baby.id, {
        feedingThresholdMins: feeding,
        restThresholdMins: rest,
        massageThresholdMins: massage,
      });
    } finally {
      setSavingPrefs(false);
    }
  }, [baby?.id]);

  const isSubscribed = pushState === 'subscribed';

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      </div>

      {/* Apariencia */}
      <div className="mb-4">
        <ThemeSelector />
      </div>

      {/* Notificaciones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 block">
          Notificaciones
        </label>

        {pushState === 'loading' && (
          <p className="text-sm text-gray-400">Comprobando...</p>
        )}

        {pushState === 'unsupported' && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            Tu navegador no soporta notificaciones push. En iPhone, asegúrate de usar Safari e instalar la app en la pantalla de inicio.
          </div>
        )}

        {pushState === 'denied' && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            Los permisos están bloqueados. Habilita las notificaciones para Lacty en los ajustes de tu navegador.
          </div>
        )}

        {(pushState === 'subscribed' || pushState === 'unsubscribed') && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Activar en este dispositivo
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isSubscribed ? 'Recibirás avisos aunque cierres la app' : 'Sin notificaciones en este dispositivo'}
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`relative w-12 h-6 rounded-full transition-colors touch-manipulation ${
                  isSubscribed ? 'bg-sage-500' : 'bg-gray-300'
                } ${toggling ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isSubscribed ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {isSubscribed && baby && (
              <div className="border-t border-gray-100 pt-3 space-y-4">
                <ThresholdRow
                  label="Avisar si no hay toma en"
                  value={feedingMins}
                  min={60}
                  max={360}
                  step={30}
                  onChange={(v) => setFeedingMins(v)}
                  onCommit={(v) => savePrefs(v, restMins, massageMins)}
                  saving={savingPrefs}
                />
                <ThresholdRow
                  label="Avisar si lleva despierto/a más de"
                  value={restMins}
                  min={30}
                  max={240}
                  step={15}
                  onChange={(v) => setRestMins(v)}
                  onCommit={(v) => savePrefs(feedingMins, v, massageMins)}
                  saving={savingPrefs}
                />
                {baby.frenectomyEnabled && (
                  <MassageThresholdRow
                    value={massageMins}
                    onChange={(v) => setMassageMins(v)}
                    onCommit={(v) => savePrefs(feedingMins, restMins, v)}
                    saving={savingPrefs}
                  />
                )}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <button
                    onClick={async () => {
                      setTesting(true);
                      setTestResult(null);
                      try {
                        const res = await fetch('/api/push/test', { method: 'POST', credentials: 'include' });
                        let data: { ok: boolean; error?: string; sent?: number; failed?: number };
                        try {
                          data = await res.json();
                        } catch {
                          setTestResult({ ok: false, message: `Error del servidor (HTTP ${res.status})` });
                          return;
                        }
                        if (data.ok) {
                          setTestResult({ ok: true, message: `Enviado a ${data.sent} dispositivo${data.sent !== 1 ? 's' : ''}${data.failed ? ` (${data.failed} fallaron)` : ''}` });
                        } else {
                          setTestResult({ ok: false, message: data.error ?? 'Error desconocido' });
                        }
                      } catch {
                        setTestResult({ ok: false, message: 'No se pudo conectar con el servidor (red)' });
                      } finally {
                        setTesting(false);
                      }
                    }}
                    disabled={testing}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium touch-manipulation disabled:opacity-50"
                  >
                    {testing ? 'Enviando…' : 'Enviar notificación de prueba'}
                  </button>
                  {testResult && (
                    <p className={`text-xs text-center ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                      {testResult.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instrucción iOS */}
      {pushState === 'unsubscribed' && (
        <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">¿Usas iPhone o iPad?</p>
          <p>Para recibir notificaciones en iOS, primero instala Lacty: toca <strong>Compartir → Agregar a pantalla de inicio</strong> y luego activa las notificaciones aquí.</p>
        </div>
      )}
    </div>
  );
}

function MassageThresholdRow({ value, onChange, onCommit, saving }: {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  saving: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">Avisar masaje pendiente después de</span>
        <span className="text-sm font-semibold text-gray-900 min-w-[3rem] text-right">
          {saving ? '…' : `${value} min`}
        </span>
      </div>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-sage-500"
      />
    </div>
  );
}

function ThresholdRow({
  label, value, min, max, step, onChange, onCommit, saving,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  saving: boolean;
}) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const display = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900 min-w-[3rem] text-right">
          {saving ? '…' : display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-sage-500"
      />
    </div>
  );
}
