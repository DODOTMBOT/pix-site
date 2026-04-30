import type { Employee } from '../types';
import { renderOrgNode } from './orgchart-node';

function safeParentIds(e: Employee): string[] {
  return Array.isArray(e.parentIds) ? e.parentIds : [];
}

function buildBranch(
  employee: Employee,
  allEmployees: Employee[],
  onClick: (emp: Employee) => void,
  visited: Set<string>
): HTMLElement {
  const branch = document.createElement('div');
  branch.className = 'org-branch';

  branch.appendChild(renderOrgNode(employee, onClick));

  if (visited.has(employee.id)) return branch;
  visited.add(employee.id);

  // Primary children: this employee is their first (primary) parent
  const primaryChildren = allEmployees.filter(e => safeParentIds(e)[0] === employee.id);

  // Secondary children: this employee is a non-primary parent — render as dashed reference only
  const secondaryChildren = allEmployees.filter(e => {
    const ids = safeParentIds(e);
    return ids.length > 1 && ids.indexOf(employee.id) > 0;
  });

  if (primaryChildren.length === 0 && secondaryChildren.length === 0) return branch;

  const connector = document.createElement('div');
  connector.className = 'org-connector';
  branch.appendChild(connector);

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'org-children-wrap';

  type ChildItem = { emp: Employee; secondary: boolean };
  const items: ChildItem[] = [
    ...primaryChildren.map(e => ({ emp: e, secondary: false })),
    ...secondaryChildren.map(e => ({ emp: e, secondary: true })),
  ];

  items.forEach(({ emp, secondary }, i) => {
    const lineWrap = document.createElement('div');
    lineWrap.className = 'org-child-col';

    const topLine = document.createElement('div');
    topLine.className = 'org-connector';
    if (secondary) {
      topLine.style.borderLeftStyle = 'dashed';
      topLine.style.borderColor = '#d1d5db';
    }
    lineWrap.appendChild(topLine);

    if (secondary) {
      const refNode = renderOrgNode(emp, onClick);
      refNode.style.borderStyle = 'dashed';
      refNode.style.borderColor = '#d1d5db';
      refNode.style.opacity = '0.75';
      lineWrap.appendChild(refNode);
    } else {
      lineWrap.appendChild(buildBranch(emp, allEmployees, onClick, new Set(visited)));
    }

    childrenWrap.appendChild(lineWrap);

    if (i < items.length - 1) {
      const sep = document.createElement('div');
      sep.className = 'org-sibling-sep';
      childrenWrap.appendChild(sep);
    }
  });

  branch.appendChild(childrenWrap);
  return branch;
}

export function renderOrgTree(
  employees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow-x: auto; padding: 8px 0 32px;';

  const roots = employees.filter(e => safeParentIds(e).length === 0);
  if (roots.length === 0) return wrap;

  const topLevel = document.createElement('div');
  topLevel.className = 'org-level';

  roots.forEach(root => topLevel.appendChild(buildBranch(root, employees, onClick, new Set())));
  wrap.appendChild(topLevel);
  return wrap;
}
