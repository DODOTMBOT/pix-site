import { navigate } from '../router';
import { getEmployees, getEmployee, addEmployee, updateEmployee } from '../services/storage';
import type { Employee } from '../types';

const PIZZERIAS = ['Все пиццерии', 'ул. Ленина', 'ул. Мира', 'ул. Победы'];

function inputStyle(hasError = false): string {
  return `width:100%;padding:9px 12px;border:1.5px solid ${hasError ? '#ef4444' : '#e5e7eb'};border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;`;
}

function labelHtml(text: string, required = false): string {
  return `<label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">${text}${required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
}

export function renderAdminEmployee(empId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const isNew = !empId;
  const existing = empId ? getEmployee(empId) : undefined;
  const allEmployees = getEmployees().filter(e => e.id !== empId);

  let extraFields: { label: string; value: string }[] = existing?.extraFields ? [...existing.extraFields] : [];
  let avatarBase64: string | undefined = existing?.avatar;

  function render(): void {
    page.replaceChildren(buildForm());
  }

  function buildForm(): HTMLElement {
    const wrap = document.createElement('div');

    const departments = [...new Set(getEmployees().map(e => e.department))].filter(Boolean);
    const datalistOpts = departments.map(d => `<option value="${d}">`).join('');

    const managerOpts = allEmployees.map(e =>
      `<option value="${e.id}" ${existing?.parentId === e.id ? 'selected' : ''}>${e.name} — ${e.position}</option>`
    ).join('');

    const relatedCheckboxes = allEmployees.map(e => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer;">
        <input type="checkbox" value="${e.id}" ${existing?.relatedIds.includes(e.id) ? 'checked' : ''} style="accent-color:var(--accent);width:15px;height:15px;">
        ${e.name} — ${e.position}
      </label>
    `).join('');

    const pizzeriaOpts = PIZZERIAS.map(p =>
      `<option value="${p}" ${(existing?.pizzeria ?? 'Все пиццерии') === p ? 'selected' : ''}>${p}</option>`
    ).join('');

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
              <datalist id="dept-list">${datalistOpts}</datalist>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                  ${labelHtml('ФИО', true)}
                  <input id="f-name" type="text" value="${existing?.name ?? ''}" style="${inputStyle()}" placeholder="Иванов Иван Иванович">
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
                  ${labelHtml('Отдел', true)}
                  <input id="f-dept" type="text" list="dept-list" value="${existing?.department ?? ''}" style="${inputStyle()}" placeholder="Управление">
                  <div class="err" id="err-dept" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
                </div>
                <div>
                  ${labelHtml('Пиццерия')}
                  <select id="f-pizzeria" style="${inputStyle()}">
                    ${pizzeriaOpts}
                  </select>
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
                ${labelHtml('Руководитель')}
                <select id="f-parent" style="${inputStyle()}">
                  <option value="">Нет (корневой)</option>
                  ${managerOpts}
                </select>
              </div>

              ${allEmployees.length > 0 ? `
              <div style="margin-bottom:16px;">
                ${labelHtml('Смежные сотрудники')}
                <div style="border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 14px;max-height:160px;overflow-y:auto;" id="related-list">
                  ${relatedCheckboxes}
                </div>
              </div>` : ''}

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

    // focus orange outline
    wrap.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur', () => { el.style.borderColor = '#e5e7eb'; });
    });

    wrap.querySelector('#cancel-btn')!.addEventListener('click', () => navigate('/admin'));
    wrap.querySelector('#cancel-btn2')!.addEventListener('click', () => navigate('/admin'));

    // avatar upload
    wrap.querySelector<HTMLInputElement>('#f-avatar')!.addEventListener('change', e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        avatarBase64 = ev.target?.result as string;
        render();
      };
      reader.readAsDataURL(file);
    });

    wrap.querySelector('#remove-avatar')?.addEventListener('click', () => {
      avatarBase64 = undefined;
      render();
    });

    // extra fields
    wrap.querySelector('#add-extra')!.addEventListener('click', () => {
      extraFields.push({ label: '', value: '' });
      render();
    });

    wrap.querySelectorAll<HTMLButtonElement>('.extra-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset['index']);
        extraFields.splice(idx, 1);
        render();
      });
    });

    // sync extra field values on input
    wrap.querySelectorAll<HTMLElement>('.extra-row').forEach(row => {
      const idx = Number(row.dataset['index']);
      row.querySelector<HTMLInputElement>('.extra-label')!.addEventListener('input', e => {
        extraFields[idx].label = (e.target as HTMLInputElement).value;
      });
      row.querySelector<HTMLInputElement>('.extra-value')!.addEventListener('input', e => {
        extraFields[idx].value = (e.target as HTMLInputElement).value;
      });
    });

    // form submit
    wrap.querySelector<HTMLFormElement>('#emp-form')!.addEventListener('submit', e => {
      e.preventDefault();

      const name = (wrap.querySelector<HTMLInputElement>('#f-name')!).value.trim();
      const position = (wrap.querySelector<HTMLInputElement>('#f-position')!).value.trim();
      const department = (wrap.querySelector<HTMLInputElement>('#f-dept')!).value.trim();

      let valid = true;

      function setError(id: string, msg: string | null): void {
        const el = wrap.querySelector<HTMLElement>(`#${id}`)!;
        const input = wrap.querySelector<HTMLInputElement>(`#${id.replace('err-', 'f-')}`)!;
        if (msg) {
          el.textContent = msg;
          el.style.display = 'block';
          input.style.borderColor = '#ef4444';
          valid = false;
        } else {
          el.style.display = 'none';
          input.style.borderColor = '#e5e7eb';
        }
      }

      setError('err-name', name ? null : 'Введите ФИО');
      setError('err-position', position ? null : 'Введите должность');
      setError('err-dept', department ? null : 'Введите отдел');

      if (!valid) return;

      const parentId = (wrap.querySelector<HTMLSelectElement>('#f-parent')!).value || null;
      const pizzeria = (wrap.querySelector<HTMLSelectElement>('#f-pizzeria')!).value;
      const email = (wrap.querySelector<HTMLInputElement>('#f-email')!).value.trim();
      const phone = (wrap.querySelector<HTMLInputElement>('#f-phone')!).value.trim();

      const relatedIds = [...wrap.querySelectorAll<HTMLInputElement>('#related-list input:checked')]
        .map(cb => cb.value);

      // sync latest extra field values
      wrap.querySelectorAll<HTMLElement>('.extra-row').forEach(row => {
        const idx = Number(row.dataset['index']);
        extraFields[idx].label = row.querySelector<HTMLInputElement>('.extra-label')!.value;
        extraFields[idx].value = row.querySelector<HTMLInputElement>('.extra-value')!.value;
      });

      const data: Omit<Employee, 'id'> = {
        name, position, department, pizzeria, email, phone,
        parentId, relatedIds,
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
