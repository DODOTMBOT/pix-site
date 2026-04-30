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
  allEmployees: Employee[],
  onClick: (emp: Employee) => void,
  visited: Set<string>
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'emp-card';
  card.innerHTML = `
    ${avatarHtml(emp, 32)}
    <div>
      <div style="font-size:13px;font-weight:600;color:#111;line-height:1.3;">${emp.name}</div>
      <div style="font-size:12px;color:#6b7280;">${emp.position}</div>
    </div>
  `;
  card.addEventListener('click', () => onClick(emp));

  if (visited.has(emp.id)) return card;
  const nextVisited = new Set(visited);
  nextVisited.add(emp.id);

  const subordinates = allEmployees.filter(e => e.managerId === emp.id);
  if (subordinates.length === 0) return card;

  const wrap = document.createElement('div');
  wrap.className = 'emp-with-subs';
  wrap.appendChild(card);

  const subsBlock = document.createElement('div');
  subsBlock.className = 'emp-subs-block';
  subordinates.forEach(sub => subsBlock.appendChild(buildEmpNode(sub, allEmployees, onClick, nextVisited)));
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

  // ── Header: dept leader + dept name ─────────────────────────
  const header = document.createElement('div');
  header.className = 'dept-header';

  const leader = dept.leaderId ? allEmployees.find(e => e.id === dept.leaderId) : null;
  if (leader) {
    const leaderCard = document.createElement('div');
    leaderCard.className = 'dept-leader-card';
    leaderCard.innerHTML = `
      ${avatarHtml(leader, 36)}
      <div>
        <div style="font-size:13px;font-weight:600;color:#111;line-height:1.3;">${leader.name}</div>
        <div style="font-size:12px;color:#6b7280;">${leader.position}</div>
      </div>
    `;
    leaderCard.addEventListener('click', () => onClick(leader));
    header.appendChild(leaderCard);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'dept-name';
  nameEl.textContent = dept.name;
  header.appendChild(nameEl);

  block.appendChild(header);

  // ── Members rendered recursively ─────────────────────────────
  // Root members of this dept: in this dept AND (no managerId, OR manager is outside this dept)
  const deptEmps = allEmployees.filter(e => e.departmentId === dept.id && e.id !== dept.leaderId);
  const rootMembers = deptEmps.filter(e => {
    if (!e.managerId) return true;
    const mgr = allEmployees.find(m => m.id === e.managerId);
    return !mgr || mgr.departmentId !== dept.id;
  });

  if (rootMembers.length > 0) {
    const membersWrap = document.createElement('div');
    membersWrap.className = 'dept-members';
    rootMembers.forEach(emp => {
      membersWrap.appendChild(buildEmpNode(emp, allEmployees, onClick, new Set([dept.leaderId ?? ''])));
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
