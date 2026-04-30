import type { Employee } from '../types';

const AVATAR_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f59e0b', '#ec4899',
  '#14b8a6', '#6366f1',
];

export function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function renderOrgNode(
  employee: Employee,
  onClick: (emp: Employee) => void
): HTMLElement {
  const node = document.createElement('div');
  node.className = 'org-node';

  const avatarContent = employee.avatar && employee.avatar.startsWith('data:')
    ? `<img src="${employee.avatar}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">`
    : `<div class="org-avatar" style="background:${getAvatarColor(employee.name)}">${getInitials(employee.name)}</div>`;

  node.innerHTML = `
    ${avatarContent}
    <div style="font-size:13px; font-weight:600; color:#111; line-height:1.3; margin-bottom:3px;">${employee.name}</div>
    <div style="font-size:12px; color:#6b7280; margin-bottom:2px;">${employee.position}</div>
    <div style="font-size:11px; color:#9ca3af;">${employee.department}</div>
  `;

  node.addEventListener('click', () => onClick(employee));
  return node;
}
