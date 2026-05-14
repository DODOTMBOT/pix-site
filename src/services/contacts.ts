import { authFetch } from './auth';

export interface ContactPizzeria {
  id:   number;
  name: string;
}

export interface Contact {
  id:        number;
  position:  string | null;
  name:      string;
  phone:     string | null;
  email:     string | null;
  pizzerias: ContactPizzeria[];
}

export async function getContacts(): Promise<Contact[]> {
  const r = await authFetch('/api/contacts');
  if (!r.ok) throw new Error('Ошибка загрузки контактов');
  return r.json();
}

export async function createContact(data: {
  position: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  pizzeria_ids: number[];
}): Promise<Contact> {
  const r = await authFetch('/api/contacts', { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка создания'); }
  return r.json();
}

export async function updateContact(id: number, data: {
  position: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  pizzeria_ids: number[];
}): Promise<Contact> {
  const r = await authFetch(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка обновления'); }
  return r.json();
}

export async function deleteContact(id: number): Promise<void> {
  await authFetch(`/api/contacts/${id}`, { method: 'DELETE' });
}
