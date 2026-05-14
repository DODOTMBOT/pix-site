import { authFetch } from './auth';
import { getActivePizzeriaId } from './pizzeriaContext';

export type RateCategory = 'кухня' | 'кассир' | 'курьер';

export interface Rate {
  id:             number;
  pizzeria_id:    number;
  category:       RateCategory;
  position:       string;
  hourly_rate:    number | null;
  monthly_salary: number | null;
  rate_per_order: number | null;
  rate_per_km:    number | null;
  notes:          string | null;
  created_at:     string;
}

export const RATE_CATEGORIES: Record<RateCategory, string[]> = {
  кухня: [
    'Стажер-пиццамейкер',
    'Клинер',
    'Пиццамейкер',
    'Универсал',
    'Наставник',
    'Стажер менеджер',
    'Менеджер',
    'Заместитель управляющего',
  ],
  кассир: [
    'Стажер-кассир',
    'Кассир',
  ],
  курьер: [
    'Пеший',
    'Электро/Вело, ТС компании',
    'Электро/Вело, личное ТС',
    'Авто, личное ТС',
  ],
};

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
