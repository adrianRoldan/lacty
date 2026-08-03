import { createPortal } from 'react-dom';
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

export default function AddRecordSheet({ onSelect, onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[85vh] overflow-y-auto pb-safe animate-[fadeSlideUp_0.18s_ease-out]">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
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

        <div className="px-5 pb-5">
          <Grupo opciones={DIA_A_DIA} onSelect={onSelect} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">Medidas</p>
          <Grupo opciones={MEDIDAS} onSelect={onSelect} />
        </div>
      </div>
    </div>,
    document.body
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
