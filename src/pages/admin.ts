import { navigate } from '../router';
import { getEmployees, deleteEmployee, getEmployee } from '../services/storage';

export function renderAdmin(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  function rebuild(): void {
    page.replaceChildren(buildContent());
  }

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');
    const employees = getEmployees();

    const rowsHtml = employees.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Сотрудников нет</td></tr>`
      : employees.map(emp => {
          const manager = emp.parentId ? getEmployee(emp.parentId) : null;
          return `
            <tr class="admin-row" data-id="${emp.id}">
              <td style="padding:13px 16px;font-weight:500;">${emp.name}</td>
              <td style="padding:13px 16px;color:#6b7280;">${emp.position}</td>
              <td style="padding:13px 16px;color:#6b7280;">${emp.department}</td>
              <td style="padding:13px 16px;color:#6b7280;">${emp.pizzeria}</td>
              <td style="padding:13px 16px;color:#6b7280;">${manager ? manager.name : '—'}</td>
              <td style="padding:13px 16px;">
                <div style="display:flex;gap:8px;">
                  <button class="btn-edit" data-id="${emp.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                  <button class="btn-delete" data-id="${emp.id}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    wrap.innerHTML = `
      <div class="container">
        <section style="padding: 40px 0 64px;">
          <button class="btn btn-ghost" id="back-site" style="margin-bottom:24px;">← Назад на сайт</button>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">Управление структурой</h1>
            <button class="btn btn-primary" id="add-emp">+ Добавить сотрудника</button>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
                  ${['ФИО','Должность','Отдел','Пиццерия','Руководитель','Действия'].map(h =>
                    `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    wrap.querySelector('#back-site')!.addEventListener('click', () => navigate('/'));
    wrap.querySelector('#add-emp')!.addEventListener('click', () => navigate('/admin/employee/new'));

    wrap.querySelectorAll<HTMLButtonElement>('.btn-edit').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => navigate(`/admin/employee/${btn.dataset['id']}`));
    });

    wrap.querySelectorAll<HTMLButtonElement>('.btn-delete').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        const emp = getEmployee(btn.dataset['id']!);
        if (!emp) return;
        if (confirm(`Удалить сотрудника "${emp.name}"? Его подчинённые станут корневыми.`)) {
          deleteEmployee(btn.dataset['id']!);
          rebuild();
        }
      });
    });

    return wrap;
  }

  page.appendChild(buildContent());
  return page;
}
