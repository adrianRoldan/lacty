import { useState, useEffect } from 'react';
import type { BabyConfig } from '../types';
import { getCurrentDaysOfLife, formatBabyAge } from '../utils/dateUtils';
import { useConfirm } from './ConfirmDialog';
import * as api from '../api';

interface Props {
  babies: BabyConfig[];
  activeId: string;
  currentUser: string | null;
  readOnly?: boolean;
  onSwitchBaby: (id: string) => void;
  onCreateBaby: (data: Omit<BabyConfig, 'id'>) => Promise<void>;
  onDeleteBaby: (id: string) => void;
  onLogout: () => void;
}

export default function FamilyView({
  babies, activeId, currentUser, readOnly, onSwitchBaby, onCreateBaby, onDeleteBaby, onLogout,
}: Props) {
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Familia</h1>
      <p className="text-sm text-gray-500 mb-4">Gestiona los bebés y la cuenta</p>

      {/* Bebés */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bebés</h2>
      <div className="space-y-2 mb-2">
        {babies.map((b) => {
          const isActive = b.id === activeId;
          return (
            <div
              key={b.id}
              onClick={() => onSwitchBaby(b.id)}
              className={`rounded-2xl p-4 flex items-center justify-between cursor-pointer select-none touch-manipulation ${
                isActive ? 'bg-sage-50 border-2 border-sage-300' : 'bg-white shadow-sm active:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">👶</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.name ?? 'Sin nombre'}</p>
                  <p className="text-xs text-gray-500">{formatBabyAge(getCurrentDaysOfLife(b))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isActive && <span className="text-xs font-medium text-sage-700 bg-sage-100 px-2 py-0.5 rounded-full">Activo</span>}
                {babies.length > 1 && !readOnly && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (await confirm(`¿Eliminar a ${b.name ?? 'este bebé'} y TODO su historial? No se puede deshacer.`)) {
                        onDeleteBaby(b.id);
                      }
                    }}
                    className="text-gray-300 hover:text-red-400 p-1.5 touch-manipulation"
                    aria-label="Eliminar bebé"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!readOnly && <button
        onClick={() => setCreating(true)}
        className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sage-600 font-semibold text-sm active:bg-gray-50 touch-manipulation mb-6"
      >
        + Añadir bebé
      </button>}

      {/* Cuenta */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mi cuenta</h2>
      <AccountSection />

      {/* Sesión */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-sage-100 text-sage-700 text-sm font-bold shrink-0">
            {(currentUser ?? '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{currentUser}</p>
            <p className="text-xs text-gray-500">Sesión iniciada</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-red-500 font-medium px-3 py-2 rounded-lg active:bg-red-50 touch-manipulation"
        >
          Salir
        </button>
      </div>

      {creating && (
        <NewBabyModal
          onCreate={async (data) => { await onCreateBaby(data); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function AccountSection() {
  const confirm = useConfirm();
  const [info, setInfo] = useState<api.AccountInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [famName, setFamName] = useState('');

  function reload() {
    api.getAccount().then((a) => { setInfo(a); setFamName(a.name ?? ''); }).catch(() => {});
  }
  useEffect(reload, []);

  function copyCode() {
    if (!info?.inviteCode) return;
    navigator.clipboard?.writeText(info.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function saveFamName() {
    if ((info?.name ?? '') !== famName.trim()) {
      api.updateAccountName(famName.trim()).then(reload);
    }
  }

  async function expel(userId: string, username: string) {
    if (!await confirm(`¿Quitar a ${username} de la familia?`)) return;
    try { await api.removeMember(userId); reload(); } catch (e: any) { alert(e.message); }
  }

  async function toggleFamilyRole(userId: string, current: string) {
    const newRole = current === 'viewer' ? 'editor' : 'viewer';
    try { await api.setMemberFamilyRole(userId, newRole); reload(); } catch (e: any) { alert(e.message); }
  }

  async function leave() {
    if (!await confirm('¿Abandonar esta familia? Dejarás de ver sus datos.')) return;
    try { await api.leaveAccount(); window.location.reload(); } catch (e: any) { alert(e.message); }
  }

  if (!info) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      {/* Nombre de la familia */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Nombre de la familia</label>
        <input
          type="text"
          value={famName}
          onChange={(e) => setFamName(e.target.value)}
          onBlur={saveFamName}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Ej. Familia Roldán"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-sage-400"
        />
      </div>

      {/* Miembros */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-900 mb-2">Miembros ({info.members.length})</p>
        <div className="space-y-1.5">
          {info.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-sage-100 text-sage-700 text-xs font-bold shrink-0">
                  {m.username.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-700 truncate">{m.username}</span>
                    {m.isMe && <span className="text-xs text-gray-400">(tú)</span>}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    m.familyRole === 'owner' ? 'bg-amber-50 text-amber-600'
                    : m.familyRole === 'viewer' ? 'bg-gray-100 text-gray-500'
                    : 'bg-sage-50 text-sage-600'
                  }`}>
                    {m.familyRole === 'owner' ? 'propietario' : m.familyRole === 'viewer' ? 'solo lectura' : 'editor'}
                  </span>
                </div>
              </div>
              {info.isAdmin && !m.isMe && m.familyRole !== 'owner' && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => toggleFamilyRole(m.id, m.familyRole)}
                    className={`text-xs px-2 py-1 rounded-lg touch-manipulation ${
                      m.familyRole === 'viewer'
                        ? 'text-sage-600 bg-sage-50 active:bg-sage-100'
                        : 'text-gray-500 bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    {m.familyRole === 'viewer' ? 'Dar edición' : 'Solo lectura'}
                  </button>
                  <button
                    onClick={() => expel(m.id, m.username)}
                    className="text-xs text-gray-300 hover:text-red-500 touch-manipulation px-1.5 py-1"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invitación */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-900">Invitar a la familia</p>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">
          Comparte este código para que tu pareja u otro cuidador se una a esta cuenta y vea los mismos datos.
        </p>
        <button
          onClick={copyCode}
          className="w-full flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 touch-manipulation active:bg-sage-100"
        >
          <span className="text-xl font-bold tracking-[0.3em] font-mono text-sage-800">{info.inviteCode}</span>
          <span className="text-xs text-sage-600 font-medium">{copied ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>

      {/* Abandonar familia (solo si hay más de un miembro) */}
      {info.members.length > 1 && (
        <div className="pt-3 border-t border-gray-100">
          <button onClick={leave} className="text-sm text-red-500 font-medium touch-manipulation">
            Abandonar esta familia
          </button>
        </div>
      )}
    </div>
  );
}

function NewBabyModal({ onCreate, onCancel }: {
  onCreate: (data: Omit<BabyConfig, 'id'>) => Promise<void>;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(today);
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!birthDate) { setError('La fecha de nacimiento es obligatoria.'); return; }
    if (!sex) { setError('Indica el sexo del bebé.'); return; }
    setError('');
    setSaving(true);
    try {
      const birthD = new Date(birthDate + 'T12:00:00');
      const todayD = new Date(today + 'T12:00:00');
      const daysOfLife = Math.max(1, Math.round((todayD.getTime() - birthD.getTime()) / 86400000) + 1);
      await onCreate({
        name: name.trim() || undefined,
        birthDate,
        sex: sex as 'male' | 'female',
        daysOfLifeAtSetup: daysOfLife,
        setupDate: today,
      });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 sm:p-6" onClick={onCancel}>
      <div className="bg-cream-50 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Nuevo bebé</h2>
          <button onClick={onCancel} className="text-gray-400 text-xl touch-manipulation">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Nombre <span className="text-gray-300">(opcional)</span></label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="Nombre del bebé"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Fecha de nacimiento <span className="text-red-400">*</span></label>
            <input
              type="date" value={birthDate} max={today}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Sexo <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSex('male')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  sex === 'male' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-100 text-gray-500'
                }`}
              >
                ♂ Niño
              </button>
              <button
                type="button"
                onClick={() => setSex('female')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold touch-manipulation transition-colors ${
                  sex === 'female' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300' : 'bg-gray-100 text-gray-500'
                }`}
              >
                ♀ Niña
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={save} disabled={saving}
            className="w-full bg-sage-600 text-white font-semibold py-3 rounded-xl active:bg-sage-700 disabled:opacity-50 touch-manipulation"
          >
            {saving ? 'Creando…' : 'Crear bebé'}
          </button>
        </div>
      </div>
    </div>
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
