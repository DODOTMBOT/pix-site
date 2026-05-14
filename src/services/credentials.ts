import { authFetch } from './auth';
import { getActivePizzeriaId } from './pizzeriaContext';

export interface Credential {
  id:           number;
  pizzeria_id:  number;
  service_name: string;
  login:        string | null;
  password:     string | null;
  url:          string | null;
  notes:        string | null;
  created_at:   string;
}

export const CREDENTIAL_SERVICES = ['Kaspi Бизнес', 'Dodopay', '1С', 'WiFi', 'Камеры', 'Прочее'] as const;

function base(): string {
  const id = getActivePizzeriaId();
  if (!id) throw new Error('Нет активной пиццерии');
  return `/api/pizzerias/${id}/credentials`;
}

export async function getCredentials(): Promise<Credential[]> {
  const r = await authFetch(base());
  if (!r.ok) throw new Error('Ошибка загрузки доступов');
  return r.json();
}

export async function createCredential(data: Omit<Credential, 'id' | 'pizzeria_id' | 'created_at'>): Promise<Credential> {
  const r = await authFetch(base(), { method: 'POST', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка создания'); }
  return r.json();
}

export async function updateCredential(id: number, data: Partial<Omit<Credential, 'id' | 'pizzeria_id' | 'created_at'>>): Promise<Credential> {
  const r = await authFetch(`${base()}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || 'Ошибка обновления'); }
  return r.json();
}

export async function deleteCredential(id: number): Promise<void> {
  await authFetch(`${base()}/${id}`, { method: 'DELETE' });
}
