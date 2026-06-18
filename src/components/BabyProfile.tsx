import { useState, useEffect } from 'react';
import type { BabyConfig, WeightEntry, VitaminDLog, ProbioticLog, MassageLog } from '../types';
import { getCurrentDaysOfLife, getBirthDate, todayIso } from '../utils/dateUtils';

interface Props {
  config: BabyConfig;
  weights: WeightEntry[];
  vitaminDLogs: VitaminDLog[];
  probioticLogs: ProbioticLog[];
  massageLogs: MassageLog[];
  onOpenFamily: () => void;
  onOpenReference: () => void;
  onNewWeight: () => void;
  onEditWeight: (w: WeightEntry) => void;
  onDeleteWeight: (id: string) => void;
  onUpdateConfig: (partial: Partial<Omit<BabyConfig, 'id'>>) => Promise<void>;
}

export default function BabyProfile({
  config, weights, vitaminDLogs, probioticLogs, massageLogs,
  onOpenFamily, onOpenReference, onNewWeight, onEditWeight, onDeleteWeight, onUpdateConfig,
}: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0] ?? null;
  const [nameInput, setNameInput] = useState(config.name ?? '');

  // Al cambiar de bebé activo, refrescar el campo de nombre
  useEffect(() => { setNameInput(config.name ?? ''); }, [config.id, config.name]);

  function handleDelete(id: string) {
    if (window.confirm('¿Eliminar este registro de peso?')) onDeleteWeight(id);
  }

  function handleNameSave() {
    const trimmed = nameInput.trim();
    if (trimmed !== (config.name ?? '')) {
      onUpdateConfig({ name: trimmed || undefined });
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{config.name ?? 'Mi bebé'}</h1>

      {/* Info del bebé — nombre, fecha de nacimiento y resumen de peso */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        {/* Nombre */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
            Nombre del bebé
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
            placeholder="Escribe el nombre…"
            className="w-full text-lg font-medium text-gray-900 placeholder-gray-300 border-none outline-none focus:ring-0 bg-transparent"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-gray-900">{daysOfLife}</p>
            <p className="text-sm text-gray-500">días de vida</p>
          </div>
          {latest && (
            <div className="text-right">
              <p className="text-4xl font-bold text-sage-600">{latest.weightKg} <span className="text-2xl">kg</span></p>
              <p className="text-sm text-gray-500">último peso</p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-700">Fecha de nacimiento</p>
          <input
            type="date"
            value={getBirthDate(config)}
            max={todayIso()}
            onChange={(e) => e.target.value && onUpdateConfig({ birthDate: e.target.value })}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
      </div>

      {/* Acceso a Familia (solo móvil; en desktop es una pestaña aparte) */}
      <button
        onClick={onOpenFamily}
        className="lg:hidden w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-6 active:bg-gray-50 touch-manipulation"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className="text-lg">👨‍👩‍👧</span> Mi familia
        </span>
        <span className="text-gray-300">›</span>
      </button>

      {/* Referencia orientativa — disponible en móvil y escritorio */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Salud</h2>
      <button
        onClick={onOpenReference}
        className="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-6 active:bg-gray-50 touch-manipulation text-left"
      >
        <span className="flex items-start gap-3 min-w-0">
          <span className="text-xl shrink-0">📊</span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-900">Valores de referencia</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Tomas, leche y sueño orientativos para su edad y peso. Abre la página de Referencia.
            </span>
          </span>
        </span>
        <span className="text-gray-300 shrink-0 self-center">›</span>
      </button>

      {/* Historial de peso */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Historial de peso</h2>
        <button
          onClick={onNewWeight}
          className="bg-sage-600 text-white font-semibold px-4 py-2 rounded-xl text-sm active:bg-sage-700 touch-manipulation"
        >
          + Peso
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-10 text-gray-400 mb-6">
          <p className="text-3xl mb-2">⚖️</p>
          <p className="text-sm">Aún no hay registros de peso.</p>
          <button onClick={onNewWeight} className="mt-3 text-sage-600 font-medium touch-manipulation text-sm">
            Registrar primer peso
          </button>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1];
            const diff = prev ? Math.round((entry.weightKg - prev.weightKg) * 1000) : null;
            const daysBetween = prev
              ? Math.round(
                  (new Date(entry.date + 'T12:00:00').getTime() - new Date(prev.date + 'T12:00:00').getTime()) / 86400000
                )
              : null;
            return (
              <div
                key={entry.id}
                onClick={() => onEditWeight(entry)}
                className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:bg-gray-50 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        {formatDate(entry.date)}
                      </span>
                      {i === 0 && (
                        <span className="text-xs bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-medium">
                          último
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-gray-900">{entry.weightKg} kg</span>
                      {diff !== null && (
                        <span className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{diff} g
                          {daysBetween != null && daysBetween > 0 && (
                            <span className="text-gray-400 font-normal"> en {daysBetween} {daysBetween === 1 ? 'día' : 'días'}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate italic">"{entry.notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                    className="text-gray-300 hover:text-red-400 p-2 shrink-0 touch-manipulation"
                    aria-label="Eliminar peso"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vitamina D3 — configuración */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vitamina D3</h2>
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Registrar vitamina D3
              {config.vitaminDMedName && <span className="text-gray-400 font-normal"> · {config.vitaminDMedName}</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">2 gotas diarias durante el primer año</p>
          </div>
          <Toggle
            enabled={config.vitaminDEnabled ?? false}
            onChange={(v) => onUpdateConfig({ vitaminDEnabled: v })}
          />
        </div>

        {config.vitaminDEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Medicamento</p>
              <input
                key={`vitd-${config.id}`}
                type="text"
                defaultValue={config.vitaminDMedName ?? ''}
                placeholder="Ej. Deltius"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (config.vitaminDMedName ?? '')) onUpdateConfig({ vitaminDMedName: v || undefined });
                }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-right w-40 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Recordatorio diario</p>
              <select
                value={config.vitaminDReminderHour ?? ''}
                onChange={(e) => onUpdateConfig({
                  vitaminDReminderHour: e.target.value !== '' ? Number(e.target.value) : undefined,
                })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="">Sin recordatorio</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Vitamina D3 — historial */}
      {config.vitaminDEnabled && (
        <VitaminDHistory logs={vitaminDLogs} />
      )}

      {/* Probiótico */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Probiótico</h2>
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Registrar probiótico
              {config.probioticMedName && <span className="text-gray-400 font-normal"> · {config.probioticMedName}</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">5 gotas diarias para los cólicos</p>
          </div>
          <Toggle
            enabled={config.probioticEnabled ?? false}
            onChange={(v) => onUpdateConfig({ probioticEnabled: v })}
          />
        </div>
        {config.probioticEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Medicamento</p>
              <input
                key={`prob-${config.id}`}
                type="text"
                defaultValue={config.probioticMedName ?? ''}
                placeholder="Ej. Reuteri"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (config.probioticMedName ?? '')) onUpdateConfig({ probioticMedName: v || undefined });
                }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-right w-40 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Recordatorio diario</p>
              <select
                value={config.probioticReminderHour ?? ''}
                onChange={(e) => onUpdateConfig({
                  probioticReminderHour: e.target.value !== '' ? Number(e.target.value) : undefined,
                })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="">Sin recordatorio</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      {/* Historial probiótico — siempre visible si hay registros */}
      {probioticLogs.length > 0 && (
        <ProbioticHistory logs={probioticLogs} />
      )}

      {/* Frenectomía */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Frenectomía</h2>
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Masajes post-frenectomía</p>
            <p className="text-xs text-gray-500 mt-0.5">5 masajes/día durante 21 días</p>
          </div>
          <Toggle
            enabled={config.frenectomyEnabled ?? false}
            onChange={(v) => onUpdateConfig({ frenectomyEnabled: v })}
          />
        </div>

        {config.frenectomyEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Fecha de la intervención</p>
              <input
                type="date"
                value={config.frenectomyDate ?? ''}
                onChange={(e) => onUpdateConfig({ frenectomyDate: e.target.value || undefined })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Primera toma del día</p>
              <input
                type="time"
                value={config.frenectomyStartTime ?? '08:30'}
                onChange={(e) => onUpdateConfig({ frenectomyStartTime: e.target.value })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Última toma del día</p>
              <input
                type="time"
                value={config.frenectomyEndTime ?? '22:30'}
                onChange={(e) => onUpdateConfig({ frenectomyEndTime: e.target.value })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            {/* Horas recomendadas */}
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-700 font-medium mb-2">Horas recomendadas (calculadas)</p>
              <div className="flex justify-between">
                {getRecommendedTimes(config.frenectomyStartTime ?? '08:30', config.frenectomyEndTime ?? '22:30').map((t, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs font-bold text-blue-800">{t}</p>
                    <p className="text-xs text-blue-500">#{i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
            {config.frenectomyDate && (
              <FrenectomyCountdown date={config.frenectomyDate} massageLogs={massageLogs} />
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function VitaminDHistory({ logs }: { logs: VitaminDLog[] }) {
  const logDates = new Set(logs.map((l) => l.date));
  const today = todayIso();

  // Racha: días consecutivos hacia atrás desde hoy (o ayer si hoy no está dado)
  let streak = 0;
  const d = new Date();
  if (!logDates.has(today)) d.setDate(d.getDate() - 1);
  while (logDates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  // Últimos 14 días (más reciente a la derecha)
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const iso = date.toISOString().slice(0, 10);
    const day = date.getDate();
    return { iso, day, given: logDates.has(iso), isToday: iso === today };
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">Historial</p>
        <div className="flex items-center gap-1.5">
          <span className="text-base">🔥</span>
          <span className="text-sm font-bold text-gray-900">{streak}</span>
          <span className="text-xs text-gray-500">días seguidos</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ iso, day, given, isToday }) => (
          <div
            key={iso}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
              ${isToday ? 'ring-2 ring-sage-400' : ''}
              ${given ? 'bg-sage-100' : 'bg-gray-100'}`}
          >
            <span className={`text-xs font-semibold leading-none ${given ? 'text-sage-700' : 'text-gray-400'}`}>
              {day}
            </span>
            <span className="text-xs leading-none">{given ? '✓' : '·'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors touch-manipulation shrink-0 ${enabled ? 'bg-sage-600' : 'bg-gray-200'}`}
      aria-label={enabled ? 'Desactivar' : 'Activar'}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ProbioticHistory({ logs }: { logs: ProbioticLog[] }) {
  const logDates = new Set(logs.map((l) => l.date));
  const today = todayIso();

  let streak = 0;
  const d = new Date();
  if (!logDates.has(today)) d.setDate(d.getDate() - 1);
  while (logDates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const iso = date.toISOString().slice(0, 10);
    return { iso, day: date.getDate(), given: logDates.has(iso), isToday: iso === today };
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">Historial</p>
        <div className="flex items-center gap-1.5">
          <span className="text-base">🔥</span>
          <span className="text-sm font-bold text-gray-900">{streak}</span>
          <span className="text-xs text-gray-500">días seguidos</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ iso, day, given, isToday }) => (
          <div
            key={iso}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
              ${isToday ? 'ring-2 ring-sage-400' : ''}
              ${given ? 'bg-sage-100' : 'bg-gray-100'}`}
          >
            <span className={`text-xs font-semibold leading-none ${given ? 'text-sage-700' : 'text-gray-400'}`}>{day}</span>
            <span className="text-xs leading-none">{given ? '✓' : '·'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRecommendedTimes(startTime: string, endTime: string): string[] {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toStr = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const start = toMin(startTime);
  const end = toMin(endTime);
  const interval = (end - start) / 4;
  return Array.from({ length: 5 }, (_, i) => toStr(Math.round(start + interval * i)));
}

function FrenectomyCountdown({ date, massageLogs }: { date: string; massageLogs: MassageLog[] }) {
  const intervention = new Date(date + 'T12:00:00');
  const end = new Date(intervention);
  end.setDate(end.getDate() + 21);
  const today = new Date();
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  const completed = daysLeft <= 0;

  // Last 7 days of the treatment for progress display
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const count = massageLogs.filter((m) => m.date === iso).length;
    return { iso, day: d.getDate(), count, isToday: iso === todayIso() };
  });

  if (completed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 text-center font-medium">
        ✓ Período de masajes completado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
        <span className="text-xs text-blue-700">Días restantes de masajes</span>
        <span className="text-sm font-bold text-blue-800">{daysLeft} / 21</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-2">Últimos 7 días</p>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ iso, day, count, isToday }) => (
            <div
              key={iso}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
                ${isToday ? 'ring-2 ring-blue-400' : ''}
                ${count >= 5 ? 'bg-blue-100' : count > 0 ? 'bg-blue-50' : 'bg-gray-100'}`}
            >
              <span className={`text-xs font-semibold leading-none ${count > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{day}</span>
              <span className="text-xs leading-none">{count > 0 ? `${count}/5` : '·'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
