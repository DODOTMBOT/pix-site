import { navigate } from '../router';
import { authFetch, roleLabel } from '../services/auth';

type Role = 'management' | 'manager' | 'shift_manager';

interface UserDetail {
  id:          number;
  email:       string;
  name:        string;
  role:        string;
  job_title:   string | null;
  pizzeria_ids: number[];
}

interface PizzeriaShort { id: number; name: string; }

const SELECTABLE_ROLES: Role[] = ['management', 'manager', 'shift_manager'];

export function renderUserForm(id?: string): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;max-width:640px;';

  const isNew = !id;

  page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;

  Promise.all([
    isNew ? Promise.resolve(null) : authFetch(`/api/users/${id}`).then(r => r.json()),
    authFetch('/api/pizzerias').then(r => r.json()),
  ]).then(([user, pizzerias]: [UserDetail | null, PizzeriaShort[]]) => {
    page.replaceChildren(buildForm(user, pizzerias));
  }).catch(() => {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
  });

  return page;
}

function buildForm(user: UserDetail | null, pizzerias: PizzeriaShort[]): HTMLElement {
  const isNew   = !user;
  const wrap    = document.createElement('div');

  let currentRole: Role = (user?.role as Role) ?? 'manager';

  function render(): void {
    wrap.replaceChildren(buildContent());
  }

  function buildContent(): HTMLElement {
    const inner = document.createElement('div');

    const label = (text: string, required = false) =>
      `<label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;">${text}${required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;

    const inp = (id: string, type: string, value: string, placeholder = '', extra = '') =>
      `<input id="${id}" type="${type}" value="${escHtml(value)}" placeholder="${escHtml(placeholder)}" ${extra} style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;">`;

    const roleOptions = SELECTABLE_ROLES.map(r =>
      `<option value="${r}" ${currentRole === r ? 'selected' : ''}>${roleLabel(r)}</option>`
    ).join('');

    // Pizzeria selection: checkboxes for management/manager, radio for shift_manager
    const pizzeriaInputs = pizzerias.map(p => {
      const checked = (user?.pizzeria_ids ?? []).includes(p.id);
      if (currentRole === 'shift_manager') {
        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;">
          <input type="radio" name="piz-radio" value="${p.id}" ${checked ? 'checked' : ''} style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;">
          ${escHtml(p.name)}
        </label>`;
      }
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;">
        <input type="checkbox" class="piz-check" value="${p.id}" ${checked ? 'checked' : ''} style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;">
        ${escHtml(p.name)}
      </label>`;
    }).join('');

    inner.innerHTML = `
      <button class="btn btn-ghost" id="cancel-btn" style="margin-bottom:24px;">← Назад</button>
      <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:28px;">
        ${isNew ? 'Новый пользователь' : 'Редактирование пользователя'}
      </h1>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;box-shadow:var(--shadow-sm);">
        <form id="user-form" novalidate>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div>
              ${label('Имя', true)}
              ${inp('f-name', 'text', user?.name ?? '', 'Иван Иванов')}
            </div>
            <div>
              ${label('Email', true)}
              ${inp('f-email', 'email', user?.email ?? '', 'user@pix-dodo.ru', isNew ? '' : 'readonly style="opacity:0.6;"')}
            </div>
          </div>

          <div style="margin-bottom:16px;">
            ${label(isNew ? 'Пароль' : 'Новый пароль (оставьте пустым — не менять)', isNew)}
            ${inp('f-password', 'password', '', '••••••••')}
          </div>

          <div style="margin-bottom:16px;">
            ${label('Роль', true)}
            <select id="f-role" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);">
              ${roleOptions}
            </select>
          </div>

          <div id="job-title-section" style="${currentRole !== 'management' ? 'display:none;' : ''}margin-bottom:16px;">
            ${label('Должность')}
            ${inp('f-job', 'text', user?.job_title ?? '', 'ТУ, операционный директор...')}
          </div>

          <div id="pizzerias-section" style="margin-bottom:24px;">
            ${label('Пиццерии')}
            <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;">
              ${pizzeriaInputs || '<div style="font-size:13px;color:var(--text-muted);">Нет доступных пиццерий</div>'}
            </div>
          </div>

          <div id="form-err" style="color:#ef4444;font-size:13px;margin-bottom:12px;display:none;"></div>

          <div style="display:flex;gap:12px;">
            <button type="submit" class="btn btn-primary" id="save-btn">Сохранить</button>
            <button type="button" class="btn btn-outline" id="cancel-btn2">Отмена</button>
          </div>
        </form>
      </div>
    `;

    inner.querySelector('#cancel-btn')!.addEventListener('click',  () => navigate('/users'));
    inner.querySelector('#cancel-btn2')!.addEventListener('click', () => navigate('/users'));

    inner.querySelector<HTMLSelectElement>('#f-role')!.addEventListener('change', e => {
      currentRole = (e.target as HTMLSelectElement).value as Role;
      render();
    });

    inner.querySelector<HTMLFormElement>('#user-form')!.addEventListener('submit', async ev => {
      ev.preventDefault();
      const errEl   = inner.querySelector<HTMLElement>('#form-err')!;
      const saveBtn = inner.querySelector<HTMLButtonElement>('#save-btn')!;

      const name     = inner.querySelector<HTMLInputElement>('#f-name')!.value.trim();
      const email    = inner.querySelector<HTMLInputElement>('#f-email')!.value.trim();
      const password = inner.querySelector<HTMLInputElement>('#f-password')!.value;
      const role     = inner.querySelector<HTMLSelectElement>('#f-role')!.value;
      const jobTitle = inner.querySelector<HTMLInputElement>('#f-job')?.value.trim() ?? '';

      let pizzeriaIds: number[] = [];
      if (role === 'shift_manager') {
        const checked = inner.querySelector<HTMLInputElement>('input[name="piz-radio"]:checked');
        pizzeriaIds = checked ? [parseInt(checked.value, 10)] : [];
      } else {
        inner.querySelectorAll<HTMLInputElement>('.piz-check:checked').forEach(cb => {
          pizzeriaIds.push(parseInt(cb.value, 10));
        });
      }

      if (!name) { showErr('Имя обязательно'); return; }
      if (isNew && !email) { showErr('Email обязателен'); return; }
      if (isNew && !password) { showErr('Пароль обязателен'); return; }
      if (role === 'shift_manager' && pizzeriaIds.length !== 1) {
        showErr('Для менеджера смены нужна ровно одна пиццерия');
        return;
      }

      errEl.style.display = 'none';
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Сохранение...';

      const body: Record<string, unknown> = {
        name,
        role,
        job_title:    jobTitle || null,
        pizzeria_ids: pizzeriaIds,
      };
      if (isNew) { body['email'] = email; body['password'] = password; }
      else if (password) { body['password'] = password; }

      function showErr(msg: string): void {
        errEl.textContent   = msg;
        errEl.style.display = 'block';
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Сохранить';
      }

      try {
        const url    = user ? `/api/users/${user.id}` : '/api/users';
        const method = user ? 'PUT' : 'POST';
        const res    = await authFetch(url, { method, body: JSON.stringify(body) });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showErr((err as { error?: string }).error || 'Ошибка сохранения');
          return;
        }
        navigate('/users');
      } catch (err) {
        showErr((err as Error).message || 'Ошибка сохранения');
      }
    });

    return inner;
  }

  render();
  return wrap;
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
