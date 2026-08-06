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

export default function AddRecordSheet({ onSelect, onClose, cuidados = [], onRegistrarCuidado }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85vh] overflow-y-auto pb-safe animate-[fadeSlideUp_0.18s_ease-out]">
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

          {cuidados.length > 0 && onRegistrarCuidado && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">
                Cuidados de hoy
              </p>
              <div className="space-y-2">
                {cuidados.map((c) => (
                  <BotonCuidado key={c.key} cuidado={c} onSelect={onRegistrarCuidado} />
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">Medidas</p>
          <Grupo opciones={MEDIDAS} onSelect={onSelect} />
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Cuidado del día. A diferencia del resto, no abre formulario: apunta la
 * administración con la hora actual, igual que el chip de «Hoy».
 */
function BotonCuidado({ cuidado, onSelect }: { cuidado: CuidadoHoy; onSelect: (c: CuidadoHoy) => void }) {
  const { hecho, urgente, hechas, total } = cuidado;
  return (
    <button
      onClick={() => onSelect(cuidado)}
      disabled={hecho}
      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left touch-manipulation transition-colors ${
        hecho ? 'bg-gray-50 opacity-60 cursor-default' : 'bg-gray-50 active:bg-gray-100'
      }`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${
        hecho ? 'bg-green-100' : urgente ? 'bg-amber-100' : 'bg-violet-100'
      }`}>
        {cuidado.icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-800 truncate">{cuidado.etiqueta}</span>
        <span className="block text-xs text-gray-500 truncate">{cuidado.detalle}</span>
      </span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
        hecho ? 'bg-green-100 text-green-700' : urgente ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'
      }`}>
        {hecho ? '✓ hecho' : total > 1 ? `${hechas}/${total}` : 'pendiente'}
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
