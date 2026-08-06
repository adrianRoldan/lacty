import type { BabyConfig, Feeding, Rest, WeightEntry, HeightEntry, HeadCircEntry, VitaminDLog, ProbioticLog, MassageLog, MilestoneLog, VaccineLog, Consultation, CalendarEvent, DiaperChange, MedicationLog, MedicationPlan, Walk, Bath } from '../types';

const BASE = '/api';

// Identificador único de esta pestaña/dispositivo. Se envía en cada mutación
// para que el servidor lo reenvíe por SSE y este cliente pueda ignorar sus propios eventos.
export const CLIENT_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Bebé activo: se envía en cada petición de datos para que el servidor aísle por bebé.
let activeBabyId = '';
export function setActiveBaby(id: string) { activeBabyId = id; }

function mutHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID, 'X-Baby-Id': activeBabyId };
}

function babyHeaders(): HeadersInit {
  return { 'X-Baby-Id': activeBabyId };
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  username: string;
  email?: string | null;
  accountId: string;
  role: 'admin' | 'user';
  familyRole: 'owner' | 'editor' | 'viewer';
  /** Diseño del timeline de «Hoy» que ha elegido este usuario. */
  timelineDesign: 'clasico' | 'rail';
  /** Si ya se le ofreció probar la línea de tiempo (el aviso sale una vez). */
  timelinePromptSeen: boolean;
  impersonating?: boolean;
  originalUsername?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalFamilies: number;
  totalBabies: number;
  activeToday: number;
  active7d: number;
  active30d: number;
  newUsers7d: number;
  feedingsToday: number;
  feedings7d: number;
  inactiveFamiliesCount: number;
  totalSubscribers: number;
  recentLogins: { username: string; last_login_at: string }[];
  families: { id: string; name: string | null; inviteCode: string | null; subscriberCount: number }[];
}

export interface AdminUserInfo {
  id: string;
  username: string;
  email: string | null;
  role: string;
  familyRole: string;
  accountId: string;
  accountName?: string;
  inviteCode?: string;
  createdAt: string;
  lastLoginAt?: string;
  babies: { id: string; name: string; birthDate?: string }[];
}

export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: data.username,
      email: data.email ?? null,
      accountId: data.accountId,
      role: data.role ?? 'user',
      familyRole: data.familyRole ?? 'editor',
      timelineDesign: data.timelineDesign === 'rail' ? 'rail' : 'clasico',
      timelinePromptSeen: !!data.timelinePromptSeen,
      impersonating: data.impersonating ?? false,
      originalUsername: data.originalUsername ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Guarda preferencias personales en la cuenta, no en el dispositivo. */
export async function updatePreferences(prefs: {
  timelineDesign?: 'clasico' | 'rail';
  timelinePromptSeen?: boolean;
}): Promise<void> {
  const res = await fetch(`${BASE}/auth/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error('No se pudo guardar la preferencia');
}

export async function updateProfile(username: string, email: string, password?: string): Promise<{ username: string; email: string }> {
  const res = await fetch(`${BASE}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password: password || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al actualizar el perfil');
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al iniciar sesión');
  }
  const data = await res.json();
  return { username: data.username, accountId: data.accountId, role: data.role ?? 'user', familyRole: data.familyRole ?? 'editor', timelineDesign: data.timelineDesign === 'rail' ? 'rail' : 'clasico', timelinePromptSeen: !!data.timelinePromptSeen };
}

export async function signup(opts: { username: string; email: string; password: string; babyName?: string; inviteCode?: string }): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al crear la cuenta');
  }
  const data = await res.json();
  return { username: data.username, accountId: data.accountId, role: data.role ?? 'user', familyRole: data.familyRole ?? 'editor', timelineDesign: data.timelineDesign === 'rail' ? 'rail' : 'clasico', timelinePromptSeen: !!data.timelinePromptSeen };
}

export interface AccountMember { id: string; username: string; isAdmin: boolean; isMe: boolean; familyRole: 'owner' | 'editor' | 'viewer'; }
export interface AccountInfo {
  id: string;
  name: string | null;
  inviteCode: string | null;
  isAdmin: boolean;
  members: AccountMember[];
}

export async function getAccount(): Promise<AccountInfo> {
  return json(await fetch(`${BASE}/account`, { headers: { 'X-Client-Id': CLIENT_ID } }));
}

export async function updateAccountName(name: string): Promise<void> {
  await fetch(`${BASE}/account`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
    body: JSON.stringify({ name }),
  });
}

export async function removeMember(userId: string): Promise<void> {
  const res = await fetch(`${BASE}/account/members/${userId}`, { method: 'DELETE', headers: { 'X-Client-Id': CLIENT_ID } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error');
}

export async function leaveAccount(): Promise<void> {
  const res = await fetch(`${BASE}/account/leave`, { method: 'POST', headers: { 'X-Client-Id': CLIENT_ID } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error');
}

export async function setMemberFamilyRole(userId: string, familyRole: 'editor' | 'viewer'): Promise<void> {
  const res = await fetch(`${BASE}/account/members/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
    body: JSON.stringify({ familyRole }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error');
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

// ── Realtime (SSE) ──────────────────────────────────────────────────────────────

export type ChangeEvent = { resource: string; originId?: string };
export type Revs = Record<string, number>;

export async function getVersions(): Promise<Revs> {
  return json(await fetch(`${BASE}/version`));
}

/**
 * Abre el stream de eventos en tiempo real. Llama a onChange cuando otro
 * dispositivo modifica un recurso (ignora los cambios originados por este cliente).
 * Devuelve una función para cerrar la conexión.
 */
export function subscribeToChanges(onChange: (resource: string) => void): () => void {
  const es = new EventSource(`${BASE}/events`, { withCredentials: true });
  es.addEventListener('change', (e) => {
    try {
      const data: ChangeEvent = JSON.parse((e as MessageEvent).data);
      if (data.originId === CLIENT_ID) return; // mi propio cambio, ya está reflejado
      onChange(data.resource);
    } catch { /* noop */ }
  });
  return () => es.close();
}

// ── Bebés (la config de cada bebé vive en su propio registro) ───────────────────

export async function getBabies(): Promise<BabyConfig[]> {
  return json(await fetch(`${BASE}/babies`, { headers: { 'X-Client-Id': CLIENT_ID } }));
}

export async function createBaby(baby: Omit<BabyConfig, 'id'>): Promise<BabyConfig> {
  return json(await fetch(`${BASE}/babies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
    body: JSON.stringify(baby),
  }));
}

export async function updateBaby(baby: BabyConfig): Promise<BabyConfig> {
  return json(await fetch(`${BASE}/babies/${baby.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
    body: JSON.stringify(baby),
  }));
}

export async function deleteBaby(id: string): Promise<void> {
  await fetch(`${BASE}/babies/${id}`, { method: 'DELETE', headers: { 'X-Client-Id': CLIENT_ID } });
}

// ── Feedings ──────────────────────────────────────────────────────────────────

export async function getFeedings(): Promise<Feeding[]> {
  return json(await fetch(`${BASE}/feedings`, { headers: babyHeaders() }));
}

export async function createFeeding(feeding: Feeding): Promise<Feeding> {
  return json(await fetch(`${BASE}/feedings`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(feeding),
  }));
}

export async function updateFeeding(feeding: Feeding): Promise<Feeding> {
  return json(await fetch(`${BASE}/feedings/${feeding.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(feeding),
  }));
}

export async function deleteFeeding(id: string): Promise<void> {
  await fetch(`${BASE}/feedings/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Rests ─────────────────────────────────────────────────────────────────────

export async function getRests(): Promise<Rest[]> {
  return json(await fetch(`${BASE}/rests`, { headers: babyHeaders() }));
}

export async function createRest(rest: Rest): Promise<Rest> {
  return json(await fetch(`${BASE}/rests`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(rest),
  }));
}

export async function updateRest(rest: Rest): Promise<Rest> {
  return json(await fetch(`${BASE}/rests/${rest.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(rest),
  }));
}

export async function deleteRest(id: string): Promise<void> {
  await fetch(`${BASE}/rests/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Weights ───────────────────────────────────────────────────────────────────

export async function getWeights(): Promise<WeightEntry[]> {
  return json(await fetch(`${BASE}/weights`, { headers: babyHeaders() }));
}

export async function createWeight(entry: WeightEntry): Promise<WeightEntry> {
  return json(await fetch(`${BASE}/weights`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(entry),
  }));
}

export async function updateWeight(entry: WeightEntry): Promise<WeightEntry> {
  return json(await fetch(`${BASE}/weights/${entry.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(entry),
  }));
}

export async function deleteWeight(id: string): Promise<void> {
  await fetch(`${BASE}/weights/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Heights ───────────────────────────────────────────────────────────────────

export async function getHeights(): Promise<HeightEntry[]> {
  return json(await fetch(`${BASE}/heights`, { headers: babyHeaders() }));
}

export async function createHeight(entry: HeightEntry): Promise<HeightEntry> {
  return json(await fetch(`${BASE}/heights`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(entry),
  }));
}

export async function updateHeight(entry: HeightEntry): Promise<HeightEntry> {
  return json(await fetch(`${BASE}/heights/${entry.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(entry),
  }));
}

export async function deleteHeight(id: string): Promise<void> {
  await fetch(`${BASE}/heights/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Perímetro craneal ─────────────────────────────────────────────────────────

export async function getHeadCircs(): Promise<HeadCircEntry[]> {
  return json(await fetch(`${BASE}/headcircs`, { headers: babyHeaders() }));
}

export async function createHeadCirc(entry: HeadCircEntry): Promise<HeadCircEntry> {
  return json(await fetch(`${BASE}/headcircs`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(entry),
  }));
}

export async function updateHeadCirc(entry: HeadCircEntry): Promise<HeadCircEntry> {
  return json(await fetch(`${BASE}/headcircs/${entry.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(entry),
  }));
}

export async function deleteHeadCirc(id: string): Promise<void> {
  await fetch(`${BASE}/headcircs/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Vitamina D3 ───────────────────────────────────────────────────────────────

export async function getVitaminDLogs(): Promise<VitaminDLog[]> {
  return json(await fetch(`${BASE}/vitamind`, { headers: babyHeaders() }));
}

export async function giveVitaminD(date: string): Promise<VitaminDLog> {
  const log: VitaminDLog = { id: date, date, givenAt: new Date().toISOString() };
  return json(await fetch(`${BASE}/vitamind`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(log),
  }));
}

export async function removeVitaminD(date: string): Promise<void> {
  await fetch(`${BASE}/vitamind/${date}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Probiótico ────────────────────────────────────────────────────────────────

export async function getProbioticLogs(): Promise<ProbioticLog[]> {
  return json(await fetch(`${BASE}/probiotics`, { headers: babyHeaders() }));
}

export async function giveProbiotic(date: string): Promise<ProbioticLog> {
  const log: ProbioticLog = { id: date, date, givenAt: new Date().toISOString() };
  return json(await fetch(`${BASE}/probiotics`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(log),
  }));
}

export async function removeProbiotic(date: string): Promise<void> {
  await fetch(`${BASE}/probiotics/${date}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Masajes frenectomía ───────────────────────────────────────────────────────

export async function getMassageLogs(): Promise<MassageLog[]> {
  return json(await fetch(`${BASE}/massages`, { headers: babyHeaders() }));
}

export async function createMassageLog(date: string): Promise<MassageLog> {
  const log: MassageLog = {
    id: `${Date.now()}-massage`,
    date,
    performedAt: new Date().toISOString(),
  };
  return json(await fetch(`${BASE}/massages`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(log),
  }));
}

export async function deleteMassageLog(id: string): Promise<void> {
  await fetch(`${BASE}/massages/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Hitos del desarrollo ─────────────────────────────────────────────────────

export async function getMilestones(): Promise<MilestoneLog[]> {
  return json(await fetch(`${BASE}/milestones`, { headers: babyHeaders() }));
}

export async function saveMilestone(log: MilestoneLog): Promise<MilestoneLog> {
  return json(await fetch(`${BASE}/milestones`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(log),
  }));
}

export async function deleteMilestone(id: string): Promise<void> {
  await fetch(`${BASE}/milestones/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Vacunas ──────────────────────────────────────────────────────────────────

export async function getVaccines(): Promise<VaccineLog[]> {
  return json(await fetch(`${BASE}/vaccines`, { headers: babyHeaders() }));
}

export async function saveVaccine(log: VaccineLog): Promise<VaccineLog> {
  return json(await fetch(`${BASE}/vaccines`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(log),
  }));
}

export async function deleteVaccine(id: string): Promise<void> {
  await fetch(`${BASE}/vaccines/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Consultas ─────────────────────────────────────────────────────────────────

export async function getConsultations(): Promise<Consultation[]> {
  return json(await fetch(`${BASE}/consultations`, { headers: babyHeaders() }));
}

export async function createConsultation(c: Consultation): Promise<Consultation> {
  return json(await fetch(`${BASE}/consultations`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(c),
  }));
}

export async function updateConsultation(c: Consultation): Promise<Consultation> {
  return json(await fetch(`${BASE}/consultations/${c.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(c),
  }));
}

export async function deleteConsultation(id: string): Promise<void> {
  await fetch(`${BASE}/consultations/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Calendario / Agenda ─────────────────────────────────────────────────────────

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return json(await fetch(`${BASE}/calendar`, { headers: babyHeaders() }));
}

export async function createCalendarEvent(e: CalendarEvent): Promise<CalendarEvent> {
  return json(await fetch(`${BASE}/calendar`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(e),
  }));
}

export async function updateCalendarEvent(e: CalendarEvent): Promise<CalendarEvent> {
  return json(await fetch(`${BASE}/calendar/${e.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(e),
  }));
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await fetch(`${BASE}/calendar/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

// ── Guías (contenido de lacty.es/guias/) ─────────────────────────────────────

export interface Articulo {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  resumen: string;
  emoji: string | null;
  contenido: string;
  publicado: number;
  fecha_publicacion: string | null;
  creado_at: string;
  actualizado_at: string;
}

export interface ArticuloForm {
  titulo: string; slug: string; descripcion: string; resumen: string;
  emoji: string; contenido: string; publicado: boolean;
}

export async function getArticulos(): Promise<Articulo[]> {
  return json(await fetch(`${BASE}/admin/articulos`, { credentials: 'include' }));
}

async function guardarArticulo(url: string, metodo: 'POST' | 'PUT', datos: ArticuloForm): Promise<Articulo> {
  const res = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al guardar la guía');
  }
  return res.json();
}

export const crearArticulo = (datos: ArticuloForm) =>
  guardarArticulo(`${BASE}/admin/articulos`, 'POST', datos);

export const actualizarArticulo = (id: string, datos: ArticuloForm) =>
  guardarArticulo(`${BASE}/admin/articulos/${id}`, 'PUT', datos);

export async function borrarArticulo(id: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/articulos/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al eliminar');
  }
}

export async function getAdminUsers(): Promise<AdminUserInfo[]> {
  return json(await fetch(`${BASE}/admin/users`, { credentials: 'include' }));
}

export async function setUserRole(userId: string, role: string): Promise<void> {
  await fetch(`${BASE}/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al eliminar');
  }
}

export async function createAdminUser(opts: { username: string; email: string; password: string; accountId?: string }): Promise<{ id: string; accountId: string }> {
  const res = await fetch(`${BASE}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al crear usuario');
  }
  return res.json();
}

export async function updateAdminUser(userId: string, username: string, email: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al actualizar');
  }
}

export async function resetAdminPassword(userId: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al cambiar contraseña');
  }
}

export async function setUserFamilyRole(userId: string, familyRole: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}/family-role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ familyRole }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al cambiar rol');
  }
}

export async function moveUserToAccount(userId: string, accountId: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}/account`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ accountId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al mover usuario');
  }
}

export async function impersonateUser(userId: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}/impersonate`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al impersonar');
  }
}

export async function exitImpersonation(): Promise<void> {
  await fetch(`${BASE}/admin/impersonate/exit`, {
    method: 'POST',
    credentials: 'include',
  });
}

export interface AdminBabyInfo {
  id: string;
  accountId: string;
  accountName: string | null;
  inviteCode: string | null;
  name: string | null;
  birthDate: string | null;
  sex: 'male' | 'female' | null;
  setupDate: string | null;
  daysOfLifeAtSetup: number;
}

export async function getAdminBabies(): Promise<AdminBabyInfo[]> {
  return json(await fetch(`${BASE}/admin/babies`, { credentials: 'include' }));
}

export async function updateAdminBaby(id: string, data: { name?: string; birthDate?: string; sex?: string }): Promise<void> {
  const res = await fetch(`${BASE}/admin/babies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al actualizar');
  }
}

export async function deleteAdminBaby(id: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/babies/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al eliminar');
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  return json(await fetch(`${BASE}/admin/stats`, { credentials: 'include' }));
}

export interface PushSubscriptionInfo {
  id: string;
  accountId: string;
  accountName: string | null;
  inviteCode: string | null;
  username: string | null;
  userAgent: string | null;
  endpoint: string;
  createdAt: string;
}

export async function getPushSubscriptions(): Promise<PushSubscriptionInfo[]> {
  return json(await fetch(`${BASE}/admin/push/subscriptions`, { credentials: 'include' }));
}

export async function adminDeletePushSubscription(id: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/push/subscriptions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al eliminar');
  }
}

export async function sendPushBroadcast(opts: { title: string; body: string; url?: string; accountId?: string }): Promise<{ sent: number; failed: number }> {
  const res = await fetch(`${BASE}/admin/push/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al enviar');
  }
  return res.json();
}

export async function regenerateInviteCode(accountId: string): Promise<string> {
  const res = await fetch(`${BASE}/admin/accounts/${accountId}/invite-code`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al regenerar código');
  }
  const data = await res.json();
  return data.inviteCode as string;
}

// ── Push notifications ─────────────────────────────────────────────────────────

export async function getPushVapidKey(): Promise<string> {
  const res = await fetch(`${BASE}/push/vapid-key`);
  const data = await res.json();
  return data.publicKey;
}

export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  await fetch(`${BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription),
  });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await fetch(`${BASE}/push/subscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint }),
  });
}

// ── Pañales ───────────────────────────────────────────────────────────────────

export async function getDiapers(): Promise<DiaperChange[]> {
  return json(await fetch(`${BASE}/diapers`, { headers: babyHeaders() }));
}

export async function createDiaper(d: DiaperChange): Promise<DiaperChange> {
  return json(await fetch(`${BASE}/diapers`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(d),
  }));
}

export async function updateDiaper(d: DiaperChange): Promise<DiaperChange> {
  return json(await fetch(`${BASE}/diapers/${d.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(d),
  }));
}

export async function deleteDiaper(id: string): Promise<void> {
  await fetch(`${BASE}/diapers/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Medicamentos ──────────────────────────────────────────────────────────────

export async function getMedications(): Promise<MedicationLog[]> {
  return json(await fetch(`${BASE}/medications`, { headers: babyHeaders() }));
}

export async function createMedication(m: MedicationLog): Promise<MedicationLog> {
  return json(await fetch(`${BASE}/medications`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(m),
  }));
}

export async function updateMedication(m: MedicationLog): Promise<MedicationLog> {
  return json(await fetch(`${BASE}/medications/${m.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(m),
  }));
}

export async function deleteMedication(id: string): Promise<void> {
  await fetch(`${BASE}/medications/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Pautas de medicación ──────────────────────────────────────────────────────

export async function getMedicationPlans(): Promise<MedicationPlan[]> {
  return json(await fetch(`${BASE}/medplans`, { headers: babyHeaders() }));
}

export async function createMedicationPlan(p: MedicationPlan): Promise<MedicationPlan> {
  return json(await fetch(`${BASE}/medplans`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(p),
  }));
}

export async function updateMedicationPlan(p: MedicationPlan): Promise<MedicationPlan> {
  return json(await fetch(`${BASE}/medplans/${p.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(p),
  }));
}

export async function deleteMedicationPlan(id: string): Promise<void> {
  await fetch(`${BASE}/medplans/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Paseos ────────────────────────────────────────────────────────────────────

export async function getWalks(): Promise<Walk[]> {
  return json(await fetch(`${BASE}/walks`, { headers: babyHeaders() }));
}

export async function createWalk(w: Walk): Promise<Walk> {
  return json(await fetch(`${BASE}/walks`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(w),
  }));
}

export async function updateWalk(w: Walk): Promise<Walk> {
  return json(await fetch(`${BASE}/walks/${w.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(w),
  }));
}

export async function deleteWalk(id: string): Promise<void> {
  await fetch(`${BASE}/walks/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

// ── Baños ─────────────────────────────────────────────────────────────────────

export async function getBaths(): Promise<Bath[]> {
  return json(await fetch(`${BASE}/baths`, { headers: babyHeaders() }));
}

export async function createBath(b: Bath): Promise<Bath> {
  return json(await fetch(`${BASE}/baths`, {
    method: 'POST',
    headers: mutHeaders(),
    body: JSON.stringify(b),
  }));
}

export async function updateBath(b: Bath): Promise<Bath> {
  return json(await fetch(`${BASE}/baths/${b.id}`, {
    method: 'PUT',
    headers: mutHeaders(),
    body: JSON.stringify(b),
  }));
}

export async function deleteBath(id: string): Promise<void> {
  await fetch(`${BASE}/baths/${id}`, { method: 'DELETE', headers: mutHeaders() });
}

export interface NotificationPrefs {
  feedingThresholdMins: number | null;
  restThresholdMins: number | null;
  massageThresholdMins: number | null;
}

export async function getNotificationPrefs(babyId: string): Promise<NotificationPrefs> {
  const res = await fetch(`${BASE}/push/prefs/${babyId}`, { credentials: 'include' });
  return res.json();
}

export async function updateNotificationPrefs(babyId: string, prefs: NotificationPrefs): Promise<void> {
  await fetch(`${BASE}/push/prefs/${babyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs),
  });
}
