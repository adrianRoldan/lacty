import { useState } from 'react';
import type { VaccineLog } from '../types';
import { VACCINE_SCHEDULE } from '../data/vaccines';
import { todayIso } from '../utils/dateUtils';

interface Props {
  vaccineLogs: VaccineLog[];
  babyAgeMonths: number;
  onToggle: (vaccineId: string, date: string) => void;
  onDelete: (vaccineId: string) => void;
  readOnly?: boolean;
}

export default function VaccinesView({ vaccineLogs, babyAgeMonths, onToggle, onDelete, readOnly }: Props) {
  const administered = new Map(vaccineLogs.map(l => [l.id, l]));
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const allEntries = VACCINE_SCHEDULE.flatMap(g => g.entries);
  const totalDone = vaccineLogs.length;
  const totalEntries = allEntries.length;

  const nextPending = allEntries
    .filter(e => !administered.has(e.id))
    .sort((a, b) => a.ageMonths - b.ageMonths)[0];

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Vacunas</h1>
      <p className="text-sm text-gray-500 mb-4">Calendario CAV-AEP 2024 · España</p>

      {/* Progress */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Progreso</span>
          <span className="text-sm font-bold text-sage-600">{totalDone}/{totalEntries}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-sage-500 rounded-full transition-all duration-500"
            style={{ width: `${(totalDone / totalEntries) * 100}%` }}
          />
        </div>
        {nextPending && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            <span>💉</span>
            <span>Próxima: <strong>{nextPending.name} ({nextPending.dose})</strong> — a los {nextPending.ageMonths} meses</span>
          </div>
        )}
      </div>

      {/* Vaccine groups */}
      <div className="space-y-3">
        {VACCINE_SCHEDULE.map(group => {
          const groupDone = group.entries.filter(e => administered.has(e.id)).length;
          const allDone = groupDone === group.entries.length;
          const isExpanded = expandedGroup === group.id;
          const isUpcoming = group.entries.some(e => !administered.has(e.id) && e.ageMonths <= babyAgeMonths + 1);

          return (
            <div key={group.id} className={`rounded-2xl overflow-hidden ${isUpcoming && !allDone ? 'ring-2 ring-amber-300' : ''}`}>
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 touch-manipulation text-left transition-colors ${
                  allDone ? 'bg-green-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{allDone ? '✅' : '💉'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{group.name}</p>
                    <p className="text-xs text-gray-500 truncate">{group.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{groupDone}/{group.entries.length}</span>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="bg-white border-t border-gray-100 divide-y divide-gray-50">
                  {group.entries.map(entry => {
                    const log = administered.get(entry.id);
                    const done = !!log;
                    const isDue = !done && entry.ageMonths <= babyAgeMonths;
                    return (
                      <VaccineRow
                        key={entry.id}
                        entry={entry}
                        done={done}
                        date={log?.date}
                        isDue={isDue}
                        readOnly={readOnly}
                        onMark={() => onToggle(entry.id, todayIso())}
                        onRemove={() => onDelete(entry.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6 px-4">
        Basado en el calendario de la AEP (2024). Consulta con tu pediatra para la pauta exacta de tu bebé.
      </p>
    </div>
  );
}

function VaccineRow({ entry, done, date, isDue, readOnly, onMark, onRemove }: {
  entry: { id: string; name: string; ageMonths: number; dose: string; description: string };
  done: boolean;
  date?: string;
  isDue: boolean;
  readOnly?: boolean;
  onMark: () => void;
  onRemove: () => void;
}) {
  const [showDate, setShowDate] = useState(false);
  const [customDate, setCustomDate] = useState(todayIso());

  return (
    <div className={`px-4 py-3 ${isDue ? 'bg-amber-50/50' : ''}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={readOnly ? undefined : () => {
            if (done) { onRemove(); } else { setShowDate(true); }
          }}
          disabled={readOnly}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors touch-manipulation ${
            done ? 'bg-green-500 border-green-500 text-white' : isDue ? 'border-amber-400' : 'border-gray-300'
          }`}
        >
          {done && <CheckIcon />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {entry.dose}
            {isDue && !done && <span className="ml-2 text-xs text-amber-600 font-medium">· toca ahora</span>}
          </p>
          <p className="text-xs text-gray-500">{entry.description} · {entry.ageMonths}m</p>
          {done && date && (
            <p className="text-xs text-green-600 mt-0.5">
              Administrada: {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
      {showDate && !done && (
        <div className="mt-2 ml-9 flex items-center gap-2">
          <input
            type="date"
            value={customDate}
            max={todayIso()}
            onChange={(e) => setCustomDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <button
            onClick={() => { onMark(); setShowDate(false); }}
            className="bg-sage-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:bg-sage-700 touch-manipulation"
          >
            Marcar
          </button>
          <button
            onClick={() => setShowDate(false)}
            className="text-xs text-gray-500 px-2 py-1.5 touch-manipulation"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
