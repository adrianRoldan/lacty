/**
 * Envuelve una acción async para que, si se vuelve a llamar mientras la
 * anterior sigue en curso, no dispare una segunda petición. Evita que pulsar
 * varias veces un botón de acción rápida (sin formulario ni estado propio de
 * "guardando") con mala conexión cree registros duplicados.
 */
export function onceInFlight<A extends unknown[]>(
  fn: (...args: A) => Promise<void>,
  onError?: (e: unknown) => void
): (...args: A) => void {
  let pending = false;
  return (...args: A) => {
    if (pending) return;
    pending = true;
    fn(...args)
      .catch((e) => onError?.(e))
      .finally(() => { pending = false; });
  };
}
