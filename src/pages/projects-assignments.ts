import { getProjectTemplates, getProjectAssignments, saveProjectAssignments } from '../services/storage';
import type { ProjectAssignment } from '../types';

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatus(a: ProjectAssignment): 'active' | 'completed' {
  if (!a.endDate) return 'active';
  return new Date(a.endDate) < new Date() ? 'completed' : 'active';
}

export function renderProjectsAssignments(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  let assignments: ProjectAssignment[] = getProjectAssignments();

  function render(): void {
    page.replaceChildren(buildContent());
  }

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'assignments-page';

    wrap.innerHTML = `
      <div style="margin-bottom:28px;">
        <div class="page-label">УПРАВЛЯЮЩИЕ</div>
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:4px 0 0;">Назначения проектов</h1>
      </div>
    `;

    wrap.appendChild(buildForm());
    wrap.appendChild(buildTable());
    return wrap;
  }

  function buildForm(): HTMLElement {
    const templates = getProjectTemplates();

    const card = document.createElement('div');
    card.className = 'assignment-form-card';
    card.innerHTML = `
      <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;">Назначить проект</h3>
      <div class="form-grid">
        <div class="form-field">
          <label>Шаблон проекта</label>
          <select id="template-select">
            ${templates.length === 0
              ? '<option value="">— Нет шаблонов —</option>'
              : templates.map(t => `<option value="${t.id}">${t.title}</option>`).join('')
            }
          </select>
        </div>
        <div class="form-field">
          <label>Сотрудник</label>
          <input type="text" id="employee-name" placeholder="Имя сотрудника">
        </div>
        <div class="form-field">
          <label>Дата начала</label>
          <input type="date" id="start-date">
        </div>
        <div class="form-field">
          <label>Дата окончания</label>
          <input type="date" id="end-date">
          <label class="checkbox-label" style="margin-top:6px;">
            <input type="checkbox" id="no-end-date"> Бессрочно
          </label>
        </div>
      </div>
      <div class="form-field" style="margin-top:12px;">
        <label>Примечания</label>
        <textarea id="notes" placeholder="Необязательно..." style="min-height:60px;resize:vertical;"></textarea>
      </div>
      <div style="margin-top:16px;display:flex;align-items:center;gap:12px;">
        <button class="btn btn-primary" id="assign-btn">Назначить проект</button>
        <span id="assign-err" style="font-size:13px;color:#ef4444;display:none;"></span>
      </div>
    `;

    const noEndChk = card.querySelector<HTMLInputElement>('#no-end-date')!;
    const endInput = card.querySelector<HTMLInputElement>('#end-date')!;
    noEndChk.addEventListener('change', () => { endInput.disabled = noEndChk.checked; if (noEndChk.checked) endInput.value = ''; });

    card.querySelector('#assign-btn')!.addEventListener('click', () => {
      const templateId   = card.querySelector<HTMLSelectElement>('#template-select')!.value;
      const employeeName = card.querySelector<HTMLInputElement>('#employee-name')!.value.trim();
      const startDate    = card.querySelector<HTMLInputElement>('#start-date')!.value;
      const endDate      = noEndChk.checked ? undefined : (endInput.value || undefined);
      const notes        = card.querySelector<HTMLTextAreaElement>('#notes')!.value.trim();
      const errEl        = card.querySelector<HTMLElement>('#assign-err')!;

      if (!templateId || templates.length === 0) { errEl.textContent = 'Выберите шаблон'; errEl.style.display = 'inline'; return; }
      if (!employeeName)                          { errEl.textContent = 'Укажите сотрудника'; errEl.style.display = 'inline'; return; }
      if (!startDate)                             { errEl.textContent = 'Укажите дату начала'; errEl.style.display = 'inline'; return; }
      errEl.style.display = 'none';

      const tpl = templates.find(t => t.id === templateId)!;
      assignments.push({
        id:             uid(),
        templateId,
        templateTitle:  tpl.title,
        employeeName,
        startDate,
        endDate,
        notes:          notes || undefined,
        createdAt:      new Date().toISOString(),
      });
      saveProjectAssignments(assignments);
      render();
    });

    return card;
  }

  function buildTable(): HTMLElement {
    const wrap = document.createElement('div');

    if (assignments.length === 0) {
      wrap.innerHTML = `<div style="padding:48px;text-align:center;color:#9ca3af;font-size:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">Назначений нет</div>`;
      return wrap;
    }

    const tableWrap = document.createElement('div');
    tableWrap.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;overflow-x:auto;';

    const table = document.createElement('table');
    table.className = 'data-table';
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
    table.innerHTML = `
      <thead>
        <tr style="background:var(--bg-secondary);border-bottom:1px solid var(--border);">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Проект</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Сотрудник</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Начало</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Окончание</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Статус</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Примечания</th>
          <th style="padding:10px 16px;width:80px;"></th>
        </tr>
      </thead>
      <tbody id="assignments-tbody"></tbody>
    `;

    const tbody = table.querySelector('#assignments-tbody')!;

    assignments.forEach((a, idx) => {
      const status = getStatus(a);
      const statusHtml = status === 'active'
        ? `<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">Активен</span>`
        : `<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">Завершён</span>`;

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      tr.innerHTML = `
        <td style="padding:12px 16px;font-weight:600;color:var(--text-primary);">${a.templateTitle}</td>
        <td style="padding:12px 16px;color:var(--text-primary);">${a.employeeName}</td>
        <td style="padding:12px 16px;color:#6b7280;white-space:nowrap;">${fmtDate(a.startDate)}</td>
        <td style="padding:12px 16px;color:#6b7280;white-space:nowrap;">${a.endDate ? fmtDate(a.endDate) : '—'}</td>
        <td style="padding:12px 16px;">${statusHtml}</td>
        <td style="padding:12px 16px;color:#6b7280;font-size:12px;max-width:200px;">${a.notes ?? '—'}</td>
        <td style="padding:12px 16px;">
          <button class="btn btn-outline del-btn" style="font-size:11px;padding:4px 10px;color:#ef4444;border-color:#fecaca;">Удалить</button>
        </td>
      `;
      tr.querySelector('.del-btn')!.addEventListener('click', () => {
        assignments.splice(idx, 1);
        saveProjectAssignments(assignments);
        render();
      });
      tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  }

  render();
  return page;
}
