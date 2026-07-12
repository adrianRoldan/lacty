import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider');
  return ctx;
}

interface DialogState {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      setDialog({
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Eliminar',
        cancelLabel: opts.cancelLabel ?? 'Cancelar',
        danger: opts.danger ?? true,
        resolve,
      });
    });
  }, []);

  function answer(v: boolean) {
    dialog?.resolve(v);
    setDialog(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => answer(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5 animate-[fadeSlideUp_0.18s_ease-out]">
            <p className="text-base text-gray-800 text-center leading-relaxed">{dialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => answer(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 active:bg-gray-200 touch-manipulation"
              >
                {dialog.cancelLabel}
              </button>
              <button
                onClick={() => answer(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white touch-manipulation ${
                  dialog.danger ? 'bg-red-500 active:bg-red-600' : 'bg-sage-600 active:bg-sage-700'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}
