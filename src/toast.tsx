import { useEffect, useReducer } from 'react';

// Sistema de avisos discretos (toasts). Uso: import { toast } from '../toast'; toast('Mensaje').
// Con acciones (por ejemplo «Deshacer»), duran más y se cierran al pulsar una.

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Resaltada: la acción principal (por ejemplo «Deshacer»). */
  primary?: boolean;
  /**
   * Ficha que se marca y desmarca sin cerrar el aviso (para elegir varias
   * opciones). Cada toque alarga el aviso para dar tiempo a la siguiente.
   */
  toggle?: boolean;
  active?: boolean;
}

export type ToastItem = { id: number; message: string; actions?: ToastAction[] };

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const temporizadores = new Map<number, ReturnType<typeof setTimeout>>();
const duraciones = new Map<number, number>();
let nextId = 1;

function emit() {
  for (const l of listeners) l();
}

function cerrar(id: number) {
  clearTimeout(temporizadores.get(id));
  temporizadores.delete(id);
  duraciones.delete(id);
  items = items.filter((t) => t.id !== id);
  emit();
}

function programarCierre(id: number) {
  clearTimeout(temporizadores.get(id));
  temporizadores.set(id, setTimeout(() => cerrar(id), duraciones.get(id) ?? 2500));
}

/** Marca o desmarca una ficha del aviso y le da más tiempo antes de cerrarse. */
function alternar(id: number, label: string) {
  items = items.map((t) => t.id !== id ? t : {
    ...t,
    actions: t.actions?.map((a) => (a.label === label ? { ...a, active: !a.active } : a)),
  });
  programarCierre(id);
  emit();
}

export function toast(message: string, options?: { actions?: ToastAction[]; duration?: number }) {
  const id = nextId++;
  const actions = options?.actions;
  items = [...items, { id, message, actions }];
  duraciones.set(id, options?.duration ?? (actions?.length ? 6000 : 2500));
  programarCierre(id);
  emit();
}

export function Toaster() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => { listeners.delete(force); };
  }, []);

  const conAcciones = items.filter((t) => t.actions?.length);
  const simples = items.filter((t) => !t.actions?.length);

  return (
    <>
      {/* Los que llevan botones van arriba: abajo taparían el dock y los
          botones flotantes, que es justo donde está lo siguiente que pulsar. */}
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {conAcciones.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto bg-gray-900/90 text-white text-sm font-medium px-3 py-2.5 rounded-2xl shadow-lg backdrop-blur-sm max-w-full animate-toast-in"
          >
            <p className="text-center px-1">{t.message}</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-2">
              {t.actions!.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    a.onClick();
                    if (a.toggle) alternar(t.id, a.label);
                    else cerrar(t.id);
                  }}
                  aria-pressed={a.toggle ? !!a.active : undefined}
                  className={`h-9 px-3 rounded-full text-[13px] font-semibold touch-manipulation active:scale-95 transition-transform ${
                    a.primary || a.active ? 'bg-white text-gray-900' : 'bg-white/15 text-white'
                  }`}
                >
                  {a.toggle && a.active ? `✓ ${a.label}` : a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-24 lg:bottom-8 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {simples.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-gray-900/90 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm max-w-full text-center animate-toast-in"
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
