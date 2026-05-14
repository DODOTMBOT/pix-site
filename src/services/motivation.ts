import { authFetch } from './auth';
import { getActivePizzeriaId } from './pizzeriaContext';

export interface MotivationRule {
  id:           number;
  pizzeria_id:  number;
  metric_name:  string;
  threshold:    number;
  bonus_amount: number;
  description:  string | null;
  is_active:    number;
  created_at:   string;
}

export const MOTIVATION_METRICS = ['Средний чек', 'Конверсия в приложение', 'Скорость сборки', 'NPS', 'Выручка', 'Прочее'] as const;

function base(): string {
  const id = getActivePizzeriaId();
  if (!id) throw new Error('Нет активной пиццерии');
  return `/api/pizzerias/${id}/motivation`;
}

export async function getMotivation(): Promise<MotivationRule[]> {
  const r = await authFetch(base());
  if (!r.ok) throw new Error('Ошибка загрузки мотивации');
  return r.json();
}

export async function createMotivationRule(data: Omit<MotivationRule, 'id' | 'pizzeria_id' | 'created_at'>): Promise<MotivationRule> {
  const r = await authFetch(base(), { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка создания'); }
  return r.json();
}

export async function updateMotivationRule(id: number, data: Partial<Omit<MotivationRule, 'id' | 'pizzeria_id' | 'created_at'>>): Promise<MotivationRule> {
  const r = await authFetch(`${base()}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка обновления'); }
  return r.json();
}

export async function deleteMotivationRule(id: number): Promise<void> {
  await authFetch(`${base()}/${id}`, { method: 'DELETE' });
}
