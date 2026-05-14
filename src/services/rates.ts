import { authFetch } from './auth';
import { getActivePizzeriaId } from './pizzeriaContext';

export interface Rate {
  id:             number;
  pizzeria_id:    number;
  position:       string;
  hourly_rate:    number | null;
  monthly_salary: number | null;
  notes:          string | null;
  created_at:     string;
}

export const RATE_POSITIONS = ['Пиццамейкер', 'Курьер', 'Кассир', 'Менеджер смены', 'Стажёр', 'Универсал', 'Наставник'] as const;

function base(): string {
  const id = getActivePizzeriaId();
  if (!id) throw new Error('Нет активной пиццерии');
  return `/api/pizzerias/${id}/rates`;
}

export async function getRates(): Promise<Rate[]> {
  const r = await authFetch(base());
  if (!r.ok) throw new Error('Ошибка загрузки ставок');
  return r.json();
}

export async function createRate(data: Omit<Rate, 'id' | 'pizzeria_id' | 'created_at'>): Promise<Rate> {
  const r = await authFetch(base(), { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка создания'); }
  return r.json();
}

export async function updateRate(id: number, data: Partial<Omit<Rate, 'id' | 'pizzeria_id' | 'created_at'>>): Promise<Rate> {
  const r = await authFetch(`${base()}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка обновления'); }
  return r.json();
}

export async function deleteRate(id: number): Promise<void> {
  await authFetch(`${base()}/${id}`, { method: 'DELETE' });
}
