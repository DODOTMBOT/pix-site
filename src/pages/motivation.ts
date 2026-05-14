import { getActivePizzeria } from '../services/pizzeriaContext';
import { canWrite } from '../services/permissions';
import { getMotivation, createMotivationRule, updateMotivationRule, deleteMotivationRule, MOTIVATION_METRICS } from '../services/motivation';
import type { MotivationRule } from '../services/motivation';

export function renderMotivation(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  const activePiz = getActivePizzeria();
  if (!activePiz) {
    page.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);">Нет активной пиццерии</div>`;
    return page;
  }

  let items: MotivationRule[] = [];

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      items = await getMotivation();
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
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Мотивация</h1>
        <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${activePiz!.name}</div>
      </div>
    `;
    if (canWrite('motivation')) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.textContent = '+ Добавить правило';
      addBtn.addEventListener('click', () => showModal(null));
      hdr.appendChild(addBtn);
    }
    wrap.appendChild(hdr);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
      empty.textContent = 'Правил мотивации нет.';
      wrap.appendChild(empty);
      return wrap;
    }

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Метрика</th><th>Порог</th><th>Бонус</th><th>Описание</th><th>Статус</th><th></th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    items.forEach(r => {
      const tr = document.createElement('tr');
      const activeHtml = r.is_active
        ? `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--accent-light);color:var(--accent);">Активно</span>`
        : `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--bg-hover);color:var(--text-muted);">Неактивно</span>`;
      tr.innerHTML = `
        <td style="font-weight:600;">${esc(r.metric_name)}</td>
        <td style="color:var(--text-secondary);">${r.threshold}</td>
        <td style="color:var(--text-secondary);">${r.bonus_amount} ₽</td>
        <td style="color:var(--text-muted);font-size:13px;">${r.description ? esc(r.description) : ''}</td>
        <td>${activeHtml}</td>
        <td>
          <div style="display:flex;gap:8px;">
            ${canWrite('motivation') ? `<button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${r.id}">Изменить</button>
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="delete" data-id="${r.id}">Удалить</button>` : ''}
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
        if (!confirm('Удалить правило мотивации?')) return;
        btn.disabled = true;
        await deleteMotivationRule(id);
        await load();
      }
    });

    card.appendChild(table);
    wrap.appendChild(card);
    return wrap;
  }

  function showModal(item: MotivationRule | null): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;width:100%;max-width:460px;box-shadow:var(--shadow-md);';

    const metricOptions = MOTIVATION_METRICS.map(m =>
      `<option value="${m}" ${item?.metric_name === m ? 'selected' : ''}>${m}</option>`
    ).join('');

    modal.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;">${item ? 'Редактировать правило' : 'Новое правило'}</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Метрика *</label>
          <input id="m-metric" type="text" list="metric-list" value="${esc(item?.metric_name ?? '')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          <datalist id="metric-list">${metricOptions}</datalist>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Порог *</label>
            <input id="m-threshold" type="number" min="0" value="${item?.threshold ?? ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Бонус (₽) *</label>
            <input id="m-bonus" type="number" min="0" value="${item?.bonus_amount ?? ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          </div>
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Описание</label>
          <textarea id="m-desc" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;resize:vertical;">${esc(item?.description ?? '')}</textarea>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <input id="m-active" type="checkbox" ${item == null || item.is_active ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
          <label for="m-active" style="font-size:14px;color:var(--text-primary);cursor:pointer;">Активно</label>
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
      const errEl    = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn  = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const metric   = (modal.querySelector<HTMLInputElement>('#m-metric')!).value.trim();
      const threshold = (modal.querySelector<HTMLInputElement>('#m-threshold')!).value;
      const bonus    = (modal.querySelector<HTMLInputElement>('#m-bonus')!).value;
      const desc     = (modal.querySelector<HTMLTextAreaElement>('#m-desc')!).value.trim();
      const isActive = (modal.querySelector<HTMLInputElement>('#m-active')!).checked;

      if (!metric) { errEl.textContent = 'Метрика обязательна'; errEl.style.display = 'block'; return; }
      if (!threshold) { errEl.textContent = 'Порог обязателен'; errEl.style.display = 'block'; return; }
      if (!bonus) { errEl.textContent = 'Бонус обязателен'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Сохранение...';

      try {
        const data = {
          metric_name:  metric,
          threshold:    parseFloat(threshold),
          bonus_amount: parseFloat(bonus),
          description:  desc || null,
          is_active:    isActive ? 1 : 0,
        };
        if (item) await updateMotivationRule(item.id, data);
        else await createMotivationRule(data);
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
