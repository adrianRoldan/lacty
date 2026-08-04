import type { WeightEntry, HeightEntry, HeadCircEntry } from '../types';
import { useConfirm } from './ConfirmDialog';

interface Props {
  weights: WeightEntry[];
  heights: HeightEntry[];
  headCircs: HeadCircEntry[];
  onBack: () => void;
  onNewWeight: () => void;
  onEditWeight: (w: WeightEntry) => void;
  onDeleteWeight: (id: string) => void;
  onNewHeight: () => void;
  onEditHeight: (h: HeightEntry) => void;
  onDeleteHeight: (id: string) => void;
  onNewHeadCirc: () => void;
  onEditHeadCirc: (h: HeadCircEntry) => void;
  onDeleteHeadCirc: (id: string) => void;
  onOpenWeightChart: () => void;
  onOpenHeightChart: () => void;
  onOpenHeadCircChart: () => void;
  readOnly?: boolean;
}

/** Fila normalizada: las tres medidas se pintan con el mismo componente. */
interface Fila {
  id: string;
  date: string;
  valor: number;
  notes?: string;
}

export default function GrowthView({
  weights, heights, headCircs, onBack,
  onNewWeight, onEditWeight, onDeleteWeight,
  onNewHeight, onEditHeight, onDeleteHeight,
  onNewHeadCirc, onEditHeadCirc, onDeleteHeadCirc,
  onOpenWeightChart, onOpenHeightChart, onOpenHeadCircChart, readOnly,
}: Props) {
  const pesos: Fila[] = weights.map((w) => ({ id: w.id, date: w.date, valor: w.weightKg, notes: w.notes }));
  const alturas: Fila[] = heights.map((h) => ({ id: h.id, date: h.date, valor: h.heightCm, notes: h.notes }));
  const perimetros: Fila[] = headCircs.map((h) => ({ id: h.id, date: h.date, valor: h.headCm, notes: h.notes }));

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Crecimiento</h1>
      </div>

      <MedidaSection
        titulo="Peso"
        emojiVacio="⚖️"
        textoVacio="Aún no hay registros de peso."
        ctaVacio="Registrar primer peso"
        etiquetaNuevo="+ Peso"
        entradas={pesos}
        formatValor={(v) => `${v} kg`}
        formatDiff={(d) => `${d >= 0 ? '+' : ''}${Math.round(d * 1000)} g`}
        confirmarTexto="¿Eliminar este registro de peso?"
        onNuevo={onNewWeight}
        onEditar={(id) => { const w = weights.find((x) => x.id === id); if (w) onEditWeight(w); }}
        onEliminar={onDeleteWeight}
        onGrafica={onOpenWeightChart}
        readOnly={readOnly}
      />

      <MedidaSection
        titulo="Altura"
        emojiVacio="📏"
        textoVacio="Aún no hay registros de altura."
        ctaVacio="Registrar primera altura"
        etiquetaNuevo="+ Altura"
        entradas={alturas}
        formatValor={(v) => `${v} cm`}
        formatDiff={(d) => `${d >= 0 ? '+' : ''}${Math.round(d * 10) / 10} cm`}
        confirmarTexto="¿Eliminar este registro de altura?"
        onNuevo={onNewHeight}
        onEditar={(id) => { const h = heights.find((x) => x.id === id); if (h) onEditHeight(h); }}
        onEliminar={onDeleteHeight}
        onGrafica={onOpenHeightChart}
        readOnly={readOnly}
      />

      <MedidaSection
        titulo="Perímetro craneal"
        emojiVacio="🧒"
        textoVacio="Aún no hay registros de perímetro craneal."
        ctaVacio="Registrar primer perímetro"
        etiquetaNuevo="+ Perímetro"
        entradas={perimetros}
        formatValor={(v) => `${v} cm`}
        formatDiff={(d) => `${d >= 0 ? '+' : ''}${Math.round(d * 10) / 10} cm`}
        confirmarTexto="¿Eliminar este registro de perímetro craneal?"
        onNuevo={onNewHeadCirc}
        onEditar={(id) => { const h = headCircs.find((x) => x.id === id); if (h) onEditHeadCirc(h); }}
        onEliminar={onDeleteHeadCirc}
        onGrafica={onOpenHeadCircChart}
        readOnly={readOnly}
      />
    </div>
  );
}

function MedidaSection({
  titulo, emojiVacio, textoVacio, ctaVacio, etiquetaNuevo, entradas,
  formatValor, formatDiff, confirmarTexto, onNuevo, onEditar, onEliminar, onGrafica, readOnly,
}: {
  titulo: string;
  emojiVacio: string;
  textoVacio: string;
  ctaVacio: string;
  etiquetaNuevo: string;
  entradas: Fila[];
  formatValor: (v: number) => string;
  formatDiff: (d: number) => string;
  confirmarTexto: string;
  onNuevo: () => void;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  onGrafica: () => void;
  readOnly?: boolean;
}) {
  const confirm = useConfirm();
  const sorted = [...entradas].sort((a, b) => b.date.localeCompare(a.date));

  async function handleDelete(id: string) {
    if (await confirm(confirmarTexto)) onEliminar(id);
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{titulo}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onGrafica}
            aria-label={`Ver gráfica de ${titulo.toLowerCase()}`}
            title={`Ver gráfica de ${titulo.toLowerCase()}`}
            className="text-sage-600 p-2 rounded-xl active:bg-sage-50 touch-manipulation"
          >
            <ChartIcon />
          </button>
          {!readOnly && (
            <button
              onClick={onNuevo}
              className="bg-sage-600 text-white font-semibold px-4 py-2 rounded-xl text-sm active:bg-sage-700 touch-manipulation"
            >
              {etiquetaNuevo}
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">{emojiVacio}</p>
          <p className="text-sm">{textoVacio}</p>
          {!readOnly && (
            <button onClick={onNuevo} className="mt-3 text-sage-600 font-medium touch-manipulation text-sm">
              {ctaVacio}
            </button>
          )}
        </div>
      ) : (
        <div className={`space-y-2 ${sorted.length > 5 ? 'max-h-[28rem] overflow-y-auto pr-1' : ''}`}>
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1];
            const diff = prev ? entry.valor - prev.valor : null;
            const daysBetween = prev
              ? Math.round(
                  (new Date(entry.date + 'T12:00:00').getTime() - new Date(prev.date + 'T12:00:00').getTime()) / 86400000
                )
              : null;
            return (
              <div
                key={entry.id}
                onClick={readOnly ? undefined : () => onEditar(entry.id)}
                className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:bg-gray-50 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">{formatDate(entry.date)}</span>
                      {i === 0 && (
                        <span className="text-xs bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-medium">
                          último
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-gray-900">{formatValor(entry.valor)}</span>
                      {diff !== null && (
                        <span className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatDiff(diff)}
                          {daysBetween != null && daysBetween > 0 && (
                            <span className="text-gray-400 font-normal"> en {daysBetween} {daysBetween === 1 ? 'día' : 'días'}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate italic">"{entry.notes}"</p>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                      className="text-gray-300 hover:text-red-400 p-2 shrink-0 touch-manipulation"
                      aria-label="Eliminar registro"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function ChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
