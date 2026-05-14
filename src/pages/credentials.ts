import { getActivePizzeria } from '../services/pizzeriaContext';
import { canWrite } from '../services/permissions';
import { getCredentials, createCredential, updateCredential, deleteCredential, CREDENTIAL_SERVICES } from '../services/credentials';
import type { Credential } from '../services/credentials';

export function renderCredentials(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  const activePiz = getActivePizzeria();
  if (!activePiz) {
    page.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);">Нет активной пиццерии</div>`;
    return page;
  }

  let items: Credential[] = [];

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      items = await getCredentials();
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
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Доступы</h1>
        <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${activePiz!.name}</div>
      </div>
    `;
    if (canWrite('credentials')) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.textContent = '+ Добавить доступ';
      addBtn.addEventListener('click', () => showModal(null));
      hdr.appendChild(addBtn);
    }
    wrap.appendChild(hdr);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
      empty.textContent = 'Доступов нет.';
      wrap.appendChild(empty);
      return wrap;
    }

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Сервис</th><th>Логин</th><th>Пароль</th><th>Ссылка</th><th>Заметки</th><th></th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    items.forEach(c => {
      const tr = document.createElement('tr');
      const urlHtml = c.url
        ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:13px;">Открыть</a>`
        : '—';
      tr.innerHTML = `
        <td style="font-weight:600;">${esc(c.service_name)}</td>
        <td style="color:var(--text-secondary);font-family:monospace;font-size:13px;">${c.login ? esc(c.login) : '—'}</td>
        <td>
          ${c.password
            ? `<span class="pwd-mask" data-pwd="${esc(c.password)}" style="font-family:monospace;font-size:13px;cursor:pointer;color:var(--text-secondary);" title="Нажмите, чтобы показать">••••••••</span>`
            : '—'}
        </td>
        <td>${urlHtml}</td>
        <td style="color:var(--text-muted);font-size:13px;">${c.notes ? esc(c.notes) : ''}</td>
        <td>
          <div style="display:flex;gap:8px;">
            ${canWrite('credentials') ? `<button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${c.id}">Изменить</button>
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="delete" data-id="${c.id}">Удалить</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    table.addEventListener('click', async e => {
      const target = e.target as HTMLElement;

      // Toggle password visibility
      if (target.classList.contains('pwd-mask')) {
        const showing = target.dataset['showing'] === '1';
        target.textContent = showing ? '••••••••' : target.dataset['pwd']!;
        target.dataset['showing'] = showing ? '0' : '1';
        return;
      }

      const btn = target.closest<HTMLButtonElement>('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.dataset['id']!);
      if (btn.dataset['action'] === 'edit') {
        showModal(items.find(c => c.id === id) ?? null);
      } else if (btn.dataset['action'] === 'delete') {
        if (!confirm('Удалить доступ?')) return;
        btn.disabled = true;
        await deleteCredential(id);
        await load();
      }
    });

    card.appendChild(table);
    wrap.appendChild(card);
    return wrap;
  }

  function showModal(item: Credential | null): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;width:100%;max-width:480px;box-shadow:var(--shadow-md);';

    const svcOptions = CREDENTIAL_SERVICES.map(s =>
      `<option value="${s}" ${item?.service_name === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    modal.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;">${item ? 'Редактировать доступ' : 'Новый доступ'}</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Сервис *</label>
          <input id="m-svc" type="text" list="svc-list" value="${esc(item?.service_name ?? '')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          <datalist id="svc-list">${svcOptions}</datalist>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Логин</label>
            <input id="m-login" type="text" value="${esc(item?.login ?? '')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Пароль</label>
            <input id="m-pwd" type="text" value="${esc(item?.password ?? '')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;font-family:monospace;">
          </div>
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Ссылка</label>
          <input id="m-url" type="url" value="${esc(item?.url ?? '')}" placeholder="https://..." style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Заметки</label>
          <textarea id="m-notes" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;resize:vertical;">${esc(item?.notes ?? '')}</textarea>
        </div>
        <div id="m-err" style="color:#ef4444;font-size:13px;display:none;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-outline" id="m-cancel">Отмена</button>
          <button class="btn btn-primary" id="m-save">Сохранить</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    modal.querySelector('#m-cancel')!.addEventListener('click', close);
    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const svc     = (modal.querySelector<HTMLInputElement>('#m-svc')!).value.trim();
      const login   = (modal.querySelector<HTMLInputElement>('#m-login')!).value.trim();
      const pwd     = (modal.querySelector<HTMLInputElement>('#m-pwd')!).value;
      const url     = (modal.querySelector<HTMLInputElement>('#m-url')!).value.trim();
      const notes   = (modal.querySelector<HTMLTextAreaElement>('#m-notes')!).value.trim();

      if (!svc) { errEl.textContent = 'Название сервиса обязательно'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Сохранение...';

      try {
        const data = { service_name: svc, login: login || null, password: pwd || null, url: url || null, notes: notes || null };
        if (item) await updateCredential(item.id, data);
        else await createCredential(data);
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
