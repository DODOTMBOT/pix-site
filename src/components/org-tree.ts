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

  const nodeWrap = document.createElement('div');
  nodeWrap.appendChild(renderOrgNode(employee, onClick));

  // If this employee has multiple managers, show secondary ones as a badge
  const secondaryManagerIds = safeParentIds(employee).slice(1);
  if (secondaryManagerIds.length > 0) {
    const names = secondaryManagerIds
      .map(pid => allEmployees.find(e => e.id === pid)?.name)
      .filter(Boolean)
      .join(', ');
    if (names) {
      const badge = document.createElement('div');
      badge.style.cssText = 'font-size:11px;color:#9ca3af;text-align:center;margin-top:4px;padding:0 4px;';
      badge.textContent = `Также: ${names}`;
      nodeWrap.appendChild(badge);
    }
  }

  branch.appendChild(nodeWrap);

  if (visited.has(employee.id)) return branch;
  visited.add(employee.id);

  // Only primary children: those whose first parent is this employee
  const children = allEmployees.filter(e => safeParentIds(e)[0] === employee.id);
  if (children.length === 0) return branch;

  const connector = document.createElement('div');
  connector.className = 'org-connector';
  branch.appendChild(connector);

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'org-children-wrap';

  children.forEach((child, i) => {
    const lineWrap = document.createElement('div');
    lineWrap.className = 'org-child-col';

    const topLine = document.createElement('div');
    topLine.className = 'org-connector';
    lineWrap.appendChild(topLine);
    lineWrap.appendChild(buildBranch(child, allEmployees, onClick, new Set(visited)));
    childrenWrap.appendChild(lineWrap);

    if (i < children.length - 1) {
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
