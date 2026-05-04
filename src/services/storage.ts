import type { Employee, Department, AccessEntry } from '../types';

const EMP_KEY    = 'pix_employees';
const DEPT_KEY   = 'pix_departments';
const ACCESS_KEY = 'pix_access';

// ─── Seed data ───────────────────────────────────────────────────────────────

const DEPT_SEED: Department[] = [
  { id: 'd1', name: 'Управление',                  leaderIds: ['e1'], parentDepartmentId: null, priority: 1 },
  { id: 'd2', name: 'Бухгалтерия',                leaderIds: ['e3'], parentDepartmentId: 'd1', priority: 2 },
  { id: 'd3', name: 'Территория 1',               leaderIds: [],     parentDepartmentId: null, priority: 2 },
  { id: 'd4', name: 'Территория 2',               leaderIds: [],     parentDepartmentId: null, priority: 2 },
  { id: 'd5', name: 'Территория 1 — Управляющие', leaderIds: [],     parentDepartmentId: 'd3', priority: 3 },
  { id: 'd6', name: 'Территория 2 — Управляющие', leaderIds: [],     parentDepartmentId: 'd4', priority: 3 },
];

const EMP_SEED: Employee[] = [
  { id: 'e1', name: 'Сигал Борис',       position: 'CEO',               department: 'Управление',  departmentId: 'd1', managerId: null,  pizzeria: 'Все пиццерии', email: 'sigal@pix-dodo.ru',      phone: '+7 900 000-00-01', relatedIds: [], extraFields: [] },
  { id: 'e2', name: 'Коваль Андрей',   position: 'Operations Manager', department: 'Управление',  departmentId: 'd1', managerId: 'e1',  pizzeria: 'Все пиццерии', email: 'koval@pix-dodo.ru',      phone: '+7 900 000-00-02', relatedIds: [], extraFields: [] },
  { id: 'e3', name: 'Подольская Ирина',position: 'Chief Accountant',   department: 'Бухгалтерия', departmentId: 'd2', managerId: 'e1',  pizzeria: '',             email: 'podolskaya@pix-dodo.ru', phone: '+7 900 000-00-03', relatedIds: [], extraFields: [] },
  { id: 'e4', name: 'Катерина Иванова',position: 'Accountant',         department: 'Бухгалтерия', departmentId: 'd2', managerId: 'e3',  pizzeria: '',             email: 'katerina@pix-dodo.ru',   phone: '+7 900 000-00-04', relatedIds: [], extraFields: [] },
  { id: 'e5', name: 'Виктория Смирнова',position: 'Accountant',        department: 'Бухгалтерия', departmentId: 'd2', managerId: 'e3',  pizzeria: '',             email: 'viktoriya@pix-dodo.ru',  phone: '+7 900 000-00-05', relatedIds: [], extraFields: [] },
];

// ─── Department CRUD ──────────────────────────────────────────────────────────

function migrateDepartment(raw: Record<string, unknown>): Department {
  if (typeof raw['priority'] !== 'number') raw['priority'] = 1;
  if (!Array.isArray(raw['leaderIds'])) {
    raw['leaderIds'] = raw['leaderId'] ? [raw['leaderId']] : [];
  }
  delete raw['leaderId'];
  return raw as unknown as Department;
}

export function getDepartments(): Department[] {
  const raw = localStorage.getItem(DEPT_KEY);
  if (raw) return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateDepartment);
  saveDepartments(DEPT_SEED);
  return DEPT_SEED;
}

export function saveDepartments(depts: Department[]): void {
  localStorage.setItem(DEPT_KEY, JSON.stringify(depts));
}

export function getDepartment(id: string): Department | undefined {
  return getDepartments().find(d => d.id === id);
}

export function addDepartment(dept: Omit<Department, 'id'>): Department {
  const all = getDepartments();
  const created: Department = { ...dept, id: crypto.randomUUID() };
  saveDepartments([...all, created]);
  return created;
}

export function updateDepartment(id: string, data: Partial<Department>): void {
  saveDepartments(getDepartments().map(d => d.id === id ? { ...d, ...data } : d));
}

export function deleteDepartment(id: string): void {
  saveDepartments(
    getDepartments()
      .filter(d => d.id !== id)
      .map(d => d.parentDepartmentId === id ? { ...d, parentDepartmentId: null } : d)
  );
  saveEmployees(
    getEmployees().map(e => e.departmentId === id ? { ...e, departmentId: null, department: '' } : e)
  );
}

// ─── Employee CRUD ────────────────────────────────────────────────────────────

function migrateEmployee(raw: Record<string, unknown>): Employee {
  if (!Array.isArray(raw['relatedIds']))      raw['relatedIds']  = [];
  if (!Array.isArray(raw['extraFields']))     raw['extraFields'] = [];
  if (raw['departmentId'] === undefined)      raw['departmentId'] = null;
  if (raw['managerId']    === undefined)      raw['managerId']    = null;
  if (typeof raw['department'] !== 'string')  raw['department']   = '';
  delete raw['parentIds'];
  return raw as unknown as Employee;
}

export function getEmployees(): Employee[] {
  const raw = localStorage.getItem(EMP_KEY);
  if (raw) return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateEmployee);
  saveEmployees(EMP_SEED);
  return EMP_SEED;
}

export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(EMP_KEY, JSON.stringify(employees));
}

export function getEmployee(id: string): Employee | undefined {
  return getEmployees().find(e => e.id === id);
}

export function addEmployee(emp: Omit<Employee, 'id'>): Employee {
  const all = getEmployees();
  const created: Employee = { ...emp, id: crypto.randomUUID() };
  saveEmployees([...all, created]);
  return created;
}

export function updateEmployee(id: string, data: Partial<Employee>): void {
  saveEmployees(getEmployees().map(e => e.id === id ? { ...e, ...data } : e));
}

export function deleteEmployee(id: string): void {
  saveEmployees(
    getEmployees()
      .filter(e => e.id !== id)
      .map(e => ({ ...e, relatedIds: e.relatedIds.filter(rid => rid !== id) }))
  );
  saveDepartments(
    getDepartments().map(d => ({ ...d, leaderIds: d.leaderIds.filter(lid => lid !== id) }))
  );
}

// ─── Access CRUD ──────────────────────────────────────────────────────────────

export function getAccessEntries(): AccessEntry[] {
  const raw = localStorage.getItem(ACCESS_KEY);
  return raw ? JSON.parse(raw) as AccessEntry[] : [];
}

function saveAccessEntries(entries: AccessEntry[]): void {
  localStorage.setItem(ACCESS_KEY, JSON.stringify(entries));
}

export function addAccessEntry(entry: Omit<AccessEntry, 'id' | 'createdAt'>): AccessEntry {
  const created: AccessEntry = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  saveAccessEntries([...getAccessEntries(), created]);
  return created;
}

export function updateAccessEntry(id: string, data: Partial<AccessEntry>): void {
  saveAccessEntries(getAccessEntries().map(e => e.id === id ? { ...e, ...data } : e));
}

export function deleteAccessEntry(id: string): void {
  saveAccessEntries(getAccessEntries().filter(e => e.id !== id));
}
