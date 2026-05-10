export interface User {
  id: number;
  email: string;
  name: string;
  role: 'superadmin' | 'management' | 'manager';
  pizzerias: string[];
}

const API_URL = '/api';

export function getToken(): string | null {
  return localStorage.getItem('pix_token');
}

export function getUser(): User | null {
  const raw = localStorage.getItem('pix_user');
  return raw ? JSON.parse(raw) as User : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function isManagement(): boolean {
  const user = getUser();
  return user?.role === 'superadmin' || user?.role === 'management';
}

export function isSuperAdmin(): boolean {
  return getUser()?.role === 'superadmin';
}

export function roleLabel(role: User['role']): string {
  const labels: Record<User['role'], string> = {
    superadmin: 'Суперадмин',
    management: 'Руководство',
    manager:    'Менеджер',
  };
  return labels[role] ?? role;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Ошибка входа');
  }
  const data = await res.json() as { token: string; user: User };
  localStorage.setItem('pix_token', data.token);
  localStorage.setItem('pix_user',  JSON.stringify(data.user));
  return data.user;
}

export function logout(): void {
  localStorage.removeItem('pix_token');
  localStorage.removeItem('pix_user');
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${getToken() ?? ''}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
}

export function filterByPizzeria<T extends { pizzeria: string }>(items: T[]): T[] {
  if (isManagement()) return items;
  const user = getUser();
  if (!user || !user.pizzerias.length) return [];
  const userPizzerias = user.pizzerias.map(p => p.trim().toLowerCase());
  return items.filter(item => {
    const itemPizzeria = item.pizzeria.trim().toLowerCase();
    return itemPizzeria === 'все' ||
           itemPizzeria === 'all' ||
           userPizzerias.includes(itemPizzeria);
  });
}
