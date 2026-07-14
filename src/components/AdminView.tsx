import { useState, useEffect, useMemo } from 'react';
import type { AdminUserInfo, AdminStats } from '../api';
import * as api from '../api';
import { useConfirm } from './ConfirmDialog';

type SheetPage = 'actions' | 'edit' | 'password' | 'move' | 'familyRole';
type Sheet = { user: AdminUserInfo; page: SheetPage } | null;
type AdminTab = 'users' | 'activity';

export default function AdminView() {
  const [adminTab, setAdminTab] = useState<AdminTab>('users');
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
  const [editPassword, setEditPassword] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [familyRoleVal, setFamilyRoleVal] = useState('editor');

  // Create user form
  const [newUsername, setNewUsername] = useState('');
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
    if (page === 'edit') setEditUsername(user.username);
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
    if (!await confirm(`¿Iniciar sesión como "${user.username}"? La página se recargará.`)) return;
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

  async function handleEditUsername(user: AdminUserInfo) {
    if (!editUsername.trim()) return;
    await sheetAction(async () => {
      await api.updateAdminUsername(user.id, editUsername.trim());
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, username: editUsername.trim() } : u));
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
    if (!newUsername.trim() || !newPassword) return;
    setCreateError('');
    setCreateLoading(true);
    try {
      const result = await api.createAdminUser({
        username: newUsername.trim(),
        password: newPassword,
        accountId: newFamilyType === 'existing' && newAccountId ? newAccountId : undefined,
      });
      // Reload to get complete user data
      const updated = await api.getAdminUsers();
      setUsers(updated);
      setCreating(false);
      setNewUsername('');
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
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        {adminTab === 'users' && (
          <button
            onClick={() => { setCreating(true); setCreateError(''); }}
            className="flex items-center gap-1.5 bg-sage-600 text-white text-sm font-semibold px-3 py-2 rounded-xl active:bg-sage-700 touch-manipulation"
          >
            <span className="text-base leading-none">＋</span> Nuevo usuario
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5 mb-4">
        <button onClick={() => setAdminTab('users')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${adminTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          👤 Usuarios
        </button>
        <button onClick={() => setAdminTab('activity')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${adminTab === 'activity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          📊 Actividad
        </button>
      </div>

      {adminTab === 'activity' && <ActivityDashboard />}

      {adminTab === 'users' && (loading ? (
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
                                u.familyRole === 'owner' ? 'bg-mustard-100 text-mustard-700' :
                                u.familyRole === 'viewer' ? 'bg-blue-50 text-blue-600' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {u.familyRole}
                              </span>
                            </div>
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
      ))}

      {/* Sheet: user actions */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
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
                  <ActionBtn icon="✏️" label="Editar nombre de usuario" onClick={() => openSheet(sheet.user, 'edit')} />
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
                  <p className="text-sm font-medium text-gray-700 mb-3">Nombre de usuario</p>
                  <input
                    type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                    autoCapitalize="none" autoCorrect="off"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 mb-4"
                  />
                  <div className="flex gap-2">
                    <button onClick={closeSheet} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200 touch-manipulation">
                      Cancelar
                    </button>
                    <button onClick={() => handleEditUsername(sheet.user)} disabled={sheetLoading || !editUsername.trim()}
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
                    {(['owner', 'editor', 'viewer'] as const).map(r => (
                      <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${familyRoleVal === r ? 'border-sage-500 bg-sage-50' : 'border-gray-200'}`}>
                        <input type="radio" name="familyRole" value={r} checked={familyRoleVal === r} onChange={() => setFamilyRoleVal(r)} className="accent-sage-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r === 'owner' ? 'Owner' : r === 'editor' ? 'Editor' : 'Viewer'}</p>
                          <p className="text-xs text-gray-400">{r === 'owner' ? 'Acceso total, puede gestionar la familia' : r === 'editor' ? 'Puede añadir y editar registros' : 'Solo lectura'}</p>
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreating(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
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
                <button type="submit" disabled={createLoading || !newUsername.trim() || newPassword.length < 6}
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

function ActivityDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>;
  if (!stats) return <p className="text-center text-red-400 py-12 text-sm">Error al cargar estadísticas</p>;

  return (
    <div className="space-y-5">
      {/* Usuarios activos */}
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

      {/* Contenido */}
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

      {/* Alertas */}
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

      {/* Últimos logins */}
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
