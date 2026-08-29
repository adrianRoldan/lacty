import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MassageLog, MedicationPlan } from '../types';
import { cuidadosDeHoy, type CuidadoHoy } from '../utils/cuidadosHoy';

/**
 * Cuidados del día en «Hoy»: un solo chip resumen que abre una hoja con la
 * lista y sus botones.
 *
 * Antes había un chip por cuidado en el renglón del título. Con vitamina D,
 * probiótico, masajes y varias pautas de medicación la fila se partía en
 * varias líneas y no había forma de saber qué tocaba antes. El chip resume
 * «cuántos llevas y a qué hora es lo siguiente», y el detalle vive en la hoja.
 *
 * Lo usan los dos diseños de «Hoy» (clásico y línea de tiempo), que antes
 * tenían este código duplicado letra por letra.
 */

export interface CareItem {
  key: string;
  icon: string;
  label: string;
  /** Contexto de una línea: dosis y horario. */
  detail: string;
  /** Hora de la siguiente toma pendiente, si se sabe. */
  time?: string;
  done: boolean;
  urgent: boolean;
  count?: { current: number; total: number };
  onAdd: () => void;
  onUndo?: () => void;
}

interface Acciones {
  today: string;
  massageLogs: MassageLog[];
  onGiveVitaminD: (date: string) => void;
  onRemoveVitaminD: (date: string) => void;
  onGiveProbiotic: (date: string) => void;
  onRemoveProbiotic: (date: string) => void;
  onAddMassage: (date: string) => void;
  onRemoveMassage: (id: string) => void;
  onGiveMedicationDose: (plan: MedicationPlan) => void;
  onUndoMedicationDose: (planId: string) => void;
}

/**
 * Calcula los cuidados de hoy y les engancha las acciones de la pantalla.
 * El qué falta lo decide `cuidadosDeHoy`; aquí solo se añade el qué hacer.
 */
export function cuidadosConAcciones(
  datos: Parameters<typeof cuidadosDeHoy>[0],
  acciones: Acciones,
): CareItem[] {
  const { today, massageLogs } = acciones;
  return cuidadosDeHoy(datos).map((c: CuidadoHoy): CareItem => {
    const base = {
      key: c.key,
      icon: c.icono,
      label: c.etiqueta,
      detail: c.detalle,
      time: c.proximaHora,
      done: c.hecho,
      urgent: c.urgente,
      count: c.total > 1 ? { current: c.hechas, total: c.total } : undefined,
    };
    switch (c.tipo) {
      case 'vitaminD':
        return { ...base,
          onAdd: () => acciones.onGiveVitaminD(today),
          onUndo: c.hecho ? () => acciones.onRemoveVitaminD(today) : undefined };
      case 'probiotic':
        return { ...base,
          onAdd: () => acciones.onGiveProbiotic(today),
          onUndo: c.hecho ? () => acciones.onRemoveProbiotic(today) : undefined };
      case 'massage': {
        // Deshacer quita el último masaje apuntado hoy, no uno cualquiera.
        const ultimo = massageLogs
          .filter((m) => m.date === today)
          .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
          .at(-1);
        return { ...base,
          count: { current: c.hechas, total: c.total },
          onAdd: () => acciones.onAddMassage(today),
          onUndo: ultimo ? () => acciones.onRemoveMassage(ultimo.id) : undefined };
      }
      default:
        return { ...base,
          count: { current: c.hechas, total: c.total },
          onAdd: () => acciones.onGiveMedicationDose(c.plan!),
          onUndo: c.hechas > 0 ? () => acciones.onUndoMedicationDose(c.plan!.id) : undefined };
    }
  });
}

/** Pendientes primero y por hora; lo hecho, al final. */
function ordenar(items: CareItem[]): CareItem[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });
}

/** Chip resumen; al tocarlo abre la hoja de cuidados. */
export function CareSummaryChip({ items, readOnly }: { items: CareItem[]; readOnly?: boolean }) {
  const [abierta, setAbierta] = useState(false);
  if (items.length === 0) return null;

  const orden = ordenar(items);
  const hechos = items.filter((i) => i.done).length;
  const todoHecho = hechos === items.length;
  const hayUrgente = items.some((i) => i.urgent && !i.done);
  const siguiente = orden.find((i) => !i.done);

  const color = todoHecho
    ? 'bg-green-100 text-green-700'
    : hayUrgente
      ? 'bg-amber-100 text-amber-800'
      : 'bg-gray-100 text-gray-500';

  return (
    <>
      <button
        onClick={() => setAbierta(true)}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold touch-manipulation active:brightness-95 ${color}`}
      >
        <span aria-hidden="true">{todoHecho ? '✓' : siguiente?.icon}</span>
        <span>Cuidados {hechos}/{items.length}</span>
        {!todoHecho && siguiente?.time && (
          <span className="font-normal opacity-70">· {siguiente.time}</span>
        )}
      </button>
      {abierta && <CareSheet items={orden} readOnly={readOnly} onClose={() => setAbierta(false)} />}
    </>
  );
}

const ARRASTRE_PARA_CERRAR = 90; // px
const SALIDA_MS = 200;           // debe coincidir con la transición de salida

/**
 * Hoja de cuidados. Copia el armazón de `AddRecordSheet` (velo, animación,
 * arrastrar la cabecera para cerrar) a propósito: es el patrón de hoja que ya
 * conoce el usuario.
 *
 * A diferencia de aquella, **no se cierra al apuntar**: lo normal es dar dos o
 * tres cosas seguidas, y cerrarse tras la primera obligaba a volver a abrirla.
 */
function CareSheet({ items, readOnly, onClose }: {
  items: CareItem[];
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [arrastre, setArrastre] = useState(0);
  const [soltando, setSoltando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const inicioY = useRef(0);

  function cerrarConSalida() {
    if (cerrando) return;
    setCerrando(true);
    setTimeout(onClose, SALIDA_MS);
  }

  function alSoltar() {
    setSoltando(true);
    if (arrastre > ARRASTRE_PARA_CERRAR) cerrarConSalida();
    else setArrastre(0);
  }

  const gestos = {
    onTouchStart: (e: React.TouchEvent) => { inicioY.current = e.touches[0].clientY; setSoltando(false); },
    onTouchMove: (e: React.TouchEvent) => {
      const dy = e.touches[0].clientY - inicioY.current;
      setArrastre(dy > 0 ? dy : 0);
    },
    onTouchEnd: alSoltar,
    onTouchCancel: alSoltar,
  };

  const pendientes = items.filter((i) => !i.done);
  const hechos = items.filter((i) => i.done);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6">
      <div
        onClick={cerrarConSalida}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          cerrando ? 'opacity-0' : 'animate-[backdropIn_0.2s_ease-out]'
        }`}
      />
      <div
        className={`relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85vh] flex flex-col ${
          arrastre === 0 && !soltando && !cerrando ? 'animate-[sheetIn_0.24s_cubic-bezier(0.32,0.72,0,1)]' : ''
        } ${soltando || cerrando ? 'transition-transform duration-200 ease-in' : ''}`}
        style={
          cerrando ? { transform: 'translateY(100%)' }
          : arrastre > 0 ? { transform: `translateY(${arrastre}px)` }
          : undefined
        }
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 touch-none" {...gestos}>
          <span className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pt-3 sm:pt-5 pb-3 flex items-center justify-between shrink-0 touch-none" {...gestos}>
          <div>
            <p className="text-lg font-bold text-gray-900">Cuidados de hoy</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendientes.length === 0
                ? 'Todo dado por hoy'
                : `Quedan ${pendientes.length} de ${items.length}`}
            </p>
          </div>
          <button
            onClick={cerrarConSalida}
            aria-label="Cerrar"
            className="text-gray-400 text-xl w-9 h-9 flex items-center justify-center shrink-0 touch-manipulation"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto overscroll-contain flex-1">
          {pendientes.length > 0 && (
            <div className="space-y-1.5">
              {pendientes.map((i) => <FilaCuidado key={i.key} item={i} readOnly={readOnly} />)}
            </div>
          )}
          {hechos.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">
                Hechos hoy
              </p>
              <div className="space-y-1.5">
                {hechos.map((i) => <FilaCuidado key={i.key} item={i} readOnly={readOnly} />)}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 pb-safe">
          <button
            onClick={cerrarConSalida}
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
 * Una línea por cuidado: qué es, dosis y horario, cuánto llevas y el botón de
 * dar. Deshacer es un botón aparte y solo aparece si hay algo que deshacer,
 * en vez de la «×» pegada al chip de antes.
 */
function FilaCuidado({ item, readOnly }: { item: CareItem; readOnly?: boolean }) {
  const { done, urgent, count, time, onAdd, onUndo } = item;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${!done && urgent ? 'bg-amber-50' : 'bg-gray-50'}`}>
      <span className="text-base shrink-0 leading-none" aria-hidden="true">{item.icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${done ? 'text-gray-400' : 'text-gray-800'}`}>
          {item.label}
          {count && <span className="ml-1.5 text-xs font-normal text-gray-400">{count.current}/{count.total}</span>}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {item.detail}
          {!done && time && <span className={urgent ? 'text-amber-700 font-semibold' : ''}> · toca a las {time}</span>}
        </p>
      </div>
      {!readOnly && onUndo && (
        <button
          onClick={onUndo}
          aria-label={`Deshacer ${item.label}`}
          className="w-8 h-8 shrink-0 rounded-full text-gray-400 text-sm flex items-center justify-center active:bg-gray-200 touch-manipulation"
        >
          ↩
        </button>
      )}
      {done ? (
        <span className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-green-100 text-green-700">✓</span>
      ) : (
        <button
          onClick={onAdd}
          disabled={readOnly}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full touch-manipulation active:brightness-95 disabled:opacity-50 ${
            urgent ? 'bg-amber-500 text-white' : 'bg-sage-600 text-white'
          }`}
        >
          Dar
        </button>
      )}
    </div>
  );
}
