import type { Employee, Department, AccessEntry, RateDocument, HomeSettings } from '../types';

// ─── Home settings ────────────────────────────────────────────────────────────

const HOME_KEY = 'pix_home_settings';

const HOME_DEFAULTS: HomeSettings = {
  headline: 'Всё что нужно\nдля работы в PiX',
  subheadline: 'Регламенты, инструкции, ключи доступа и контакты команды — в одном месте, всегда под рукой.',
  photos: [],
  blocks: [
    { id: '1', title: 'Оргструктура', description: 'Вся команда в одном месте', link: '/org', size: 'large', bgColor: '#1a1a1a' },
    { id: '2', title: 'Ставки', description: 'Система оплаты труда', link: '/rates', size: 'small', bgColor: '#f97316' },
    { id: '3', title: 'Доступы', description: 'Логины и пароли сервисов', link: '/access', size: 'small', bgColor: '#374151' },
    { id: '4', title: 'Регламенты', description: 'Стандарты работы и процедуры', link: '/regulations', size: 'large', bgColor: '#166534' },
  ],
};

export function getHomeSettings(): HomeSettings {
  const raw = localStorage.getItem(HOME_KEY);
  return raw ? (JSON.parse(raw) as HomeSettings) : HOME_DEFAULTS;
}

export function saveHomeSettings(settings: HomeSettings): void {
  localStorage.setItem(HOME_KEY, JSON.stringify(settings));
}

// ─────────────────────────────────────────────────────────────────────────────

const EMP_KEY    = 'pix_employees';
const DEPT_KEY   = 'pix_departments';
const ACCESS_KEY = 'pix_access';
const RATES_KEY  = 'pix_rates';

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

// ─── Rate documents seed ──────────────────────────────────────────────────────

const RATES_SEED: RateDocument[] = [
  {
    id: 'rate1',
    pizzeria: 'Немчиновка-1',
    title: 'Система оплаты труда',
    updatedAt: '2026-05-04T00:00:00.000Z',
    sections: [
      {
        id: 'rs1',
        title: 'Работники кухни',
        tables: [
          {
            id: 'rt1',
            title: 'Почасовые ставки',
            rows: [
              { isHeader: true, cells: [{ value: 'Позиция', highlight: 'dark', bold: true }, { value: 'Ставка, руб/ч', highlight: 'dark', bold: true }] },
              { cells: [{ value: 'Стажёр' }, { value: '300' }] },
              { cells: [{ value: 'Пиццамейкер' }, { value: '310' }] },
              { cells: [{ value: 'Универсал' }, { value: '325' }] },
              { cells: [{ value: 'Наставник' }, { value: '325' }] },
              { cells: [{ value: 'Менеджер смены', bold: true }, { value: '365', bold: true }] },
            ],
          },
        ],
      },
      {
        id: 'rs2',
        title: 'Курьеры',
        tables: [
          {
            id: 'rt2',
            title: 'Ставки доставки',
            rows: [
              { isHeader: true, cells: [{ value: 'Параметр', highlight: 'dark', bold: true }, { value: 'Ставка', highlight: 'dark', bold: true }] },
              { cells: [{ value: 'Автомобильный', highlight: 'orange', bold: true }, { value: '—', highlight: 'orange' }] },
              { cells: [{ value: 'Час' }, { value: '115 руб' }] },
              { cells: [{ value: 'Заказ' }, { value: '135 руб' }] },
              { cells: [{ value: 'Км' }, { value: '8 руб' }] },
            ],
          },
        ],
      },
    ],
  },
];

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

// ─── Rate documents CRUD ──────────────────────────────────────────────────────

export function getRateDocuments(): RateDocument[] {
  const raw = localStorage.getItem(RATES_KEY);
  if (raw) return JSON.parse(raw) as RateDocument[];
  saveRateDocuments(RATES_SEED);
  return RATES_SEED;
}

function saveRateDocuments(docs: RateDocument[]): void {
  localStorage.setItem(RATES_KEY, JSON.stringify(docs));
}

export function getRateDocument(id: string): RateDocument | undefined {
  return getRateDocuments().find(d => d.id === id);
}

export function saveRateDocument(doc: RateDocument): void {
  const all = getRateDocuments();
  const idx = all.findIndex(d => d.id === doc.id);
  if (idx >= 0) all[idx] = doc;
  else all.push(doc);
  saveRateDocuments(all);
}

export function deleteRateDocument(id: string): void {
  saveRateDocuments(getRateDocuments().filter(d => d.id !== id));
}
