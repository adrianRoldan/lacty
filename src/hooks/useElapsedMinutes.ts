import { useState, useEffect } from 'react';

export function useElapsedTime(startTime: string): string {
  const calc = () => {
    const totalSec = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const [display, setDisplay] = useState(calc);

  useEffect(() => {
    setDisplay(calc());
    const id = setInterval(() => setDisplay(calc()), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return display;
}
