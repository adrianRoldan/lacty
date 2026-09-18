import { useTimelineDesign } from '../timelineDesign';
import type { TimelineDesign } from '../api';

/**
 * Elegir diseño de «Hoy». Con tres opciones ya no cabe un selector de
 * pestañas en un móvil estrecho, así que va en lista: cada una con lo que la
 * distingue de verdad, que es lo que hay por encima del registro del día.
 */
const OPCIONES: { key: TimelineDesign; label: string; desc: string; nuevo?: boolean }[] = [
  {
    key: 'ahora',
    label: 'Ahora',
    nuevo: true,
    desc: 'Arriba, cuánto lleva sin comer y cuánto lleva despierto, en grande y con botones para apuntar toma o sueño de un toque. Los avisos tiñen esos números en vez de apilar cajas.',
  },
  {
    key: 'rail',
    label: 'Línea de tiempo',
    desc: 'Los registros del día sobre una línea de tiempo, con la hora en una columna y una barra por cada sueño o paseo.',
  },
  {
    key: 'clasico',
    label: 'Clásico',
    desc: 'Los registros del día como tarjetas de colores, una debajo de otra.',
  },
];

export default function TimelineDesignSelector() {
  const { design, setDesign } = useTimelineDesign();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 block">
        Pantalla de «Hoy»
      </label>
      <div className="flex flex-col gap-2">
        {OPCIONES.map((opt) => {
          const activa = design === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setDesign(opt.key)}
              aria-pressed={activa}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left touch-manipulation transition-colors ${
                activa ? 'border-sage-600 bg-sage-50' : 'border-gray-200 active:bg-gray-50'
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  activa ? 'border-sage-600 bg-sage-600 text-white' : 'border-gray-300'
                }`}
                aria-hidden="true"
              >
                {activa && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${activa ? 'text-sage-800' : 'text-gray-900'}`}>
                    {opt.label}
                  </span>
                  {opt.nuevo && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-sage-100 text-sage-800 px-1.5 py-0.5 rounded-full">
                      Nuevo
                    </span>
                  )}
                </span>
                <span className="block text-xs text-gray-500 mt-1 leading-snug">{opt.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
