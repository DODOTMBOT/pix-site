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

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  pizzeria: string;
  email: string;
  phone: string;
  parentId: string | null;
  relatedIds: string[];
  extraFields: { label: string; value: string }[];
  avatar?: string;
}
