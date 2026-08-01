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
