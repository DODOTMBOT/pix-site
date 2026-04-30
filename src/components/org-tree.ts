import type { Employee } from '../types';
import { getAvatarColor, getInitials } from './orgchart-node';

function safeParentIds(e: Employee): string[] {
  return Array.isArray(e.parentIds) ? e.parentIds : [];
}

// Assign each employee a level: roots=0, children=max(parent levels)+1
function computeLevelMap(employees: Employee[]): Map<string, number> {
  const map = new Map<string, number>();
  employees.forEach(e => {
    if (safeParentIds(e).length === 0) map.set(e.id, 0);
  });
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of employees) {
      const pids = safeParentIds(e);
      if (pids.length === 0) continue;
      const maxParent = pids.reduce((m, pid) => Math.max(m, map.get(pid) ?? -1), -1);
      if (maxParent < 0) continue;
      const next = maxParent + 1;
      if ((map.get(e.id) ?? -1) < next) {
        map.set(e.id, next);
        changed = true;
      }
    }
  }
  return map;
}

function renderCard(
  emp: Employee,
  allEmployees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

  const pids = safeParentIds(emp);
  if (pids.length > 0) {
    const names = pids
      .map(pid => allEmployees.find(e => e.id === pid)?.name.split(' ')[0])
      .filter(Boolean)
      .join(', ');
    if (names) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:#9ca3af;margin-bottom:4px;text-align:center;max-width:160px;';
      hint.textContent = `↑ ${names}`;
      wrap.appendChild(hint);
    }
  }

  const card = document.createElement('div');
  card.style.cssText = [
    'background:#fff',
    'border:1px solid #e5e7eb',
    'border-radius:12px',
    'padding:16px 12px',
    'width:160px',
    'text-align:center',
    'cursor:pointer',
    'transition:box-shadow 0.15s,border-color 0.15s',
    'box-sizing:border-box',
  ].join(';');

  const avatarHtml = emp.avatar && emp.avatar.startsWith('data:')
    ? `<img src="${emp.avatar}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block;">`
    : `<div style="width:48px;height:48px;border-radius:50%;background:${getAvatarColor(emp.name)};color:#fff;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">${getInitials(emp.name)}</div>`;

  card.innerHTML = `
    ${avatarHtml}
    <div style="font-size:13px;font-weight:600;color:#111;line-height:1.3;margin-bottom:3px;">${emp.name}</div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">${emp.position}</div>
    <div style="font-size:11px;color:#9ca3af;">${emp.department}</div>
  `;

  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
    card.style.borderColor = '#f97316';
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = '';
    card.style.borderColor = '#e5e7eb';
  });
  card.addEventListener('click', () => onClick(emp));

  wrap.appendChild(card);
  return wrap;
}

export function renderOrgTree(
  employees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow-x:auto;padding:8px 0 32px;';

  const levelMap = computeLevelMap(employees);
  const maxLevel = employees.reduce((m, e) => Math.max(m, levelMap.get(e.id) ?? -1), -1);
  if (maxLevel < 0) return wrap;

  const visited = new Set<string>();

  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const row = employees
      .filter(e => levelMap.get(e.id) === lvl && !visited.has(e.id))
      .sort((a, b) => {
        const pa = safeParentIds(a)[0] ?? '';
        const pb = safeParentIds(b)[0] ?? '';
        return pa !== pb ? pa.localeCompare(pb) : a.name.localeCompare(b.name);
      });

    if (row.length === 0) continue;
    row.forEach(e => visited.add(e.id));

    const rowEl = document.createElement('div');
    rowEl.style.cssText = `display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:16px;${lvl > 0 ? 'margin-top:32px;' : ''}`;

    let prevPrimary = '';
    row.forEach(emp => {
      const primary = safeParentIds(emp)[0] ?? '';
      if (prevPrimary && primary !== prevPrimary) {
        const spacer = document.createElement('div');
        spacer.style.cssText = 'width:16px;flex-shrink:0;';
        rowEl.appendChild(spacer);
      }
      prevPrimary = primary;
      rowEl.appendChild(renderCard(emp, employees, onClick));
    });

    wrap.appendChild(rowEl);
  }

  return wrap;
}
