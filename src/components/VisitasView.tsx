import { useState } from 'react';
import type { CalendarEvent, Consultation } from '../types';
import CalendarView from './CalendarView';
import ConsultationsView from './ConsultationsView';

interface Props {
  events: CalendarEvent[];
  consultations: Consultation[];
  readOnly?: boolean;
  onCreateEvent: (e: CalendarEvent) => void;
  onUpdateEvent: (e: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onCreateConsultation: (c: Consultation) => void;
  onUpdateConsultation: (c: Consultation) => void;
  onDeleteConsultation: (id: string) => void;
}

export default function VisitasView({
  events, consultations, readOnly,
  onCreateEvent, onUpdateEvent, onDeleteEvent,
  onCreateConsultation, onUpdateConsultation, onDeleteConsultation,
}: Props) {
  const [tab, setTab] = useState<'agenda' | 'dudas'>('agenda');
  const pendingDudas = consultations.filter((c) => !c.resolved).length;

  return (
    <div>
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Visitas</h1>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          <button
            onClick={() => setTab('agenda')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
              tab === 'agenda' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            📅 Agenda
          </button>
          <button
            onClick={() => setTab('dudas')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
              tab === 'dudas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            📝 Dudas{pendingDudas > 0 && <span className="ml-1 text-xs">({pendingDudas})</span>}
          </button>
        </div>
      </div>

      {tab === 'agenda' ? (
        <CalendarView
          events={events}
          consultations={consultations}
          readOnly={readOnly}
          onCreate={onCreateEvent}
          onUpdate={onUpdateEvent}
          onDelete={onDeleteEvent}
        />
      ) : (
        <ConsultationsView
          consultations={consultations}
          readOnly={readOnly}
          onCreate={onCreateConsultation}
          onUpdate={onUpdateConsultation}
          onDelete={onDeleteConsultation}
        />
      )}
    </div>
  );
}
