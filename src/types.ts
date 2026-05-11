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
  leaderIds: string[];
  parentDepartmentId: string | null;
  priority: number;
  color?: string;
}

export interface RateCell {
  value: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
  highlight?: 'orange' | 'dark' | 'none';
}

export interface RateRow {
  cells: RateCell[];
  isHeader?: boolean;
}

export interface RateTable {
  id: string;
  title: string;
  note?: string;
  rows: RateRow[];
}

export interface RateSection {
  id: string;
  title: string;
  tables: RateTable[];
}

export interface RateDocument {
  id: string;
  pizzeria: string;
  title: string;
  sections: RateSection[];
  updatedAt: string;
}

export interface AccessEntry {
  id: string;
  serviceName: string;
  serviceUrl: string;
  login: string;
  password: string;
  pizzeria: string;
  notes: string;
  createdAt: string;
}

export interface HomeBlock {
  id: string;
  title: string;
  description: string;
  photo?: string;
  link?: string;
  size: 'large' | 'small';
  bgColor?: string;
}

export interface HomeSettings {
  headline: string;
  subheadline: string;
  blocks: HomeBlock[];
}

export interface MotivationMetric {
  id: string;
  name: string;
  block: 'ratings' | 'profit';
  direction: 'higher' | 'lower';
  unit?: string;
}

export interface MotivationTarget {
  metricId: string;
  weight: number;
  targetValue: string;
  wowValue?: string;
  result?: string;
  fulfilled?: boolean | null;
  wowFulfilled?: boolean | null;
}

export interface ResetCondition {
  id: string;
  description: string;
  criticalValue?: string;
  triggered?: boolean;
}

export interface MotivationPlan {
  id: string;
  pizzeria: string;
  month: string;
  bonusFund: number;
  wowFund: number;
  ratingsWeight: number;
  profitWeight: number;
  targets: MotivationTarget[];
  resetConditions: ResetCondition[];
}

export interface MotivationResult {
  planId: string;
  bonusAmount: number;
  wowAmount: number;
  totalAmount: number;
  isReset: boolean;
  breakdown: {
    metricId: string;
    metricName: string;
    block: string;
    weight: number;
    blockWeight: number;
    earned: number;
    wowEarned: number;
  }[];
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  pizzerias: string;
  phone: string;
  email: string;
  extraFields: { label: string; value: string }[];
  avatar?: string;
}

export interface ProjectSubBlock {
  id: string;
  price: number;
  tasks: string;
  checkpoints: string;
  hint?: string;
}

export interface ProjectBlock {
  id: string;
  name: string;
  price: number;
  hint?: string;
  subBlocks: ProjectSubBlock[];
}

export interface ProjectTemplate {
  id: string;
  title: string;
  blocks: ProjectBlock[];
  createdAt: string;
}

export interface ProjectAssignment {
  id: string;
  templateId: string;
  templateTitle: string;
  employeeName: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;       // display name, synced from Department.name on save
  departmentId: string | null;
  managerId: string | null; // direct manager (person-to-person)
  pizzeria: string;
  email: string;
  phone: string;
  relatedIds: string[];
  extraFields: { label: string; value: string }[];
  avatar?: string;
}
