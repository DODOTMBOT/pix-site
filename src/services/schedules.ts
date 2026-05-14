import { authFetch } from './auth';

export interface ScheduleEntry {
  day:        number;        // 0 = Mon … 6 = Sun
  start_time: string | null; // 'HH:MM'
  end_time:   string | null;
}

export interface UserSchedule {
  user_id:               number;
  user_name?:            string;
  selected_pizzeria_id?: number | null;
  pizzeria_name?:        string | null;
  entries:               ScheduleEntry[];
}

export async function getSchedules(weekStart: string): Promise<UserSchedule[]> {
  const r = await authFetch(`/api/schedules?week=${weekStart}`);
  if (!r.ok) throw new Error('Ошибка загрузки');
  return r.json();
}

export async function saveSchedule(weekStart: string, entries: ScheduleEntry[]): Promise<ScheduleEntry[]> {
  const r = await authFetch(`/api/schedules?week=${weekStart}`, {
    method: 'PUT',
    body: JSON.stringify({ entries }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error((e as any).error || 'Ошибка сохранения');
  }
  return r.json();
}

export async function saveScheduleLocation(weekStart: string, pizzeriaId: number | null): Promise<void> {
  await authFetch(`/api/schedule-location?week=${weekStart}`, {
    method: 'PUT',
    body: JSON.stringify({ pizzeria_id: pizzeriaId }),
  });
}
