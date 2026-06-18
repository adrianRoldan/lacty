import { useState } from 'react';
import type { CalendarEvent, EventCategory, Consultation } from '../types';
import { generateId } from '../utils/feedingUtils';

interface Props {
  events: CalendarEvent[];
  consultations: Consultation[];
  onCreate: (e: CalendarEvent) => void;
  onUpdate: (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

const CATS: { key: EventCategory; label: string; icon: string; dot: string; chip: string }[] = [
  { key: 'pediatra', label: 'Pediatra', icon: '🩺', dot: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700' },
  { key: 'matrona',  label: 'Matrona',  icon: '👩‍⚕️', dot: 'bg-pink-500',   chip: 'bg-pink-100 text-pink-700' },
  { key: 'fisio',    label: 'Fisio',    icon: '💪', dot: 'bg-amber-500',  chip: 'bg-amber-100 text-amber-700' },
  { key: 'vacuna',   label: 'Vacuna',   icon: '💉', dot: 'bg-red-500',    chip: 'bg-red-100 text-red-700' },
  { key: 'analisis', label: 'Análisis', icon: '🔬', dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' },
  { key: 'revision', label: 'Revisión', icon: '👶', dot: 'bg-sage-500',   chip: 'bg-sage-100 text-sage-700' },
  { key: 'otro',     label: 'Otro',     icon: '📌', dot: 'bg-gray-400',   chip: 'bg-gray-100 text-gray-600' },
];
const catOf = (k: EventCategory) => CATS.find((c) => c.key === k)!;

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => isoOf(new Date());

export default function CalendarView({ events, consultations, onCreate, onUpdate, onDelete }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(todayIso());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  // Eventos agrupados por día
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    if (!byDay.has(e.date)) byDay.set(e.date, []);
    byDay.get(e.date)!.push(e);
  }

  // Grid del mes (lunes primero)
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoOf(new Date(viewYear, viewMonth, i + 1))),
  ];

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const selectedEvents = (byDay.get(selected) ?? []).sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
  const upcoming = events
    .filter((e) => e.date >= todayIso())
    .sort((a, b) => (a.date + (a.time ?? '99')).localeCompare(b.date + (b.time ?? '99')))
    .slice(0, 6);

  function startCreate(date: string = selected) {
    setSelected(date);
    setEditing({
      id: generateId(), date, title: '', category: 'pediatra',
      createdAt: new Date().toISOString(),
    });
    setCreating(true);
  }

  return (
    <div className="px-4 pt-3 pb-24">
      {/* Cabecera mes */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 text-xl px-3 py-1 touch-manipulation">‹</button>
        <h2 className="text-base font-bold text-gray-900">{MONTHS[viewMonth]} {viewYear}</h2>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 text-xl px-3 py-1 touch-manipulation">›</button>
      </div>

      {/* Grid mensual */}
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-4">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const day = Number(iso.slice(8));
            const dayEvents = (byDay.get(iso) ?? [])
              .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
            const isToday = iso === todayIso();
            const isSelected = iso === selected;
            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                onDoubleClick={() => startCreate(iso)}
                title="Doble clic para añadir un evento"
                className={`min-h-[58px] rounded-lg p-1 flex flex-col items-stretch gap-0.5 touch-manipulation transition-colors overflow-hidden
                  ${isSelected ? 'bg-gray-800' : isToday ? 'bg-gray-100' : 'active:bg-gray-50'}`}
              >
                <span className={`text-xs text-center leading-none mb-0.5
                  ${isSelected ? 'font-bold text-white' : isToday ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                  {day}
                </span>
                {dayEvents.slice(0, 2).map((e) => {
                  const c = catOf(e.category);
                  return (
                    <span
                      key={e.id}
                      className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                        isSelected ? 'bg-white/20 text-white' : c.chip
                      }`}
                    >
                      {e.time ? `${e.time} ` : ''}{e.title || c.label}
                    </span>
                  );
                })}
                {dayEvents.length > 2 && (
                  <span className={`text-[9px] leading-none text-center ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    +{dayEvents.length - 2}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-2">Doble clic en un día para añadir un evento</p>
      </div>

      {/* Día seleccionado */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {formatDayLabel(selected)}
        </h3>
      </div>

      {selectedEvents.length > 0 ? (
        <div className="space-y-2 mb-6">
          {selectedEvents.map((e) => (
            <EventCard key={e.id} e={e} onClick={() => { setEditing(e); setCreating(false); }} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-6">Sin eventos este día.</p>
      )}

      {/* Próximos */}
      {upcoming.length > 0 && (
        <>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Próximos</h3>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} e={e} showDate onClick={() => { setSelected(e.date); setEditing(e); setCreating(false); }} />
            ))}
          </div>
        </>
      )}

      {/* FAB — nuevo evento (en el día seleccionado) */}
      {!editing && (
        <button
          onClick={() => startCreate()}
          aria-label="Nuevo evento"
          className="fixed right-5 bottom-20 lg:bottom-6 z-20 w-14 h-14 rounded-full bg-sage-600 text-white shadow-lg shadow-sage-600/30 flex items-center justify-center text-3xl leading-none pb-1 active:scale-95 active:bg-sage-700 transition-transform touch-manipulation"
        >
          +
        </button>
      )}

      {/* Form modal */}
      {editing && (
        <EventForm
          event={editing}
          isNew={creating}
          consultations={consultations}
          onSave={(e) => { creating ? onCreate(e) : onUpdate(e); setEditing(null); }}
          onDelete={() => { onDelete(editing.id); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EventCard({ e, showDate, onClick }: { e: CalendarEvent; showDate?: boolean; onClick: () => void }) {
  const cat = catOf(e.category);
  return (
    <div onClick={onClick} className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 select-none">
      <span className="text-xl shrink-0">{cat.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{e.title || cat.label}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {showDate && <span>{formatShort(e.date)}</span>}
          {e.time && <span>🕐 {e.time}</span>}
          <span className={`px-1.5 py-0.5 rounded-full ${cat.chip}`}>{cat.label}</span>
        </div>
      </div>
    </div>
  );
}

function EventForm({ event, isNew, consultations, onSave, onDelete, onCancel }: {
  event: CalendarEvent;
  isNew: boolean;
  consultations: Consultation[];
  onSave: (e: CalendarEvent) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time ?? '');
  const [title, setTitle] = useState(event.title);
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [description, setDescription] = useState(event.description ?? '');
  const [notes, setNotes] = useState(event.notes ?? '');

  // Dudas pendientes vinculadas a esta categoría (si coincide con una de consultas)
  const relatedDudas = consultations.filter(
    (c) => !c.resolved && c.category === category
  );

  function save() {
    if (!title.trim()) return;
    onSave({
      ...event,
      date, title: title.trim(), category,
      time: time || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end lg:items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-cream-50 w-full lg:max-w-md rounded-t-3xl lg:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{isNew ? 'Nuevo evento' : 'Editar evento'}</h2>
          <button onClick={onCancel} className="text-gray-400 text-xl touch-manipulation">✕</button>
        </div>

        <div className="space-y-4">
          {/* Asunto */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Asunto</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              placeholder="Ej. Revisión de los 2 meses"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Tipo</label>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button
                  key={c.key} onClick={() => setCategory(c.key)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-full touch-manipulation transition-colors ${
                    category === c.key ? c.chip : 'bg-white text-gray-400'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Día + hora */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">Día</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400" />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-gray-500 block mb-1">Hora</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400" />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Detalles, dirección, qué llevar…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400 resize-none" />
          </div>

          {/* Notas post-visita */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notas de la visita</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Lo que te dijeron, indicaciones…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400 resize-none" />
          </div>

          {/* Dudas vinculadas */}
          {relatedDudas.length > 0 && (
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">
                {relatedDudas.length} duda{relatedDudas.length > 1 ? 's' : ''} pendiente{relatedDudas.length > 1 ? 's' : ''} para esta visita
              </p>
              <ul className="space-y-1">
                {relatedDudas.map((d) => (
                  <li key={d.id} className="text-xs text-gray-600">• {d.text}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-1.5">Las gestionas en la sub-sección Dudas.</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            {!isNew && (
              <button
                onClick={() => { if (window.confirm('¿Eliminar este evento?')) onDelete(); }}
                className="text-red-500 font-medium px-4 py-3 touch-manipulation"
              >
                Eliminar
              </button>
            )}
            <button
              onClick={save} disabled={!title.trim()}
              className="flex-1 bg-sage-600 text-white font-semibold py-3 rounded-xl active:bg-sage-700 disabled:opacity-40 touch-manipulation"
            >
              {isNew ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}
