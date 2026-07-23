import { useState, useEffect } from 'react';
import * as api from '../api';

interface Props {
  onBack: () => void;
  onUpdateUsername: (username: string) => void;
}

export default function MyDataView({ onBack, onUpdateUsername }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.checkAuth().then((auth) => {
      setUsername(auth?.username ?? '');
      setEmail(auth?.email ?? '');
      setLoaded(true);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
      if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const result = await api.updateProfile(username.trim(), email.trim(), newPassword || undefined);
      onUpdateUsername(result.username);
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sage-600 text-lg p-1 touch-manipulation">
          ← Atrás
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Mis datos</h1>
      </div>

      {!loaded ? (
        <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Usuario</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none" autoCorrect="off" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none" autoCorrect="off" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Nueva contraseña <span className="text-gray-300">(opcional)</span>
            </label>
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password" placeholder="Déjalo en blanco para no cambiarla"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          {newPassword && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Confirmar contraseña</label>
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit" disabled={saving}
              className="text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 px-4 py-2 rounded-xl touch-manipulation"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {saved && <span className="text-xs text-sage-600 font-medium">Guardado ✓</span>}
          </div>
        </form>
      )}
    </div>
  );
}
