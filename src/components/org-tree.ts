import type { Employee } from '../types';
import { renderOrgNode } from './orgchart-node';

function buildBranch(
  employee: Employee,
  allEmployees: Employee[],
  onClick: (emp: Employee) => void,
  visited: Set<string>
): HTMLElement {
  const branch = document.createElement('div');
  branch.className = 'org-branch';

  branch.appendChild(renderOrgNode(employee, onClick));

  // guard against cycles
  if (visited.has(employee.id)) return branch;
  visited.add(employee.id);

  const children = allEmployees.filter(e => e.parentIds.includes(employee.id));
  if (children.length === 0) return branch;

  const connector = document.createElement('div');
  connector.className = 'org-connector';
  branch.appendChild(connector);

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'org-children-wrap';

  children.forEach((child, i) => {
    const childBranch = buildBranch(child, allEmployees, onClick, new Set(visited));

    const lineWrap = document.createElement('div');
    lineWrap.className = 'org-child-col';

    const topLine = document.createElement('div');
    topLine.className = 'org-connector';
    lineWrap.appendChild(topLine);
    lineWrap.appendChild(childBranch);
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

  const roots = employees.filter(e => e.parentIds.length === 0);
  if (roots.length === 0) return wrap;

  const topLevel = document.createElement('div');
  topLevel.className = 'org-level';

  roots.forEach(root => topLevel.appendChild(buildBranch(root, employees, onClick, new Set())));
  wrap.appendChild(topLevel);
  return wrap;
}
