import { navigate } from '../router';
import { authFetch, isManagement } from '../services/auth';

interface PizzeriaRow {
  id:           number;
  name:         string;
  city:         string | null;
  street:       string | null;
  house:        string | null;
  legal_entity: string | null;
  opening_date: string | null;
  manager:      { id: number; name: string } | null;
  curator:      { id: number; name: string; job_title: string | null } | null;
  is_archived:  number;
}

export function renderPizzeriasList(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  page.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">Загрузка...</div>`;

  authFetch('/api/pizzerias')
    .then(r => r.json())
    .then((rows: PizzeriaRow[]) => {
      page.replaceChildren(buildContent(rows));
    })
    .catch(() => {
      page.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">Ошибка загрузки</div>`;
    });

  return page;
}

function buildContent(rows: PizzeriaRow[]): HTMLElement {
  const wrap = document.createElement('div');

  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;';
  headerRow.innerHTML = `<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Пиццерии</h1>`;

  if (isManagement()) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Новая пиццерия';
    addBtn.addEventListener('click', () => navigate('/pizzerias/new'));
    headerRow.appendChild(addBtn);
  }

  wrap.appendChild(headerRow);

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
    empty.textContent = 'Пиццерий нет. Создайте первую.';
    wrap.appendChild(empty);
    return wrap;
  }

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

  const table = document.createElement('table');

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Название</th>
    <th>Адрес</th>
    <th>Управляющий</th>
    <th>Куратор (ТУ)</th>
    <th>Открытие</th>
    <th></th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(p => {
    const tr = document.createElement('tr');
    const address = [p.city, p.street, p.house].filter(Boolean).join(', ') || '—';
    const openDate = p.opening_date ? new Date(p.opening_date).toLocaleDateString('ru-RU') : '—';

    const actionsHtml = isManagement() ? `
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${p.id}">Изменить</button>
        <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="archive" data-id="${p.id}">Архивировать</button>
      </div>
    ` : '';

    tr.style.cssText = 'cursor:pointer;';
    tr.dataset['id'] = String(p.id);
    tr.innerHTML = `
      <td style="font-weight:600;">${p.name}</td>
      <td style="color:var(--text-secondary);">${address}</td>
      <td>${p.manager?.name ?? '—'}</td>
      <td>${p.curator?.name ?? '—'}</td>
      <td style="color:var(--text-secondary);">${openDate}</td>
      <td>${actionsHtml}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  table.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');

    if (btn) {
      const id     = btn.dataset['id']!;
      const action = btn.dataset['action']!;
      if (action === 'edit') {
        navigate(`/pizzerias/${id}/edit`);
      } else if (action === 'archive') {
        if (!confirm('Архивировать пиццерию?')) return;
        btn.disabled = true;
        await authFetch(`/api/pizzerias/${id}`, { method: 'DELETE' });
        navigate('/pizzerias');
      }
      return;
    }

    // Row click → open pizzeria card
    const tr = (e.target as HTMLElement).closest<HTMLTableRowElement>('tr[data-id]');
    if (tr) navigate(`/pizzerias/${tr.dataset['id']}`);
  });

  card.appendChild(table);
  wrap.appendChild(card);
  return wrap;
}
