import type { BabyConfig, Feeding, Rest, WeightEntry } from '../types';

const BASE = '/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<BabyConfig | null> {
  const list = await json<BabyConfig[]>(await fetch(`${BASE}/config`));
  return list[0] ?? null;
}

export async function saveConfig(config: Omit<BabyConfig, 'id'>): Promise<BabyConfig> {
  const existing = await getConfig();
  if (existing) {
    return json(await fetch(`${BASE}/config/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, id: existing.id }),
    }));
  }
  return json(await fetch(`${BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...config, id: '1' }),
  }));
}

// ── Feedings ──────────────────────────────────────────────────────────────────

export async function getFeedings(): Promise<Feeding[]> {
  return json(await fetch(`${BASE}/feedings`));
}

export async function createFeeding(feeding: Feeding): Promise<Feeding> {
  return json(await fetch(`${BASE}/feedings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feeding),
  }));
}

export async function updateFeeding(feeding: Feeding): Promise<Feeding> {
  return json(await fetch(`${BASE}/feedings/${feeding.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feeding),
  }));
}

export async function deleteFeeding(id: string): Promise<void> {
  await fetch(`${BASE}/feedings/${id}`, { method: 'DELETE' });
}

// ── Rests ─────────────────────────────────────────────────────────────────────

export async function getRests(): Promise<Rest[]> {
  return json(await fetch(`${BASE}/rests`));
}

export async function createRest(rest: Rest): Promise<Rest> {
  return json(await fetch(`${BASE}/rests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  }));
}

export async function updateRest(rest: Rest): Promise<Rest> {
  return json(await fetch(`${BASE}/rests/${rest.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  }));
}

export async function deleteRest(id: string): Promise<void> {
  await fetch(`${BASE}/rests/${id}`, { method: 'DELETE' });
}

// ── Weights ───────────────────────────────────────────────────────────────────

export async function getWeights(): Promise<WeightEntry[]> {
  return json(await fetch(`${BASE}/weights`));
}

export async function createWeight(entry: WeightEntry): Promise<WeightEntry> {
  return json(await fetch(`${BASE}/weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }));
}

export async function updateWeight(entry: WeightEntry): Promise<WeightEntry> {
  return json(await fetch(`${BASE}/weights/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }));
}

export async function deleteWeight(id: string): Promise<void> {
  await fetch(`${BASE}/weights/${id}`, { method: 'DELETE' });
}
