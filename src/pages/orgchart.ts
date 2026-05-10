import { navigate } from '../router';
import { getEmployees, getDepartments } from '../services/storage';
import { getAvatarColor, getInitials } from '../components/orgchart-node';
import { filterByPizzeria } from '../services/auth';
import type { Employee, Department } from '../types';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function avatarHtml(emp: Employee, cls: string): string {
  if (emp.avatar && emp.avatar.startsWith('data:')) {
    return `<img src="${emp.avatar}" class="emp-avatar ${cls}" style="object-fit:cover;">`;
  }
  return `<div class="emp-avatar ${cls}" style="background:${getAvatarColor(emp.name)};">${getInitials(emp.name)}</div>`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function renderModal(emp: Employee, allEmployees: Employee[], onClose: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(0,0,0,0.55);
    backdrop-filter:blur(4px);
    z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  const colleagues = allEmployees.filter(e => e.departmentId === emp.departmentId && e.id !== emp.id);

  const avatarContent = emp.avatar && emp.avatar.startsWith('data:')
    ? `<img src="${emp.avatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 16px;display:block;">`
    : `<div style="width:72px;height:72px;border-radius:50%;background:${getAvatarColor(emp.name)};color:#fff;font-size:26px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">${getInitials(emp.name)}</div>`;

  const extraHtml = (emp.extraFields ?? []).map(f => `
    <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:13px;color:var(--text-secondary);min-width:120px;">${f.label}</span>
      <span style="font-size:13px;color:var(--text-primary);">${f.value}</span>
    </div>`).join('');

  const colleaguesHtml = colleagues.length
    ? `<div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:var(--text-secondary);text-transform:uppercase;margin-bottom:10px;">Коллеги по отделу</div>
        ${colleagues.map(s => `<div class="modal-sub-link" data-id="${s.id}" style="font-size:13px;color:var(--accent);cursor:pointer;padding:4px 0;">${s.name} — ${s.position}</div>`).join('')}
      </div>`
    : '';

  overlay.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:480px;width:100%;position:relative;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);">
      <button id="modal-close" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;color:var(--text-muted);cursor:pointer;line-height:1;">✕</button>
      ${avatarContent}
      <h2 style="font-size:20px;font-weight:700;text-align:center;margin-bottom:4px;color:var(--text-primary);">${emp.name}</h2>
      <div style="text-align:center;font-size:14px;color:var(--text-secondary);margin-bottom:20px;">${emp.position} · ${emp.department}</div>
      <div style="border-top:1px solid var(--border);padding-top:16px;">
        ${[
          ['Отдел', emp.department],
          ['Пиццерия', emp.pizzeria],
          ['Email', emp.email],
          ['Телефон', emp.phone],
        ].filter(([, v]) => v).map(([l, v]) => `
          <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;color:var(--text-secondary);min-width:120px;">${l}</span>
            <span style="font-size:13px;color:var(--text-primary);">${v}</span>
          </div>`).join('')}
        ${extraHtml}
      </div>
      ${colleaguesHtml}
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

// ─── Emp card ─────────────────────────────────────────────────────────────────

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/);
  return [parts[0] ?? '', parts[1] ?? ''];
}

function buildEmpCard(emp: Employee, onClick: (emp: Employee) => void): HTMLElement {
  const [first, last] = splitName(emp.name);
  const card = document.createElement('div');
  card.className = 'emp-card';
  card.innerHTML = `
    ${avatarHtml(emp, '')}
    <div class="emp-info">
      <span class="emp-firstname">${first}</span>
      ${last ? `<span class="emp-lastname">${last}</span>` : ''}
      <span class="emp-position">${emp.position}</span>
      ${emp.pizzeria ? `<span class="emp-pizzeria">${emp.pizzeria}</span>` : ''}
    </div>
  `;
  card.addEventListener('click', () => onClick(emp));
  return card;
}

// ─── Dept block (non-recursive) ───────────────────────────────────────────────

function buildDeptBlock(
  dept: Department,
  allEmps: Employee[],
  onClick: (emp: Employee) => void,
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'dept-block';

  const leaders    = dept.leaderIds.map(lid => allEmps.find(e => e.id === lid)).filter(Boolean) as Employee[];
  const leaderIdSet = new Set(dept.leaderIds);
  const members    = allEmps.filter(e => e.departmentId === dept.id && !leaderIdSet.has(e.id));

  const titleEl = document.createElement('div');
  titleEl.className = 'dept-title';
  titleEl.textContent = dept.name.toUpperCase();
  block.appendChild(titleEl);

  leaders.forEach(leader => {
    const row = document.createElement('div');
    row.className = 'dept-leader-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      ${avatarHtml(leader, 'sm')}
      <div style="min-width:0;overflow:hidden;flex:1;">
        <span class="dept-leader-name">${leader.name}</span>
        <span class="dept-leader-pos">${leader.position}</span>
      </div>
    `;
    row.addEventListener('click', () => onClick(leader));
    block.appendChild(row);
  });

  if (members.length > 0) {
    const membersWrap = document.createElement('div');
    membersWrap.className = 'dept-members';
    members.forEach(emp => membersWrap.appendChild(buildEmpCard(emp, onClick)));
    block.appendChild(membersWrap);
  }

  return block;
}

// ─── Org tree (BFS, flat rows — no nested DOM blocks) ────────────────────────

function buildOrgTree(
  employees: Employee[],
  departments: Department[],
  onClick: (emp: Employee) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'org-page';

  const rootDepts = departments.filter(d => !d.parentDepartmentId);

  // Root level: group by priority field → one row per priority value
  const priorities = [...new Set(rootDepts.map(d => d.priority))].sort((a, b) => a - b);
  priorities.forEach(p => {
    const depts = rootDepts.filter(d => d.priority === p);
    const row = document.createElement('div');
    row.className = 'priority-row';
    depts.forEach(dept => row.appendChild(buildDeptBlock(dept, employees, onClick)));
    wrap.appendChild(row);
  });

  // Deeper levels: BFS, one flat row per depth
  let currentIds = rootDepts.map(d => d.id);
  while (currentIds.length > 0) {
    const children = departments.filter(
      d => d.parentDepartmentId !== null && currentIds.includes(d.parentDepartmentId!)
    );
    if (children.length === 0) break;

    const row = document.createElement('div');
    row.className = 'priority-row';
    children.forEach(dept => row.appendChild(buildDeptBlock(dept, employees, onClick)));
    wrap.appendChild(row);

    currentIds = children.map(d => d.id);
  }

  return wrap;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function renderOrgChart(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const employees   = filterByPizzeria(getEmployees());
  const departments = getDepartments();

  let treeContent: HTMLElement;
  if (departments.length === 0) {
    treeContent = document.createElement('div');
    treeContent.innerHTML = `
      <div style="text-align:center;padding:80px 20px;">
        <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-primary);">Структура не настроена</div>
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">Перейдите в Админку чтобы добавить отделы</div>
        <button class="btn btn-primary" id="goto-admin">Открыть Админку</button>
      </div>
    `;
    treeContent.querySelector('#goto-admin')!.addEventListener('click', () => navigate('/admin'));
  } else {
    treeContent = buildOrgTree(employees, departments, emp => {
      const modal = renderModal(emp, employees, () => modal.remove());
      document.body.appendChild(modal);
    });
  }

  page.innerHTML = `
    <div class="container">
      <section style="padding:40px 0 64px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;">
          <div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Организация</div>
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;color:var(--text-primary);">Структура компании</h1>
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
