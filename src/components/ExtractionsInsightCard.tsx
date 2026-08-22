import type { Extraction } from '../types';
import type { FeedingReference } from '../data/referenceTable';
import { ProgressRow, AverageRow } from './InsightRows';

interface Props {
  /** Extracciones de hoy (ya filtradas por el día por quien llama). */
  extractions: Extraction[];
  /** Media de tomas/día de la última semana (avgDailyFeeds), o null si aún
   *  no hay suficientes días con datos — entonces se usa `reference`. */
  avgFeedsTarget: number | null;
  reference: FeedingReference | null;
}

/**
 * Tarjeta "Extracciones": compara las extracciones de hoy con el ritmo real
 * de tomas del bebé (no una cifra fija), para avisar si la frecuencia de
 * sacado protege la producción o arriesga bajarla / subirla de más.
 *
 * Vive en su propio archivo para poder mostrarse tanto en «Medias del día»
 * (DayInsights) como en el diálogo de información del propio formulario de
 * extracción — la misma tarjeta, no una copia.
 */
export default function ExtractionsInsightCard({ extractions, avgFeedsTarget, reference }: Props) {
  const extractionsHoy = extractions.filter((e) => e.purpose === 'replace').length;
  const extractionsExtra = extractions.filter((e) => e.purpose === 'extra').length;
  const extractionMl = extractions.reduce((s, e) => s + (e.ml ?? 0), 0);
  const extractionRef = avgFeedsTarget != null
    ? { min: Math.max(1, Math.round(avgFeedsTarget - 1)), max: Math.round(avgFeedsTarget + 1), label: `~${Math.round(avgFeedsTarget)}/día de tu bebé` }
    : reference
      ? { min: reference.feedsPerDayMin, max: reference.feedsPerDayMax, label: undefined }
      : null;

  if (!extractionRef) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Extracciones
      </h3>

      <ProgressRow
        label="Extracciones hoy"
        value={extractionsHoy}
        refMin={extractionRef.min}
        refMax={extractionRef.max}
        refLabel={extractionRef.label}
        formatValue={(v) => String(v)}
      />

      {extractionMl > 0 && (
        <AverageRow icon="🥛" label="ml extraídos hoy" value={`${extractionMl} ml`} />
      )}

      {extractionsExtra > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          +{extractionsExtra} extra para banco hoy — puntual está bien, pero hacerlo a
          diario tiende a subir la producción por encima de lo que el bebé necesita.
        </p>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        ℹ️ El objetivo se ajusta a las tomas reales de tu bebé (o a la referencia por
        edad si aún no hay suficientes días registrados): sacarte con esa frecuencia
        protege la producción sin sobre-estimularla.
      </p>
    </div>
  );
}
