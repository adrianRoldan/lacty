import { useEffect, useState } from 'react';

/**
 * La franja en la que «Hoy» se reduce a lo que se usa con el bebé en brazos a
 * oscuras. Fija a propósito: un ajuste más para algo que casi nadie tocaría.
 * Si hay que moverla, se mueve aquí.
 */
export const MADRUGADA_DESDE = 23; // 23:00
export const MADRUGADA_HASTA = 7;  // 07:00

export function esMadrugada(ahora: Date = new Date()): boolean {
  const h = ahora.getHours();
  // La franja cruza la medianoche, así que es un «o», no un «y».
  return h >= MADRUGADA_DESDE || h < MADRUGADA_HASTA;
}

/**
 * Se recalcula cada minuto para que la pantalla entre y salga del modo sola,
 * sin tener que recargar. Es el mismo latido que ya usa «Hoy» para los
 * «hace 2 h 05».
 */
export function useModoMadrugada(): boolean {
  const [activo, setActivo] = useState(esMadrugada);

  useEffect(() => {
    const id = setInterval(() => setActivo(esMadrugada()), 60000);
    return () => clearInterval(id);
  }, []);

  return activo;
}
