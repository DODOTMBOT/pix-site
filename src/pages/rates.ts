import { getActivePizzeria } from '../services/pizzeriaContext';
import { getRates, createRate, updateRate, deleteRate, RATE_CATEGORIES } from '../services/rates';
import type { Rate, RateCategory } from '../services/rates';
import { canWrite } from '../services/permissions';

const CATEGORY_LABELS: Record<RateCategory, string> = {
  кухня:  'Кухня',
  кассир: 'Кассир',
  курьер: 'Курьер',
};

const CATEGORY_COLORS: Record<RateCategory, string> = {
  кухня:  '#FF6900',
  кассир: '#0ea5e9',
  курьер: '#10b981',
};

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
    if (canWrite('rates')) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.textContent = '+ Добавить ставку';
      addBtn.addEventListener('click', () => showModal(null));
      hdr.appendChild(addBtn);
    }
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
      <th>Категория</th>
      <th>Должность</th>
      <th>Ч. ставка</th>
      <th>Оклад</th>
      <th>За заказ</th>
      <th>За км</th>
      <th>Заметки</th>
      <th></th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    items.forEach(r => {
      const cat = (r.category ?? 'кухня') as RateCategory;
      const color = CATEGORY_COLORS[cat] ?? '#888';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span style="
            font-size:11px;padding:2px 9px;border-radius:20px;font-weight:600;
            background:${color}18;color:${color};
          ">${esc(CATEGORY_LABELS[cat] ?? cat)}</span>
        </td>
        <td style="font-weight:600;">${esc(r.position)}</td>
        <td style="color:var(--text-secondary);">${r.hourly_rate != null ? r.hourly_rate + ' ₽/ч' : '—'}</td>
        <td style="color:var(--text-secondary);">${r.monthly_salary != null ? r.monthly_salary + ' ₽/мес' : '—'}</td>
        <td style="color:var(--text-secondary);">${r.rate_per_order != null ? r.rate_per_order + ' ₽' : '—'}</td>
        <td style="color:var(--text-secondary);">${r.rate_per_km != null ? r.rate_per_km + ' ₽/км' : '—'}</td>
        <td style="color:var(--text-muted);font-size:13px;">${r.notes ? esc(r.notes) : ''}</td>
        <td>
          ${canWrite('rates') ? `<div style="display:flex;gap:8px;">
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;" data-action="edit" data-id="${r.id}">Изменить</button>
            <button class="btn btn-outline" style="padding:5px 12px;font-size:12px;color:var(--text-muted);" data-action="delete" data-id="${r.id}">Удалить</button>
          </div>` : ''}
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
    modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;width:100%;max-width:480px;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto;';

    const initialCat: RateCategory = item?.category ?? 'кухня';
    modal.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;">${item ? 'Редактировать ставку' : 'Новая ставка'}</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">

        <!-- Category segment switcher -->
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:8px;">Категория *</label>
          <div id="cat-switcher" style="display:flex;background:var(--bg-secondary);border-radius:var(--radius-sm);padding:3px;gap:2px;">
            ${(['кухня','кассир','курьер'] as RateCategory[]).map(c => `
              <button type="button" data-cat="${c}" style="
                flex:1;padding:7px 4px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
                transition:background 0.15s,color 0.15s;
                ${c === initialCat
                  ? `background:var(--bg-card);color:var(--accent);box-shadow:var(--shadow-sm);`
                  : `background:transparent;color:var(--text-muted);`}
              ">${CATEGORY_LABELS[c]}</button>
            `).join('')}
          </div>
        </div>

        <!-- Position dropdown (changes based on category) -->
        <div>
          <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">Должность *</label>
          <select id="m-pos" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;"></select>
        </div>

        <!-- Hourly + salary -->
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

        <!-- Courier-only fields -->
        <div id="courier-fields" style="display:none;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">За заказ (₽)</label>
            <input id="m-per-order" type="number" min="0" value="${item?.rate_per_order ?? ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;">За км (₽)</label>
            <input id="m-per-km" type="number" min="0" value="${item?.rate_per_km ?? ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;">
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

    // ── State ─────────────────────────────────────────────────────────────────
    let currentCat: RateCategory = initialCat;

    const posSelect      = modal.querySelector<HTMLSelectElement>('#m-pos')!;
    const courierFields  = modal.querySelector<HTMLElement>('#courier-fields')!;

    function applyCategory(cat: RateCategory): void {
      currentCat = cat;

      // Update switcher button styles
      modal.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(btn => {
        const active = btn.dataset['cat'] === cat;
        btn.style.background  = active ? 'var(--bg-card)' : 'transparent';
        btn.style.color       = active ? 'var(--accent)' : 'var(--text-muted)';
        btn.style.boxShadow   = active ? 'var(--shadow-sm)' : 'none';
      });

      // Rebuild position select
      const positions = RATE_CATEGORIES[cat];
      posSelect.innerHTML = positions
        .map(p => `<option value="${esc(p)}" ${item?.position === p && item?.category === cat ? 'selected' : ''}>${esc(p)}</option>`)
        .join('');

      // Show/hide courier fields
      courierFields.style.display = cat === 'курьер' ? 'grid' : 'none';
    }

    // Init
    applyCategory(initialCat);

    // Category switcher clicks
    modal.querySelector('#cat-switcher')!.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cat]');
      if (btn) applyCategory(btn.dataset['cat'] as RateCategory);
    });

    // ── Save / close ──────────────────────────────────────────────────────────
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    modal.querySelector('#m-cancel')!.addEventListener('click', close);
    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;

      const pos    = posSelect.value;
      const hourly = (modal.querySelector<HTMLInputElement>('#m-hourly')!).value;
      const salary = (modal.querySelector<HTMLInputElement>('#m-salary')!).value;
      const perOrd = (modal.querySelector<HTMLInputElement>('#m-per-order')!).value;
      const perKm  = (modal.querySelector<HTMLInputElement>('#m-per-km')!).value;
      const notes  = (modal.querySelector<HTMLTextAreaElement>('#m-notes')!).value.trim();

      if (!pos) { errEl.textContent = 'Выберите должность'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Сохранение...';

      try {
        const data = {
          category:       currentCat,
          position:       pos,
          hourly_rate:    hourly  ? parseInt(hourly)  : null,
          monthly_salary: salary  ? parseInt(salary)  : null,
          rate_per_order: currentCat === 'курьер' && perOrd ? parseInt(perOrd) : null,
          rate_per_km:    currentCat === 'курьер' && perKm  ? parseInt(perKm)  : null,
          notes:          notes || null,
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
