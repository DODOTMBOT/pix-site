import { authFetch } from './auth';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayShift {
  start: string; // "HH:MM"
  end:   string; // "HH:MM"
  off:   boolean;
}

export type WeekShifts = Partial<Record<DayKey, DayShift>>;

export interface ScheduleRow {
  id:       number;
  week:     string;
  pizzeria: string;
  employee: string;
  shifts:   WeekShifts;
}

export const DAY_KEYS: DayKey[]     = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
};

export function getWeekLabel(week: string): string {
  const [year, wNum] = week.split('-W');
  const w = parseInt(wNum, 10);
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  const startMs = jan4.getTime() - (((jan4.getDay() + 6) % 7) - (w - 1) * 7) * 86400000;
  const start = new Date(startMs);
  const end   = new Date(startMs + 6 * 86400000);
  const fmt = (d: Date) => `${d.getDate()} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]}`;
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}

export function currentISOWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
  const diff = now.getTime() - startOfWeek1.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function shiftWeek(week: string, delta: number): string {
  const [year, wNum] = week.split('-W');
  const y = parseInt(year, 10);
  const w = parseInt(wNum, 10);
  const jan4 = new Date(y, 0, 4);
  const startMs = jan4.getTime() - (((jan4.getDay() + 6) % 7) - (w - 1) * 7) * 86400000;
  const newStart = new Date(startMs + delta * 7 * 86400000);
  const jan4New = new Date(newStart.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4New.getTime() - ((jan4New.getDay() + 6) % 7) * 86400000);
  const newWeek = Math.floor((newStart.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
  return `${newStart.getFullYear()}-W${String(newWeek).padStart(2, '0')}`;
}

export function totalHours(shifts: WeekShifts): number {
  let total = 0;
  for (const key of DAY_KEYS) {
    const s = shifts[key];
    if (!s || s.off || !s.start || !s.end) continue;
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) total += diff / 60;
  }
  return Math.round(total * 10) / 10;
}

export async function fetchSchedule(week: string, pizzeria: string): Promise<ScheduleRow[]> {
  const res = await authFetch(`/api/schedule?week=${encodeURIComponent(week)}&pizzeria=${encodeURIComponent(pizzeria)}`);
  if (!res.ok) throw new Error('Ошибка загрузки графика');
  return res.json();
}

export async function fetchOverview(week: string): Promise<ScheduleRow[]> {
  const res = await authFetch(`/api/schedule/overview?week=${encodeURIComponent(week)}`);
  if (!res.ok) throw new Error('Ошибка загрузки обзора');
  return res.json();
}

export async function saveScheduleRow(row: Omit<ScheduleRow, 'id'>): Promise<void> {
  const res = await authFetch('/api/schedule', {
    method: 'POST',
    body:   JSON.stringify(row),
  });
  if (!res.ok) throw new Error('Ошибка сохранения');
}

export async function deleteScheduleRow(id: number): Promise<void> {
  const res = await authFetch(`/api/schedule/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Ошибка удаления');
}
