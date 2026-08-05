import { createContext, useContext, useState, type ReactNode } from 'react';
import * as api from './api';
import { toast } from './toast';

/**
 * Diseño del timeline de «Hoy». Conviven dos mientras se decide cuál se queda:
 * el clásico (tarjetas de colores) y la línea de tiempo. Cada persona elige el
 * suyo desde «Hoy» y puede volver al anterior en Ajustes.
 *
 * La preferencia vive en la cuenta (columna `timeline_design` del usuario), no
 * en el dispositivo: así se ve igual en el móvil y en el ordenador.
 */
export type TimelineDesign = 'clasico' | 'rail';

interface TimelineDesignCtx {
  design: TimelineDesign;
  /** Cambia el diseño y lo guarda en la cuenta. */
  setDesign: (d: TimelineDesign) => void;
  /** Fija el diseño que viene del servidor, sin volver a guardarlo. */
  hydrate: (d: TimelineDesign) => void;
}

const TimelineDesignContext = createContext<TimelineDesignCtx>({
  design: 'clasico',
  setDesign: () => {},
  hydrate: () => {},
});

export function TimelineDesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesignState] = useState<TimelineDesign>('clasico');

  function setDesign(d: TimelineDesign) {
    const anterior = design;
    setDesignState(d); // optimista: el cambio se ve al instante
    api.updateTimelineDesign(d).catch(() => {
      setDesignState(anterior);
      toast('No se pudo guardar la preferencia');
    });
  }

  return (
    <TimelineDesignContext.Provider value={{ design, setDesign, hydrate: setDesignState }}>
      {children}
    </TimelineDesignContext.Provider>
  );
}

export function useTimelineDesign() {
  return useContext(TimelineDesignContext);
}
