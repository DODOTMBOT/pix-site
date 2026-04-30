import type { Employee } from '../types';
import { getAvatarColor, getInitials } from './orgchart-node';

function safeParentIds(e: Employee): string[] {
  return Array.isArray(e.parentIds) ? e.parentIds : [];
}

function renderCard(
  emp: Employee,
  allEmployees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

  // Badge only when employee has more than one manager
  const pids = safeParentIds(emp);
  if (pids.length > 1) {
    const names = pids
      .map(pid => allEmployees.find(e => e.id === pid)?.name.split(' ')[0])
      .filter(Boolean)
      .join(', ');
    if (names) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:#9ca3af;margin-bottom:4px;text-align:center;width:160px;';
      hint.textContent = `↑ ${names}`;
      wrap.appendChild(hint);
    }
  }

  const card = document.createElement('div');
  card.className = 'org-node';

  const avatarHtml = emp.avatar && emp.avatar.startsWith('data:')
    ? `<img src="${emp.avatar}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block;flex-shrink:0;">`
    : `<div class="org-avatar" style="background:${getAvatarColor(emp.name)}">${getInitials(emp.name)}</div>`;

  card.innerHTML = `
    ${avatarHtml}
    <div style="font-size:13px;font-weight:600;color:#111;line-height:1.3;margin-bottom:3px;">${emp.name}</div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">${emp.position}</div>
    <div style="font-size:11px;color:#9ca3af;">${emp.department}</div>
  `;

  card.addEventListener('click', () => onClick(emp));
  wrap.appendChild(card);
  return wrap;
}

function buildCol(
  emp: Employee,
  allEmployees: Employee[],
  onClick: (emp: Employee) => void,
  visited: Set<string>
): HTMLElement {
  const col = document.createElement('div');
  col.className = 'org-col';

  col.appendChild(renderCard(emp, allEmployees, onClick));

  if (visited.has(emp.id)) return col;
  const nextVisited = new Set(visited);
  nextVisited.add(emp.id);

  const children = allEmployees.filter(e => safeParentIds(e)[0] === emp.id);
  if (children.length === 0) return col;

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'org-children';
  children.forEach(child => childrenWrap.appendChild(buildCol(child, allEmployees, onClick, nextVisited)));

  col.appendChild(childrenWrap);
  return col;
}

export function renderOrgTree(
  employees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow-x:auto;padding:8px 0 32px;';

  const roots = employees.filter(e => safeParentIds(e).length === 0);
  if (roots.length === 0) return wrap;

  const level = document.createElement('div');
  level.className = 'org-level';

  const visited = new Set<string>();
  roots.forEach(root => {
    level.appendChild(buildCol(root, employees, onClick, visited));
    visited.add(root.id);
  });

  wrap.appendChild(level);
  return wrap;
}
