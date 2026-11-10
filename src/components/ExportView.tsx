import { useState, useMemo } from 'react';
import type { DatosExportacion } from '../utils/exportUtils';
import { construirTexto, construirCsv, diasDelRango, PREGUNTA_POR_DEFECTO } from '../utils/exportUtils';
import { todayIso, inicioDeUltimosDias } from '../utils/dateUtils';
import PeriodoSelector from './PeriodoSelector';

interface Props {
  datos: DatosExportacion;
  onBack: () => void;
}

type Formato = 'texto' | 'csv';

export default function ExportView({ datos, onBack }: Props) {
  const [desde, setDesde] = useState(inicioDeUltimosDias(7));
  const [hasta, setHasta] = useState(todayIso());
  const [formato, setFormato] = useState<Formato>('texto');
  const [ocultarNombre, setOcultarNombre] = useState(false);
  const [conPregunta, setConPregunta] = useState(true);
  const [pregunta, setPregunta] = useState(PREGUNTA_POR_DEFECTO);
  const [copiado, setCopiado] = useState(false);

  const rangoValido = desde <= hasta;
  const numDias = rangoValido ? diasDelRango(desde, hasta).length : 0;

  const contenido = useMemo(() => {
    if (!rangoValido) return '';
    const op = { desde, hasta, ocultarNombre, pregunta: conPregunta ? pregunta : '' };
    return formato === 'texto' ? construirTexto(datos, op) : construirCsv(datos, op);
  }, [datos, desde, hasta, formato, ocultarNombre, conPregunta, pregunta, rangoValido]);

  const nombreArchivo = `lacty-${desde}-a-${hasta}.${formato === 'texto' ? 'txt' : 'csv'}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contenido);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles queda la descarga como alternativa.
    }
  }

  function descargar() {
    // El BOM hace que Excel abra bien los acentos del CSV.
    const cuerpo = formato === 'csv' ? '﻿' + contenido : contenido;
    const blob = new Blob([cuerpo], {
      type: formato === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function compartir() {
    try {
      await navigator.share({ title: 'Registros de Lacty', text: contenido });
    } catch {
      // Cancelado o no disponible: no hay nada que hacer.
    }
  }

  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator && formato === 'texto';

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">← Atrás</button>
        <h1 className="text-2xl font-bold text-gray-900">Exportar registros</h1>
      </div>

      <p className="text-sm text-taupe-700 leading-relaxed mb-5">
        Genera un resumen del historial para enseñárselo a tu pediatra o matrona,
        o para pegarlo en una IA y que analice los patrones de tomas y siestas.
      </p>

      <PeriodoSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />

      {/* Formato */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <p className="text-sm font-medium text-gray-600 mb-3">Formato</p>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          <button onClick={() => setFormato('texto')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors touch-manipulation ${
              formato === 'texto' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Texto
          </button>
          <button onClick={() => setFormato('csv')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors touch-manipulation ${
              formato === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Hoja de cálculo
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          {formato === 'texto'
            ? 'Para pegar en una IA o enviar por mensaje. Incluye el día a día y un bloque con todos los sueños.'
            : 'Una fila por registro, para abrir en Excel o Google Sheets.'}
        </p>
      </div>

      {/* Opciones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
          <input type="checkbox" checked={ocultarNombre} onChange={(e) => setOcultarNombre(e.target.checked)}
            className="accent-sage-600 w-4 h-4 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Ocultar el nombre</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Lo sustituye por «El bebé». Los patrones se analizan igual, y así el nombre no queda
              guardado en el historial de un servicio de terceros.
            </p>
          </div>
        </label>

        {formato === 'texto' && (
          <>
            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input type="checkbox" checked={conPregunta} onChange={(e) => setConPregunta(e.target.checked)}
                className="accent-sage-600 w-4 h-4 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Incluir una pregunta al principio</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Para no tener que explicarle el contexto a la IA cada vez.
                </p>
              </div>
            </label>
            {conPregunta && (
              <textarea
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-600 resize-none"
              />
            )}
          </>
        )}
      </div>

      {/* Vista previa */}
      {rangoValido && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Vista previa</p>
            <p className="text-xs text-gray-400">
              {numDias} {numDias === 1 ? 'día' : 'días'} · {contenido.split('\n').length} líneas
            </p>
          </div>
          <pre className="text-[11px] leading-relaxed text-gray-600 bg-gray-50 rounded-xl p-3 max-h-60 overflow-auto whitespace-pre-wrap break-words">
            {contenido.slice(0, 1200)}{contenido.length > 1200 ? '\n…' : ''}
          </pre>
        </div>
      )}

      {/* Acciones */}
      <div className="space-y-2">
        <button onClick={copiar} disabled={!rangoValido}
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-base active:bg-sage-700 disabled:opacity-50 touch-manipulation">
          {copiado ? '✓ Copiado al portapapeles' : '📋 Copiar'}
        </button>
        <div className="flex gap-2">
          <button onClick={descargar} disabled={!rangoValido}
            className="flex-1 bg-white border-2 border-sage-200 text-sage-700 font-semibold py-3 rounded-xl active:bg-sage-50 disabled:opacity-50 touch-manipulation">
            Descargar
          </button>
          {puedeCompartir && (
            <button onClick={compartir} disabled={!rangoValido}
              className="flex-1 bg-white border-2 border-sage-200 text-sage-700 font-semibold py-3 rounded-xl active:bg-sage-50 disabled:opacity-50 touch-manipulation">
              Compartir
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed mt-5 px-2">
        Al compartir, estos datos salen de Lacty. Si los pegas en una IA, ten en cuenta que
        quedarán en el historial de ese servicio.
      </p>
    </div>
  );
}
