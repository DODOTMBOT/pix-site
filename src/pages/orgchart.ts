import { navigate } from '../router';
import { getEmployees, getDepartments } from '../services/storage';
import { renderOrgTree } from '../components/org-tree';
import { getAvatarColor, getInitials } from '../components/orgchart-node';
import type { Employee } from '../types';

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

export function renderOrgChart(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const employees    = getEmployees();
  const departments  = getDepartments();

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
    treeContent = renderOrgTree(employees, departments, emp => {
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
          <button class="btn btn-outline" id="goto-admin-btn" style="font-size:13px;padding:8px 16px;">Управление</button>
        </div>
        <div id="tree-wrap"></div>
      </section>
    </div>
  `;

  page.querySelector('#goto-admin-btn')!.addEventListener('click', () => navigate('/admin'));
  page.querySelector('#tree-wrap')!.appendChild(treeContent);

  return page;
}
