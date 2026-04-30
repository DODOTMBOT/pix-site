import { navigate } from '../router';
import { getEmployee, addEmployee, updateEmployee, getDepartments } from '../services/storage';
import type { Employee } from '../types';

function inputStyle(hasError = false): string {
  return `width:100%;padding:9px 12px;border:1.5px solid ${hasError ? '#ef4444' : '#e5e7eb'};border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;background:#fff;`;
}

function labelHtml(text: string, required = false): string {
  return `<label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">${text}${required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
}

export function renderAdminEmployee(empId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const isNew    = !empId;
  const existing = empId ? getEmployee(empId) : undefined;

  let extraFields: { label: string; value: string }[] = existing?.extraFields ? [...existing.extraFields] : [];
  let avatarBase64: string | undefined = existing?.avatar;

  function render(): void {
    page.replaceChildren(buildForm());
  }

  function buildForm(): HTMLElement {
    const wrap = document.createElement('div');

    const departments   = getDepartments();
    const deptOptions   = [
      `<option value="">— Не выбран —</option>`,
      ...departments.map(d =>
        `<option value="${d.id}" ${existing?.departmentId === d.id ? 'selected' : ''}>${d.name}</option>`
      ),
    ].join('');

    const extraHtml = extraFields.map((f, i) => `
      <div class="extra-row" data-index="${i}" style="display:flex;gap:8px;margin-bottom:8px;">
        <input class="extra-label" type="text" placeholder="Название поля" value="${f.label}" style="${inputStyle()}flex:1;">
        <input class="extra-value" type="text" placeholder="Значение" value="${f.value}" style="${inputStyle()}flex:1.5;">
        <button class="extra-remove" data-index="${i}" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;padding:0 4px;flex-shrink:0;">✕</button>
      </div>
    `).join('');

    const avatarPreview = avatarBase64 && avatarBase64.startsWith('data:')
      ? `<img src="${avatarBase64}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:56px;height:56px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:13px;color:#9ca3af;">Фото</div>`;

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;max-width:600px;">
          <button class="btn btn-ghost" id="cancel-btn" style="margin-bottom:24px;">← Назад</button>
          <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;">
            ${isNew ? 'Новый сотрудник' : 'Редактирование'}
          </h1>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <form id="emp-form" novalidate>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                  ${labelHtml('ФИО', true)}
                  <input id="f-name" type="text" value="${existing?.name ?? ''}" style="${inputStyle()}" placeholder="Иванов Иван">
                  <div class="err" id="err-name" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                </div>
                <div>
                  ${labelHtml('Должность', true)}
                  <input id="f-position" type="text" value="${existing?.position ?? ''}" style="${inputStyle()}" placeholder="Store Manager">
                  <div class="err" id="err-position" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                  ${labelHtml('Отдел')}
                  <select id="f-dept" style="${inputStyle()}">
                    ${deptOptions}
                  </select>
                </div>
                <div>
                  ${labelHtml('Пиццерия')}
                  <input id="f-pizzeria" type="text" value="${existing?.pizzeria ?? ''}" style="${inputStyle()}" placeholder="ул. Ленина">
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                  ${labelHtml('Email')}
                  <input id="f-email" type="email" value="${existing?.email ?? ''}" style="${inputStyle()}" placeholder="name@pix-dodo.ru">
                </div>
                <div>
                  ${labelHtml('Телефон')}
                  <input id="f-phone" type="tel" value="${existing?.phone ?? ''}" style="${inputStyle()}" placeholder="+7 900 000-00-00">
                </div>
              </div>

              <div style="margin-bottom:16px;">
                ${labelHtml('Аватар')}
                <div style="display:flex;align-items:center;gap:12px;">
                  <div id="avatar-preview">${avatarPreview}</div>
                  <label style="cursor:pointer;">
                    <input type="file" id="f-avatar" accept="image/*" style="display:none;">
                    <span style="font-size:13px;padding:7px 14px;border:1.5px solid #e5e7eb;border-radius:8px;color:#374151;background:#fff;">Загрузить фото</span>
                  </label>
                  ${avatarBase64 ? `<button type="button" id="remove-avatar" style="font-size:13px;color:#9ca3af;background:none;border:none;cursor:pointer;">Удалить</button>` : ''}
                </div>
              </div>

              <div style="margin-bottom:24px;">
                ${labelHtml('Дополнительные поля')}
                <div id="extra-fields">${extraHtml}</div>
                <button type="button" id="add-extra" style="font-size:13px;color:var(--accent);background:none;border:none;cursor:pointer;padding:4px 0;">+ Добавить поле</button>
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

    // Focus highlights
    wrap.querySelectorAll<HTMLInputElement>('input[type=text],input[type=email],input[type=tel]').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
    });
    wrap.querySelectorAll<HTMLSelectElement>('select').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
    });

    wrap.querySelector('#cancel-btn')!.addEventListener('click',  () => navigate('/admin'));
    wrap.querySelector('#cancel-btn2')!.addEventListener('click', () => navigate('/admin'));

    wrap.querySelector<HTMLInputElement>('#f-avatar')!.addEventListener('change', e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { avatarBase64 = ev.target?.result as string; render(); };
      reader.readAsDataURL(file);
    });

    wrap.querySelector('#remove-avatar')?.addEventListener('click', () => {
      avatarBase64 = undefined;
      render();
    });

    wrap.querySelector('#add-extra')!.addEventListener('click', () => {
      extraFields.push({ label: '', value: '' });
      render();
    });

    wrap.querySelectorAll<HTMLButtonElement>('.extra-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        extraFields.splice(Number(btn.dataset['index']), 1);
        render();
      });
    });

    wrap.querySelectorAll<HTMLElement>('.extra-row').forEach(row => {
      const idx = Number(row.dataset['index']);
      row.querySelector<HTMLInputElement>('.extra-label')!.addEventListener('input', e => {
        extraFields[idx].label = (e.target as HTMLInputElement).value;
      });
      row.querySelector<HTMLInputElement>('.extra-value')!.addEventListener('input', e => {
        extraFields[idx].value = (e.target as HTMLInputElement).value;
      });
    });

    wrap.querySelector<HTMLFormElement>('#emp-form')!.addEventListener('submit', e => {
      e.preventDefault();

      const name     = wrap.querySelector<HTMLInputElement>('#f-name')!.value.trim();
      const position = wrap.querySelector<HTMLInputElement>('#f-position')!.value.trim();
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

      setError('err-name',     'f-name',     name     ? null : 'Введите ФИО');
      setError('err-position', 'f-position', position ? null : 'Введите должность');

      if (!valid) return;

      const deptId       = wrap.querySelector<HTMLSelectElement>('#f-dept')!.value || null;
      const deptName     = deptId ? (getDepartments().find(d => d.id === deptId)?.name ?? '') : '';
      const pizzeria     = wrap.querySelector<HTMLInputElement>('#f-pizzeria')!.value.trim();
      const email        = wrap.querySelector<HTMLInputElement>('#f-email')!.value.trim();
      const phone        = wrap.querySelector<HTMLInputElement>('#f-phone')!.value.trim();

      wrap.querySelectorAll<HTMLElement>('.extra-row').forEach(row => {
        const idx = Number(row.dataset['index']);
        extraFields[idx].label = row.querySelector<HTMLInputElement>('.extra-label')!.value;
        extraFields[idx].value = row.querySelector<HTMLInputElement>('.extra-value')!.value;
      });

      const data: Omit<Employee, 'id'> = {
        name, position,
        department: deptName,
        departmentId: deptId,
        pizzeria, email, phone,
        relatedIds: existing?.relatedIds ?? [],
        extraFields: extraFields.filter(f => f.label),
        avatar: avatarBase64,
      };

      if (isNew) {
        addEmployee(data);
      } else {
        updateEmployee(empId!, data);
      }

      navigate('/admin');
    });

    return wrap;
  }

  page.appendChild(buildForm());
  return page;
}
