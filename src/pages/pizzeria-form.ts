import { navigate } from '../router';
import { authFetch } from '../services/auth';

interface UserOption { id: number; name: string; job_title: string | null; }
interface PizzeriaDetail {
  id:           number;
  name:         string;
  city:         string | null;
  street:       string | null;
  house:        string | null;
  legal_entity: string | null;
  opening_date: string | null;
  manager:      { id: number; name: string } | null;
  curator:      { id: number; name: string } | null;
}

export function renderPizzeriaForm(id?: string): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;max-width:640px;';

  const isNew = !id;

  page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;

  Promise.all([
    isNew ? Promise.resolve(null) : authFetch(`/api/pizzerias/${id}`).then(r => r.json()),
    authFetch('/api/users/by-role/manager').then(r => r.json()),
    authFetch('/api/users/by-role/management').then(r => r.json()),
  ]).then(([pizzeria, managers, curators]: [PizzeriaDetail | null, UserOption[], UserOption[]]) => {
    page.replaceChildren(buildForm(pizzeria, managers, curators));
  }).catch(() => {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
  });

  return page;
}

function buildForm(
  pizzeria: PizzeriaDetail | null,
  managers: UserOption[],
  curators: UserOption[],
): HTMLElement {
  const isNew = !pizzeria;

  const wrap = document.createElement('div');

  const label = (text: string): string =>
    `<label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;">${text}</label>`;

  const field = (labelText: string, inputHtml: string): string => `
    <div style="margin-bottom:16px;">
      ${label(labelText)}
      ${inputHtml}
    </div>
  `;

  const input = (id: string, type: string, value: string, placeholder = '') =>
    `<input id="${id}" type="${type}" value="${escHtml(value)}" placeholder="${placeholder}" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;">`;

  const managerOptions = managers.map(u =>
    `<option value="${u.id}" ${pizzeria?.manager?.id === u.id ? 'selected' : ''}>${escHtml(u.name)}</option>`
  ).join('');

  const curatorOptions = curators.map(u =>
    `<option value="${u.id}" ${pizzeria?.curator?.id === u.id ? 'selected' : ''}>${escHtml(u.name)}</option>`
  ).join('');

  wrap.innerHTML = `
    <button class="btn btn-ghost" id="cancel-btn" style="margin-bottom:24px;">← Назад</button>
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:28px;">
      ${isNew ? 'Новая пиццерия' : 'Редактирование пиццерии'}
    </h1>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;box-shadow:var(--shadow-sm);">
      <form id="piz-form" novalidate>
        ${field('Название *', input('f-name', 'text', pizzeria?.name ?? '', 'Название пиццерии'))}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            ${label('Город')}
            ${input('f-city', 'text', pizzeria?.city ?? '', 'Москва')}
          </div>
          <div>
            ${label('Улица')}
            ${input('f-street', 'text', pizzeria?.street ?? '', 'ул. Примерная')}
          </div>
          <div>
            ${label('Дом')}
            ${input('f-house', 'text', pizzeria?.house ?? '', '1')}
          </div>
        </div>
        ${field('Юридическое лицо', input('f-legal', 'text', pizzeria?.legal_entity ?? '', ''))}
        ${field('Управляющий', `
          <select id="f-manager" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);">
            <option value="">— Не назначен —</option>
            ${managerOptions}
          </select>
        `)}
        ${field('Куратор ТУ', `
          <select id="f-curator" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);">
            <option value="">— Не назначен —</option>
            ${curatorOptions}
          </select>
        `)}
        ${field('Дата открытия', input('f-date', 'date', pizzeria?.opening_date ?? '', ''))}

        <div id="form-err" style="color:#ef4444;font-size:13px;margin-bottom:12px;display:none;"></div>

        <div style="display:flex;gap:12px;">
          <button type="submit" class="btn btn-primary" id="save-btn">Сохранить</button>
          <button type="button" class="btn btn-outline" id="cancel-btn2">Отмена</button>
        </div>
      </form>
    </div>
  `;

  const back = () => pizzeria ? navigate(`/pizzerias/${pizzeria.id}`) : navigate('/pizzerias');
  wrap.querySelector('#cancel-btn')!.addEventListener('click',  back);
  wrap.querySelector('#cancel-btn2')!.addEventListener('click', back);

  wrap.querySelector<HTMLFormElement>('#piz-form')!.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = wrap.querySelector<HTMLElement>('#form-err')!;
    const saveBtn = wrap.querySelector<HTMLButtonElement>('#save-btn')!;

    const name       = (wrap.querySelector<HTMLInputElement>('#f-name')!).value.trim();
    const city       = (wrap.querySelector<HTMLInputElement>('#f-city')!).value.trim();
    const street     = (wrap.querySelector<HTMLInputElement>('#f-street')!).value.trim();
    const house      = (wrap.querySelector<HTMLInputElement>('#f-house')!).value.trim();
    const legal      = (wrap.querySelector<HTMLInputElement>('#f-legal')!).value.trim();
    const managerId  = (wrap.querySelector<HTMLSelectElement>('#f-manager')!).value;
    const curatorId  = (wrap.querySelector<HTMLSelectElement>('#f-curator')!).value;
    const openDate   = (wrap.querySelector<HTMLInputElement>('#f-date')!).value;

    if (!name || name.length < 2) {
      errEl.textContent = 'Название обязательно (минимум 2 символа)';
      errEl.style.display = 'block';
      return;
    }

    errEl.style.display = 'none';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';

    const body = {
      name,
      city:         city       || null,
      street:       street     || null,
      house:        house      || null,
      legal_entity: legal      || null,
      manager_id:   managerId  ? parseInt(managerId,  10) : null,
      curator_id:   curatorId  ? parseInt(curatorId,  10) : null,
      opening_date: openDate   || null,
    };

    try {
      const url    = pizzeria ? `/api/pizzerias/${pizzeria.id}` : '/api/pizzerias';
      const method = pizzeria ? 'PUT' : 'POST';
      const res    = await authFetch(url, { method, body: JSON.stringify(body) });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Ошибка сохранения');
      }
      const saved = await res.json() as { id: number };
      navigate(`/pizzerias/${saved.id}`);
    } catch (err) {
      errEl.textContent   = (err as Error).message;
      errEl.style.display = 'block';
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Сохранить';
    }
  });

  return wrap;
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
