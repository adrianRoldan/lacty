import { useState, useEffect } from 'react';
import type { BabyConfig } from '../types';
import { getCurrentDaysOfLife } from '../utils/dateUtils';
import * as api from '../api';

interface Props {
  babies: BabyConfig[];
  activeId: string;
  currentUser: string | null;
  onSwitchBaby: (id: string) => void;
  onCreateBaby: (data: Omit<BabyConfig, 'id'>) => Promise<void>;
  onDeleteBaby: (id: string) => void;
  onLogout: () => void;
}

export default function FamilyView({
  babies, activeId, currentUser, onSwitchBaby, onCreateBaby, onDeleteBaby, onLogout,
}: Props) {
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
                  <p className="text-xs text-gray-500">Día {getCurrentDaysOfLife(b)} de vida</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isActive && <span className="text-xs font-medium text-sage-700 bg-sage-100 px-2 py-0.5 rounded-full">Activo</span>}
                {babies.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Eliminar a ${b.name ?? 'este bebé'} y TODO su historial? No se puede deshacer.`)) {
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
      <button
        onClick={() => setCreating(true)}
        className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sage-600 font-semibold text-sm active:bg-gray-50 touch-manipulation mb-6"
      >
        + Añadir bebé
      </button>

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
    if (!window.confirm(`¿Quitar a ${username} de la familia?`)) return;
    try { await api.removeMember(userId); reload(); } catch (e: any) { alert(e.message); }
  }

  async function leave() {
    if (!window.confirm('¿Abandonar esta familia? Dejarás de ver sus datos.')) return;
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
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-sage-100 text-sage-700 text-xs font-bold shrink-0">
                  {m.username.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-gray-700 truncate">{m.username}</span>
                {m.isAdmin && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">admin</span>}
                {m.isMe && <span className="text-xs text-gray-400">(tú)</span>}
              </div>
              {info.isAdmin && !m.isMe && (
                <button
                  onClick={() => expel(m.id, m.username)}
                  className="text-xs text-gray-300 hover:text-red-500 touch-manipulation px-2 py-1"
                >
                  Quitar
                </button>
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
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onCreate({
        name: name.trim() || undefined,
        birthDate,
        daysOfLifeAtSetup: 1,
        setupDate: today,
      });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end lg:items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-cream-50 w-full lg:max-w-sm rounded-t-3xl lg:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
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
            <label className="text-xs font-medium text-gray-500 block mb-1">Fecha de nacimiento</label>
            <input
              type="date" value={birthDate} max={today}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
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
