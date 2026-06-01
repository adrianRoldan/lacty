import type { BabyConfig, WeightEntry } from '../types';
import { getCurrentDaysOfLife } from '../utils/dateUtils';

interface Props {
  config: BabyConfig;
  weights: WeightEntry[];
  onEditConfig: () => void;
  onNewWeight: () => void;
  onEditWeight: (w: WeightEntry) => void;
  onDeleteWeight: (id: string) => void;
}

export default function BabyProfile({
  config, weights,
  onEditConfig, onNewWeight, onEditWeight, onDeleteWeight,
}: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0] ?? null;

  function handleDelete(id: string) {
    if (window.confirm('¿Eliminar este registro de peso?')) onDeleteWeight(id);
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Mi bebé</h1>

      {/* Info del bebé */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-gray-900">{daysOfLife}</p>
            <p className="text-sm text-gray-500">días de vida</p>
          </div>
          {latest && (
            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">{latest.weightKg} <span className="text-2xl">kg</span></p>
              <p className="text-sm text-gray-500">último peso</p>
            </div>
          )}
        </div>
        <button
          onClick={onEditConfig}
          className="mt-3 text-sm text-blue-600 touch-manipulation"
        >
          Editar días de vida →
        </button>
      </div>

      {/* Historial de peso */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Historial de peso</h2>
        <button
          onClick={onNewWeight}
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm active:bg-blue-700 touch-manipulation"
        >
          + Peso
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">⚖️</p>
          <p className="text-sm">Aún no hay registros de peso.</p>
          <button onClick={onNewWeight} className="mt-3 text-blue-600 font-medium touch-manipulation text-sm">
            Registrar primer peso
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1];
            const diff = prev ? Math.round((entry.weightKg - prev.weightKg) * 1000) : null;
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
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          último
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-gray-900">{entry.weightKg} kg</span>
                      {diff !== null && (
                        <span className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{diff} g
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
