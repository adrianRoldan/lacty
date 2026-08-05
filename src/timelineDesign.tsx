import { createContext, useContext, useState, type ReactNode } from 'react';
import * as api from './api';
import { toast } from './toast';

/**
 * Diseño del timeline de «Hoy». Conviven dos mientras se decide cuál se queda:
 * el clásico (tarjetas de colores) y la línea de tiempo. Cada persona elige el
 * suyo desde el aviso de «Hoy» y puede cambiarlo cuando quiera en Ajustes.
 *
 * Tanto el diseño elegido como si ya se enseñó el aviso viven en la cuenta
 * (columnas `timeline_design` y `timeline_prompt_seen` del usuario), no en el
 * dispositivo: así se ve igual en el móvil y en el ordenador.
 */
export type TimelineDesign = 'clasico' | 'rail';

interface TimelineDesignCtx {
  design: TimelineDesign;
  /** Si ya se ofreció probar la línea de tiempo: el aviso solo sale una vez. */
  promptSeen: boolean;
  /** Cambia el diseño, lo guarda y da el aviso por visto. */
  setDesign: (d: TimelineDesign) => void;
  /** Cierra el aviso sin cambiar de diseño. */
  dismissPrompt: () => void;
  /** Fija los valores que vienen del servidor, sin volver a guardarlos. */
  hydrate: (v: { design: TimelineDesign; promptSeen: boolean }) => void;
}

const TimelineDesignContext = createContext<TimelineDesignCtx>({
  design: 'clasico',
  promptSeen: true,
  setDesign: () => {},
  dismissPrompt: () => {},
  hydrate: () => {},
});

export function TimelineDesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesignState] = useState<TimelineDesign>('clasico');
  // Se asume visto hasta que el servidor diga lo contrario, para que el aviso
  // no aparezca y desaparezca mientras carga la sesión.
  const [promptSeen, setPromptSeen] = useState(true);

  function setDesign(d: TimelineDesign) {
    const anterior = design;
    setDesignState(d); // optimista: el cambio se ve al instante
    setPromptSeen(true);
    api.updatePreferences({ timelineDesign: d, timelinePromptSeen: true }).catch(() => {
      setDesignState(anterior);
      toast('No se pudo guardar la preferencia');
    });
  }

  function dismissPrompt() {
    setPromptSeen(true);
    api.updatePreferences({ timelinePromptSeen: true }).catch(() => {});
  }

  function hydrate({ design: d, promptSeen: seen }: { design: TimelineDesign; promptSeen: boolean }) {
    setDesignState(d);
    setPromptSeen(seen);
  }

  return (
    <TimelineDesignContext.Provider value={{ design, promptSeen, setDesign, dismissPrompt, hydrate }}>
      {children}
    </TimelineDesignContext.Provider>
  );
}

export function useTimelineDesign() {
  return useContext(TimelineDesignContext);
}
