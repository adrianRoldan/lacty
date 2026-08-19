import { useState } from 'react';
import * as api from '../api';

interface Props {
  /** `joined` indica que se ha entrado con un código de invitación. */
  onLogin: (username: string, role: 'admin' | 'user', familyRole: 'administrador' | 'cuidador' | 'invitado', joined?: boolean) => void;
}

type Mode = 'login' | 'signup';

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>(
    window.location.search.includes('registro') ? 'signup' : 'login'
  );
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [babyName, setBabyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinExisting, setJoinExisting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        const user = await api.login(username.trim(), password);
        onLogin(user.username, user.role ?? 'user', user.familyRole ?? 'cuidador');
      } else {
        const user = await api.signup({
          username: username.trim(),
          email: email.trim(),
          password,
          babyName: joinExisting ? undefined : babyName.trim() || undefined,
          inviteCode: joinExisting ? inviteCode.trim() : undefined,
        });
        onLogin(user.username, user.role ?? 'user', user.familyRole ?? 'cuidador', joinExisting);
      }
    } catch (err: any) {
      setError(err.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 bg-cream-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👶</div>
          <h1 className="text-2xl font-bold text-gray-900">Lacty</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' ? 'Registro de tomas del bebé' : 'Crea tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              {mode === 'login' ? 'Usuario o email' : 'Usuario'}
            </label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none" autoCorrect="off" autoComplete="username" required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none" autoCorrect="off" autoComplete="email" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Contraseña</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </div>

          {/* Campos extra solo en registro */}
          {mode === 'signup' && (
            <>
              {/* Toggle: cuenta nueva vs unirse */}
              <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                <button type="button" onClick={() => setJoinExisting(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${!joinExisting ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  Cuenta nueva
                </button>
                <button type="button" onClick={() => setJoinExisting(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${joinExisting ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  Unirme a una familia
                </button>
              </div>

              {joinExisting ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Código de invitación</label>
                  <input
                    type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    autoCapitalize="characters" placeholder="Ej. 4XK9P2" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 tracking-widest font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Pídeselo a quien ya tenga la cuenta (en Mi bebé → Mi cuenta).</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre del bebé <span className="text-gray-300">(opcional)</span></label>
                  <input
                    type="text" value={babyName} onChange={(e) => setBabyName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-sage-600 text-white font-semibold py-3 rounded-xl active:bg-sage-700 touch-manipulation disabled:opacity-60"
          >
            {loading ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-center mt-5">
          {mode === 'login' ? (
            <button onClick={() => switchMode('signup')} className="text-sm text-sage-600 touch-manipulation">
              ¿No tienes cuenta? <span className="font-semibold">Crear una</span>
            </button>
          ) : (
            <button onClick={() => switchMode('login')} className="text-sm text-sage-600 touch-manipulation">
              ¿Ya tienes cuenta? <span className="font-semibold">Inicia sesión</span>
            </button>
          )}
        </div>

        <div className="text-center mt-4 pt-4 border-t border-gray-100">
          <a href="https://lacty.es" className="text-xs text-gray-400 hover:text-sage-600 transition-colors">
            ← Volver a lacty.es
          </a>
        </div>
      </div>
    </div>
  );
}
