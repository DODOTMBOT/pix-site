import { authFetch, roleLabel } from '../services/auth';
import type { Role } from '../services/auth';

// ── Data definitions ──────────────────────────────────────────────────────────

const RESOURCES: { key: string; label: string; desc: string }[] = [
  { key: 'contacts',      label: 'Контакты',          desc: 'Поставщики и партнёры' },
  { key: 'rates',         label: 'Ставки',             desc: 'Оклады и тарифы' },
  { key: 'credentials',   label: 'Доступы',            desc: 'Логины и пароли' },
  { key: 'motivation',    label: 'Мотивация',          desc: 'Бонусы и правила' },
  { key: 'pizzerias',     label: 'Пиццерии',           desc: 'Создание и редактирование' },
  { key: 'schedules_own', label: 'График (свой)',       desc: 'Составление своего графика' },
  { key: 'schedules_all', label: 'Графики (все)',       desc: 'Просмотр графиков всех управляющих' },
];

const EDIT_ROLES: { key: string; label: string; color: string }[] = [
  { key: 'management',    label: 'Руководство',       color: '#FF6900' },
  { key: 'manager',       label: 'Управляющий',       color: '#0ea5e9' },
  { key: 'shift_manager', label: 'Сменный менеджер',  color: '#8b5cf6' },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'superadmin',    label: 'Суперадмин' },
  { value: 'management',    label: 'Руководство' },
  { value: 'manager',       label: 'Управляющий' },
  { value: 'shift_manager', label: 'Сменный менеджер' },
];

interface PermRow { role: string; resource: string; can_read: number; can_write: number; }
interface UserRow { id: number; name: string; email: string; role: Role; job_title: string | null; }

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
  hdr.style.cssText = 'margin-bottom:32px;';
  hdr.innerHTML = `
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px;">Роли и доступы</h1>
    <div style="font-size:13px;color:var(--text-muted);">Настройка прав доступа и назначение ролей пользователям</div>
  `;
  wrap.appendChild(hdr);

  wrap.appendChild(buildPermMatrix(perms));

  const spacer = document.createElement('div');
  spacer.style.cssText = 'height:32px;';
  wrap.appendChild(spacer);

  wrap.appendChild(buildUsersSection(users));

  return wrap;
}

// ── Permission matrix ─────────────────────────────────────────────────────────

function buildPermMatrix(initial: PermRow[]): HTMLElement {
  // Build a local mutable map: role+resource → {read, write}
  const state = new Map<string, { read: boolean; write: boolean }>();
  for (const r of EDIT_ROLES) {
    for (const res of RESOURCES) {
      const found = initial.find(p => p.role === r.key && p.resource === res.key);
      state.set(`${r.key}:${res.key}`, {
        read:  !!found?.can_read,
        write: !!found?.can_write,
      });
    }
  }

  const section = document.createElement('div');

  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;';
  title.textContent = 'Матрица доступов';
  section.appendChild(title);

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;table-layout:fixed;';

  // thead
  const thead = document.createElement('thead');
  let thHtml = `<tr><th style="width:200px;text-align:left;padding:14px 16px;">Раздел</th>`;
  // Superadmin locked column
  thHtml += `<th style="text-align:center;padding:14px 8px;">
    <div style="font-size:13px;font-weight:700;color:var(--text-muted);">Суперадмин</div>
    <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">всегда полный</div>
  </th>`;
  for (const role of EDIT_ROLES) {
    thHtml += `<th style="text-align:center;padding:14px 8px;" colspan="2">
      <div style="font-size:13px;font-weight:700;color:${role.color};">${role.label}</div>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:6px;">
        <span style="font-size:10px;color:var(--text-muted);font-weight:600;">ЧТЕНИЕ</span>
        <span style="font-size:10px;color:var(--text-muted);font-weight:600;">ЗАПИСЬ</span>
      </div>
    </th>`;
  }
  thHtml += `</tr>`;
  thead.innerHTML = thHtml;
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement('tbody');

  RESOURCES.forEach((res, i) => {
    const tr = document.createElement('tr');
    tr.style.cssText = i % 2 === 0 ? '' : 'background:var(--bg-secondary);';

    let tdHtml = `<td style="padding:12px 16px;">
      <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${res.label}</div>
      <div style="font-size:11px;color:var(--text-muted);">${res.desc}</div>
    </td>`;

    // Superadmin: always locked
    tdHtml += `<td style="text-align:center;padding:12px 8px;" colspan="2">
      <div style="display:flex;gap:20px;justify-content:center;">
        ${lockedCheck(true)}
        ${lockedCheck(true)}
      </div>
    </td>`;

    tr.innerHTML = tdHtml;

    // Editable roles
    for (const role of EDIT_ROLES) {
      const key   = `${role.key}:${res.key}`;
      const s     = state.get(key)!;

      const readTd  = document.createElement('td');
      const writeTd = document.createElement('td');
      readTd.style.cssText  = 'text-align:center;padding:12px 6px;';
      writeTd.style.cssText = 'text-align:center;padding:12px 6px;';

      const readCb  = makeCheckbox(s.read,  role.color);
      const writeCb = makeCheckbox(s.write, role.color);

      // Business logic: write implies read; removing read removes write
      readCb.addEventListener('change', async () => {
        if (!readCb.checked) writeCb.checked = false;
        s.read  = readCb.checked;
        s.write = writeCb.checked;
        await savePerm(role.key, res.key, s.read, s.write, readCb, writeCb);
      });

      writeCb.addEventListener('change', async () => {
        if (writeCb.checked) readCb.checked = true;
        s.read  = readCb.checked;
        s.write = writeCb.checked;
        await savePerm(role.key, res.key, s.read, s.write, readCb, writeCb);
      });

      readTd.appendChild(readCb);
      writeTd.appendChild(writeCb);
      tr.appendChild(readTd);
      tr.appendChild(writeTd);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  // Legend row
  const legendRow = document.createElement('tr');
  legendRow.innerHTML = `<td colspan="${2 + EDIT_ROLES.length * 2}" style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg-secondary);">
    <span style="font-size:11px;color:var(--text-muted);">
      ✦ Изменения применяются немедленно и отражаются при следующем обращении пользователя к API.
      Смена роли пользователя ниже вступает в силу без перелогина.
    </span>
  </td>`;
  tbody.appendChild(legendRow);

  card.appendChild(table);
  section.appendChild(card);
  return section;
}

async function savePerm(
  role: string, resource: string, read: boolean, write: boolean,
  readCb: HTMLInputElement, writeCb: HTMLInputElement,
): Promise<void> {
  readCb.disabled  = true;
  writeCb.disabled = true;
  try {
    const r = await authFetch('/api/permissions', {
      method: 'PUT',
      body: JSON.stringify({ role, resource, can_read: read, can_write: write }),
    });
    if (!r.ok) throw new Error();
  } catch {
    // revert on error
    readCb.checked  = !read;
    writeCb.checked = !write;
  } finally {
    readCb.disabled  = false;
    writeCb.disabled = false;
  }
}

function makeCheckbox(checked: boolean, accentColor: string): HTMLInputElement {
  const cb = document.createElement('input');
  cb.type    = 'checkbox';
  cb.checked = checked;
  cb.style.cssText = `width:18px;height:18px;cursor:pointer;accent-color:${accentColor};`;
  return cb;
}

function lockedCheck(checked: boolean): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:${checked ? 'var(--accent-light)' : 'var(--bg-hover)'};color:${checked ? 'var(--accent)' : 'var(--text-muted)'};font-size:13px;">
    ${checked ? '✓' : '—'}
  </span>`;
}

// ── User role management ──────────────────────────────────────────────────────

function buildUsersSection(users: UserRow[]): HTMLElement {
  const section = document.createElement('div');

  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;';
  title.textContent = 'Пользователи';
  section.appendChild(title);

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>Имя</th>
    <th>Email</th>
    <th>Должность</th>
    <th style="width:200px;">Роль</th>
    <th style="width:120px;"></th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');

  users.forEach(u => {
    const tr = document.createElement('tr');

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

    const sel = document.createElement('select');
    sel.style.cssText = 'width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);';
    ROLE_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value       = opt.value;
      o.textContent = opt.label;
      o.selected    = opt.value === u.role;
      sel.appendChild(o);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-outline';
    saveBtn.style.cssText = 'padding:5px 14px;font-size:12px;';
    saveBtn.textContent = 'Сохранить';

    const statusEl = document.createElement('span');
    statusEl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-left:8px;';

    const badgeCell = document.createElement('td');
    badgeCell.innerHTML = roleBadge(u.role);

    // Track original role to show badge correctly
    let currentRole = u.role;

    sel.addEventListener('change', () => {
      saveBtn.style.fontWeight = sel.value !== currentRole ? '700' : '';
    });

    saveBtn.addEventListener('click', async () => {
      const newRole = sel.value as Role;
      if (newRole === currentRole) return;

      saveBtn.disabled  = true;
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
        badgeCell.innerHTML = roleBadge(newRole);
        statusEl.textContent = '✓';
        statusEl.style.color = 'var(--accent)';
        saveBtn.textContent = 'Сохранить';
        saveBtn.style.fontWeight = '';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      } catch (err) {
        statusEl.textContent = (err as Error).message;
        statusEl.style.color = '#ef4444';
        saveBtn.textContent = 'Сохранить';
        // revert select
        sel.value = currentRole;
      } finally {
        saveBtn.disabled = false;
      }
    });

    const roleTd   = document.createElement('td');
    roleTd.appendChild(sel);

    const actionTd = document.createElement('td');
    actionTd.style.cssText = 'white-space:nowrap;';
    actionTd.appendChild(saveBtn);
    actionTd.appendChild(statusEl);

    tr.innerHTML = `
      <td style="font-weight:600;">${esc(u.name)}</td>
      <td style="color:var(--text-secondary);font-size:13px;">${esc(u.email)}</td>
      <td style="color:var(--text-muted);font-size:13px;">${u.job_title ? esc(u.job_title) : '—'}</td>
    `;
    tr.appendChild(badgeCell);
    tr.appendChild(roleTd);
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
