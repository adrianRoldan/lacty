import { useState } from 'react';
import type { BabyConfig } from '../types';
import { getCurrentDaysOfLife, formatBabyAge } from '../utils/dateUtils';
import { isPushSupported } from '../utils/pushNotifications';
import { enablePush } from '../utils/enablePush';

interface Props {
  baby: BabyConfig | null;
  onStart: () => void;
}

/**
 * Bienvenida para quien entra con un código de invitación.
 *
 * Estas personas no pasan por el alta —el bebé ya está configurado— y hasta
 * ahora aterrizaban directamente en una pantalla de registros sin ninguna
 * explicación.
 */
export default function WelcomeScreen({ baby, onStart }: Props) {
  const [avisos, setAvisos] = useState<'pendiente' | 'activados'>('pendiente');
  const [error, setError] = useState('');

  const nombre = baby?.name?.trim();
  const edad = baby ? formatBabyAge(getCurrentDaysOfLife(baby)) : null;

  async function activarAvisos() {
    setError('');
    const r = await enablePush();
    if (r === 'ok') setAvisos('activados');
    else if (r === 'denegado') setError('Los avisos están bloqueados en el navegador. Puedes activarlos luego en Ajustes.');
    else setError('No se han podido activar los avisos. Puedes hacerlo luego en Ajustes.');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 bg-cream-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-2xl font-bold text-gray-900">¡Ya estás dentro!</h1>
          <p className="text-sm text-taupe-700 mt-2 leading-relaxed">
            {nombre
              ? <>Te has unido al seguimiento de <strong className="text-gray-900">{nombre}</strong>.</>
              : <>Te has unido al seguimiento del bebé de la familia.</>}
          </p>
          {edad && <p className="text-xs text-gray-400 mt-1">{edad}</p>}
        </div>

        <div className="space-y-3 mb-6">
          <Punto emoji="📝">
            Apunta tomas, sueños, pañales y paseos desde los botones de la pantalla <strong>Hoy</strong>.
          </Punto>
          <Punto emoji="🔄">
            Todo se sincroniza al instante: lo que apuntes lo ve el resto de la familia, y al revés.
          </Punto>
          <Punto emoji="📊">
            En <strong>Historial</strong> y <strong>Gráficas</strong> tienes lo registrado hasta ahora,
            incluido lo de antes de que te unieras.
          </Punto>
        </div>

        {isPushSupported() && (
          <div className="mb-4">
            {avisos === 'activados' ? (
              <p className="text-sm text-center text-sage-700 bg-sage-50 border border-sage-200 rounded-xl py-3">
                ✅ Avisos activados
              </p>
            ) : (
              <button
                type="button"
                onClick={activarAvisos}
                className="w-full bg-white border-2 border-sage-200 text-sage-700 font-semibold py-3 rounded-xl active:bg-sage-50 touch-manipulation"
              >
                🔔 Activar avisos en este dispositivo
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center mb-4">{error}</p>}

        <button
          type="button"
          onClick={onStart}
          className="w-full bg-sage-600 text-white font-semibold py-4 rounded-xl text-lg active:bg-sage-700 touch-manipulation"
        >
          Empezar
        </button>
      </div>
    </div>
  );
}

function Punto({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg shrink-0" aria-hidden="true">{emoji}</span>
      <p className="text-sm text-taupe-700 leading-relaxed">{children}</p>
    </div>
  );
}
