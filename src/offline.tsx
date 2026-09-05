import { useEffect, useState } from 'react';

// Aviso de conectividad, mismo patrón pub/sub que toast.tsx.
//
// El aviso lo dispara SOLO que fallen peticiones reales a la API (markOffline
// se llama desde el envoltorio de fetch), nunca una corazonada del navegador:
// `navigator.onLine` y el evento `offline` dan falsos positivos —en el móvil,
// al abrir la app, onLine llega en false unas décimas mientras la radio
// despierta—, y con eso se veía un parpadeo rojo en cada arranque teniendo
// conexión perfecta. Como la app consulta al servidor cada pocos segundos, un
// corte de verdad se detecta igual de rápido y sin inventarse nada.

/** Fallos seguidos de la API. Con uno solo no se avisa: puede ser una petición
 *  suelta que se cruzó con un cambio de red o con la app volviendo del fondo. */
let fallosSeguidos = 0;
const FALLOS_PARA_AVISAR = 2;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function markOffline() {
  fallosSeguidos++;
  if (fallosSeguidos === FALLOS_PARA_AVISAR) emit();
}

export function markOnline() {
  if (fallosSeguidos > 0) {
    fallosSeguidos = 0;
    emit();
  }
}

const sinConexion = () => fallosSeguidos >= FALLOS_PARA_AVISAR;

if (typeof window !== 'undefined') {
  // Recuperar la conexión sí es fiable y buena noticia: se quita el aviso al
  // momento, sin esperar a que responda la siguiente petición.
  window.addEventListener('online', markOnline);
}

export function OfflineBanner() {
  const [visible, setVisible] = useState(sinConexion);

  useEffect(() => {
    const sincronizar = () => setVisible(sinConexion());
    listeners.add(sincronizar);
    sincronizar();
    return () => { listeners.delete(sincronizar); };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-sm font-medium text-center py-2 px-4 shadow-md">
      Sin conexión — los cambios no se guardarán hasta que vuelva
    </div>
  );
}
