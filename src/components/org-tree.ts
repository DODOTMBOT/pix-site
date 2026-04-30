import type { Employee, Department } from '../types';
import { getAvatarColor, getInitials } from './orgchart-node';

function avatarHtml(emp: Employee, size: number): string {
  const fs = Math.round(size * 0.38);
  if (emp.avatar && emp.avatar.startsWith('data:')) {
    return `<img src="${emp.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
  }
  return `<div class="emp-avatar" style="width:${size}px;height:${size}px;font-size:${fs}px;background:${getAvatarColor(emp.name)};">${getInitials(emp.name)}</div>`;
}

function buildEmpNode(
  emp: Employee,
  deptEmployees: Employee[],
  onClick: (emp: Employee) => void,
  visited: Set<string>
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'emp-card';
  card.innerHTML = `
    ${avatarHtml(emp, 28)}
    <div class="emp-info">
      <div class="emp-name">${emp.name}</div>
      <div class="emp-position">${emp.position}</div>
      ${emp.pizzeria ? `<div class="emp-pizzeria">${emp.pizzeria}</div>` : ''}
    </div>
  `;
  card.addEventListener('click', () => onClick(emp));

  if (visited.has(emp.id)) return card;
  const nextVisited = new Set(visited);
  nextVisited.add(emp.id);

  const subordinates = deptEmployees.filter(e => e.managerId === emp.id);
  if (subordinates.length === 0) return card;

  const wrap = document.createElement('div');
  wrap.className = 'emp-with-subs';
  wrap.appendChild(card);

  const subsBlock = document.createElement('div');
  subsBlock.className = 'emp-subs-block';
  subordinates.forEach(sub => subsBlock.appendChild(buildEmpNode(sub, deptEmployees, onClick, nextVisited)));
  wrap.appendChild(subsBlock);

  return wrap;
}

function buildDeptBlock(
  dept: Department,
  allEmployees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'dept-block';

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'dept-title';
  titleEl.textContent = dept.name;
  block.appendChild(titleEl);

  // Leader
  const leader = dept.leaderId ? allEmployees.find(e => e.id === dept.leaderId) : null;
  if (leader) {
    const leaderEl = document.createElement('div');
    leaderEl.className = 'dept-leader';
    leaderEl.innerHTML = `
      ${avatarHtml(leader, 28)}
      <div>
        <span class="dept-leader-name">${leader.name}</span>
        <div class="dept-leader-pos">${leader.position}</div>
      </div>
    `;
    leaderEl.addEventListener('click', () => onClick(leader));
    block.appendChild(leaderEl);
  }

  // Members
  const deptEmps   = allEmployees.filter(e => e.departmentId === dept.id && e.id !== dept.leaderId);
  const deptEmpIds = new Set(deptEmps.map(e => e.id));
  const rootMembers = deptEmps.filter(e => !e.managerId || !deptEmpIds.has(e.managerId));

  if (rootMembers.length > 0) {
    const membersWrap = document.createElement('div');
    membersWrap.className = 'dept-members';
    rootMembers.forEach(emp => {
      membersWrap.appendChild(buildEmpNode(emp, deptEmps, onClick, new Set()));
    });
    block.appendChild(membersWrap);
  }

  return block;
}

function getDeptLevel(deptId: string, departments: Department[], memo: Map<string, number> = new Map()): number {
  if (memo.has(deptId)) return memo.get(deptId)!;
  const dept = departments.find(d => d.id === deptId);
  if (!dept?.parentDepartmentId) { memo.set(deptId, 0); return 0; }
  const level = getDeptLevel(dept.parentDepartmentId, departments, memo) + 1;
  memo.set(deptId, level);
  return level;
}

export function renderOrgTree(
  employees: Employee[],
  departments: Department[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'org-wrap';

  if (departments.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Отделы не настроены</div>`;
    return wrap;
  }

  // Group departments by depth level
  const memo = new Map<string, number>();
  const levels = new Map<number, Department[]>();
  departments.forEach(dept => {
    const lvl = getDeptLevel(dept.id, departments, memo);
    if (!levels.has(lvl)) levels.set(lvl, []);
    levels.get(lvl)!.push(dept);
  });

  const row = document.createElement('div');
  row.className = 'org-row';

  Array.from(levels.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([, depts]) => {
      const col = document.createElement('div');
      col.className = 'org-col';
      depts.forEach(dept => col.appendChild(buildDeptBlock(dept, employees, onClick)));
      row.appendChild(col);
    });

  wrap.appendChild(row);
  return wrap;
}
