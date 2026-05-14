import { navigate } from '../router';
import { authFetch, roleLabel, isSuperAdmin } from '../services/auth';

interface UserRow {
  id:          number;
  email:       string;
  name:        string;
  role:        string;
  job_title:   string | null;
  pizzeria_ids: number[];
}

interface PizzeriaShort { id: number; name: string; }

export function renderUsersList(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;

  Promise.all([
    authFetch('/api/users').then(r => r.json()),
    authFetch('/api/pizzerias').then(r => r.json()),
  ]).then(([users, pizzerias]: [UserRow[], PizzeriaShort[]]) => {
    page.replaceChildren(buildContent(users, pizzerias));
  }).catch(() => {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
  });

  return page;
}

function buildContent(users: UserRow[], pizzerias: PizzeriaShort[]): HTMLElement {
  const wrap = document.createElement('div');

  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;';
  headerRow.innerHTML = `<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Пользователи</h1>`;

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = '+ Новый пользователь';
  addBtn.addEventListener('click', () => navigate('/users/new'));
  headerRow.appendChild(addBtn);
  wrap.appendChild(headerRow);

  const pizzeriaMap = new Map(pizzerias.map(p => [p.id, p.name]));

  if (users.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
    empty.textContent = 'Нет пользователей.';
    wrap.appendChild(empty);
    return wrap;
  }

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

  const table = document.createElement('table');

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Имя</th>
    <th>Email</th>
    <th>Роль</th>
    <th>Должность</th>
    <th>Пиццерии</th>
    <th></th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  users.forEach(u => {
    const tr = document.createElement('tr');
    const pizzNames = (u.pizzeria_ids || [])
      .map(id => pizzeriaMap.get(id) ?? `#${id}`)
      .join(', ') || '—';

    const isSA = u.role === 'superadmin';
    const actions = `
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${u.id}">Изменить</button>
        ${!isSA ? `<button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="delete" data-id="${u.id}">Удалить</button>` : ''}
      </div>
    `;

    tr.innerHTML = `
      <td style="font-weight:600;">${escHtml(u.name)}</td>
      <td style="color:var(--text-secondary);">${escHtml(u.email)}</td>
      <td>${roleLabel(u.role as any)}</td>
      <td style="color:var(--text-secondary);">${u.job_title ? escHtml(u.job_title) : '—'}</td>
      <td style="color:var(--text-secondary);font-size:13px;">${escHtml(pizzNames)}</td>
      <td>${isSuperAdmin() ? actions : ''}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  table.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!btn) return;
    const id     = btn.dataset['id']!;
    const action = btn.dataset['action']!;

    if (action === 'edit') {
      navigate(`/users/${id}`);
    } else if (action === 'delete') {
      if (!confirm('Удалить пользователя?')) return;
      btn.disabled = true;
      const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/users');
      } else {
        alert('Ошибка удаления');
        btn.disabled = false;
      }
    }
  });

  card.appendChild(table);
  wrap.appendChild(card);
  return wrap;
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
