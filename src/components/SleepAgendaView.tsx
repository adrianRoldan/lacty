import { useMemo, useState } from 'react';
import type { BabyConfig, Feeding, NoteEntry, Rest } from '../types';
import PeriodoSelector from './PeriodoSelector';
import { todayIso, inicioDeUltimosDias } from '../utils/dateUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { construirAgenda, FILTRO_FLECHAS_POR_DEFECTO } from '../utils/sleepAgenda';

interface Props {
  config: BabyConfig;
  rests: Rest[];
  notes: NoteEntry[];
  feedings: Feeding[];
  onBack: () => void;
}

const NOTAS_VISIBLES = 5;

export default function SleepAgendaView({ config, rests, notes, feedings, onBack }: Props) {
  const [desde, setDesde] = useState(inicioDeUltimosDias(14));
  const [hasta, setHasta] = useState(todayIso());
  const [filtro, setFiltro] = useLocalStorage('lacty-agenda-filtro-flechas', FILTRO_FLECHAS_POR_DEFECTO);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  const rangoValido = desde <= hasta;
  const agenda = useMemo(
    () => (rangoValido ? construirAgenda({ rests, notes, feedings }, desde, hasta, filtro) : null),
    [rests, notes, feedings, desde, hasta, filtro, rangoValido],
  );

  async function descargar() {
    if (!agenda) return;
    setGenerando(true);
    setError('');
    try {
      const { generarAgendaPdf } = await import('../utils/sleepAgendaPdf');
      const blob = generarAgendaPdf(agenda, { nombre: config.name ?? 'Bebé', desde, hasta });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agenda-sueno-${desde}-a-${hasta}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo generar el PDF. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">← Atrás</button>
        <h1 className="text-2xl font-bold text-gray-900">Agenda de sueño</h1>
      </div>

      <p className="text-sm text-taupe-700 leading-relaxed mb-5">
        Genera la hoja de sueño para el pediatra: una fila por día, en casillas de 10 minutos,
        con las flechas de cuando se le ofrece dormir, un ojo en cada microdespertar y una B en cada biberón.
      </p>

      <PeriodoSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <label htmlFor="filtro-flechas" className="block text-sm font-medium text-gray-600 mb-2">
          Notas que dibujan una flecha
        </label>
        <input
          id="filtro-flechas"
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
        />
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          Separa con comas las distintas formas de escribirlo. Da igual usar mayúsculas o acentos.
        </p>
      </div>

      {agenda && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
          <p className="text-sm font-medium text-gray-600 mb-2">Qué saldrá en la hoja</p>
          <p className="text-sm text-gray-800">
            {agenda.filas.length} {agenda.filas.length === 1 ? 'día' : 'días'} · {agenda.notasConFlecha.length}{' '}
            {agenda.notasConFlecha.length === 1 ? 'flecha' : 'flechas'} · {agenda.numMicrodespertares}{' '}
            {agenda.numMicrodespertares === 1 ? 'microdespertar' : 'microdespertares'} · {agenda.numBiberones}{' '}
            {agenda.numBiberones === 1 ? 'biberón' : 'biberones'}
          </p>
          {agenda.notasConFlecha.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {agenda.notasConFlecha.slice(0, NOTAS_VISIBLES).map((n) => (
                <li key={n.id} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-700 min-w-0 break-words">{n.text}</span>
                  <span className="text-gray-400 ml-auto shrink-0 tabular-nums">
                    {new Date(n.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
              {agenda.notasConFlecha.length > NOTAS_VISIBLES && (
                <li className="text-xs text-gray-400">y {agenda.notasConFlecha.length - NOTAS_VISIBLES} más</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Ninguna nota del periodo coincide con ese texto, así que la hoja saldrá sin flechas.
            </p>
          )}
        </div>
      )}

      <button
        onClick={descargar}
        disabled={!agenda || generando}
        className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-base active:bg-sage-700 disabled:opacity-50 touch-manipulation"
      >
        {generando ? 'Generando…' : '📄 Descargar PDF'}
      </button>
      {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
    </div>
  );
}
