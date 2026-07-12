import { useState, useEffect, useMemo } from 'react';
import type { AdminUserInfo } from '../api';
import * as api from '../api';
import { useConfirm } from './ConfirmDialog';

export default function AdminView() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [sortBy, setSortBy] = useState<'lastLogin' | 'created' | 'username'>('lastLogin');

  useEffect(() => {
    api.getAdminUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  async function toggleRole(user: AdminUserInfo) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await api.setUserRole(user.id, newRole);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
  }

  async function handleDelete(user: AdminUserInfo) {
    const otherMembers = users.filter(u => u.accountId === user.accountId && u.id !== user.id);
    const msg = otherMembers.length === 0
      ? `¿Eliminar a "${user.username}"? Se borrarán también todos los datos de su familia (bebés, tomas, etc.)`
      : `¿Eliminar a "${user.username}"? Los datos de la familia se mantienen para los otros miembros.`;
    if (!await confirm(msg)) return;
    try {
      await api.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.username.toLowerCase().includes(q)
        || u.babies.some(b => b.name.toLowerCase().includes(q))
        || (u.inviteCode ?? '').toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'username': arr.sort((a, b) => a.username.localeCompare(b.username)); break;
      case 'created': arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case 'lastLogin': arr.sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? '')); break;
    }
    return arr;
  }, [filtered, sortBy]);

  const accounts = new Map<string, AdminUserInfo[]>();
  for (const u of sorted) {
    const list = accounts.get(u.accountId) ?? [];
    list.push(u);
    accounts.set(u.accountId, list);
  }

  const totalBabies = new Set(users.flatMap(u => u.babies.map(b => b.id))).size;
  const totalFamilies = new Set(users.map(u => u.accountId)).size;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Usuarios</h1>

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="Usuarios" value={String(users.length)} />
            <StatCard label="Familias" value={String(totalFamilies)} />
            <StatCard label="Bebés" value={String(totalBabies)} />
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario, bebé o código…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 placeholder:text-gray-400 mb-3"
          />

          {/* Filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            <div className="flex gap-1.5 shrink-0">
              {(['all', 'admin', 'user'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold touch-manipulation transition-colors ${
                    roleFilter === r ? 'bg-sage-600 text-white' : 'bg-white text-gray-500 shadow-sm'
                  }`}
                >
                  {r === 'all' ? 'Todos' : r === 'admin' ? '🛡️ Admins' : '👤 Usuarios'}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none shrink-0"
            >
              <option value="lastLogin">Último login</option>
              <option value="created">Registro</option>
              <option value="username">Nombre</option>
            </select>
          </div>

          {search && (
            <p className="text-xs text-gray-400 mb-2">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</p>
          )}

          {accounts.size === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Sin resultados</p>
          ) : (
            <div className="space-y-4">
              {[...accounts.entries()].map(([accountId, members]) => {
                const babies = members[0]?.babies ?? [];
                const inviteCode = members[0]?.inviteCode;
                const accountName = members[0]?.accountName;
                return (
                  <div key={accountId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">👨‍👩‍👧</span>
                          <span className="text-xs font-semibold text-gray-700">{accountName ?? 'Familia'}</span>
                          {inviteCode && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono">{inviteCode}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{members.length} {members.length === 1 ? 'usuario' : 'usuarios'}</span>
                      </div>
                      {babies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {babies.map((b) => (
                            <span key={b.id} className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                              👶 {b.name}{b.birthDate ? ` · ${b.birthDate}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {members.map((u) => (
                        <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{u.username}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>{u.role}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                              <span>Registro: {formatDt(u.createdAt)}</span>
                              <span>{u.lastLoginAt ? `Último login: ${formatDt(u.lastLoginAt)}` : 'Nunca ha entrado'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => toggleRole(u)}
                              className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-lg active:bg-gray-200 touch-manipulation"
                            >
                              {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              className="text-xs text-red-500 bg-red-50 px-2 py-1.5 rounded-lg active:bg-red-100 touch-manipulation"
                              title="Eliminar usuario"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
