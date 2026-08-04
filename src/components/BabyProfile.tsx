import { useState, useEffect } from 'react';
import type { BabyConfig, WeightEntry, HeightEntry, HeadCircEntry } from '../types';
import { getCurrentDaysOfLife, getBirthDate, todayIso } from '../utils/dateUtils';

interface Props {
  config: BabyConfig;
  weights: WeightEntry[];
  heights: HeightEntry[];
  headCircs: HeadCircEntry[];
  onOpenGrowth: () => void;
  onOpenCare: () => void;
  onOpenFamily: () => void;
  onOpenReference: () => void;
  onOpenMilestones: () => void;
  onOpenVaccines: () => void;
  onOpenPediatraSummary: () => void;
  onOpenExport: () => void;
  readOnly?: boolean;
  onUpdateConfig: (partial: Partial<Omit<BabyConfig, 'id'>>) => Promise<void>;
}

export default function BabyProfile({
  config, weights, heights, headCircs,
  onOpenGrowth, onOpenCare, onOpenFamily, onOpenReference,
  onOpenMilestones, onOpenVaccines, onOpenPediatraSummary, onOpenExport,
  onUpdateConfig, readOnly,
}: Props) {
  const daysOfLife = getCurrentDaysOfLife(config);
  const latestWeight = ultimo(weights)?.weightKg;
  const latestHeight = ultimo(heights)?.heightCm;
  const latestHeadCirc = ultimo(headCircs)?.headCm;
  const [nameInput, setNameInput] = useState(config.name ?? '');

  // Al cambiar de bebé activo, refrescar el campo de nombre
  useEffect(() => { setNameInput(config.name ?? ''); }, [config.id, config.name]);

  function handleNameSave() {
    const trimmed = nameInput.trim();
    if (trimmed !== (config.name ?? '')) {
      onUpdateConfig({ name: trimmed || undefined });
    }
  }

  // Subtítulo de «Crecimiento»: las últimas medidas de un vistazo
  const medidas = [
    latestWeight != null ? `${latestWeight} kg` : null,
    latestHeight != null ? `${latestHeight} cm` : null,
    latestHeadCirc != null ? `${latestHeadCirc} cm de perímetro` : null,
  ].filter(Boolean) as string[];

  // Subtítulo de «Cuidados»: qué hay activo ahora mismo
  const cuidadosActivos = [
    config.vitaminDEnabled && 'vitamina D3',
    config.probioticEnabled && 'probiótico',
    config.frenectomyEnabled && 'masajes',
  ].filter(Boolean) as string[];

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{config.name ?? 'Mi bebé'}</h1>

      {/* Ficha — edad, últimas medidas y datos de identidad */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            {daysOfLife < 30 ? (
              <>
                <p className="text-4xl font-bold text-gray-900">{daysOfLife}</p>
                <p className="text-sm text-gray-500">días de vida</p>
              </>
            ) : (() => {
              const months = Math.floor(daysOfLife / 30);
              const weeks = Math.floor((daysOfLife - months * 30) / 7);
              const mLabel = months === 1 ? 'mes' : 'meses';
              const wLabel = weeks === 1 ? 'semana' : 'semanas';
              return (
                <>
                  <p className="text-xl font-bold text-gray-900 leading-snug">
                    {months} {mLabel}{weeks > 0 ? ` y ${weeks} ${wLabel}` : ''}
                  </p>
                  <p className="text-sm text-gray-500">{daysOfLife} días de vida</p>
                </>
              );
            })()}
          </div>
          {(latestWeight != null || latestHeight != null) && (
            <div className="text-right">
              {latestWeight != null && (
                <>
                  <p className="text-4xl font-bold text-sage-600">{latestWeight} <span className="text-2xl">kg</span></p>
                  <p className="text-sm text-gray-500">último peso</p>
                </>
              )}
              {latestHeight != null && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-bold text-gray-700">{latestHeight} cm</span> de altura
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 shrink-0">Nombre</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            disabled={readOnly}
            placeholder="Escribe el nombre…"
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-right min-w-0 flex-1 max-w-[12rem] focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-700">Fecha de nacimiento</p>
          <input
            type="date"
            value={getBirthDate(config)}
            max={todayIso()}
            onChange={(e) => { if (e.target.value && e.target.value <= todayIso()) onUpdateConfig({ birthDate: e.target.value }); }}
            disabled={readOnly}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-700">Sexo</p>
          <div className="flex gap-1.5">
            <button
              onClick={readOnly ? undefined : () => onUpdateConfig({ sex: 'male' })}
              disabled={readOnly}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                config.sex === 'male' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-100 text-gray-500'
              }`}
            >
              ♂ Niño
            </button>
            <button
              onClick={readOnly ? undefined : () => onUpdateConfig({ sex: 'female' })}
              disabled={readOnly}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                config.sex === 'female' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300' : 'bg-gray-100 text-gray-500'
              }`}
            >
              ♀ Niña
            </button>
          </div>
        </div>
      </div>

      {/* Seguimiento — subpáginas propias */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Seguimiento</h2>
      <Grupo>
        <Fila
          emoji="📈"
          titulo="Crecimiento"
          subtitulo={medidas.length > 0 ? medidas.join(' · ') : 'Peso, altura y perímetro craneal'}
          onClick={onOpenGrowth}
        />
        <Fila
          emoji="💊"
          titulo="Cuidados"
          subtitulo={cuidadosActivos.length > 0
            ? `Activos: ${cuidadosActivos.join(' · ')}`
            : 'Vitamina D3, probiótico, frenectomía y sueño'}
          onClick={onOpenCare}
        />
      </Grupo>

      {/* Salud */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Salud</h2>
      <Grupo>
        <Fila emoji="🌟" titulo="Hitos del desarrollo" subtitulo="Habilidades motoras, sociales y cognitivas" onClick={onOpenMilestones} />
        <Fila emoji="💉" titulo="Vacunas" subtitulo="Calendario vacunal AEP" onClick={onOpenVaccines} />
        <Fila emoji="📊" titulo="Valores de referencia" subtitulo="Tomas, leche y sueño orientativos para su edad" onClick={onOpenReference} />
      </Grupo>

      {/* Informes */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Informes</h2>
      <Grupo>
        <Fila emoji="📄" titulo="Resumen para el pediatra" subtitulo="Últimos 14 días, listo para imprimir" onClick={onOpenPediatraSummary} />
        <Fila emoji="📤" titulo="Exportar registros" subtitulo="El día a día entre dos fechas, para compartir o analizar" onClick={onOpenExport} />
      </Grupo>

      {/* Familia — en escritorio ya es una pestaña aparte */}
      <div className="lg:hidden mt-6">
        <Grupo>
          <Fila emoji="👨‍👩‍👧" titulo="Mi familia" subtitulo="Miembros, invitaciones y bebés de la cuenta" onClick={onOpenFamily} />
        </Grupo>
      </div>
    </div>
  );
}

function Grupo({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
      {children}
    </div>
  );
}

function Fila({ emoji, titulo, subtitulo, onClick }: {
  emoji: string;
  titulo: string;
  subtitulo?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 touch-manipulation text-left"
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900">{titulo}</span>
        {subtitulo && <span className="block text-xs text-gray-500 truncate">{subtitulo}</span>}
      </span>
      <span className="text-gray-300 shrink-0">›</span>
    </button>
  );
}

/** Última entrada por fecha (las listas no vienen ordenadas). */
function ultimo<T extends { date: string }>(entradas: T[]): T | undefined {
  return [...entradas].sort((a, b) => b.date.localeCompare(a.date))[0];
}
