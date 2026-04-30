import type { Employee, Department } from '../types';
import { getAvatarColor, getInitials } from './orgchart-node';

function avatarHtml(emp: Employee, size: number): string {
  const fs = Math.round(size * 0.38);
  if (emp.avatar && emp.avatar.startsWith('data:')) {
    return `<img src="${emp.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${getAvatarColor(emp.name)};color:#fff;font-size:${fs}px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${getInitials(emp.name)}</div>`;
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
    ${avatarHtml(emp, 32)}
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

  // Subordinates only within this department
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
  allDepts: Department[],
  allEmployees: Employee[],
  onClick: (emp: Employee) => void,
  deptVisited: Set<string>
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'dept-block';

  // ── Header: dept title + leader ──────────────────────────────
  const header = document.createElement('div');
  header.className = 'dept-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'dept-title';
  titleEl.textContent = dept.name;
  header.appendChild(titleEl);

  const leader = dept.leaderId ? allEmployees.find(e => e.id === dept.leaderId) : null;
  if (leader) {
    const leaderEl = document.createElement('div');
    leaderEl.className = 'dept-leader';
    leaderEl.innerHTML = `
      ${avatarHtml(leader, 28)}
      <span class="dept-leader-name">${leader.name}</span>
      <span class="dept-leader-pos">· ${leader.position}</span>
    `;
    leaderEl.addEventListener('click', () => onClick(leader));
    header.appendChild(leaderEl);
  }

  block.appendChild(header);

  // ── Members rendered recursively ─────────────────────────────
  const deptEmps   = allEmployees.filter(e => e.departmentId === dept.id && e.id !== dept.leaderId);
  const deptEmpIds = new Set(deptEmps.map(e => e.id));

  // Root members: no managerId, or manager is outside this dept
  const rootMembers = deptEmps.filter(e => !e.managerId || !deptEmpIds.has(e.managerId));

  if (rootMembers.length > 0) {
    const membersWrap = document.createElement('div');
    membersWrap.className = 'dept-members';
    rootMembers.forEach(emp => {
      membersWrap.appendChild(buildEmpNode(emp, deptEmps, onClick, new Set()));
    });
    block.appendChild(membersWrap);
  }

  // ── Child departments ────────────────────────────────────────
  if (deptVisited.has(dept.id)) return block;
  const nextDeptVisited = new Set(deptVisited);
  nextDeptVisited.add(dept.id);

  const children = allDepts.filter(d => d.parentDepartmentId === dept.id);
  if (children.length > 0) {
    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'dept-children';
    children.forEach(child => {
      childrenWrap.appendChild(buildDeptBlock(child, allDepts, allEmployees, onClick, nextDeptVisited));
    });
    block.appendChild(childrenWrap);
  }

  return block;
}

export function renderOrgTree(
  employees: Employee[],
  departments: Department[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const chart = document.createElement('div');
  chart.className = 'org-chart';

  const roots = departments.filter(d => d.parentDepartmentId === null);
  if (roots.length === 0) {
    chart.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Отделы не настроены</div>`;
    return chart;
  }

  roots.forEach(root => chart.appendChild(buildDeptBlock(root, departments, employees, onClick, new Set())));
  return chart;
}
