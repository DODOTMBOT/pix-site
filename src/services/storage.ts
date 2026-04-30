import type { Employee, Department } from '../types';

const EMP_KEY  = 'pix_employees';
const DEPT_KEY = 'pix_departments';

// ─── Seed data ───────────────────────────────────────────────────────────────

const DEPT_SEED: Department[] = [
  { id: 'd1', name: 'Управление',  leaderId: 'e1', parentDepartmentId: null },
  { id: 'd2', name: 'Бухгалтерия', leaderId: 'e3', parentDepartmentId: 'd1' },
];

const EMP_SEED: Employee[] = [
  { id: 'e1', name: 'Сигал Борис',      position: 'CEO',               department: 'Управление',  departmentId: 'd1', pizzeria: 'Все пиццерии',   email: 'sigal@pix-dodo.ru',      phone: '+7 900 000-00-01', relatedIds: [], extraFields: [] },
  { id: 'e2', name: 'Коваль Андрей',    position: 'Operations Manager', department: 'Управление',  departmentId: 'd1', pizzeria: 'Все пиццерии',   email: 'koval@pix-dodo.ru',      phone: '+7 900 000-00-02', relatedIds: [], extraFields: [] },
  { id: 'e3', name: 'Подольская Ирина', position: 'Chief Accountant',   department: 'Бухгалтерия', departmentId: 'd2', pizzeria: '',               email: 'podolskaya@pix-dodo.ru', phone: '+7 900 000-00-03', relatedIds: [], extraFields: [] },
  { id: 'e4', name: 'Катерина Иванова', position: 'Accountant',         department: 'Бухгалтерия', departmentId: 'd2', pizzeria: '',               email: 'katerina@pix-dodo.ru',   phone: '+7 900 000-00-04', relatedIds: [], extraFields: [] },
  { id: 'e5', name: 'Виктория Смирнова',position: 'Accountant',         department: 'Бухгалтерия', departmentId: 'd2', pizzeria: '',               email: 'viktoriya@pix-dodo.ru',  phone: '+7 900 000-00-05', relatedIds: [], extraFields: [] },
];

// ─── Department CRUD ──────────────────────────────────────────────────────────

export function getDepartments(): Department[] {
  const raw = localStorage.getItem(DEPT_KEY);
  if (raw) return JSON.parse(raw) as Department[];
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
  if (!Array.isArray(raw['relatedIds']))  raw['relatedIds']  = [];
  if (!Array.isArray(raw['extraFields'])) raw['extraFields'] = [];
  if (raw['departmentId'] === undefined)  raw['departmentId'] = null;
  if (typeof raw['department'] !== 'string') raw['department'] = '';
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
    getDepartments().map(d => d.leaderId === id ? { ...d, leaderId: null } : d)
  );
}
