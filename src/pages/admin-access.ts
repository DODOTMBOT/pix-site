import { navigate } from '../router';
import { getAccessEntries, addAccessEntry, updateAccessEntry } from '../services/storage';
import type { AccessEntry } from '../types';

function inputStyle(hasError = false): string {
  return `width:100%;padding:9px 12px;border:1.5px solid ${hasError ? '#ef4444' : '#e5e7eb'};border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;background:#fff;`;
}

function labelHtml(text: string, required = false): string {
  return `<label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">${text}${required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
}

export function renderAdminAccess(entryId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const isNew    = !entryId;
  const existing = entryId ? getAccessEntries().find(e => e.id === entryId) : undefined;
  let showPwd    = false;

  function render(): void {
    page.replaceChildren(buildForm());
  }

  function buildForm(): HTMLElement {
    const wrap = document.createElement('div');

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;max-width:560px;">
          <button class="btn btn-ghost" id="cancel-btn" style="margin-bottom:24px;">← Назад</button>
          <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;">
            ${isNew ? 'Новый доступ' : 'Редактирование доступа'}
          </h1>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <form id="access-form" novalidate>

              <div style="margin-bottom:16px;">
                ${labelHtml('Название сервиса', true)}
                <input id="f-service" type="text" value="${existing?.serviceName ?? ''}" style="${inputStyle()}" placeholder="1С, Google Drive, Iiko…">
                <div id="err-service" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
              </div>

              <div style="margin-bottom:16px;">
                ${labelHtml('Ссылка')}
                <input id="f-url" type="url" value="${existing?.serviceUrl ?? ''}" style="${inputStyle()}" placeholder="https://…">
              </div>

              <div style="margin-bottom:16px;">
                ${labelHtml('Пиццерия')}
                <input id="f-pizzeria" type="text" value="${existing?.pizzeria ?? ''}" style="${inputStyle()}" placeholder="Все / ул. Ленина…">
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                  ${labelHtml('Логин', true)}
                  <input id="f-login" type="text" value="${existing?.login ?? ''}" style="${inputStyle()}" placeholder="admin">
                  <div id="err-login" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                </div>
                <div>
                  ${labelHtml('Пароль', true)}
                  <div style="position:relative;">
                    <input id="f-password" type="${showPwd ? 'text' : 'password'}" value="${existing?.password ?? ''}" style="${inputStyle()}padding-right:40px;" placeholder="••••••••">
                    <button type="button" id="pwd-toggle" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:#9ca3af;padding:0;">👁</button>
                  </div>
                  <div id="err-password" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                </div>
              </div>

              <div style="margin-bottom:24px;">
                ${labelHtml('Заметки')}
                <textarea id="f-notes" rows="3" style="${inputStyle()}resize:vertical;">${existing?.notes ?? ''}</textarea>
              </div>

              <div style="display:flex;gap:12px;">
                <button type="submit" class="btn btn-primary" style="padding:11px 28px;">Сохранить</button>
                <button type="button" id="cancel-btn2" class="btn btn-outline">Отмена</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    `;

    wrap.querySelectorAll<HTMLInputElement>('input[type=text],input[type=url],input[type=password],input[type=email]').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
    });

    wrap.querySelector('#cancel-btn')!.addEventListener('click',  () => navigate('/admin'));
    wrap.querySelector('#cancel-btn2')!.addEventListener('click', () => navigate('/admin'));

    wrap.querySelector('#pwd-toggle')!.addEventListener('click', () => {
      showPwd = !showPwd;
      render();
    });

    wrap.querySelector<HTMLFormElement>('#access-form')!.addEventListener('submit', e => {
      e.preventDefault();

      const serviceName = wrap.querySelector<HTMLInputElement>('#f-service')!.value.trim();
      const login       = wrap.querySelector<HTMLInputElement>('#f-login')!.value.trim();
      const password    = wrap.querySelector<HTMLInputElement>('#f-password')!.value.trim();
      let valid = true;

      function setError(errId: string, inputId: string, msg: string | null): void {
        const errEl   = wrap.querySelector<HTMLElement>(`#${errId}`)!;
        const inputEl = wrap.querySelector<HTMLInputElement>(`#${inputId}`)!;
        if (msg) {
          errEl.textContent = msg;
          errEl.style.display = 'block';
          inputEl.style.borderColor = '#ef4444';
          valid = false;
        } else {
          errEl.style.display = 'none';
          inputEl.style.borderColor = '#e5e7eb';
        }
      }

      setError('err-service',  'f-service',  serviceName ? null : 'Введите название сервиса');
      setError('err-login',    'f-login',    login       ? null : 'Введите логин');
      setError('err-password', 'f-password', password    ? null : 'Введите пароль');

      if (!valid) return;

      const data: Omit<AccessEntry, 'id' | 'createdAt'> = {
        serviceName,
        serviceUrl: wrap.querySelector<HTMLInputElement>('#f-url')!.value.trim(),
        pizzeria:   wrap.querySelector<HTMLInputElement>('#f-pizzeria')!.value.trim(),
        login,
        password,
        notes: wrap.querySelector<HTMLTextAreaElement>('#f-notes')!.value.trim(),
      };

      if (isNew) {
        addAccessEntry(data);
      } else {
        updateAccessEntry(entryId!, data);
      }

      navigate('/admin');
    });

    return wrap;
  }

  page.appendChild(buildForm());
  return page;
}
