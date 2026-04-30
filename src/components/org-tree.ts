import type { Employee } from '../types';
import { getAvatarColor, getInitials } from './orgchart-node';

function safeParentIds(e: Employee): string[] {
  return Array.isArray(e.parentIds) ? e.parentIds : [];
}

function computeLevels(employees: Employee[]): Map<string, number> {
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

function renderOrgNode(emp: Employee, onClick: (emp: Employee) => void): HTMLElement {
  const node = document.createElement('div');
  node.className = 'org-node';

  const avatarHtml = emp.avatar && emp.avatar.startsWith('data:')
    ? `<img src="${emp.avatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block;">`
    : `<div class="org-avatar" style="background:${getAvatarColor(emp.name)}">${getInitials(emp.name)}</div>`;

  node.innerHTML = `
    ${avatarHtml}
    <div style="font-size:13px;font-weight:600;color:#111;line-height:1.3;margin-bottom:2px;">${emp.name}</div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:1px;">${emp.position}</div>
    <div style="font-size:11px;color:#9ca3af;">${emp.department}</div>
  `;

  node.addEventListener('click', () => onClick(emp));
  return node;
}

export function renderOrgTree(
  employees: Employee[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const chart = document.createElement('div');
  chart.className = 'org-chart';

  const levelMap = computeLevels(employees);
  const maxLevel = employees.reduce((m, e) => Math.max(m, levelMap.get(e.id) ?? -1), -1);
  if (maxLevel < 0) return chart;

  const visited = new Set<string>();

  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const levelEmps = employees.filter(e => levelMap.get(e.id) === lvl && !visited.has(e.id));
    if (levelEmps.length === 0) continue;
    levelEmps.forEach(e => visited.add(e.id));

    const levelEl = document.createElement('div');
    levelEl.className = 'org-level';

    if (lvl === 0) {
      // Roots: render nodes directly in the level row
      levelEmps.forEach(emp => levelEl.appendChild(renderOrgNode(emp, onClick)));
    } else {
      // Group by parentIds + department
      const groups = new Map<string, { parentKey: string; dept: string; members: Employee[] }>();
      levelEmps.forEach(emp => {
        const parentKey = safeParentIds(emp).slice().sort().join(',');
        const fullKey = parentKey + '|' + emp.department;
        if (!groups.has(fullKey)) groups.set(fullKey, { parentKey, dept: emp.department, members: [] });
        groups.get(fullKey)!.members.push(emp);
      });

      // Determine which parentKeys have multiple departments (need dept shown in label)
      const parentKeyDeptCount = new Map<string, number>();
      groups.forEach(({ parentKey }) => {
        parentKeyDeptCount.set(parentKey, (parentKeyDeptCount.get(parentKey) ?? 0) + 1);
      });

      // Sort groups: by parentKey first (clusters same-parent groups), then by dept
      const sortedGroups = Array.from(groups.values()).sort((a, b) =>
        a.parentKey !== b.parentKey ? a.parentKey.localeCompare(b.parentKey) : a.dept.localeCompare(b.dept)
      );

      let prevParentKey = '';
      sortedGroups.forEach(({ parentKey, dept, members }) => {
        // Insert spacer between groups of different parent sets
        if (prevParentKey && parentKey !== prevParentKey) {
          const spacer = document.createElement('div');
          spacer.style.cssText = 'width:16px;flex-shrink:0;';
          levelEl.appendChild(spacer);
        }
        prevParentKey = parentKey;

        const group = document.createElement('div');
        group.className = 'org-group';

        const label = document.createElement('div');
        label.className = 'org-group-label';
        const parentNames = parentKey.split(',')
          .map(pid => employees.find(e => e.id === pid)?.name.split(' ')[0])
          .filter(Boolean)
          .join(', ');
        const showDept = (parentKeyDeptCount.get(parentKey) ?? 1) > 1;
        label.textContent = showDept ? `↑ ${parentNames} · ${dept}` : `↑ ${parentNames}`;
        group.appendChild(label);

        const nodes = document.createElement('div');
        nodes.className = 'org-group-nodes';
        members.forEach(emp => nodes.appendChild(renderOrgNode(emp, onClick)));
        group.appendChild(nodes);

        levelEl.appendChild(group);
      });
    }

    chart.appendChild(levelEl);
  }

  return chart;
}
