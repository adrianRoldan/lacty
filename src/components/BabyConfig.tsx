import { useState } from 'react';
import type { BabyConfig } from '../types';

interface Props {
  onSave: (config: Omit<BabyConfig, 'id'>) => void;
  existing?: BabyConfig | null;
}

export default function BabyConfigScreen({ onSave, existing }: Props) {
  const [days, setDays] = useState(existing?.daysOfLifeAtSetup ?? 1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ daysOfLifeAtSetup: days, setupDate: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👶</div>
          <h1 className="text-2xl font-bold text-gray-900">Lacty</h1>
          <p className="text-gray-500 text-sm mt-2">Registro de tomas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Días de vida */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cuántos días de vida tiene el bebé hoy?
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-full border border-gray-300 rounded-xl px-4 py-4 text-3xl font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-400 mt-2 text-center">
              A partir de mañana, la app lo calculará automáticamente.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-blue-700 touch-manipulation"
          >
            {existing ? 'Guardar cambios' : 'Empezar'}
          </button>
        </form>
      </div>
    </div>
  );
}
