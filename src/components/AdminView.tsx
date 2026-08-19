import { useState, useEffect, useMemo } from 'react';
import type { AdminUserInfo, AdminStats, AdminBabyInfo } from '../api';
import * as api from '../api';
import { useConfirm } from './ConfirmDialog';

type SheetPage = 'actions' | 'edit' | 'password' | 'move' | 'familyRole';
type Sheet = { user: AdminUserInfo; page: SheetPage } | null;

export default function AdminView() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [sortBy, setSortBy] = useState<'lastLogin' | 'created' | 'username'>('lastLogin');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetError, setSheetError] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Sheet form fields
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [familyRoleVal, setFamilyRoleVal] = useState('cuidador');

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFamilyType, setNewFamilyType] = useState<'new' | 'existing'>('existing');
  const [newAccountId, setNewAccountId] = useState('');

  useEffect(() => {
    api.getAdminUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const allAccounts = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; inviteCode?: string }>();
    for (const u of users) {
      if (!map.has(u.accountId)) {
        map.set(u.accountId, { id: u.accountId, name: u.accountName ?? undefined, inviteCode: u.inviteCode });
      }
    }
    return [...map.values()];
  }, [users]);

  function openSheet(user: AdminUserInfo, page: SheetPage = 'actions') {
    setSheet({ user, page });
    setSheetError('');
    setSheetLoading(false);
    if (page === 'edit') { setEditUsername(user.username); setEditEmail(user.email ?? ''); }
    if (page === 'password') setEditPassword('');
    if (page === 'move') setTargetAccountId('');
    if (page === 'familyRole') setFamilyRoleVal(user.familyRole);
  }

  function closeSheet() {
    setSheet(null);
    setSheetError('');
  }

  async function sheetAction(fn: () => Promise<void>) {
    setSheetError('');
    setSheetLoading(true);
    try {
      await fn();
    } catch (e: any) {
      setSheetError(e.message);
    } finally {
      setSheetLoading(false);
    }
  }

  async function handleToggleRole(user: AdminUserInfo) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const label = newRole === 'admin' ? 'admin' : 'usuario';
    if (!await confirm(`¿Cambiar a "${user.username}" a rol ${label}?`)) return;
    await sheetAction(async () => {
      await api.setUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      closeSheet();
    });
  }

  async function handleImpersonate(user: AdminUserInfo) {
    if (!await confirm({ message: `¿Iniciar sesión como "${user.username}"? La página se recargará.`, confirmLabel: 'Iniciar sesión', danger: false })) return;
    await sheetAction(async () => {
      await api.impersonateUser(user.id);
      window.location.reload();
    });
  }

  async function handleDelete(user: AdminUserInfo) {
    const others = users.filter(u => u.accountId === user.accountId && u.id !== user.id);
    const msg = others.length === 0
      ? `¿Eliminar a "${user.username}"? Se borrarán también todos los datos de su familia.`
      : `¿Eliminar a "${user.username}"? Los datos de la familia se mantienen para los otros miembros.`;
    if (!await confirm({ message: msg, confirmLabel: 'Eliminar', danger: true })) return;
    await sheetAction(async () => {
      await api.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      closeSheet();
    });
  }

  async function handleEditProfile(user: AdminUserInfo) {
    if (!editUsername.trim() || !editEmail.trim()) return;
    await sheetAction(async () => {
      await api.updateAdminUser(user.id, editUsername.trim(), editEmail.trim());
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, username: editUsername.trim(), email: editEmail.trim() } : u));
      closeSheet();
    });
  }

  async function handleResetPassword(user: AdminUserInfo) {
    if (!editPassword) return;
    await sheetAction(async () => {
      await api.resetAdminPassword(user.id, editPassword);
      closeSheet();
    });
  }

  async function handleFamilyRole(user: AdminUserInfo) {
    await sheetAction(async () => {
      await api.setUserFamilyRole(user.id, familyRoleVal);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, familyRole: familyRoleVal } : u));
      closeSheet();
    });
  }

  async function handleMoveUser(user: AdminUserInfo) {
    if (!targetAccountId) return;
    await sheetAction(async () => {
      await api.moveUserToAccount(user.id, targetAccountId);
      const targetAcc = allAccounts.find(a => a.id === targetAccountId);
      setUsers(prev => prev.map(u => u.id === user.id
        ? { ...u, accountId: targetAccountId, accountName: targetAcc?.name, inviteCode: targetAcc?.inviteCode }
        : u
      ));
      closeSheet();
      // Reload to reflect cleaned-up families
      api.getAdminUsers().then(setUsers);
    });
  }

  async function handleRegenerateCode(accountId: string) {
    if (!await confirm({ message: '¿Regenerar el código de invitación? El código anterior dejará de funcionar.', confirmLabel: 'Regenerar', danger: false })) return;
    try {
      const code = await api.regenerateInviteCode(accountId);
      setUsers(prev => prev.map(u => u.accountId === accountId ? { ...u, inviteCode: code } : u));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim() || !newPassword) return;
    setCreateError('');
    setCreateLoading(true);
    try {
      const result = await api.createAdminUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        accountId: newFamilyType === 'existing' && newAccountId ? newAccountId : undefined,
      });
      // Reload to get complete user data
      const updated = await api.getAdminUsers();
      setUsers(updated);
      setCreating(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewAccountId('');
      setNewFamilyType('existing');
      void result;
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreateLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.username.toLowerCase().includes(q)
        || (u.email ?? '').toLowerCase().includes(q)
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <button
          onClick={() => { setCreating(true); setCreateError(''); }}
          className="flex items-center gap-1.5 bg-sage-600 text-white text-sm font-semibold px-3 py-2 rounded-xl active:bg-sage-700 touch-manipulation"
        >
          <span className="text-base leading-none">＋</span> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="Usuarios" value={String(users.length)} />
            <StatCard label="Familias" value={String(totalFamilies)} />
            <StatCard label="Bebés" value={String(totalBabies)} />
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario, bebé o código…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 placeholder:text-gray-400 mb-3"
          />

          <div className="flex gap-2 mb-4 overflow-x-auto">
            <div className="flex gap-1.5 shrink-0">
              {(['all', 'admin', 'user'] as const).map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold touch-manipulation transition-colors ${roleFilter === r ? 'bg-sage-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
                  {r === 'all' ? 'Todos' : r === 'admin' ? '🛡️ Admins' : '👤 Usuarios'}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none shrink-0">
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
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">👨‍👩‍👧</span>
                          <span className="text-xs font-semibold text-gray-700 truncate">{accountName ?? 'Familia'}</span>
                          {inviteCode && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono shrink-0">{inviteCode}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-gray-400">{members.length} {members.length === 1 ? 'usuario' : 'usuarios'}</span>
                          <button
                            onClick={() => handleRegenerateCode(accountId)}
                            className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg active:bg-gray-200 touch-manipulation"
                            title="Regenerar código de invitación"
                          >
                            🔄
                          </button>
                        </div>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-800">{u.username}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                {u.role}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                u.familyRole === 'administrador' ? 'bg-mustard-100 text-mustard-700' :
                                u.familyRole === 'invitado' ? 'bg-blue-50 text-blue-600' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {u.familyRole}
                              </span>
                            </div>
                            {u.email && <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                              <span>Alta: {formatDt(u.createdAt)}</span>
                              <span>{u.lastLoginAt ? `Login: ${formatDt(u.lastLoginAt)}` : 'Nunca ha entrado'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => openSheet(u, 'actions')}
                            className="text-gray-400 bg-gray-100 w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-200 touch-manipulation shrink-0 ml-2 text-lg"
                          >
                            ⋯
                          </button>
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

      {/* Sheet: user actions */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{sheet.user.username}</p>
                <p className="text-xs text-gray-400">{sheet.user.accountName ?? 'Familia'} · {sheet.user.accountId.slice(0, 8)}</p>
              </div>
              <button onClick={closeSheet} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            <div className="p-4">
              {sheetError && <p className="text-sm text-red-500 mb-3 text-center">{sheetError}</p>}

              {sheet.page === 'actions' && (
                <div className="space-y-2">
                  <ActionBtn icon="✏️" label="Editar usuario y email" onClick={() => openSheet(sheet.user, 'edit')} />
                  <ActionBtn icon="🔑" label="Cambiar contraseña" onClick={() => openSheet(sheet.user, 'password')} />
                  <ActionBtn icon="👨‍👩‍👧" label="Cambiar de familia" onClick={() => openSheet(sheet.user, 'move')} />
                  <ActionBtn icon="🎭" label="Rol familiar" sub={sheet.user.familyRole} onClick={() => openSheet(sheet.user, 'familyRole')} />
                  <ActionBtn
                    icon="🛡️"
                    label={sheet.user.role === 'admin' ? 'Quitar rol admin' : 'Hacer admin del sistema'}
                    onClick={() => handleToggleRole(sheet.user)}
                    loading={sheetLoading}
                  />
                  <ActionBtn
                    icon="👁️"
                    label="Iniciar sesión como este usuario"
                    onClick={() => handleImpersonate(sheet.user)}
                    loading={sheetLoading}
                  />
                  <div className="pt-2 border-t border-gray-100">
                    <ActionBtn icon="🗑️" label="Eliminar usuario" danger onClick={() => handleDelete(sheet.user)} loading={sheetLoading} />
                  </div>
                </div>
              )}

              {sheet.page === 'edit' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Nombre de usuario</p>
                  <input
                    type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                    autoCapitalize="none" autoCorrect="off"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 mb-3"
                  />
                  <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
                  <input
                    type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    autoCapitalize="none" autoCorrect="off"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 mb-4"
                  />
                  <div className="flex gap-2">
                    <button onClick={closeSheet} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                      Cancelar
                    </button>
                    <button onClick={() => handleEditProfile(sheet.user)} disabled={sheetLoading || !editUsername.trim() || !editEmail.trim()}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 touch-manipulation">
                      {sheetLoading ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {sheet.page === 'password' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Nueva contraseña</p>
                  <input
                    type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                    autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 mb-4"
                  />
                  <div className="flex gap-2">
                    <button onClick={closeSheet} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                      Cancelar
                    </button>
                    <button onClick={() => handleResetPassword(sheet.user)} disabled={sheetLoading || editPassword.length < 6}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 touch-manipulation">
                      {sheetLoading ? 'Guardando…' : 'Cambiar contraseña'}
                    </button>
                  </div>
                </div>
              )}

              {sheet.page === 'familyRole' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Rol en la familia</p>
                  <div className="space-y-2 mb-4">
                    {(['administrador', 'cuidador', 'invitado'] as const).map(r => (
                      <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${familyRoleVal === r ? 'border-sage-500 bg-sage-50' : 'border-gray-200'}`}>
                        <input type="radio" name="familyRole" value={r} checked={familyRoleVal === r} onChange={() => setFamilyRoleVal(r)} className="accent-sage-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r === 'administrador' ? 'Administrador' : r === 'cuidador' ? 'Cuidador' : 'Invitado'}</p>
                          <p className="text-xs text-gray-400">{r === 'administrador' ? 'Acceso total, puede gestionar la familia' : r === 'cuidador' ? 'Puede añadir y editar registros' : 'Solo lectura'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={closeSheet} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                      Cancelar
                    </button>
                    <button onClick={() => handleFamilyRole(sheet.user)} disabled={sheetLoading}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 touch-manipulation">
                      {sheetLoading ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {sheet.page === 'move' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Mover a otra familia</p>
                  <p className="text-xs text-gray-400 mb-3">Si es el último miembro de su familia actual, esa familia se eliminará junto con todos sus datos.</p>
                  <select value={targetAccountId} onChange={e => setTargetAccountId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 mb-4">
                    <option value="">Selecciona una familia…</option>
                    {allAccounts.filter(a => a.id !== sheet.user.accountId).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name ?? 'Familia sin nombre'} {a.inviteCode ? `(${a.inviteCode})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={closeSheet} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                      Cancelar
                    </button>
                    <button onClick={() => handleMoveUser(sheet.user)} disabled={sheetLoading || !targetAccountId}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 touch-manipulation">
                      {sheetLoading ? 'Moviendo…' : 'Mover'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: crear usuario */}
      {creating && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreating(false)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-900">Nuevo usuario</p>
              <button onClick={() => setCreating(false)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Usuario</label>
                <input
                  type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  autoCapitalize="none" autoCorrect="off" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input
                  type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  autoCapitalize="none" autoCorrect="off" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Contraseña</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password" placeholder="Mínimo 6 caracteres" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Familia</label>
                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5 mb-3">
                  <button type="button" onClick={() => setNewFamilyType('existing')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${newFamilyType === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    Familia existente
                  </button>
                  <button type="button" onClick={() => setNewFamilyType('new')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${newFamilyType === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                    Nueva familia
                  </button>
                </div>
                {newFamilyType === 'existing' && (
                  <select value={newAccountId} onChange={e => setNewAccountId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500">
                    <option value="">Selecciona una familia…</option>
                    {allAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name ?? 'Familia sin nombre'} {a.inviteCode ? `(${a.inviteCode})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {newFamilyType === 'new' && (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">Se creará una nueva familia con un bebé vacío. El usuario podrá configurar los datos desde la app.</p>
                )}
              </div>

              {createError && <p className="text-sm text-red-500 text-center">{createError}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCreating(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                  Cancelar
                </button>
                <button type="submit" disabled={createLoading || !newUsername.trim() || !newEmail.trim() || newPassword.length < 6}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 touch-manipulation">
                  {createLoading ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
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

function ActionBtn({ icon, label, sub, onClick, danger, loading }: {
  icon: string; label: string; sub?: string; onClick: () => void; danger?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left active:opacity-70 touch-manipulation transition-opacity ${danger ? 'bg-red-50 active:bg-red-100' : 'bg-gray-50 active:bg-gray-100'}`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <span className={`text-sm font-medium flex-1 ${danger ? 'text-red-600' : 'text-gray-800'}`}>{label}</span>
      {sub && <span className="text-xs text-gray-400 shrink-0">{sub}</span>}
      {!danger && <span className="text-gray-300 shrink-0">›</span>}
    </button>
  );
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function ActivityDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>;
  if (!stats) return <p className="text-center text-red-400 py-12 text-sm">Error al cargar estadísticas</p>;

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Usuarios activos</h2>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="Hoy" value={stats.activeToday} total={stats.totalUsers} color="sage" />
          <MetricCard label="7 días" value={stats.active7d} total={stats.totalUsers} color="lagoon" />
          <MetricCard label="30 días" value={stats.active30d} total={stats.totalUsers} color="mustard" />
        </div>
        {stats.newUsers7d > 0 && (
          <p className="text-xs text-sage-700 bg-sage-50 rounded-xl px-3 py-2 mt-2">
            🆕 {stats.newUsers7d} nuevo{stats.newUsers7d !== 1 ? 's' : ''} usuario{stats.newUsers7d !== 1 ? 's' : ''} esta semana
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tomas registradas</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.feedingsToday}</p>
            <p className="text-xs text-gray-500 mt-0.5">Hoy</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.feedings7d}</p>
            <p className="text-xs text-gray-500 mt-0.5">Últimos 7 días</p>
          </div>
        </div>
      </section>

      {stats.inactiveFamiliesCount > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Alertas</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {stats.inactiveFamiliesCount} {stats.inactiveFamiliesCount === 1 ? 'familia' : 'familias'} sin actividad en 30 días
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Sin login de ningún miembro en el último mes</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Últimos accesos</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {stats.recentLogins.map((l, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-gray-800">{l.username}</span>
              <span className="text-xs text-gray-400">{formatDt(l.last_login_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PushBroadcastView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subs, setSubs] = useState<api.PushSubscriptionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushAccountId, setPushAccountId] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; failed: number } | null>(null);
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    Promise.all([api.getAdminStats(), api.getPushSubscriptions()])
      .then(([s, sub]) => { setStats(s); setSubs(sub); })
      .finally(() => setLoading(false));
  }, []);

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    setPushResult(null);
    setPushError('');
    try {
      const result = await api.sendPushBroadcast({
        title: pushTitle.trim(),
        body: pushBody.trim(),
        accountId: pushAccountId || undefined,
      });
      setPushResult(result);
      setPushTitle('');
      setPushBody('');
      setPushAccountId('');
    } catch (e: any) {
      setPushError(e.message);
    } finally {
      setPushSending(false);
    }
  }

  async function handleDeleteSub(id: string) {
    try {
      await api.adminDeletePushSubscription(id);
      setSubs(prev => prev.filter(s => s.id !== id));
      setStats(prev => prev ? { ...prev, totalSubscribers: prev.totalSubscribers - 1 } : prev);
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>;

  const totalSubscribers = stats?.totalSubscribers ?? subs.length;
  const families = stats?.families ?? [];

  // Agrupar suscripciones por familia
  const subsByAccount = new Map<string, api.PushSubscriptionInfo[]>();
  for (const s of subs) {
    const list = subsByAccount.get(s.accountId) ?? [];
    list.push(s);
    subsByAccount.set(s.accountId, list);
  }

  return (
    <div className="space-y-5">
      {/* Enviar notificación */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Enviar notificación</h2>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-3">
            📲 {totalSubscribers} {totalSubscribers === 1 ? 'dispositivo suscrito' : 'dispositivos suscritos'} en total
          </p>
          <form onSubmit={handleBroadcast} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Destinatario</label>
              <select
                value={pushAccountId}
                onChange={e => setPushAccountId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="">Todos los usuarios ({totalSubscribers} dispositivos)</option>
                {families.filter(f => f.subscriberCount > 0).map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name ?? 'Familia sin nombre'} {f.inviteCode ? `(${f.inviteCode})` : ''} — {f.subscriberCount} {f.subscriberCount === 1 ? 'dispositivo' : 'dispositivos'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
              <input
                type="text" value={pushTitle} onChange={e => setPushTitle(e.target.value)}
                placeholder="Ej. Nueva funcionalidad disponible" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje</label>
              <textarea
                value={pushBody} onChange={e => setPushBody(e.target.value)}
                placeholder="Ej. Ahora puedes registrar pañales desde la pantalla de hoy."
                required rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
              />
            </div>
            {pushError && <p className="text-xs text-red-500">{pushError}</p>}
            {pushResult && (
              <p className="text-xs text-sage-700 bg-sage-50 rounded-xl px-3 py-2">
                ✅ Enviado a {pushResult.sent} {pushResult.sent === 1 ? 'dispositivo' : 'dispositivos'}
                {pushResult.failed > 0 ? ` · ${pushResult.failed} fallidos eliminados` : ''}
              </p>
            )}
            <button
              type="submit"
              disabled={pushSending || !pushTitle.trim() || !pushBody.trim()}
              className="w-full bg-sage-600 text-white font-semibold text-sm py-3 rounded-xl active:bg-sage-700 disabled:opacity-50 touch-manipulation"
            >
              {pushSending ? 'Enviando…' : '📢 Enviar notificación'}
            </button>
          </form>
        </div>
      </section>

      {/* Dispositivos suscritos */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dispositivos suscritos</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Ningún dispositivo suscrito</p>
        ) : (
          <div className="space-y-3">
            {[...subsByAccount.entries()].map(([accountId, accountSubs]) => {
              const first = accountSubs[0];
              return (
                <div key={accountId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{first.accountName ?? 'Familia sin nombre'}</span>
                    {first.inviteCode && (
                      <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">{first.inviteCode}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{accountSubs.length} {accountSubs.length === 1 ? 'dispositivo' : 'dispositivos'}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {accountSubs.map(s => {
                      const isIOS = s.userAgent?.includes('iOS');
                      const isAndroid = s.userAgent?.includes('Android');
                      const icon = isIOS || isAndroid ? '📱' : '💻';
                      return (
                        <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                          <span className="text-lg shrink-0">{icon}</span>
                          <div className="flex-1 min-w-0">
                            {s.username && (
                              <p className="text-sm font-medium text-gray-800">{s.username}</p>
                            )}
                            <p className="text-xs text-gray-500">{s.userAgent ?? 'Dispositivo desconocido'}</p>
                            <p className="text-xs text-gray-400">Suscrito el {formatDt(s.createdAt)}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteSub(s.id)}
                            className="text-red-400 text-xs bg-red-50 px-2.5 py-1.5 rounded-lg active:bg-red-100 touch-manipulation shrink-0"
                          >
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function BabiesAdminView() {
  const confirm = useConfirm();
  const [babies, setBabies] = useState<AdminBabyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminBabyInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    api.getAdminBabies().then(setBabies).finally(() => setLoading(false));
  }, []);

  function openEdit(baby: AdminBabyInfo) {
    setEditing(baby);
    setEditName(baby.name ?? '');
    setEditBirthDate(baby.birthDate ?? '');
    setEditSex(baby.sex ?? '');
    setEditError('');
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.updateAdminBaby(editing.id, {
        name: editName,
        birthDate: editBirthDate,
        sex: editSex || undefined,
      });
      setBabies(prev => prev.map(b => b.id === editing.id
        ? { ...b, name: editName || null, birthDate: editBirthDate || null, sex: (editSex as 'male' | 'female') || null }
        : b
      ));
      setEditing(null);
    } catch (e: any) {
      setEditError(e.message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(baby: AdminBabyInfo) {
    if (!await confirm({
      message: `¿Eliminar a "${baby.name ?? 'este bebé'}"? Se borrarán todas sus tomas, pesos, sueños y demás datos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })) return;
    try {
      await api.deleteAdminBaby(baby.id);
      setBabies(prev => prev.filter(b => b.id !== baby.id));
      setEditing(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return babies;
    return babies.filter(b =>
      (b.name ?? '').toLowerCase().includes(q) ||
      (b.accountName ?? '').toLowerCase().includes(q) ||
      (b.inviteCode ?? '').toLowerCase().includes(q)
    );
  }, [babies, search]);

  // Agrupar por familia
  const byAccount = new Map<string, AdminBabyInfo[]>();
  for (const b of filtered) {
    const list = byAccount.get(b.accountId) ?? [];
    list.push(b);
    byAccount.set(b.accountId, list);
  }

  const noName = babies.filter(b => !b.name).length;
  const noBirthDate = babies.filter(b => !b.birthDate).length;

  return (
    <div>
      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="Bebés" value={String(babies.length)} />
            <StatCard label="Sin nombre" value={String(noName)} />
            <StatCard label="Sin fecha" value={String(noBirthDate)} />
          </div>

          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, familia o código…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 placeholder:text-gray-400 mb-4"
          />

          {byAccount.size === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Sin resultados</p>
          ) : (
            <div className="space-y-4">
              {[...byAccount.entries()].map(([accountId, accountBabies]) => {
                const first = accountBabies[0];
                return (
                  <div key={accountId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{first.accountName ?? 'Familia sin nombre'}</span>
                      {first.inviteCode && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">{first.inviteCode}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{accountBabies.length} {accountBabies.length === 1 ? 'bebé' : 'bebés'}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {accountBabies.map(baby => {
                        const sexEmoji = baby.sex === 'male' ? '👦' : baby.sex === 'female' ? '👧' : '👶';
                        const age = baby.birthDate ? babyAge(baby.birthDate) : null;
                        return (
                          <div key={baby.id} className="px-4 py-3 flex items-center gap-3">
                            <span className="text-2xl shrink-0">{sexEmoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {baby.name ?? <span className="text-gray-400 italic">Sin nombre</span>}
                              </p>
                              <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-0.5">
                                {baby.birthDate
                                  ? <span>{baby.birthDate}{age ? ` · ${age}` : ''}</span>
                                  : <span className="text-amber-500">Sin fecha de nacimiento</span>
                                }
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => openEdit(baby)}
                                className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg active:bg-gray-200 touch-manipulation"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDelete(baby)}
                                className="text-xs text-red-400 bg-red-50 px-2 py-1.5 rounded-lg active:bg-red-100 touch-manipulation"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sheet edición */}
      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-900">Editar bebé</p>
              <button onClick={() => setEditing(null)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre</label>
                <input
                  type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  placeholder="Nombre del bebé"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fecha de nacimiento</label>
                <input
                  type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Sexo</label>
                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                  {([['', '—'], ['male', '👦 Niño'], ['female', '👧 Niña']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setEditSex(val)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${editSex === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {editError && <p className="text-sm text-red-500 text-center">{editError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                  Cancelar
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-sage-600 active:bg-sage-700 disabled:opacity-50 touch-manipulation">
                  {editLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
              <div className="pt-1 border-t border-gray-100">
                <button type="button" onClick={() => handleDelete(editing)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation">
                  🗑️ Eliminar bebé y todos sus datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function babyAge(birthDate: string): string {
  const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000);
  if (days < 0) return '';
  if (days < 7) return `${days}d`;
  if (days < 112) {
    const w = Math.floor(days / 7), r = days % 7;
    return r === 0 ? `${w}sem` : `${w}sem ${r}d`;
  }
  const m = Math.floor(days / 30), w = Math.floor((days - m * 30) / 7);
  return w > 0 ? `${m}m ${w}sem` : `${m}m`;
}

function MetricCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barColor = color === 'sage' ? 'bg-sage-500' : color === 'lagoon' ? 'bg-lagoon-500' : 'bg-mustard-500';
  const textColor = color === 'sage' ? 'text-sage-700' : color === 'lagoon' ? 'text-lagoon-700' : 'text-mustard-700';
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className={`text-xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct}% del total</p>
    </div>
  );
}
