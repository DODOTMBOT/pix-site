export type Role = 'superadmin' | 'management' | 'manager' | 'shift_manager';

export interface User {
  id:       number;
  email:    string;
  name:     string;
  role:     Role;
  jobTitle: string | null;
}

export interface PizzeriaShort {
  id:     number;
  name:   string;
  city:   string | null;
  street: string | null;
  house:  string | null;
}

const API_URL = '/api';

export function getUser(): User | null {
  const raw = localStorage.getItem('pix_user');
  if (!raw) return null;
  return JSON.parse(raw) as User;
}

export function isAuthenticated(): boolean {
  return !!getUser();
}

export function isSuperAdmin(): boolean {
  return getUser()?.role === 'superadmin';
}

export function isManagement(): boolean {
  const u = getUser();
  return u?.role === 'superadmin' || u?.role === 'management';
}

export function isManager(): boolean {
  return getUser()?.role === 'manager';
}

export function isShiftManager(): boolean {
  return getUser()?.role === 'shift_manager';
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    superadmin:    'Суперадмин',
    management:    'Руководство',
    manager:       'Управляющий',
    shift_manager: 'Менеджер смены',
  };
  return labels[role] ?? role;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Ошибка входа');
  }
  const data = await res.json() as {
    user: { id: number; email: string; name: string; role: Role; job_title: string | null };
  };
  const user: User = {
    id:       data.user.id,
    email:    data.user.email,
    name:     data.user.name,
    role:     data.user.role,
    jobTitle: data.user.job_title,
  };
  localStorage.setItem('pix_user', JSON.stringify(user));
  return user;
}

export async function fetchMe(): Promise<{ user: User; pizzerias: PizzeriaShort[] }> {
  const res = await authFetch(`${API_URL}/auth/me`);
  if (!res.ok) {
    const err: Error & { status?: number } = new Error('Unauthorized');
    err.status = res.status;
    throw err;
  }
  const data = await res.json() as {
    user:      { id: number; email: string; name: string; role: Role; job_title: string | null };
    pizzerias: PizzeriaShort[];
  };
  const user: User = {
    id:       data.user.id,
    email:    data.user.email,
    name:     data.user.name,
    role:     data.user.role,
    jobTitle: data.user.job_title,
  };
  localStorage.setItem('pix_user', JSON.stringify(user));
  return { user, pizzerias: data.pizzerias };
}

export function logout(): void {
  localStorage.removeItem('pix_user');
  // Fire-and-forget: destroy the server session. Use plain fetch to avoid
  // triggering the 401 interceptor in authFetch if the session is already gone.
  fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}

// All authenticated API calls. Sends the session cookie automatically.
// On 401 (expired/invalid session) clears local state and redirects to /login.
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    logout();
    window.location.replace('/login');
  }
  return res;
}
