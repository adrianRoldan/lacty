/**
 * Aviso de la próxima cita del calendario, encima del registro del día.
 *
 * Lo comparten los tres diseños de «Hoy». Estaba copiado letra por letra en dos
 * de ellos, así que cualquier arreglo había que hacerlo dos veces.
 */
import { useState, useEffect } from 'react';
import type { CalendarEvent } from '../types';
import { todayIso } from '../utils/dateUtils';

const EVENT_CAT_META: Record<string, { icon: string; label: string }> = {
  pediatra: { icon: '🩺', label: 'Pediatra' },
  matrona:  { icon: '👩‍⚕️', label: 'Matrona' },
  fisio:    { icon: '💪', label: 'Fisio' },
  vacuna:   { icon: '💉', label: 'Vacuna' },
  analisis: { icon: '🔬', label: 'Análisis' },
  revision: { icon: '👶', label: 'Revisión' },
  otro:     { icon: '📌', label: 'Otro' },
};

export default function NextEventBanner({ events, onOpen }: { events: CalendarEvent[]; onOpen: () => void }) {
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
