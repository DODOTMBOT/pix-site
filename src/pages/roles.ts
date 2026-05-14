import { authFetch, roleLabel } from '../services/auth';
import type { Role } from '../services/auth';

// ── Data definitions ──────────────────────────────────────────────────────────

const PAGES: { key: string; label: string; locked?: boolean }[] = [
  { key: 'pizzerias',   label: 'Пиццерии' },
  { key: 'contacts',    label: 'Контакты' },
  { key: 'rates',       label: 'Ставки' },
  { key: 'credentials', label: 'Доступы' },
  { key: 'motivation',  label: 'Мотивация' },
  { key: 'schedules',   label: 'Графики' },
  { key: '__users__',   label: 'Пользователи', locked: true },
  { key: '__roles__',   label: 'Роли',         locked: true },
];

const EDIT_ROLES: { key: string; label: string; color: string }[] = [
  { key: 'management',    label: 'Руководство',    color: '#FF6900' },
  { key: 'manager',       label: 'Управляющий',    color: '#0ea5e9' },
  { key: 'shift_manager', label: 'Смен. менеджер', color: '#8b5cf6' },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'superadmin',    label: 'Суперадмин' },
  { value: 'management',    label: 'Руководство' },
  { value: 'manager',       label: 'Управляющий' },
  { value: 'shift_manager', label: 'Сменный менеджер' },
];

type PermLevel = 'none' | 'read' | 'full';

interface PermRow { role: string; resource: string; can_read: number; can_write: number; }
interface UserRow { id: number; name: string; email: string; role: Role; job_title: string | null; }

function toLevel(can_read: number, can_write: number): PermLevel {
  if (!can_read) return 'none';
  if (!can_write) return 'read';
  return 'full';
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function renderRoles(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';
  page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;

  Promise.all([
    authFetch('/api/permissions').then(r => r.json() as Promise<PermRow[]>),
    authFetch('/api/users').then(r => r.json() as Promise<UserRow[]>),
  ]).then(([perms, users]) => {
    page.replaceChildren(buildLayout(perms, users));
  }).catch(() => {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
  });

  return page;
}

function buildLayout(perms: PermRow[], users: UserRow[]): HTMLElement {
  const wrap = document.createElement('div');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'margin-bottom:28px;';
  hdr.innerHTML = `
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px;">Роли и доступы</h1>
    <div style="font-size:13px;color:var(--text-muted);">— нет доступа · Чтение — только просмотр · Полный — просмотр и редактирование</div>
  `;
  wrap.appendChild(hdr);

  wrap.appendChild(buildPermMatrix(perms));

  const spacer = document.createElement('div');
  spacer.style.cssText = 'height:28px;';
  wrap.appendChild(spacer);

  wrap.appendChild(buildUsersSection(users));
  return wrap;
}

// ── Permission matrix ─────────────────────────────────────────────────────────

function buildPermMatrix(initial: PermRow[]): HTMLElement {
  const state = new Map<string, PermLevel>();
  for (const r of EDIT_ROLES) {
    for (const pg of PAGES) {
      if (pg.locked) continue;
      const found = initial.find(p => p.role === r.key && p.resource === pg.key);
      state.set(`${r.key}:${pg.key}`, toLevel(found?.can_read ?? 0, found?.can_write ?? 0));
    }
  }

  const section = document.createElement('div');

  const title = document.createElement('div');
  title.style.cssText = 'font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;';
  title.textContent = 'Матрица доступов';
  section.appendChild(title);

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';

  // thead
  const thead = document.createElement('thead');
  let thHtml = `<tr>
    <th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">Страница</th>
    <th style="text-align:center;padding:10px 8px;font-size:12px;border-bottom:1px solid var(--border);width:110px;">
      <div style="font-weight:700;color:#FF6900;">Суперадмин</div>
    </th>`;
  for (const role of EDIT_ROLES) {
    thHtml += `<th style="text-align:center;padding:10px 8px;font-size:12px;border-bottom:1px solid var(--border);width:160px;">
      <div style="font-weight:700;color:${role.color};">${role.label}</div>
    </th>`;
  }
  thHtml += `</tr>`;
  thead.innerHTML = thHtml;
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement('tbody');

  PAGES.forEach((pg, i) => {
    const tr = document.createElement('tr');
    tr.style.cssText = i % 2 === 0 ? '' : 'background:var(--bg-secondary);';

    const labelTd = document.createElement('td');
    labelTd.style.cssText = 'padding:10px 16px;font-size:13px;font-weight:600;color:var(--text-primary);';
    labelTd.textContent = pg.label;
    tr.appendChild(labelTd);

    // Superadmin — always full
    const saTd = document.createElement('td');
    saTd.style.cssText = 'text-align:center;padding:8px;';
    saTd.innerHTML = lockedBadge('full');
    tr.appendChild(saTd);

    if (pg.locked) {
      for (let _i = 0; _i < EDIT_ROLES.length; _i++) {
        const td = document.createElement('td');
        td.style.cssText = 'text-align:center;padding:8px;';
        td.innerHTML = lockedBadge('none');
        tr.appendChild(td);
      }
    } else {
      for (const role of EDIT_ROLES) {
        const key = `${role.key}:${pg.key}`;
        const td = document.createElement('td');
        td.style.cssText = 'text-align:center;padding:8px;';
        td.appendChild(buildSelector(state.get(key)!, role.color, async (newLevel) => {
          state.set(key, newLevel);
          await authFetch('/api/permissions', {
            method: 'PUT',
            body: JSON.stringify({
              role:      role.key,
              resource:  pg.key,
              can_read:  newLevel !== 'none' ? 1 : 0,
              can_write: newLevel === 'full'  ? 1 : 0,
            }),
          });
        }));
        tr.appendChild(td);
      }
    }

    tbody.appendChild(tr);
  });

  const noteRow = document.createElement('tr');
  noteRow.innerHTML = `<td colspan="${2 + EDIT_ROLES.length}" style="padding:8px 16px;border-top:1px solid var(--border);background:var(--bg-secondary);">
    <span style="font-size:11px;color:var(--text-muted);">Изменения вступают в силу немедленно. Пользователь без доступа не видит страницу в меню.</span>
  </td>`;
  tbody.appendChild(noteRow);

  table.appendChild(tbody);
  card.appendChild(table);
  section.appendChild(card);
  return section;
}

function buildSelector(initial: PermLevel, accentColor: string, onChange: (level: PermLevel) => Promise<void>): HTMLElement {
  const OPTIONS: { value: PermLevel; label: string }[] = [
    { value: 'none', label: '—' },
    { value: 'read', label: 'Чтение' },
    { value: 'full', label: 'Полный' },
  ];

  let current = initial;
  let saving  = false;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:inline-flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;';

  const buttons: HTMLButtonElement[] = [];

  function setActive(level: PermLevel): void {
    buttons.forEach(btn => {
      const active = btn.dataset['val'] === level;
      btn.style.background = active
        ? (level === 'none' ? 'var(--bg-hover)' : accentColor + '22')
        : 'transparent';
      btn.style.color = active
        ? (level === 'none' ? 'var(--text-muted)' : accentColor)
        : 'var(--text-muted)';
      btn.style.fontWeight = active ? '700' : '400';
    });
  }

  OPTIONS.forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.dataset['val'] = value;
    btn.textContent    = label;
    btn.style.cssText  = `
      border:none;cursor:pointer;font-size:11px;font-family:inherit;padding:4px 9px;
      transition:background 0.12s,color 0.12s;white-space:nowrap;
    `;
    btn.addEventListener('click', async () => {
      if (saving || current === value) return;
      saving = true;
      const prev = current;
      current = value;
      setActive(current);
      wrap.style.opacity = '0.6';
      try {
        await onChange(value);
      } catch {
        current = prev;
        setActive(current);
      } finally {
        saving = false;
        wrap.style.opacity = '1';
      }
    });
    buttons.push(btn);
    wrap.appendChild(btn);
  });

  setActive(current);
  return wrap;
}

function lockedBadge(level: PermLevel): string {
  if (level === 'full') {
    return `<span style="font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;background:#FF690018;color:#FF6900;">Полный</span>`;
  }
  return `<span style="font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;background:var(--bg-hover);color:var(--text-muted);">—</span>`;
}

// ── User role management ──────────────────────────────────────────────────────

function buildUsersSection(users: UserRow[]): HTMLElement {
  const section = document.createElement('div');

  const title = document.createElement('div');
  title.style.cssText = 'font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;';
  title.textContent = 'Пользователи';
  section.appendChild(title);

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';
  table.innerHTML = `<thead><tr style="border-bottom:1px solid var(--border);">
    <th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:600;color:var(--text-muted);">Имя</th>
    <th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:600;color:var(--text-muted);">Email</th>
    <th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:600;color:var(--text-muted);">Должность</th>
    <th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:600;color:var(--text-muted);width:180px;">Роль</th>
    <th style="width:100px;padding:10px 16px;"></th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');

  const roleBadge = (role: Role) => {
    const colors: Record<string, string> = {
      superadmin:    '#FF6900',
      management:    '#FF6900',
      manager:       '#0ea5e9',
      shift_manager: '#8b5cf6',
    };
    const c = colors[role] ?? '#888';
    return `<span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:${c}18;color:${c};">${roleLabel(role)}</span>`;
  };

  users.forEach((u, i) => {
    const tr = document.createElement('tr');
    tr.style.cssText = i % 2 !== 0 ? 'background:var(--bg-secondary);' : '';

    const sel = document.createElement('select');
    sel.style.cssText = 'padding:5px 8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);width:100%;';
    ROLE_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value       = opt.value;
      o.textContent = opt.label;
      o.selected    = opt.value === u.role;
      sel.appendChild(o);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-outline';
    saveBtn.style.cssText = 'padding:4px 12px;font-size:12px;white-space:nowrap;';
    saveBtn.textContent = 'Сохранить';

    const statusEl = document.createElement('span');
    statusEl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-left:6px;';

    const badgeTd = document.createElement('td');
    badgeTd.style.cssText = 'padding:9px 16px;';
    badgeTd.innerHTML = roleBadge(u.role);

    let currentRole = u.role;

    sel.addEventListener('change', () => {
      saveBtn.style.fontWeight = sel.value !== currentRole ? '700' : '';
    });

    saveBtn.addEventListener('click', async () => {
      const newRole = sel.value as Role;
      if (newRole === currentRole) return;
      saveBtn.disabled = true;
      saveBtn.textContent = '...';
      statusEl.textContent = '';
      try {
        const r = await authFetch(`/api/users/${u.id}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role: newRole }),
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error((e as any).error || 'Ошибка');
        }
        currentRole = newRole;
        badgeTd.innerHTML = roleBadge(newRole);
        statusEl.textContent = '✓';
        statusEl.style.color = 'var(--accent)';
        saveBtn.style.fontWeight = '';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      } catch (err) {
        statusEl.textContent = (err as Error).message;
        statusEl.style.color = '#ef4444';
        sel.value = currentRole;
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
      }
    });

    const selTd = document.createElement('td');
    selTd.style.cssText = 'padding:6px 16px;';
    selTd.appendChild(sel);

    const actionTd = document.createElement('td');
    actionTd.style.cssText = 'padding:6px 16px;white-space:nowrap;';
    actionTd.appendChild(saveBtn);
    actionTd.appendChild(statusEl);

    tr.innerHTML = `
      <td style="padding:9px 16px;font-size:13px;font-weight:600;">${esc(u.name)}</td>
      <td style="padding:9px 16px;font-size:12px;color:var(--text-secondary);">${esc(u.email)}</td>
      <td style="padding:9px 16px;font-size:12px;color:var(--text-muted);">${u.job_title ? esc(u.job_title) : '—'}</td>
    `;
    tr.appendChild(badgeTd);
    tr.appendChild(selTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  card.appendChild(table);
  section.appendChild(card);
  return section;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
