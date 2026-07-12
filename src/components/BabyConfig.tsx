import { useState } from 'react';
import type { BabyConfig } from '../types';
import { getBirthDate } from '../utils/dateUtils';

interface Props {
  onSave: (config: Omit<BabyConfig, 'id'>) => void | Promise<void>;
  onLogout?: () => void;
  username?: string | null;
  existing?: BabyConfig | null;
  initialWeight?: number;
  onSaveWeight?: (kg: number) => void | Promise<void>;
}

export default function BabyConfigScreen({ onSave, onLogout, username, existing, initialWeight, onSaveWeight }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(existing?.name ?? '');
  const [birthDate, setBirthDate] = useState(existing ? getBirthDate(existing) : today);
  const [sex, setSex] = useState<'male' | 'female' | ''>(existing?.sex ?? '');
  const [weightKg, setWeightKg] = useState<number | ''>(initialWeight ?? '');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!birthDate) { setError('La fecha de nacimiento es obligatoria.'); return; }
    if (!sex) { setError('Indica el sexo del bebé.'); return; }
    if (weightKg === '' || weightKg <= 0) { setError('Introduce el peso del bebé.'); return; }
    setError('');

    const birthD = new Date(birthDate + 'T12:00:00');
    const todayD = new Date(today + 'T12:00:00');
    const daysOfLife = Math.max(1, Math.round((todayD.getTime() - birthD.getTime()) / 86400000) + 1);

    await onSave({
      name: name.trim() || undefined,
      birthDate,
      sex: sex as 'male' | 'female',
      daysOfLifeAtSetup: existing?.daysOfLifeAtSetup ?? daysOfLife,
      setupDate: existing?.setupDate ?? today,
    });

    if (weightKg && weightKg > 0 && onSaveWeight) {
      await onSaveWeight(Number(weightKg));
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 bg-cream-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👶</div>
          <h1 className="text-2xl font-bold text-gray-900">Lacty</h1>
          <p className="text-gray-500 text-sm mt-2">
            {existing ? 'Completa los datos del bebé para poder usar la app' : 'Datos del bebé para empezar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nombre <span className="text-gray-300">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del bebé"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fecha de nacimiento <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={birthDate}
              max={today}
              onChange={(e) => { if (e.target.value <= today) setBirthDate(e.target.value); }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
              required
            />
          </div>

          {/* Sexo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Sexo <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSex('male')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  sex === 'male' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-100 text-gray-500'
                }`}
              >
                ♂ Niño
              </button>
              <button
                type="button"
                onClick={() => setSex('female')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  sex === 'female' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300' : 'bg-gray-100 text-gray-500'
                }`}
              >
                ♀ Niña
              </button>
            </div>
          </div>

          {/* Peso al nacer */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Peso <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.5}
                max={7}
                step={0.01}
                value={weightKg}
                placeholder="Ej: 3.25"
                onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 placeholder:text-gray-300"
              />
              <span className="text-sm font-medium text-gray-500 shrink-0">kg</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Peso de nacimiento o peso actual. Se usa para calcular la referencia de ml/día.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation"
          >
            {existing ? 'Guardar cambios' : 'Empezar'}
          </button>
        </form>
      </div>
      {username && (
        <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400">
          <span>Sesión: <span className="font-medium text-gray-500">{username}</span></span>
          {onLogout && (
            <>
              <span>·</span>
              <button onClick={onLogout} className="text-red-400 font-medium touch-manipulation">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
