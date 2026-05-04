import { navigate } from '../router';
import { getEmployees, deleteEmployee, getEmployee, getDepartments, getDepartment, deleteDepartment, getAccessEntries, deleteAccessEntry } from '../services/storage';

type Tab = 'employees' | 'departments' | 'access';

export function renderAdmin(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  let activeTab: Tab = 'employees';

  function rebuild(): void {
    page.replaceChildren(buildContent());
  }

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');

    const tabBtn = (tab: Tab, label: string) => `
      <button class="tab-btn" data-tab="${tab}" style="
        padding:8px 20px;font-size:14px;font-weight:500;border:none;background:none;cursor:pointer;
        border-bottom:2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'};
        color:${activeTab === tab ? 'var(--accent)' : '#6b7280'};transition:color 0.15s;
      ">${label}</button>
    `;

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;">
          <button class="btn btn-ghost" id="back-site" style="margin-bottom:24px;">← Назад на сайт</button>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">Управление структурой</h1>
            <button class="btn btn-primary" id="add-btn">+ Добавить</button>
          </div>
          <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:24px;">
            ${tabBtn('employees', 'Сотрудники')}
            ${tabBtn('departments', 'Отделы')}
            ${tabBtn('access', 'Доступы')}
          </div>
          <div id="tab-content"></div>
        </section>
      </div>
    `;

    wrap.querySelector('#back-site')!.addEventListener('click', () => navigate('/'));

    wrap.querySelector('#add-btn')!.addEventListener('click', () => {
      if (activeTab === 'employees')   navigate('/admin/employee/new');
      else if (activeTab === 'departments') navigate('/admin/department/new');
      else navigate('/admin/access/new');
    });

    wrap.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset['tab'] as Tab;
        rebuild();
      });
    });

    const tabContent = wrap.querySelector('#tab-content')!;
    if (activeTab === 'employees') {
      tabContent.appendChild(buildEmployeesTable());
    } else if (activeTab === 'departments') {
      tabContent.appendChild(buildDepartmentsTable());
    } else {
      tabContent.appendChild(buildAccessTable());
    }

    return wrap;
  }

  function buildEmployeesTable(): HTMLElement {
    const employees = getEmployees();
    const el = document.createElement('div');

    const rowsHtml = employees.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Сотрудников нет</td></tr>`
      : employees.map(emp => {
          const deptName = emp.departmentId ? (getDepartment(emp.departmentId)?.name ?? '—') : '—';
          return `
            <tr class="admin-row" data-id="${emp.id}">
              <td style="padding:13px 16px;font-weight:500;">${emp.name}</td>
              <td style="padding:13px 16px;color:#6b7280;">${emp.position}</td>
              <td style="padding:13px 16px;color:#6b7280;">${deptName}</td>
              <td style="padding:13px 16px;color:#6b7280;">${emp.pizzeria || '—'}</td>
              <td style="padding:13px 16px;">
                <div style="display:flex;gap:8px;">
                  <button class="btn-edit" data-id="${emp.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                  <button class="btn-delete" data-id="${emp.id}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    el.innerHTML = `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
              ${['ФИО','Должность','Отдел','Пиццерия','Действия'].map(h =>
                `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    el.querySelectorAll<HTMLButtonElement>('.btn-edit').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => navigate(`/admin/employee/${btn.dataset['id']}`));
    });

    el.querySelectorAll<HTMLButtonElement>('.btn-delete').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        const emp = getEmployee(btn.dataset['id']!);
        if (!emp) return;
        if (confirm(`Удалить сотрудника "${emp.name}"?`)) {
          deleteEmployee(btn.dataset['id']!);
          rebuild();
        }
      });
    });

    return el;
  }

  function buildDepartmentsTable(): HTMLElement {
    const departments = getDepartments();
    const employees   = getEmployees();
    const el = document.createElement('div');

    const rowsHtml = departments.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Отделов нет</td></tr>`
      : departments.map(dept => {
          const leaderName  = dept.leaderIds.length > 0
            ? dept.leaderIds.map(lid => employees.find(e => e.id === lid)?.name ?? '—').join(', ')
            : '—';
          const parentName  = dept.parentDepartmentId ? (getDepartment(dept.parentDepartmentId)?.name ?? '—') : 'Корневой';
          return `
            <tr>
              <td style="padding:13px 16px;font-weight:500;">${dept.name}</td>
              <td style="padding:13px 16px;color:#6b7280;">${leaderName}</td>
              <td style="padding:13px 16px;color:#6b7280;">${parentName}</td>
              <td style="padding:13px 16px;">
                <div style="display:flex;gap:8px;">
                  <button class="dept-edit" data-id="${dept.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                  <button class="dept-delete" data-id="${dept.id}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    el.innerHTML = `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
              ${['Название','Руководитель','Родительский отдел','Действия'].map(h =>
                `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    el.querySelectorAll<HTMLButtonElement>('.dept-edit').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => navigate(`/admin/department/${btn.dataset['id']}`));
    });

    el.querySelectorAll<HTMLButtonElement>('.dept-delete').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        const dept = getDepartment(btn.dataset['id']!);
        if (!dept) return;
        if (confirm(`Удалить отдел "${dept.name}"? Сотрудники отдела станут без отдела.`)) {
          deleteDepartment(btn.dataset['id']!);
          rebuild();
        }
      });
    });

    return el;
  }

  function buildAccessTable(): HTMLElement {
    const entries = getAccessEntries();
    const el = document.createElement('div');

    const rowsHtml = entries.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Доступов нет</td></tr>`
      : entries.map(entry => `
          <tr>
            <td style="padding:13px 16px;font-weight:500;">
              ${entry.serviceName}
              ${entry.serviceUrl ? `<a href="${entry.serviceUrl}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent);text-decoration:none;margin-left:6px;">↗</a>` : ''}
            </td>
            <td style="padding:13px 16px;color:#f97316;font-size:13px;">${entry.pizzeria || '—'}</td>
            <td style="padding:13px 16px;color:#6b7280;font-size:13px;font-family:monospace;">${entry.login}</td>
            <td style="padding:13px 16px;color:#9ca3af;font-size:13px;letter-spacing:0.1em;">••••••••</td>
            <td style="padding:13px 16px;">
              <div style="display:flex;gap:8px;">
                <button class="acc-edit" data-id="${entry.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                <button class="acc-delete" data-id="${entry.id}" data-name="${entry.serviceName}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
              </div>
            </td>
          </tr>
        `).join('');

    el.innerHTML = `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
              ${['Сервис','Пиццерия','Логин','Пароль','Действия'].map(h =>
                `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    el.querySelectorAll<HTMLButtonElement>('.acc-edit').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => navigate(`/admin/access/${btn.dataset['id']}`));
    });

    el.querySelectorAll<HTMLButtonElement>('.acc-delete').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        if (confirm(`Удалить доступ "${btn.dataset['name']}"?`)) {
          deleteAccessEntry(btn.dataset['id']!);
          rebuild();
        }
      });
    });

    return el;
  }

  page.appendChild(buildContent());
  return page;
}
