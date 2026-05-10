import { navigate } from '../router';
import { getEmployees, deleteEmployee, getEmployee, getDepartments, getDepartment, deleteDepartment, getAccessEntries, deleteAccessEntry, getRateDocuments, deleteRateDocument, getContacts, saveContacts, getMetrics, saveMetrics, getPlans, deletePlan } from '../services/storage';
import { isManagement, isSuperAdmin } from '../services/auth';
import { buildUsersTableEl } from './admin-users';

type Tab = 'employees' | 'departments' | 'access' | 'rates' | 'users' | 'home' | 'contacts' | 'motivation';

export function renderAdmin(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  if (!isManagement()) { navigate('/'); return page; }

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

    const noAddBtn = activeTab === 'users' || activeTab === 'home';
    const showAddBtn = !noAddBtn && activeTab !== 'contacts' && activeTab !== 'motivation';

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;">
          <button class="btn btn-ghost" id="back-site" style="margin-bottom:24px;">← Назад на сайт</button>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">Управление структурой</h1>
            ${showAddBtn ? '<button class="btn btn-primary" id="add-btn">+ Добавить</button>' : ''}
            ${activeTab === 'users' ? '<button class="btn btn-primary" id="add-user-btn">+ Новый пользователь</button>' : ''}
            ${activeTab === 'home' ? '<button class="btn btn-primary" id="edit-home-btn">Редактировать</button>' : ''}
            ${activeTab === 'contacts'   ? '<button class="btn btn-primary" id="add-contact-btn">+ Добавить контакт</button>' : ''}
            ${activeTab === 'motivation' ? '<button class="btn btn-primary" id="add-motiv-btn">+ Новый план</button>' : ''}
          </div>
          <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:24px;">
            ${tabBtn('employees', 'Сотрудники')}
            ${tabBtn('departments', 'Отделы')}
            ${tabBtn('access', 'Доступы')}
            ${tabBtn('rates', 'Ставки')}
            ${isSuperAdmin() ? tabBtn('users', 'Пользователи') : ''}
            ${tabBtn('home', 'Главная')}
            ${tabBtn('contacts', 'Контакты')}
            ${tabBtn('motivation', 'Мотивация')}
          </div>
          <div id="tab-content"></div>
        </section>
      </div>
    `;

    wrap.querySelector('#back-site')!.addEventListener('click', () => navigate('/'));

    wrap.querySelector('#add-btn')?.addEventListener('click', () => {
      if (activeTab === 'employees')        navigate('/admin/employee/new');
      else if (activeTab === 'departments') navigate('/admin/department/new');
      else if (activeTab === 'access')      navigate('/admin/access/new');
      else                                  navigate('/admin/rates/new');
    });

    wrap.querySelector('#add-user-btn')?.addEventListener('click', () => navigate('/admin/users/new'));
    wrap.querySelector('#edit-home-btn')?.addEventListener('click', () => navigate('/admin/home'));
    wrap.querySelector('#add-contact-btn')?.addEventListener('click', () => navigate('/admin/contacts/new'));
    wrap.querySelector('#add-motiv-btn')?.addEventListener('click', () => navigate('/admin/motivation/new'));

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
    } else if (activeTab === 'access') {
      tabContent.appendChild(buildAccessTable());
    } else if (activeTab === 'rates') {
      tabContent.appendChild(buildRatesTable());
    } else if (activeTab === 'users') {
      tabContent.appendChild(buildUsersTableEl(rebuild));
    } else if (activeTab === 'contacts') {
      tabContent.appendChild(buildContactsTable());
    } else if (activeTab === 'motivation') {
      tabContent.appendChild(buildMotivationSection());
    } else {
      tabContent.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:32px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">🏠</div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">Главная страница</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Редактируйте заголовок, карусель фото и блоки главной страницы</div>
          <button class="btn btn-primary" id="goto-home-edit">Редактировать главную</button>
        </div>
      `;
      tabContent.querySelector('#goto-home-edit')?.addEventListener('click', () => navigate('/admin/home'));
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

  function buildRatesTable(): HTMLElement {
    const docs = getRateDocuments();
    const el   = document.createElement('div');

    const rowsHtml = docs.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Документов нет</td></tr>`
      : docs.map(doc => {
          const updDate = new Date(doc.updatedAt).toLocaleDateString('ru-RU');
          return `
            <tr>
              <td style="padding:13px 16px;font-weight:500;">${doc.pizzeria}</td>
              <td style="padding:13px 16px;color:#6b7280;">${doc.title}</td>
              <td style="padding:13px 16px;color:#9ca3af;font-size:13px;">${updDate}</td>
              <td style="padding:13px 16px;">
                <div style="display:flex;gap:8px;">
                  <button class="rate-edit" data-id="${doc.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                  <button class="rate-delete" data-id="${doc.id}" data-name="${doc.pizzeria}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
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
              ${['Пиццерия','Заголовок','Обновлено','Действия'].map(h =>
                `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    el.querySelectorAll<HTMLButtonElement>('.rate-edit').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => navigate(`/admin/rates/${btn.dataset['id']}`));
    });

    el.querySelectorAll<HTMLButtonElement>('.rate-delete').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        if (confirm(`Удалить документ "${btn.dataset['name']}"?`)) {
          deleteRateDocument(btn.dataset['id']!);
          rebuild();
        }
      });
    });

    return el;
  }

  function buildContactsTable(): HTMLElement {
    const contacts = getContacts();
    const el = document.createElement('div');

    const rowsHtml = contacts.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Контактов нет</td></tr>`
      : contacts.map(c => `
          <tr>
            <td style="padding:13px 16px;font-weight:500;">${c.name}</td>
            <td style="padding:13px 16px;color:#6b7280;">${c.position || '—'}</td>
            <td style="padding:13px 16px;color:#6b7280;">${c.pizzerias || '—'}</td>
            <td style="padding:13px 16px;color:#6b7280;">${c.phone || '—'}</td>
            <td style="padding:13px 16px;">
              <div style="display:flex;gap:8px;">
                <button class="cnt-edit" data-id="${c.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                <button class="cnt-delete" data-id="${c.id}" data-name="${c.name}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
              </div>
            </td>
          </tr>`).join('');

    el.innerHTML = `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
              ${['Имя','Должность','Пиццерии','Телефон','Действия'].map(h =>
                `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    el.querySelectorAll<HTMLButtonElement>('.cnt-edit').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f9fafb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => navigate(`/admin/contacts/${btn.dataset['id']}`));
    });

    el.querySelectorAll<HTMLButtonElement>('.cnt-delete').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fef2f2'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
      btn.addEventListener('click', () => {
        if (confirm(`Удалить контакт "${btn.dataset['name']}"?`)) {
          saveContacts(getContacts().filter(c => c.id !== btn.dataset['id']));
          rebuild();
        }
      });
    });

    return el;
  }

  function buildMotivationSection(): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:20px;';

    // ── Metrics library ──
    const metrics = getMetrics();

    const metricRows = metrics.map(m => `
      <tr>
        <td style="padding:11px 16px;font-weight:500;">${m.name}</td>
        <td style="padding:11px 16px;color:#6b7280;">${m.block === 'ratings' ? 'Рейтинги' : 'Прибыль'}</td>
        <td style="padding:11px 16px;color:#6b7280;">${m.direction === 'higher' ? '↑ выше' : '↓ ниже'}</td>
        <td style="padding:11px 16px;color:#6b7280;">${m.unit ?? '—'}</td>
        <td style="padding:11px 16px;">
          <button class="metric-del" data-id="${m.id}" data-name="${m.name}"
            style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
        </td>
      </tr>
    `).join('');

    const metricsCard = document.createElement('div');
    metricsCard.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);">
          <h2 style="font-size:15px;font-weight:600;margin:0;">Показатели (KPI)</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);background:var(--bg-secondary);">
              ${['Название','Блок','Направление','Единица',''].map(h =>
                `<th style="padding:9px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${metricRows || '<tr><td colspan="5" style="text-align:center;padding:30px;color:#9ca3af;font-size:14px;">Показателей нет</td></tr>'}</tbody>
        </table>
        <!-- Добавить показатель -->
        <div style="padding:16px 20px;border-top:1px solid var(--border);background:var(--bg-secondary);">
          <div style="display:grid;grid-template-columns:1fr 120px 120px 100px auto;gap:8px;align-items:end;">
            <div>
              <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">Название</div>
              <input id="nm-name" type="text" placeholder="NPS" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-input,var(--bg-primary));color:var(--text-primary);outline:none;box-sizing:border-box;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">Блок</div>
              <select id="nm-block" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-input,var(--bg-primary));color:var(--text-primary);outline:none;box-sizing:border-box;">
                <option value="ratings">Рейтинги</option>
                <option value="profit">Прибыль</option>
              </select>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">Направление</div>
              <select id="nm-dir" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-input,var(--bg-primary));color:var(--text-primary);outline:none;box-sizing:border-box;">
                <option value="higher">↑ выше</option>
                <option value="lower">↓ ниже</option>
              </select>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">Ед. изм.</div>
              <input id="nm-unit" type="text" placeholder="балл" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-input,var(--bg-primary));color:var(--text-primary);outline:none;box-sizing:border-box;">
            </div>
            <button id="nm-add" class="btn btn-primary" style="padding:9px 16px;font-size:13px;">Добавить</button>
          </div>
        </div>
      </div>
    `;

    metricsCard.querySelectorAll<HTMLButtonElement>('.metric-del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`Удалить показатель "${btn.dataset['name']}"?`)) {
          saveMetrics(getMetrics().filter(m => m.id !== btn.dataset['id']));
          rebuild();
        }
      });
    });

    metricsCard.querySelector('#nm-add')!.addEventListener('click', () => {
      const name = (metricsCard.querySelector<HTMLInputElement>('#nm-name')!).value.trim();
      if (!name) return;
      const block     = (metricsCard.querySelector<HTMLSelectElement>('#nm-block')!).value as 'ratings' | 'profit';
      const direction = (metricsCard.querySelector<HTMLSelectElement>('#nm-dir')!).value as 'higher' | 'lower';
      const unit      = (metricsCard.querySelector<HTMLInputElement>('#nm-unit')!).value.trim() || undefined;
      const newMetrics = [...getMetrics(), { id: Math.random().toString(36).slice(2, 9), name, block, direction, unit }];
      saveMetrics(newMetrics);
      rebuild();
    });

    el.appendChild(metricsCard);

    // ── Plans ──
    const plans = getPlans();

    const planRows = plans.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Планов нет</td></tr>`
      : plans.map(p => {
          const monthLabel = new Date(p.month + '-01').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
          return `
            <tr>
              <td style="padding:13px 16px;font-weight:500;">${p.pizzeria}</td>
              <td style="padding:13px 16px;color:#6b7280;">${monthLabel}</td>
              <td style="padding:13px 16px;color:#6b7280;">${p.bonusFund.toLocaleString('ru-RU')} ₽</td>
              <td style="padding:13px 16px;color:#f97316;">${p.wowFund.toLocaleString('ru-RU')} ₽</td>
              <td style="padding:13px 16px;">
                <div style="display:flex;gap:8px;">
                  <button class="plan-edit" data-id="${p.id}" style="font-size:12px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;color:#374151;">Изменить</button>
                  <button class="plan-del"  data-id="${p.id}" data-name="${p.pizzeria} ${p.month}" style="font-size:12px;padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;">Удалить</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    const plansCard = document.createElement('div');
    plansCard.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);">
          <h2 style="font-size:15px;font-weight:600;margin:0;">Планы мотивации</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);background:var(--bg-secondary);">
              ${['Пиццерия','Месяц','Бонус. фонд','WOW-фонд','Действия'].map(h =>
                `<th style="padding:9px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>${planRows}</tbody>
        </table>
      </div>
    `;

    plansCard.querySelectorAll<HTMLButtonElement>('.plan-edit').forEach(btn => {
      btn.addEventListener('click', () => navigate(`/admin/motivation/${btn.dataset['id']}`));
    });

    plansCard.querySelectorAll<HTMLButtonElement>('.plan-del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`Удалить план "${btn.dataset['name']}"?`)) {
          deletePlan(btn.dataset['id']!);
          rebuild();
        }
      });
    });

    el.appendChild(plansCard);
    return el;
  }

  page.appendChild(buildContent());
  return page;
}
