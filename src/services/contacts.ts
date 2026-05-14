import { authFetch } from './auth';
import { getActivePizzeriaId } from './pizzeriaContext';

export interface Contact {
  id:          number;
  pizzeria_id: number;
  category:    string;
  name:        string;
  phone:       string | null;
  email:       string | null;
  notes:       string | null;
  created_at:  string;
}

export const CONTACT_CATEGORIES = ['Поставщики', 'Сервисные службы', 'Партнеры', 'Прочее'] as const;

function base(): string {
  const id = getActivePizzeriaId();
  if (!id) throw new Error('Нет активной пиццерии');
  return `/api/pizzerias/${id}/contacts`;
}

export async function getContacts(): Promise<Contact[]> {
  const r = await authFetch(base());
  if (!r.ok) throw new Error('Ошибка загрузки контактов');
  return r.json();
}

export async function createContact(data: Omit<Contact, 'id' | 'pizzeria_id' | 'created_at'>): Promise<Contact> {
  const r = await authFetch(base(), { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка создания'); }
  return r.json();
}

export async function updateContact(id: number, data: Partial<Omit<Contact, 'id' | 'pizzeria_id' | 'created_at'>>): Promise<Contact> {
  const r = await authFetch(`${base()}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка обновления'); }
  return r.json();
}

export async function deleteContact(id: number): Promise<void> {
  await authFetch(`${base()}/${id}`, { method: 'DELETE' });
}
