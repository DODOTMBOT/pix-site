import { getAllPizzerias } from '../services/pizzeriaContext';
import { getContacts, createContact, updateContact, deleteContact } from '../services/contacts';
import type { Contact } from '../services/contacts';

export function renderContacts(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  let items: Contact[] = [];

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      items = await getContacts();
      render();
    } catch {
      page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
    }
  }

  function render(): void { page.replaceChildren(buildLayout()); }

  function buildLayout(): HTMLElement {
    const wrap = document.createElement('div');

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;';
    hdr.innerHTML = `
      <div>
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Контакты</h1>
        <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">Все пиццерии</div>
      </div>
    `;
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Добавить контакт';
    addBtn.addEventListener('click', () => showModal(null));
    hdr.appendChild(addBtn);
    wrap.appendChild(hdr);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
      empty.textContent = 'Контактов нет.';
      wrap.appendChild(empty);
      return wrap;
    }

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Должность</th>
      <th>ФИО</th>
      <th>Пиццерия</th>
      <th>Телефон</th>
      <th>Почта</th>
      <th></th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    items.forEach(c => {
      const tr = document.createElement('tr');
      const pizzeriaBadges = c.pizzerias.length
        ? c.pizzerias.map(p =>
            `<span style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;background:var(--accent-light);color:var(--accent);font-weight:600;margin:1px 2px;">${esc(p.name)}</span>`
          ).join('')
        : '<span style="color:var(--text-muted);">—</span>';

      tr.innerHTML = `
        <td style="color:var(--text-secondary);font-size:13px;">${c.position ? esc(c.position) : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td style="font-weight:600;">${esc(c.name)}</td>
        <td style="max-width:220px;">${pizzeriaBadges}</td>
        <td style="color:var(--text-secondary);">${c.phone ? `<a href="tel:${esc(c.phone)}" style="color:var(--text-secondary);text-decoration:none;">${esc(c.phone)}</a>` : '—'}</td>
        <td style="color:var(--text-secondary);">${c.email ? `<a href="mailto:${esc(c.email)}" style="color:var(--text-secondary);text-decoration:none;">${esc(c.email)}</a>` : '—'}</td>
        <td>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${c.id}">Изменить</button>
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="delete" data-id="${c.id}">Удалить</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    table.addEventListener('click', async e => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.dataset['id']!);
      if (btn.dataset['action'] === 'edit') {
        showModal(items.find(c => c.id === id) ?? null);
      } else if (btn.dataset['action'] === 'delete') {
        if (!confirm('Удалить контакт?')) return;
        btn.disabled = true;
        await deleteContact(id);
        await load();
      }
    });

    card.appendChild(table);
    wrap.appendChild(card);
    return wrap;
  }

  function showModal(item: Contact | null): void {
    const pizzerias = getAllPizzerias();
    const selectedIds = new Set<number>(item?.pizzerias.map(p => p.id) ?? []);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;width:100%;max-width:500px;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto;';

    const pizzeriaCheckboxes = pizzerias.map(p => `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;transition:background 0.1s;" class="piz-option">
        <input type="checkbox" value="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;">
        <span style="font-size:14px;color:var(--text-primary);">${esc(p.name)}</span>
      </label>
    `).join('');

    modal.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;">${item ? 'Редактировать контакт' : 'Новый контакт'}</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Должность</label>
          <input id="m-position" type="text" value="${esc(item?.position ?? '')}"
            placeholder="Менеджер, Директор, Технолог..."
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">ФИО *</label>
          <input id="m-name" type="text" value="${esc(item?.name ?? '')}"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:8px;">Пиццерия</label>
          <div id="piz-list" style="border:1.5px solid var(--border);border-radius:var(--radius-sm);max-height:160px;overflow-y:auto;padding:4px;">
            ${pizzeriaCheckboxes || '<div style="padding:10px;color:var(--text-muted);font-size:13px;">Нет пиццерий</div>'}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Телефон</label>
            <input id="m-phone" type="tel" value="${esc(item?.phone ?? '')}"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Почта</label>
            <input id="m-email" type="email" value="${esc(item?.email ?? '')}"
              style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box;">
          </div>
        </div>
        <div id="m-err" style="color:#ef4444;font-size:13px;display:none;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-outline" id="m-cancel">Отмена</button>
          <button class="btn btn-primary" id="m-save">Сохранить</button>
        </div>
      </div>
    `;

    // Hover effect for pizzeria options
    modal.querySelectorAll<HTMLElement>('.piz-option').forEach(el => {
      el.addEventListener('mouseenter', () => { el.style.background = 'var(--bg-hover)'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; });
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    modal.querySelector('#m-cancel')!.addEventListener('click', close);
    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;

      const position = (modal.querySelector<HTMLInputElement>('#m-position')!).value.trim();
      const name     = (modal.querySelector<HTMLInputElement>('#m-name')!).value.trim();
      const phone    = (modal.querySelector<HTMLInputElement>('#m-phone')!).value.trim();
      const email    = (modal.querySelector<HTMLInputElement>('#m-email')!).value.trim();
      const pizzeria_ids = Array.from(
        modal.querySelectorAll<HTMLInputElement>('#piz-list input[type=checkbox]:checked')
      ).map(cb => parseInt(cb.value));

      if (!name) { errEl.textContent = 'ФИО обязательно'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Сохранение...';

      try {
        const data = {
          position: position || null,
          name,
          phone: phone || null,
          email: email || null,
          pizzeria_ids,
        };
        if (item) await updateContact(item.id, data);
        else await createContact(data);
        close();
        await load();
      } catch (err) {
        errEl.textContent   = (err as Error).message;
        errEl.style.display = 'block';
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Сохранить';
      }
    });

    function close(): void { overlay.remove(); }
  }

  load();
  return page;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
