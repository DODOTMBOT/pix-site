export interface Route {
  path: string;
  render: () => HTMLElement;
}

export interface NavItem {
  title: string;
  description: string;
  path: string;
  badge?: { text: string; variant: 'orange' | 'gray' };
}

export interface Department {
  id: string;
  name: string;
  leaderId: string | null;
  parentDepartmentId: string | null;
  color?: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;       // display name, synced from Department.name on save
  departmentId: string | null;
  pizzeria: string;
  email: string;
  phone: string;
  relatedIds: string[];
  extraFields: { label: string; value: string }[];
  avatar?: string;
}
