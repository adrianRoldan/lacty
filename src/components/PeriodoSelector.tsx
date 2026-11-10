import { todayIso, inicioDeUltimosDias } from '../utils/dateUtils';

const PRESETS: { etiqueta: string; dias: number }[] = [
  { etiqueta: '7 días', dias: 7 },
  { etiqueta: '14 días', dias: 14 },
  { etiqueta: '30 días', dias: 30 },
];

interface Props {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
}

export default function PeriodoSelector({ desde, hasta, onChange }: Props) {
  const hoy = todayIso();
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <p className="text-sm font-medium text-gray-600 mb-3">Periodo</p>
      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => {
          const activo = desde === inicioDeUltimosDias(p.dias) && hasta === hoy;
          return (
            <button
              key={p.dias}
              onClick={() => onChange(inicioDeUltimosDias(p.dias), hoy)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold touch-manipulation transition-colors ${
                activo ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {p.etiqueta}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input type="date" value={desde} max={hoy} onChange={(e) => onChange(e.target.value, hasta)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input type="date" value={hasta} max={hoy} min={desde} onChange={(e) => onChange(desde, e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600" />
        </div>
      </div>
      {desde > hasta && (
        <p className="text-xs text-red-500 mt-2">La fecha de inicio debe ser anterior a la de fin.</p>
      )}
    </div>
  );
}
