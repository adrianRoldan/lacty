import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lacty-theme';

function getStored(): Theme | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

function getInitialTheme(): Theme {
  const stored = getStored();
  if (stored) return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Aplica la clase antes del primer render para evitar parpadeo (FOUC).
export function applyInitialTheme() {
  document.documentElement.classList.toggle('dark', getInitialTheme() === 'dark');
}

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  /**
   * Pone la app en oscuro sin tocar —ni guardar— la preferencia del usuario.
   * Lo usa el modo madrugada de «Hoy»: al salir se vuelve a lo que él eligió.
   */
  forzarOscuro: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
  forzarOscuro: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [oscuroForzado, setOscuroForzado] = useState(false);

  // Lo que se pinta es «su tema, o oscuro si algo lo está forzando».
  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuroForzado || theme === 'dark');
  }, [theme, oscuroForzado]);

  // Lo que se guarda es solo su elección: un forzado temporal no debe
  // quedarse pegado en el dispositivo para siempre.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((p) => (p === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, forzarOscuro: setOscuroForzado }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
