import type { Employee } from '../types';

const STORAGE_KEY = 'pix_employees';

const SEED_DATA: Employee[] = [
  {
    id: '1',
    name: 'Иванов Иван Иванович',
    position: 'CEO',
    department: 'Управление',
    pizzeria: 'Все пиццерии',
    email: 'ivanov@pix-dodo.ru',
    phone: '+7 900 000-00-01',
    parentIds: [],
    relatedIds: [],
    extraFields: [],
  },
  {
    id: '2',
    name: 'Петров Пётр Петрович',
    position: 'Operations Manager',
    department: 'Управление',
    pizzeria: 'Все пиццерии',
    email: 'petrov@pix-dodo.ru',
    phone: '+7 900 000-00-02',
    parentIds: ['1'],
    relatedIds: [],
    extraFields: [],
  },
  {
    id: '3',
    name: 'Сидоров Сидор',
    position: 'Store Manager',
    department: 'ул. Ленина',
    pizzeria: 'ул. Ленина',
    email: 'sidorov@pix-dodo.ru',
    phone: '+7 900 000-00-03',
    parentIds: ['2'],
    relatedIds: [],
    extraFields: [],
  },
  {
    id: '4',
    name: 'Козлов Алексей',
    position: 'Store Manager',
    department: 'ул. Мира',
    pizzeria: 'ул. Мира',
    email: 'kozlov@pix-dodo.ru',
    phone: '+7 900 000-00-04',
    parentIds: ['2'],
    relatedIds: [],
    extraFields: [],
  },
];

function migrate(emp: Record<string, unknown>): Employee {
  if (!Array.isArray(emp['parentIds'])) {
    const old = emp['parentId'];
    emp['parentIds'] = old ? [old] : [];
    delete emp['parentId'];
  }
  if (!Array.isArray(emp['relatedIds'])) emp['relatedIds'] = [];
  if (!Array.isArray(emp['extraFields'])) emp['extraFields'] = [];
  return emp as unknown as Employee;
}

export function getEmployees(): Employee[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = (JSON.parse(raw) as Record<string, unknown>[]).map(migrate);
    return parsed;
  }
  saveEmployees(SEED_DATA);
  return SEED_DATA;
}

export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

export function getEmployee(id: string): Employee | undefined {
  return getEmployees().find(e => e.id === id);
}

export function addEmployee(emp: Omit<Employee, 'id'>): Employee {
  const employees = getEmployees();
  const newEmp: Employee = { ...emp, id: crypto.randomUUID() };
  saveEmployees([...employees, newEmp]);
  return newEmp;
}

export function updateEmployee(id: string, data: Partial<Employee>): void {
  const employees = getEmployees().map(e => e.id === id ? { ...e, ...data } : e);
  saveEmployees(employees);
}

export function deleteEmployee(id: string): void {
  const employees = getEmployees()
    .filter(e => e.id !== id)
    .map(e => ({
      ...e,
      parentIds: e.parentIds.filter(pid => pid !== id),
      relatedIds: e.relatedIds.filter(rid => rid !== id),
    }));
  saveEmployees(employees);
}
