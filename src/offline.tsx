import { useEffect, useReducer } from 'react';

// Aviso de conectividad, mismo patrón pub/sub que toast.tsx. markOffline/markOnline
// se llaman tanto desde eventos nativos del navegador como desde cada petición de la API,
// para detectar tanto "sin wifi" como "con wifi pero sin internet real".

let offline = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function markOffline() {
  if (!offline) { offline = true; emit(); }
}

export function markOnline() {
  if (offline) { offline = false; emit(); }
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', markOffline);
  window.addEventListener('online', markOnline);
  if (!navigator.onLine) offline = true;
}

export function OfflineBanner() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => { listeners.delete(force); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-sm font-medium text-center py-2 px-4 shadow-md">
      Sin conexión — los cambios no se guardarán hasta que vuelva
    </div>
  );
}
