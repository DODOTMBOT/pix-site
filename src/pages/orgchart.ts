import { navigate } from '../router';
import { getEmployees, getDepartments } from '../services/storage';
import { getAvatarColor, getInitials } from '../components/orgchart-node';
import type { Employee, Department } from '../types';

// ─── Avatar helpers ──────────────────────────────────────────────────────────

function avatarHtml(emp: Employee, cls: string): string {
  const initials = getInitials(emp.name);
  const color    = getAvatarColor(emp.name);
  if (emp.avatar && emp.avatar.startsWith('data:')) {
    return `<img src="${emp.avatar}" class="emp-avatar ${cls}" style="object-fit:cover;">`;
  }
  return `<div class="emp-avatar ${cls}" style="background:${color};">${initials}</div>`;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function renderModal(emp: Employee, allEmployees: Employee[], onClose: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.45);
    z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  const subordinates = allEmployees.filter(e => e.departmentId === emp.departmentId && e.id !== emp.id);

  const avatarContent = emp.avatar && emp.avatar.startsWith('data:')
    ? `<img src="${emp.avatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 16px;display:block;">`
    : `<div style="width:72px;height:72px;border-radius:50%;background:${getAvatarColor(emp.name)};color:#fff;font-size:26px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">${getInitials(emp.name)}</div>`;

  const extraHtml = (emp.extraFields ?? []).map(f => `
    <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
      <span style="font-size:13px;color:#6b7280;min-width:120px;">${f.label}</span>
      <span style="font-size:13px;color:#111;">${f.value}</span>
    </div>`).join('');

  const subHtml = subordinates.length
    ? `<div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">Коллеги по отделу</div>
        ${subordinates.map(s => `<div class="modal-sub-link" data-id="${s.id}" style="font-size:13px;color:#f97316;cursor:pointer;padding:4px 0;">${s.name} — ${s.position}</div>`).join('')}
      </div>`
    : '';

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px;max-width:480px;width:100%;position:relative;max-height:90vh;overflow-y:auto;">
      <button id="modal-close" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;color:#9ca3af;cursor:pointer;line-height:1;">✕</button>
      ${avatarContent}
      <h2 style="font-size:20px;font-weight:700;text-align:center;margin-bottom:4px;">${emp.name}</h2>
      <div style="text-align:center;font-size:14px;color:#6b7280;margin-bottom:20px;">${emp.position} · ${emp.department}</div>
      <div style="border-top:1px solid #f3f4f6;padding-top:16px;">
        ${[
          ['Отдел', emp.department],
          ['Пиццерия', emp.pizzeria],
          ['Email', emp.email],
          ['Телефон', emp.phone],
        ].filter(([, v]) => v).map(([l, v]) => `
          <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:13px;color:#6b7280;min-width:120px;">${l}</span>
            <span style="font-size:13px;color:#111;">${v}</span>
          </div>`).join('')}
        ${extraHtml}
      </div>
      ${subHtml}
    </div>
  `;

  overlay.querySelector('#modal-close')!.addEventListener('click', onClose);
  overlay.addEventListener('click', e => { if (e.target === overlay) onClose(); });

  overlay.querySelectorAll<HTMLElement>('.modal-sub-link').forEach(el => {
    el.addEventListener('click', () => {
      const sub = allEmployees.find(e => e.id === el.dataset['id']);
      if (!sub) return;
      onClose();
      setTimeout(() => {
        const newModal = renderModal(sub, allEmployees, () => newModal.remove());
        document.body.appendChild(newModal);
      }, 50);
    });
  });

  return overlay;
}

// ─── Org tree rendering ───────────────────────────────────────────────────────

function buildEmpCard(
  emp: Employee,
  onClick: (emp: Employee) => void,
  extraClass = ''
): HTMLElement {
  const card = document.createElement('div');
  card.className = `emp-card${extraClass ? ' ' + extraClass : ''}`;
  card.innerHTML = `
    ${avatarHtml(emp, '')}
    <div class="emp-info">
      <div class="emp-name">${emp.name}</div>
      <div class="emp-pos">${emp.position}</div>
      ${emp.pizzeria ? `<div class="emp-pizzeria">${emp.pizzeria}</div>` : ''}
    </div>
  `;
  card.addEventListener('click', () => onClick(emp));
  return card;
}

function buildDeptBlock(
  dept: Department,
  allDepts: Department[],
  allEmps: Employee[],
  onClick: (emp: Employee) => void,
  nested = false
): HTMLElement {
  const block = document.createElement('div');
  block.className = nested ? 'dept-block nested' : 'dept-block';

  const leader  = dept.leaderId ? allEmps.find(e => e.id === dept.leaderId) : null;
  const members = allEmps.filter(e => e.departmentId === dept.id && e.id !== dept.leaderId);
  const children = allDepts.filter(d => d.parentDepartmentId === dept.id);

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'dept-title';
  titleEl.textContent = dept.name.toUpperCase();
  block.appendChild(titleEl);

  // Leader row
  if (leader) {
    const leaderRow = document.createElement('div');
    leaderRow.className = 'dept-leader-row';
    leaderRow.innerHTML = `
      ${avatarHtml(leader, 'sm')}
      <div>
        <span class="emp-name">${leader.name}</span>
        <span class="emp-pos"> · ${leader.position}</span>
      </div>
    `;
    leaderRow.style.cursor = 'pointer';
    leaderRow.addEventListener('click', () => onClick(leader));
    block.appendChild(leaderRow);
  }

  // Members
  if (members.length > 0) {
    const membersWrap = document.createElement('div');
    membersWrap.className = 'dept-members';
    members.forEach(emp => membersWrap.appendChild(buildEmpCard(emp, onClick)));
    block.appendChild(membersWrap);
  }

  // Nested child departments
  children.forEach(child => {
    block.appendChild(buildDeptBlock(child, allDepts, allEmps, onClick, true));
  });

  return block;
}

function getDeptsByLeader(
  leaderId: string,
  depts: Department[],
  emps: Employee[]
): Department[] {
  return depts.filter(d => {
    if (d.leaderId === leaderId) return true;
    return emps.some(e => e.departmentId === d.id && e.managerId === leaderId);
  });
}

function buildOrgColumns(
  employees: Employee[],
  departments: Department[],
  onClick: (emp: Employee) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'org-page';

  const rootLeaders = employees.filter(e => !e.managerId);

  if (rootLeaders.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#9ca3af;font-size:14px;">Нет корневых руководителей</div>`;
    return wrap;
  }

  const columns = document.createElement('div');
  columns.className = 'org-columns';

  rootLeaders.forEach((leader, idx) => {
    // Divider between columns
    if (idx > 0) {
      const divider = document.createElement('div');
      divider.className = 'org-divider';
      columns.appendChild(divider);
    }

    const col = document.createElement('div');
    col.className = 'org-column';

    // Root card
    const rootCard = document.createElement('div');
    rootCard.className = 'root-card';
    rootCard.innerHTML = `
      ${avatarHtml(leader, 'large')}
      <div class="root-info">
        <div class="root-name">${leader.name}</div>
        <div class="root-pos">${leader.position}</div>
        ${leader.pizzeria ? `<div class="emp-pizzeria">${leader.pizzeria}</div>` : ''}
      </div>
    `;
    rootCard.style.cursor = 'pointer';
    rootCard.addEventListener('click', () => onClick(leader));
    col.appendChild(rootCard);

    // Departments belonging to this leader (root depts only — no parent)
    const leaderDepts = getDeptsByLeader(leader.id, departments, employees)
      .filter(d => !d.parentDepartmentId);

    leaderDepts.forEach(dept => {
      col.appendChild(buildDeptBlock(dept, departments, employees, onClick, false));
    });

    columns.appendChild(col);
  });

  wrap.appendChild(columns);
  return wrap;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function renderOrgChart(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const employees   = getEmployees();
  const departments = getDepartments();

  let treeContent: HTMLElement;
  if (departments.length === 0) {
    treeContent = document.createElement('div');
    treeContent.innerHTML = `
      <div style="text-align:center;padding:80px 20px;">
        <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Структура не настроена</div>
        <div style="font-size:14px;color:#6b7280;margin-bottom:24px;">Перейдите в Админку чтобы добавить отделы</div>
        <button class="btn btn-primary" id="goto-admin">Открыть Админку</button>
      </div>
    `;
    treeContent.querySelector('#goto-admin')!.addEventListener('click', () => navigate('/admin'));
  } else {
    treeContent = buildOrgColumns(employees, departments, emp => {
      const modal = renderModal(emp, employees, () => modal.remove());
      document.body.appendChild(modal);
    });
  }

  page.innerHTML = `
    <div class="container">
      <section style="padding:40px 0 64px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;">
          <div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:8px;">Организация</div>
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">Структура компании</h1>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline" id="reset-btn" style="font-size:13px;padding:8px 16px;color:#ef4444;border-color:#fecaca;">Сброс данных</button>
            <button class="btn btn-outline" id="goto-admin-btn" style="font-size:13px;padding:8px 16px;">Управление</button>
          </div>
        </div>
        <div id="tree-wrap"></div>
      </section>
    </div>
  `;

  page.querySelector('#goto-admin-btn')!.addEventListener('click', () => navigate('/admin'));
  page.querySelector('#reset-btn')!.addEventListener('click', () => {
    if (confirm('Сбросить все данные и загрузить тестовые? Это удалит всех сотрудников и отделы.')) {
      localStorage.removeItem('pix_employees');
      localStorage.removeItem('pix_departments');
      window.location.reload();
    }
  });
  page.querySelector('#tree-wrap')!.appendChild(treeContent);

  return page;
}
