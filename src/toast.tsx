import { useEffect, useReducer } from 'react';

// Sistema de avisos discretos (toasts). Uso: import { toast } from '../toast'; toast('Mensaje').

export type ToastItem = { id: number; message: string };

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string) {
  const id = nextId++;
  items = [...items, { id, message }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 2500);
}

export function Toaster() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => { listeners.delete(force); };
  }, []);

  return (
    <div className="fixed bottom-24 lg:bottom-8 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-gray-900/90 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm max-w-full text-center animate-toast-in"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
