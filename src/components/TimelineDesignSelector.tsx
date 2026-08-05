import { useTimelineDesign } from '../timelineDesign';

export default function TimelineDesignSelector() {
  const { design, setDesign } = useTimelineDesign();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
        Registros de «Hoy»
      </label>
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {([
          { key: 'clasico', label: 'Clásico', icon: '🗂️' },
          { key: 'rail',    label: 'Línea de tiempo', icon: '✨' },
        ] as const).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setDesign(opt.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold touch-manipulation transition-colors ${
              design === opt.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <span>{opt.icon}</span> {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {design === 'rail'
          ? 'Los registros del día se ven sobre una línea de tiempo, con la hora en una columna y una barra por cada sueño o paseo.'
          : 'Los registros del día se ven como tarjetas de colores, una debajo de otra.'}
      </p>
    </div>
  );
}
