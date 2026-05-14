import { authFetch } from './auth';
import { getActivePizzeriaId } from './pizzeriaContext';

export interface MotivationFund { premium: number; wow: number; }

export interface MotivationItem {
  id:           number;
  block_id:     number;
  name:         string;
  weight:       number;
  goal:         string | null;
  has_wow_goal: boolean;
  wow_goal:     string | null;
}

export interface MotivationBlock {
  id:     number;
  name:   string;
  weight: number;
  items:  MotivationItem[];
}

export interface CriticalFactor { id: number; name: string; indicator: string | null; }

export interface MotivationData {
  fund:     MotivationFund;
  blocks:   MotivationBlock[];
  critical: CriticalFactor[];
}

function base(): string {
  const id = getActivePizzeriaId();
  if (!id) throw new Error('Нет активной пиццерии');
  return `/api/pizzerias/${id}/motivation2`;
}

export async function getMotivation(): Promise<MotivationData> {
  const r = await authFetch(base());
  if (!r.ok) throw new Error('Ошибка загрузки');
  return r.json();
}

export async function saveFund(fund: MotivationFund): Promise<void> {
  const r = await authFetch(`${base()}/fund`, { method: 'PUT', body: JSON.stringify(fund) });
  if (!r.ok) throw new Error('Ошибка сохранения');
}

export async function createBlock(data: { name: string; weight: number }): Promise<MotivationBlock> {
  const r = await authFetch(`${base()}/blocks`, { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка'); }
  return r.json();
}

export async function updateBlock(id: number, data: { name: string; weight: number }): Promise<void> {
  const r = await authFetch(`${base()}/blocks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка'); }
}

export async function deleteBlock(id: number): Promise<void> {
  await authFetch(`${base()}/blocks/${id}`, { method: 'DELETE' });
}

export async function createItem(
  blockId: number,
  data: { name: string; weight: number; goal: string | null; has_wow_goal: boolean; wow_goal: string | null },
): Promise<MotivationItem> {
  const r = await authFetch(`${base()}/blocks/${blockId}/items`, { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка'); }
  return r.json();
}

export async function updateItem(
  id: number,
  data: { name: string; weight: number; goal: string | null; has_wow_goal: boolean; wow_goal: string | null },
): Promise<void> {
  const r = await authFetch(`${base()}/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка'); }
}

export async function deleteItem(id: number): Promise<void> {
  await authFetch(`${base()}/items/${id}`, { method: 'DELETE' });
}

export async function createCritical(data: { name: string; indicator: string | null }): Promise<CriticalFactor> {
  const r = await authFetch(`${base()}/critical`, { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) throw new Error('Ошибка');
  return r.json();
}

export async function deleteCritical(id: number): Promise<void> {
  await authFetch(`${base()}/critical/${id}`, { method: 'DELETE' });
}
