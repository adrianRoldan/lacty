import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Diálogo para pedir una cantidad al vuelo, sin salir de la pantalla.
 *
 * Nace del biberón rápido: se inicia con un toque y sin mililitros, así que al
 * finalizarlo hay que preguntarlos. Abrir el formulario entero para un solo
 * número rompía la agilidad que se buscaba.
 */

interface AmountOptions {
  title: string;
  hint?: string;
  unit?: string;
  /** Valores sugeridos para acertar de un toque. */
  quick?: number[];
  confirmLabel?: string;
}

type AmountFn = (options: AmountOptions) => Promise<number | null>;

const AmountContext = createContext<AmountFn | null>(null);

export function useAmount(): AmountFn {
  const ctx = useContext(AmountContext);
  if (!ctx) throw new Error('useAmount debe usarse dentro de AmountProvider');
  return ctx;
}

interface DialogState extends AmountOptions {
  resolve: (v: number | null) => void;
}

export function AmountProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [valor, setValor] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pedir = useCallback((options: AmountOptions): Promise<number | null> => {
    setValor('');
    return new Promise((resolve) => setDialog({ ...options, resolve }));
  }, []);

  useEffect(() => {
    if (dialog) setTimeout(() => inputRef.current?.focus(), 60);
  }, [dialog]);

  function cerrar(v: number | null) {
    dialog?.resolve(v);
    setDialog(null);
  }

  const numero = Number(valor.replace(',', '.'));
  const valido = valor.trim() !== '' && !Number.isNaN(numero) && numero > 0;

  function confirmar() {
    if (valido) cerrar(numero);
  }

  return (
    <AmountContext.Provider value={pedir}>
      {children}
      {dialog && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => cerrar(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4 animate-[fadeSlideUp_0.18s_ease-out]">
            <div className="text-center">
              <p className="text-base font-semibold text-gray-900">{dialog.title}</p>
              {dialog.hint && <p className="text-xs text-gray-400 mt-1">{dialog.hint}</p>}
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }}
                placeholder="0"
                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
              />
              {dialog.unit && <span className="text-lg font-medium text-gray-500">{dialog.unit}</span>}
            </div>

            {dialog.quick && dialog.quick.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {dialog.quick.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setValor(String(q))}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold touch-manipulation transition-colors ${
                      valor === String(q)
                        ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => cerrar(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={!valido}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-40 touch-manipulation"
              >
                {dialog.confirmLabel ?? 'Guardar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AmountContext.Provider>
  );
}
