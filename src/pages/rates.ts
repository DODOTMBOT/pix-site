import { getActivePizzeria } from '../services/pizzeriaContext';
import { getRates, createRate, updateRate, deleteRate, RATE_POSITIONS } from '../services/rates';
import type { Rate } from '../services/rates';

export function renderRates(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  const activePiz = getActivePizzeria();
  if (!activePiz) {
    page.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);">Нет активной пиццерии</div>`;
    return page;
  }

  let items: Rate[] = [];

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      items = await getRates();
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
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Ставки</h1>
        <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${activePiz!.name}</div>
      </div>
    `;
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Добавить ставку';
    addBtn.addEventListener('click', () => showModal(null));
    hdr.appendChild(addBtn);
    wrap.appendChild(hdr);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
      empty.textContent = 'Ставок нет.';
      wrap.appendChild(empty);
      return wrap;
    }

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Должность</th><th>Часовая ставка</th><th>Оклад</th><th>Заметки</th><th></th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    items.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${esc(r.position)}</td>
        <td style="color:var(--text-secondary);">${r.hourly_rate != null ? r.hourly_rate + ' ₽/ч' : '—'}</td>
        <td style="color:var(--text-secondary);">${r.monthly_salary != null ? r.monthly_salary + ' ₽/мес' : '—'}</td>
        <td style="color:var(--text-muted);font-size:13px;">${r.notes ? esc(r.notes) : ''}</td>
        <td>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${r.id}">Изменить</button>
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="delete" data-id="${r.id}">Удалить</button>
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
        showModal(items.find(r => r.id === id) ?? null);
      } else if (btn.dataset['action'] === 'delete') {
        if (!confirm('Удалить ставку?')) return;
        btn.disabled = true;
        await deleteRate(id);
        await load();
      }
    });

    card.appendChild(table);
    wrap.appendChild(card);
    return wrap;
  }

  function showModal(item: Rate | null): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;width:100%;max-width:440px;box-shadow:var(--shadow-md);';

    const posOptions = RATE_POSITIONS.map(p =>
      `<option value="${p}" ${item?.position === p ? 'selected' : ''}>${p}</option>`
    ).join('');

    modal.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;">${item ? 'Редактировать ставку' : 'Новая ставка'}</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Должность *</label>
          <input id="m-pos" type="text" list="pos-list" value="${esc(item?.position ?? '')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          <datalist id="pos-list">${posOptions}</datalist>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Часовая ставка (₽)</label>
            <input id="m-hourly" type="number" min="0" value="${item?.hourly_rate ?? ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Оклад (₽/мес)</label>
            <input id="m-salary" type="number" min="0" value="${item?.monthly_salary ?? ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          </div>
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
      const pos     = (modal.querySelector<HTMLInputElement>('#m-pos')!).value.trim();
      const hourly  = (modal.querySelector<HTMLInputElement>('#m-hourly')!).value;
      const salary  = (modal.querySelector<HTMLInputElement>('#m-salary')!).value;
      const notes   = (modal.querySelector<HTMLTextAreaElement>('#m-notes')!).value.trim();

      if (!pos) { errEl.textContent = 'Должность обязательна'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Сохранение...';

      try {
        const data = {
          position:       pos,
          hourly_rate:    hourly  ? parseInt(hourly)  : null,
          monthly_salary: salary  ? parseInt(salary)  : null,
          notes:          notes   || null,
        };
        if (item) await updateRate(item.id, data);
        else await createRate(data);
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
