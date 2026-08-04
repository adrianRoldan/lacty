import type { BabyConfig, VitaminDLog, ProbioticLog, MassageLog } from '../types';
import { todayIso } from '../utils/dateUtils';
import { massagesPerDay, frenectomyEndDate, vitaminDEndDate, getRecommendedMassageTimes, DIAS_DE_MASAJES_POR_DEFECTO } from '../utils/careUtils';
import { ventanaNocturna } from '../utils/sleepUtils';

interface Props {
  config: BabyConfig;
  vitaminDLogs: VitaminDLog[];
  probioticLogs: ProbioticLog[];
  massageLogs: MassageLog[];
  onBack: () => void;
  onUpdateConfig: (partial: Partial<Omit<BabyConfig, 'id'>>) => Promise<void>;
  readOnly?: boolean;
}

export default function CareSettings({
  config, vitaminDLogs, probioticLogs, massageLogs, onBack, onUpdateConfig, readOnly,
}: Props) {
  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Cuidados</h1>
      </div>

      {/* Vitamina D3 */}
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
            disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Hasta</p>
                <p className="text-xs text-gray-400">Por defecto, hasta el año de vida</p>
              </div>
              <input
                type="date"
                value={vitaminDEndDate(config) ?? ''}
                disabled={readOnly}
                onChange={(e) => onUpdateConfig({ vitaminDEndDate: e.target.value || undefined })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          </div>
        )}
      </div>

      {config.vitaminDEnabled && <RachaHistorial logs={vitaminDLogs} />}

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
            disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
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
      {/* Historial del probiótico — siempre visible si hay registros */}
      {probioticLogs.length > 0 && <RachaHistorial logs={probioticLogs} />}

      {/* Frenectomía */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Frenectomía</h2>
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Masajes post-frenectomía</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {massagesPerDay(config)} masajes/día
              {config.frenectomyDate && (() => {
                const fin = frenectomyEndDate(config);
                return fin ? ` hasta el ${new Date(fin + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : '';
              })()}
            </p>
          </div>
          <Toggle
            enabled={config.frenectomyEnabled ?? false}
            disabled={readOnly}
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
                disabled={readOnly}
                onChange={(e) => onUpdateConfig({ frenectomyDate: e.target.value || undefined })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Primera toma del día</p>
              <input
                type="time"
                value={config.frenectomyStartTime ?? '08:30'}
                disabled={readOnly}
                onChange={(e) => onUpdateConfig({ frenectomyStartTime: e.target.value })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">Última toma del día</p>
              <input
                type="time"
                value={config.frenectomyEndTime ?? '22:30'}
                disabled={readOnly}
                onChange={(e) => onUpdateConfig({ frenectomyEndTime: e.target.value })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Masajes al día</p>
                <p className="text-xs text-gray-400">El protocolo habitual son 5</p>
              </div>
              <input
                type="number"
                min={1}
                max={12}
                value={massagesPerDay(config)}
                disabled={readOnly}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= 12) onUpdateConfig({ frenectomyMassagesPerDay: n });
                }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-center w-20 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Fin de los masajes</p>
                <p className="text-xs text-gray-400">Por defecto, 21 días tras la intervención</p>
              </div>
              <input
                type="date"
                value={frenectomyEndDate(config) ?? ''}
                min={config.frenectomyDate}
                disabled={readOnly}
                onChange={(e) => onUpdateConfig({ frenectomyEndDate: e.target.value || undefined })}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            {/* Horas recomendadas */}
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-700 font-medium mb-2">Horas recomendadas (calculadas)</p>
              <div className="flex justify-between">
                {getRecommendedMassageTimes(config.frenectomyStartTime ?? '08:30', config.frenectomyEndTime ?? '22:30', massagesPerDay(config)).map((t, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs font-bold text-blue-800">{t}</p>
                    <p className="text-xs text-blue-500">#{i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
            {config.frenectomyDate && (
              <FrenectomyCountdown config={config} massageLogs={massageLogs} />
            )}
          </div>
        )}
      </div>

      {/* Franja de sueño nocturno */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Sueño nocturno</h2>
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <p className="text-xs text-gray-500 mb-3">
          Los sueños que empiecen en esta franja se numeran como nocturnos; el resto, como siestas.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="time"
              value={ventanaNocturna(config).inicio}
              disabled={readOnly}
              onChange={(e) => onUpdateConfig({ nightSleepStart: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="time"
              value={ventanaNocturna(config).fin}
              disabled={readOnly}
              onChange={(e) => onUpdateConfig({ nightSleepEnd: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Racha y calendario de 14 días — vale para vitamina D y para el probiótico. */
function RachaHistorial({ logs }: { logs: { date: string }[] }) {
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

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : () => onChange(!enabled)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors touch-manipulation shrink-0 disabled:opacity-50 ${enabled ? 'bg-sage-600' : 'bg-gray-200'}`}
      aria-label={enabled ? 'Desactivar' : 'Activar'}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

function FrenectomyCountdown({ config, massageLogs }: { config: BabyConfig; massageLogs: MassageLog[] }) {
  const objetivo = massagesPerDay(config);
  const fin = frenectomyEndDate(config);
  const totalDias = fin && config.frenectomyDate
    ? Math.round((new Date(fin + 'T12:00:00').getTime() - new Date(config.frenectomyDate + 'T12:00:00').getTime()) / 86400000)
    : DIAS_DE_MASAJES_POR_DEFECTO;
  // Se comparan fechas, no marcas de tiempo: con Date.now() el redondeo daba
  // un día de más ("22 / 21" el primer día).
  const daysLeft = fin
    ? Math.round((new Date(fin + 'T12:00:00').getTime() - new Date(todayIso() + 'T12:00:00').getTime()) / 86400000)
    : 0;
  const completed = daysLeft < 0;

  // Últimos 7 días del tratamiento, para ver el progreso
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
        <span className="text-sm font-bold text-blue-800">{daysLeft} / {totalDias}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-2">Últimos 7 días</p>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ iso, day, count, isToday }) => (
            <div
              key={iso}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
                ${isToday ? 'ring-2 ring-blue-400' : ''}
                ${count >= objetivo ? 'bg-blue-100' : count > 0 ? 'bg-blue-50' : 'bg-gray-100'}`}
            >
              <span className={`text-xs font-semibold leading-none ${count > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{day}</span>
              <span className="text-xs leading-none">{count > 0 ? `${count}/${objetivo}` : '·'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
