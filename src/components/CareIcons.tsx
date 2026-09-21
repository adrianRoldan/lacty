// Iconos propios para los registros que no tienen un emoji libre y reconocible.
// Los emojis obvios ya están ocupados: 💊 vitamina D, 💉 jeringa y vacunas,
// 🦠 probiótico. Se dibujan como SVG igual que DiaperIcon y BreastIcon.

/** Frasco de jarabe con cruz: medicamentos (Apiretal, Dalsy…). */
export function MedicineIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {/* Tapón */}
      <path d="M9.5 2.5h5v3h-5z" />
      {/* Cuerpo del frasco */}
      <path d="M8 5.5h8a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-13a1 1 0 0 1 1-1z" />
      {/* Cruz */}
      <path d="M12 11v5M9.5 13.5h5" />
    </svg>
  );
}

/**
 * Pesa: registro de peso. El emoji ⚖️ es marrón y multicolor, y sobre el
 * fondo del botón flotante quedaba embarrado; en SVG hereda el blanco.
 */
export function ScaleIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {/* Asa */}
      <path d="M9 8.6V7.2a3 3 0 0 1 6 0v1.4" />
      {/* Cuerpo */}
      <path d="M6.4 8.6h11.2l1.3 10.3a1.7 1.7 0 0 1-1.7 1.9H6.8a1.7 1.7 0 0 1-1.7-1.9z" />
    </svg>
  );
}

/** Carrito de bebé: paseos. */
export function StrollerIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {/* Capota y cesta: media luna apoyada en el chasis */}
      <path d="M2 13h14A7 7 0 0 0 2 13Z" />
      {/* Manillar, hacia arriba y atrás */}
      <path d="M16 13V7.8A2 2 0 0 1 18 5.8h3.2" />
      {/* Patas */}
      <path d="M5.6 13 6.4 17.2M12.4 13 11.6 17.2" />
      {/* Ruedas */}
      <circle cx="6.4" cy="19.1" r="1.9" />
      <circle cx="11.6" cy="19.1" r="1.9" />
    </svg>
  );
}

// ── Glifos del rail en cajas ────────────────────────────────────────────────
// El diseño «Ahora» pinta cada registro en una cajita del color de su tipo, y
// ahí un emoji de colores se pelea con el fondo: estos heredan `currentColor`
// y se tiñen del acento. Mismo trazo (1.9) y misma rejilla de 24 que el resto.

type GlifoProps = { size?: number; className?: string };

const base = (size: number, className: string) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: '1.9',
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  className, 'aria-hidden': true,
});

/** Biberón: tetina, cuello y marca de medida. */
export function BottleIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9.5 2h5" />
      <path d="M10 2v3L8.5 7v12a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V7L14 5V2" />
      <path d="M8.5 11h7" />
    </svg>
  );
}

/** Jeringa: la de los suplementos dedo-jeringa. */
export function SyringeIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M16.5 3.5 20.5 7.5" />
      <path d="M18.5 5.5 9 15l-3.5.6L6 12.1Z" />
      <path d="M11.5 7.5 16.5 12.5" />
    </svg>
  );
}

/** Luna: sueño nocturno. */
export function MoonIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </svg>
  );
}

/** Luna con zzz: siesta, para distinguirla del sueño de la noche. */
export function NapIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M19.5 15.5A8 8 0 0 1 8.5 5 8 8 0 1 0 19.5 15.5Z" />
      <path d="M15 3h4l-4 4h4" strokeWidth="1.5" />
    </svg>
  );
}

/** Gota: pañal mojado. */
export function DropIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z" />
    </svg>
  );
}

/** Biberón con gotas: extracción de leche. */
export function PumpIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 10h10v7a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-7Z" />
      <path d="M9 10V6.5A2.5 2.5 0 0 1 11.5 4h1" />
      <path d="M18.5 5.5v.01M20.5 8.5v.01" />
    </svg>
  );
}

/** Pañal de trazo: el DiaperIcon relleno chirría entre glifos de línea. */
export function NappyIcon({ size = 16, className = '' }: GlifoProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 6.5h16v4.5a8 8 0 0 1-8 8 8 8 0 0 1-8-8V6.5Z" />
      <path d="M4 10h4.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1 3.5-3.5H20" />
    </svg>
  );
}
