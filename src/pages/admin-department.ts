import { navigate } from '../router';
import { getDepartments, getDepartment, getEmployees, addDepartment, updateDepartment } from '../services/storage';
import type { Department } from '../types';

function inputStyle(hasError = false): string {
  return `width:100%;padding:9px 12px;border:1.5px solid ${hasError ? '#ef4444' : '#e5e7eb'};border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;background:#fff;`;
}

function labelHtml(text: string, required = false): string {
  return `<label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">${text}${required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
}

export function renderAdminDepartment(deptId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const isNew    = !deptId;
  const existing = deptId ? getDepartment(deptId) : undefined;

  function buildForm(): HTMLElement {
    const wrap = document.createElement('div');

    const employees   = getEmployees();
    const allDepts    = getDepartments().filter(d => d.id !== deptId);

    const leaderOptions = employees.map(e =>
      `<option value="${e.id}" ${existing?.leaderId === e.id ? 'selected' : ''}>${e.name} — ${e.position}</option>`
    ).join('');

    const parentOptions = [
      `<option value="" ${!existing?.parentDepartmentId ? 'selected' : ''}>Нет (корневой)</option>`,
      ...allDepts.map(d =>
        `<option value="${d.id}" ${existing?.parentDepartmentId === d.id ? 'selected' : ''}>${d.name}</option>`
      ),
    ].join('');

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;max-width:520px;">
          <button class="btn btn-ghost" id="cancel-btn" style="margin-bottom:24px;">← Назад</button>
          <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;">
            ${isNew ? 'Новый отдел' : 'Редактирование отдела'}
          </h1>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <form id="dept-form" novalidate>

              <div style="margin-bottom:16px;">
                ${labelHtml('Название отдела', true)}
                <input id="f-name" type="text" value="${existing?.name ?? ''}" style="${inputStyle()}" placeholder="Управление">
                <div class="err" id="err-name" style="font-size:12px;color:#ef4444;margin-top:4px;display:none;"></div>
              </div>

              <div style="margin-bottom:16px;">
                ${labelHtml('Руководитель')}
                <select id="f-leader" style="${inputStyle()}">
                  <option value="">— Не назначен —</option>
                  ${leaderOptions}
                </select>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
                <div>
                  ${labelHtml('Родительский отдел')}
                  <select id="f-parent" style="${inputStyle()}">
                    ${parentOptions}
                  </select>
                </div>
                <div>
                  ${labelHtml('Приоритет')}
                  <input id="f-priority" type="number" min="1" value="${existing?.priority ?? 1}" style="${inputStyle()}">
                </div>
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

    wrap.querySelectorAll<HTMLSelectElement>('select').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
    });
    wrap.querySelectorAll<HTMLInputElement>('input[type=text],input[type=number]').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
    });

    wrap.querySelector('#cancel-btn')!.addEventListener('click',  () => navigate('/admin'));
    wrap.querySelector('#cancel-btn2')!.addEventListener('click', () => navigate('/admin'));

    wrap.querySelector<HTMLFormElement>('#dept-form')!.addEventListener('submit', e => {
      e.preventDefault();

      const name = (wrap.querySelector<HTMLInputElement>('#f-name')!).value.trim();
      const errEl = wrap.querySelector<HTMLElement>('#err-name')!;
      const nameInput = wrap.querySelector<HTMLInputElement>('#f-name')!;

      if (!name) {
        errEl.textContent = 'Введите название отдела';
        errEl.style.display = 'block';
        nameInput.style.borderColor = '#ef4444';
        return;
      }
      errEl.style.display = 'none';
      nameInput.style.borderColor = '#e5e7eb';

      const leaderId           = (wrap.querySelector<HTMLSelectElement>('#f-leader')!).value || null;
      const parentDepartmentId = (wrap.querySelector<HTMLSelectElement>('#f-parent')!).value  || null;
      const priority           = Math.max(1, Number((wrap.querySelector<HTMLInputElement>('#f-priority')!).value) || 1);

      const data: Omit<Department, 'id'> = { name, leaderId, parentDepartmentId, priority };

      if (isNew) {
        addDepartment(data);
      } else {
        updateDepartment(deptId!, data);
      }

      navigate('/admin');
    });

    return wrap;
  }

  page.appendChild(buildForm());
  return page;
}
