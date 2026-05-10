import { navigate } from '../router';
import { authFetch, isSuperAdmin, roleLabel } from '../services/auth';
import { getRateDocuments } from '../services/storage';
import type { User } from '../services/auth';

const IS = 'width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;background:#fff;box-sizing:border-box;';

function labelHtml(text: string, required = false): string {
  return `<label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">${text}${required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
}

// ─── User form ────────────────────────────────────────────────────────────────

export function renderAdminUsersForm(userId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  if (!isSuperAdmin()) { navigate('/admin'); return page; }

  const isNew = !userId;

  if (userId) {
    page.innerHTML = '<div style="text-align:center;padding:80px;color:#9ca3af;">Загрузка...</div>';
    authFetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then((user: User) => page.replaceChildren(buildForm(user)))
      .catch(() => { page.innerHTML = '<div style="text-align:center;padding:80px;color:#ef4444;">Ошибка загрузки</div>'; });
  } else {
    page.appendChild(buildForm(null));
  }

  function buildForm(user: User | null): HTMLElement {
    const pizzeriasList = getRateDocuments().map(d => d.pizzeria);

    const wrap = document.createElement('div');
    let showPwd = false;
    let currentRole = user?.role ?? 'manager';

    function render(): void { wrap.replaceChildren(buildContent()); }

    function buildContent(): HTMLElement {
      const inner = document.createElement('div');

      const checkedPizzerias = user?.pizzerias ?? [];
      const pizzeriasHtml = pizzeriasList.map(p => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:13px;background:#fff;">
          <input type="checkbox" class="piz-check" value="${p}" ${checkedPizzerias.includes(p) ? 'checked' : ''} style="accent-color:var(--accent);">
          ${p}
        </label>
      `).join('');

      inner.innerHTML = `
        <div class="container">
          <section style="padding:40px 0 64px;max-width:540px;">
            <button class="btn btn-ghost" id="cancel-btn" style="margin-bottom:24px;">← Назад</button>
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;">
              ${isNew ? 'Новый пользователь' : 'Редактирование пользователя'}
            </h1>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <form id="user-form" novalidate>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                  <div>
                    ${labelHtml('Имя', true)}
                    <input id="f-name" type="text" value="${user?.name ?? ''}" style="${IS}" placeholder="Иван Иванов">
                    <div id="err-name" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                  </div>
                  <div>
                    ${labelHtml('Email', true)}
                    <input id="f-email" type="email" value="${user?.email ?? ''}" ${!isNew ? 'readonly style="' + IS + 'background:#f9fafb;color:#6b7280;"' : `style="${IS}"`} placeholder="user@pix-dodo.ru">
                    <div id="err-email" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                  </div>
                </div>

                <div style="margin-bottom:16px;">
                  ${labelHtml(isNew ? 'Пароль' : 'Новый пароль (оставь пустым чтобы не менять)', isNew)}
                  <div style="position:relative;">
                    <input id="f-password" type="${showPwd ? 'text' : 'password'}" style="${IS}padding-right:40px;" placeholder="••••••••">
                    <button type="button" id="pwd-toggle" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:#9ca3af;padding:0;">👁</button>
                  </div>
                  <div id="err-password" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                </div>

                <div style="margin-bottom:16px;">
                  ${labelHtml('Роль', true)}
                  <select id="f-role" style="${IS}">
                    <option value="management" ${currentRole === 'management' ? 'selected' : ''}>Руководство (management)</option>
                    <option value="manager"    ${currentRole === 'manager'    ? 'selected' : ''}>Менеджер (manager)</option>
                  </select>
                </div>

                <div id="pizzerias-section" style="margin-bottom:24px;${currentRole !== 'manager' ? 'display:none;' : ''}">
                  ${labelHtml('Пиццерии')}
                  <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;">
                    ${pizzeriasHtml || '<div style="font-size:13px;color:#9ca3af;">Нет доступных пиццерий (добавьте документы ставок)</div>'}
                  </div>
                </div>

                <div id="form-error" style="font-size:13px;color:#ef4444;margin-bottom:16px;display:none;"></div>

                <div style="display:flex;gap:12px;">
                  <button type="submit" id="submit-btn" class="btn btn-primary" style="padding:11px 28px;">Сохранить</button>
                  <button type="button" id="cancel-btn2" class="btn btn-outline">Отмена</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      `;

      inner.querySelector('#cancel-btn')!.addEventListener('click',  () => navigate('/admin'));
      inner.querySelector('#cancel-btn2')!.addEventListener('click', () => navigate('/admin'));

      inner.querySelector('#pwd-toggle')!.addEventListener('click', () => { showPwd = !showPwd; render(); });

      const roleSel = inner.querySelector<HTMLSelectElement>('#f-role')!;
      const pizSection = inner.querySelector<HTMLElement>('#pizzerias-section')!;
      roleSel.addEventListener('change', () => {
        currentRole = roleSel.value as User['role'];
        pizSection.style.display = currentRole === 'manager' ? '' : 'none';
      });

      inner.querySelectorAll<HTMLInputElement>('input[type=text],input[type=email],input[type=password]').forEach(el => {
        el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
        el.addEventListener('blur',  () => { el.style.borderColor = el.readOnly ? '#e5e7eb' : '#e5e7eb'; });
      });

      const submitBtn  = inner.querySelector<HTMLButtonElement>('#submit-btn')!;
      const formErr    = inner.querySelector<HTMLElement>('#form-error')!;

      inner.querySelector<HTMLFormElement>('#user-form')!.addEventListener('submit', async e => {
        e.preventDefault();
        submitBtn.disabled = true; submitBtn.textContent = 'Сохранение...';
        formErr.style.display = 'none';

        const name     = inner.querySelector<HTMLInputElement>('#f-name')!.value.trim();
        const email    = inner.querySelector<HTMLInputElement>('#f-email')!.value.trim();
        const password = inner.querySelector<HTMLInputElement>('#f-password')!.value;
        const role     = inner.querySelector<HTMLSelectElement>('#f-role')!.value;
        const pizzerias = Array.from(inner.querySelectorAll<HTMLInputElement>('.piz-check:checked')).map(cb => cb.value);

        let valid = true;
        function setErr(errId: string, inputId: string, msg: string | null): void {
          const errEl = inner.querySelector<HTMLElement>(`#${errId}`)!;
          const inEl  = inner.querySelector<HTMLElement>(`#${inputId}`)!;
          errEl.textContent = msg ?? '';
          errEl.style.display = msg ? 'block' : 'none';
          if (inEl instanceof HTMLInputElement) inEl.style.borderColor = msg ? '#ef4444' : '#e5e7eb';
          if (msg) valid = false;
        }

        setErr('err-name',     'f-name',     name  ? null : 'Введите имя');
        setErr('err-email',    'f-email',    email ? null : 'Введите email');
        if (isNew) setErr('err-password', 'f-password', password ? null : 'Введите пароль');

        if (!valid) { submitBtn.disabled = false; submitBtn.textContent = 'Сохранить'; return; }

        try {
          if (isNew) {
            await authFetch('/api/auth/register', {
              method: 'POST',
              body: JSON.stringify({ email, password, name, role, pizzerias }),
            });
          } else {
            const body: Record<string, unknown> = { name, role, pizzerias };
            if (password) body['password'] = password;
            await authFetch(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) });
          }
          navigate('/admin');
        } catch (err) {
          formErr.textContent = (err as Error).message || 'Ошибка сохранения';
          formErr.style.display = 'block';
          submitBtn.disabled = false; submitBtn.textContent = 'Сохранить';
        }
      });

      return inner;
    }

    wrap.appendChild(buildContent());
    return wrap;
  }

  return page;
}

// ─── Roles table (for admin tab) ──────────────────────────────────────────────

export function buildUsersTableEl(rebuild: () => void): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">Загрузка...</div>';

  authFetch('/api/users')
    .then(r => r.json())
    .then((users: User[]) => {
      const rowsHtml = users.length === 0
        ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Пользователей нет</td></tr>`
        : users.map(u => `
            <tr>
              <td style="padding:13px 16px;font-weight:500;">${u.name}</td>
              <td style="padding:13px 16px;color:#6b7280;font-size:13px;">${u.email}</td>
              <td style="padding:13px 16px;">
                <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;
                  background:${u.role === 'superadmin' ? '#1f2937' : u.role === 'management' ? '#fef3c7' : '#f3f4f6'};
                  color:${u.role === 'superadmin' ? '#fff' : u.role === 'management' ? '#92400e' : '#374151'};">
                  ${roleLabel(u.role)}
                </span>
              </td>
              <td style="padding:13px 16px;font-size:12px;color:#6b7280;">${u.pizzerias.join(', ') || '—'}</td>
              <td style="padding:13px 16px;">
                ${u.role !== 'superadmin' ? `
                  <div style="display:flex;gap:8px;">
                    <button class="usr-edit" data-id="${u.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                    <button class="usr-delete" data-id="${u.id}" data-name="${u.name}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
                  </div>` : '<span style="font-size:12px;color:#9ca3af;">—</span>'}
              </td>
            </tr>
          `).join('');

      el.innerHTML = `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
                ${['Имя','Email','Роль','Пиццерии','Действия'].map(h =>
                  `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;

      el.querySelectorAll<HTMLButtonElement>('.usr-edit').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
        btn.addEventListener('click', () => navigate(`/admin/users/${btn.dataset['id']}`));
      });

      el.querySelectorAll<HTMLButtonElement>('.usr-delete').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
        btn.addEventListener('click', async () => {
          if (!confirm(`Удалить пользователя "${btn.dataset['name']}"?`)) return;
          await authFetch(`/api/users/${btn.dataset['id']}`, { method: 'DELETE' });
          rebuild();
        });
      });
    })
    .catch(() => {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Ошибка загрузки пользователей</div>';
    });

  return el;
}
