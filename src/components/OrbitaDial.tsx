/**
 * El reloj de 24 h del diseño «Órbita»: el día de hoy dibujado como una esfera
 * con la medianoche arriba. Anillo exterior, tomas; interior, sueños; puntos,
 * pañales; y una aguja en la hora actual. Lo ya vivido se ve un punto más
 * claro que lo que queda de día, así que de un vistazo se sabe qué parte del
 * día falta.
 *
 * Solo dibuja: qué poner en el centro lo decide quien lo usa (children).
 * Todo va en un viewBox fijo de 320 y escala con el ancho del contenedor.
 */
import type { ReactNode } from 'react';
import type { Feeding, Rest, DiaperChange } from '../types';

const C = 160;
const R_TOMA = 138;
const R_SUENO = 112;
const R_PANAL = 88;
const HORA_MS = 3600000;

/** Duración que se dibuja para una toma sin hora de fin ni minutos. */
const TOMA_POR_DEFECTO_MIN = 20;
/** Lo mínimo que mide un arco para que se vea y se pueda tocar con la vista. */
const ARCO_MINIMO_H = 10 / 60;

export interface OrbitaDialProps {
  feedings: Feeding[];
  rests: Rest[];
  diapers: DiaperChange[];
  ahora: Date;
  /** La toma en curso, si la hay: su arco crece hasta la aguja. */
  tomaEnCurso?: Feeding | null;
  /** Qué destacar: con un sueño en curso, el resto del día se apaga. */
  enfoque?: 'sueno' | null;
  /** Hora prevista de la próxima toma: se dibuja discontinua. */
  prevision?: Date | null;
  /** Espera desde la última toma, cuando ya pasa del máximo de su edad. */
  espera?: { desde: Date; limite: Date } | null;
  /** Versión miniatura: sin horas ni pañales y con trazos más gruesos. */
  mini?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
}

export default function OrbitaDial({
  feedings, rests, diapers, ahora, tomaEnCurso, enfoque, prevision, espera, mini, ariaLabel, children,
}: OrbitaDialProps) {
  const inicioDia = new Date(ahora);
  inicioDia.setHours(0, 0, 0, 0);
  const t0 = inicioDia.getTime();
  const horaDe = (iso: string | Date) => (new Date(iso).getTime() - t0) / HORA_MS;
  const ahoraH = horaDe(ahora);

  // Recorta un tramo a lo que cae entre la medianoche y ahora.
  const recortar = (a: number, b: number): [number, number] | null => {
    const ini = Math.max(0, a);
    const fin = Math.min(ahoraH, b);
    return fin > ini ? [ini, fin] : null;
  };

  const suenos = rests
    .map((r) => {
      const tramo = recortar(horaDe(r.startTime), r.endTime ? horaDe(r.endTime) : ahoraH);
      return tramo && { id: r.id, tramo, enCurso: r.endTime == null };
    })
    .filter((x): x is { id: string; tramo: [number, number]; enCurso: boolean } => x != null);

  const tomas = feedings
    .map((f) => {
      const ini = horaDe(f.timestamp);
      let fin: number;
      if (tomaEnCurso && f.id === tomaEnCurso.id) fin = ahoraH;
      else if (f.endTime) fin = horaDe(f.endTime);
      else {
        const min = (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0) || TOMA_POR_DEFECTO_MIN;
        fin = ini + min / 60;
      }
      const tramo = recortar(ini, Math.max(fin, ini + ARCO_MINIMO_H));
      return tramo && { id: f.id, tramo };
    })
    .filter((x): x is { id: string; tramo: [number, number] } => x != null);

  const panales = mini ? [] : diapers
    .map((d) => ({ id: d.id, h: horaDe(d.timestamp) }))
    .filter((d) => d.h >= 0 && d.h <= ahoraH);

  const prevH = prevision ? horaDe(prevision) : null;
  const dibujaPrevision = prevH !== null && prevH > ahoraH && prevH < 24;

  const esperaTramos = espera ? {
    discontinua: recortar(horaDe(espera.desde), horaDe(espera.limite)),
    pasada: recortar(horaDe(espera.limite), ahoraH),
  } : null;

  const apagado = enfoque === 'sueno' ? 0.5 : 1;
  const grosorToma = mini ? 24 : 16;
  const grosorSueno = mini ? 30 : 22;

  const [ax1, ay1] = punto(ahoraH, mini ? 40 : 70);
  const [ax2, ay2] = punto(ahoraH, mini ? 150 : 156);
  const finSuenoEnCurso = suenos.find((s) => s.enCurso);

  return (
    <div className="relative w-full aspect-square">
      <svg viewBox="0 0 320 320" fill="none" className="absolute inset-0 w-full h-full" role="img" aria-label={ariaLabel}>
        {/* pistas: lo que queda de día, y encima lo ya vivido */}
        <circle cx={C} cy={C} r={R_TOMA} stroke="var(--color-gray-100)" strokeWidth={grosorToma} />
        <circle cx={C} cy={C} r={R_SUENO} stroke="var(--color-gray-100)" strokeWidth={grosorSueno} />
        {ahoraH > 0.05 && (<>
          <path d={arco(0, ahoraH, R_TOMA)} stroke="var(--color-gray-200)" strokeWidth={grosorToma} />
          <path d={arco(0, ahoraH, R_SUENO)} stroke="var(--color-gray-200)" strokeWidth={grosorSueno} />
        </>)}

        {suenos.map((s) => (
          <path
            key={s.id} d={arco(s.tramo[0], s.tramo[1], R_SUENO)}
            stroke="var(--orb-sueno)" strokeWidth={grosorSueno}
            opacity={s.enCurso ? 1 : apagado}
          />
        ))}
        {finSuenoEnCurso && !mini && (() => {
          const [x, y] = punto(finSuenoEnCurso.tramo[1], R_SUENO);
          return <circle cx={x} cy={y} r={17} stroke="var(--orb-sueno)" strokeWidth={2} opacity={0.4} className="animate-pulse" />;
        })()}

        {tomas.map((t) => (
          <path
            key={t.id} d={arco(t.tramo[0], t.tramo[1], R_TOMA)}
            stroke="var(--orb-toma)" strokeWidth={grosorToma} strokeLinecap="round"
            opacity={tomaEnCurso?.id === t.id ? 1 : apagado}
          />
        ))}

        {dibujaPrevision && !mini && (
          <path
            d={arco(prevH!, Math.min(24, prevH! + 25 / 60), R_TOMA)}
            stroke="var(--orb-toma)" strokeWidth={grosorToma} strokeLinecap="round"
            strokeDasharray="3 5" opacity={0.75}
          />
        )}

        {esperaTramos?.discontinua && (
          <path
            d={arco(esperaTramos.discontinua[0], esperaTramos.discontinua[1], R_TOMA)}
            stroke="var(--orb-alerta)" strokeWidth={4} strokeLinecap="round" strokeDasharray="2 6"
          />
        )}
        {esperaTramos?.pasada && (
          <path
            d={arco(esperaTramos.pasada[0], esperaTramos.pasada[1], R_TOMA)}
            stroke="var(--orb-alerta)" strokeWidth={grosorToma} strokeLinecap="round"
          />
        )}

        {panales.map((p) => {
          const [x, y] = punto(p.h, R_PANAL);
          return <circle key={p.id} cx={x} cy={y} r={4.5} fill="var(--orb-panal)" opacity={apagado} />;
        })}

        <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} stroke="var(--color-gray-900)" strokeWidth={mini ? 10 : 2.5} strokeLinecap="round" />
        {!mini && <circle cx={ax2} cy={ay2} r={5} fill="var(--color-gray-900)" />}

        {!mini && (
          <g fill="var(--color-gray-400)" fontSize="11">
            {HORAS.filter((h) => distanciaHoras(h.h, ahoraH) > 0.6).map((h) => (
              <text key={h.h} x={h.x} y={h.y} textAnchor={h.anchor}>{h.h}</text>
            ))}
          </g>
        )}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-[24%]">
          {children}
        </div>
      )}
    </div>
  );
}

// Las horas de referencia del borde. La que queda bajo la aguja se oculta:
// la aguja ya dice qué hora es y la tapaba.
const HORAS: { h: number; x: number; y: number; anchor: 'start' | 'middle' | 'end' }[] = [
  { h: 0, x: C, y: 12, anchor: 'middle' },
  { h: 6, x: 314, y: 164, anchor: 'end' },
  { h: 12, x: C, y: 318, anchor: 'middle' },
  { h: 18, x: 6, y: 164, anchor: 'start' },
];

function distanciaHoras(a: number, b: number): number {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

/** Punto de la esfera para una hora del día (0–24) a un radio dado. */
function punto(h: number, r: number): [number, number] {
  const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/** Arco en el sentido de las agujas del reloj entre dos horas del día. */
function arco(h1: number, h2: number, r: number): string {
  // Un arco SVG de 360° no se dibuja: se parte en dos mitades.
  if (h2 - h1 >= 23.99) return `${arco(h1, h1 + 12, r)} ${arco(h1 + 12, h2 - 0.001, r)}`;
  const [x1, y1] = punto(h1, r);
  const [x2, y2] = punto(h2, r);
  const grande = h2 - h1 > 12 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${grande} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
