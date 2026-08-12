import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CuidadoHoy } from '../utils/cuidadosHoy';
import { DiaperIcon } from './DiaperItem';
import { MedicineIcon, StrollerIcon, ScaleIcon } from './CareIcons';

/**
 * Selector para añadir un registro cualquiera.
 *
 * Los botones flotantes registran «ahora mismo»; esto es la vía para apuntar
 * algo que ya ha pasado, con su hora editable. Antes solo estaban tomas y
 * sueños en la cabecera, y los otros seis tipos no tenían dónde.
 */

export type TipoRegistro =
  | 'toma' | 'sueno' | 'panal' | 'bano' | 'paseo' | 'medicamento'
  | 'peso' | 'altura' | 'perimetro';

interface Props {
  onSelect: (tipo: TipoRegistro) => void;
  onClose: () => void;
  /** Cuidados activos hoy (vitamina D, probiótico, masajes, medicación). */
  cuidados?: CuidadoHoy[];
  /** Apunta el cuidado con la hora actual, sin pasar por ningún formulario. */
  onRegistrarCuidado?: (cuidado: CuidadoHoy) => void;
}

interface Opcion {
  tipo: TipoRegistro;
  etiqueta: string;
  color: string;
  icono: React.ReactNode;
}

const DIA_A_DIA: Opcion[] = [
  { tipo: 'toma',        etiqueta: 'Toma',        color: 'bg-mustard-100 text-mustard-700', icono: <span className="text-xl">🤱</span> },
  { tipo: 'sueno',       etiqueta: 'Sueño',       color: 'bg-lagoon-100 text-lagoon-700',   icono: <span className="text-xl">🌙</span> },
  { tipo: 'panal',       etiqueta: 'Pañal',       color: 'bg-rose-100 text-rose-600',       icono: <DiaperIcon size={22} /> },
  { tipo: 'bano',        etiqueta: 'Baño',        color: 'bg-teal-100 text-teal-700',       icono: <span className="text-xl">🛁</span> },
  { tipo: 'paseo',       etiqueta: 'Paseo',       color: 'bg-coral-100 text-coral-700',     icono: <StrollerIcon size={22} /> },
  { tipo: 'medicamento', etiqueta: 'Medicamento', color: 'bg-violet-100 text-violet-700',   icono: <MedicineIcon size={21} /> },
];

const MEDIDAS: Opcion[] = [
  { tipo: 'peso',      etiqueta: 'Peso',      color: 'bg-slate-100 text-slate-700', icono: <ScaleIcon size={21} /> },
  { tipo: 'altura',    etiqueta: 'Altura',    color: 'bg-slate-100 text-slate-700', icono: <span className="text-xl">📏</span> },
  { tipo: 'perimetro', etiqueta: 'Perímetro', color: 'bg-slate-100 text-slate-700', icono: <span className="text-xl">🧠</span> },
];

const ARRASTRE_PARA_CERRAR = 90; // px

export default function AddRecordSheet({ onSelect, onClose, cuidados = [], onRegistrarCuidado }: Props) {
  // Arrastrar la cabecera hacia abajo cierra la hoja. La cabecera lleva
  // `touch-none`, así que el navegador no se queda el gesto: sin eso, en Chrome
  // de Android acababa siendo un «tirar para recargar» y se perdía la pantalla.
  const [arrastre, setArrastre] = useState(0);
  const [soltando, setSoltando] = useState(false);
  const inicioY = useRef(0);

  function alEmpezar(e: React.TouchEvent) {
    inicioY.current = e.touches[0].clientY;
    setSoltando(false);
  }

  function alMover(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - inicioY.current;
    setArrastre(dy > 0 ? dy : 0);
  }

  function alSoltar() {
    setSoltando(true);
    if (arrastre > ARRASTRE_PARA_CERRAR) {
      // Se acompaña la salida antes de desmontar, para que no desaparezca de golpe.
      setArrastre(window.innerHeight);
      setTimeout(onClose, 160);
    } else {
      setArrastre(0);
    }
  }

  const gestos = {
    onTouchStart: alEmpezar,
    onTouchMove: alMover,
    onTouchEnd: alSoltar,
    onTouchCancel: alSoltar,
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Columna con cabecera y pie fijos: con los cuidados la hoja se alarga y
          el botón de cerrar quedaba fuera de la vista hasta hacer scroll. */}
      <div
        className={`relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85vh] flex flex-col ${
          arrastre === 0 && !soltando ? 'animate-[fadeSlideUp_0.18s_ease-out]' : ''
        } ${soltando ? 'transition-transform duration-150 ease-out' : ''}`}
        style={arrastre > 0 ? { transform: `translateY(${arrastre}px)` } : undefined}
      >
        {/* Asa: en móvil indica que es una hoja que se puede cerrar, y es la
            zona por la que se arrastra hacia abajo para hacerlo. */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 touch-none" {...gestos}>
          <span className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pt-3 sm:pt-5 pb-3 flex items-center justify-between shrink-0 touch-none" {...gestos}>
          <div>
            <p className="text-lg font-bold text-gray-900">Añadir un registro</p>
            <p className="text-xs text-gray-400 mt-0.5">Podrás ajustar la hora si ya ha pasado</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 text-xl w-9 h-9 flex items-center justify-center shrink-0 touch-manipulation"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto overscroll-contain flex-1">
          <Grupo opciones={DIA_A_DIA} onSelect={onSelect} />

          {cuidados.length > 0 && onRegistrarCuidado && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">
                Cuidados de hoy
              </p>
              <div className="space-y-1.5">
                {cuidados.map((c) => (
                  <BotonCuidado key={c.key} cuidado={c} onSelect={onRegistrarCuidado} />
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">Medidas</p>
          <Grupo opciones={MEDIDAS} onSelect={onSelect} />
        </div>

        {/* Cerrar desde abajo, siempre a mano y en la zona del pulgar. El hueco
            de la barra de gestos va en el contenedor: en el botón chocaría con
            su propio padding vertical. */}
        <div className="shrink-0 border-t border-gray-100 pb-safe">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-full py-3.5 flex items-center justify-center text-gray-400 active:bg-gray-50 touch-manipulation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Cuidado del día. A diferencia del resto, no abre formulario: apunta la
 * administración con la hora actual, igual que el chip de «Hoy».
 *
 * Va en una sola línea, sin la caja de color del icono: son cuatro o cinco y
 * con el formato de los demás botones ocupaban media pantalla.
 */
function BotonCuidado({ cuidado, onSelect }: { cuidado: CuidadoHoy; onSelect: (c: CuidadoHoy) => void }) {
  const { hecho, urgente, hechas, total } = cuidado;
  return (
    <button
      onClick={() => onSelect(cuidado)}
      disabled={hecho}
      className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left touch-manipulation transition-colors ${
        hecho ? 'bg-gray-50 opacity-60 cursor-default' : 'bg-gray-50 active:bg-gray-100'
      }`}
    >
      <span className="text-base shrink-0 leading-none" aria-hidden="true">{cuidado.icono}</span>
      <span className="text-sm font-semibold text-gray-800 shrink-0">{cuidado.etiqueta}</span>
      <span className="text-xs text-gray-400 truncate">{cuidado.detalle}</span>
      <span className={`ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
        hecho ? 'bg-green-100 text-green-700' : urgente ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'
      }`}>
        {hecho ? '✓' : total > 1 ? `${hechas}/${total}` : 'pendiente'}
      </span>
    </button>
  );
}

function Grupo({ opciones, onSelect }: { opciones: Opcion[]; onSelect: (t: TipoRegistro) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {opciones.map((o) => (
        <button
          key={o.tipo}
          onClick={() => onSelect(o.tipo)}
          className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-3 text-left active:bg-gray-100 touch-manipulation"
        >
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${o.color}`}>
            {o.icono}
          </span>
          <span className="text-sm font-semibold text-gray-800 min-w-0 truncate">{o.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
