import { getActivePizzeria } from '../services/pizzeriaContext';
import { canWrite } from '../services/permissions';
import type { MotivationData, MotivationBlock, MotivationItem, CriticalFactor } from '../services/motivation';
import {
  getMotivation, saveFund, createBlock, updateBlock, deleteBlock,
  createItem, updateItem, deleteItem, createCritical, deleteCritical,
} from '../services/motivation';

export function renderMotivation(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';

  const activePiz = getActivePizzeria();
  if (!activePiz) {
    page.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);">Нет активной пиццерии</div>`;
    return page;
  }

  const writable = canWrite('motivation');
  let data: MotivationData | null = null;

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      data = await getMotivation();
      render();
    } catch {
      page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
    }
  }

  function render(): void {
    if (!data) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:900px;display:flex;flex-direction:column;gap:24px;';

    const hdr = document.createElement('div');
    hdr.innerHTML = `
      <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:2px;">Мотивация</h1>
      <div style="font-size:13px;color:var(--text-muted);">${activePiz!.name}</div>
    `;
    wrap.appendChild(hdr);
    wrap.appendChild(buildFundSection(data.fund));
    wrap.appendChild(buildBlocksSection(data.blocks, data.fund.premium, data.fund.wow));
    wrap.appendChild(buildCriticalSection(data.critical));
    page.replaceChildren(wrap);
  }

  // ── Fund ─────────────────────────────────────────────────────────────────────

  function buildFundSection(fund: { premium: number; wow: number }): HTMLElement {
    const section = document.createElement('div');
    section.appendChild(secLabel('ФОНД ПРЕМИИ'));

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px 22px;box-shadow:var(--shadow-sm);';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;';

    const premFld = fundField('Премиальный фонд', fund.premium, !writable, '#FF6900');
    const wowFld  = fundField('Фонд WOW', fund.wow, !writable, '#f59e0b');

    const totalBox = document.createElement('div');
    totalBox.style.cssText = 'flex:1;min-width:120px;padding-bottom:1px;';

    function refreshTotal(): void {
      const p = parseMoney(premFld.inp.value);
      const w = parseMoney(wowFld.inp.value);
      totalBox.innerHTML = `
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Итого</div>
        <div style="font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.02em;">${fmtN(p + w)} ₽</div>
      `;
    }

    premFld.inp.addEventListener('input', refreshTotal);
    wowFld.inp.addEventListener('input', refreshTotal);
    refreshTotal();

    row.appendChild(premFld.el);
    row.appendChild(wowFld.el);
    row.appendChild(totalBox);

    if (writable) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.style.cssText = 'padding:9px 20px;align-self:flex-end;';
      saveBtn.textContent = 'Сохранить';
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true; saveBtn.textContent = '...';
        try {
          await saveFund({ premium: parseMoney(premFld.inp.value), wow: parseMoney(wowFld.inp.value) });
          await load();
        } catch {
          saveBtn.textContent = 'Ошибка';
          setTimeout(() => { saveBtn.textContent = 'Сохранить'; saveBtn.disabled = false; }, 1500);
        }
      });
      row.appendChild(saveBtn);
    }

    card.appendChild(row);
    section.appendChild(card);
    return section;
  }

  // ── Blocks ────────────────────────────────────────────────────────────────────

  function buildBlocksSection(blocks: MotivationBlock[], premFund: number, wowFund: number): HTMLElement {
    const section = document.createElement('div');
    const blockSum   = round1(blocks.reduce((s, b) => s + b.weight, 0));
    const blockSumOk = blocks.length === 0 || Math.abs(blockSum - 100) < 0.01;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:10px;';
    left.appendChild(secLabel('БЛОКИ И ПУНКТЫ'));
    if (blocks.length > 0) {
      const badge = span(sumStyle(blockSumOk), `Σ = ${blockSum}%${blockSumOk ? ' ✓' : ' ✗ (нужно 100%)'}`);
      left.appendChild(badge);
    }
    titleRow.appendChild(left);

    if (writable) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.style.cssText = 'font-size:13px;padding:6px 14px;';
      btn.textContent = '+ Блок';
      btn.addEventListener('click', () => showBlockModal(null, premFund, blocks));
      titleRow.appendChild(btn);
    }
    section.appendChild(titleRow);

    if (blocks.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:36px;text-align:center;color:var(--text-muted);font-size:13px;';
      empty.textContent = writable ? 'Блоков нет. Добавьте первый.' : 'Блоков нет.';
      section.appendChild(empty);
      return section;
    }

    blocks.forEach(b => section.appendChild(buildBlockCard(b, premFund, wowFund)));
    return section;
  }

  function buildBlockCard(block: MotivationBlock, premFund: number, wowFund: number): HTMLElement {
    const blockAmt  = Math.round((block.weight / 100) * premFund);
    const wowAmt    = wowFund > 0 ? Math.round((block.weight / 100) * wowFund) : 0;
    const itemSum   = round1(block.items.reduce((s, i) => s + i.weight, 0));
    const itemSumOk = block.items.length === 0 || Math.abs(itemSum - 100) < 0.01;

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);margin-bottom:10px;';

    // ── Block header bar ──────────────────────────────────────────────────────
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:10px 16px;background:var(--bg-secondary);display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);flex:1;';
    nameEl.textContent = block.name;

    hdr.appendChild(nameEl);
    hdr.appendChild(span('font-size:12px;font-weight:700;padding:2px 9px;border-radius:20px;background:var(--accent-light);color:var(--accent);', `${block.weight}%`));
    hdr.appendChild(span('font-size:13px;font-weight:700;color:var(--text-primary);min-width:80px;text-align:right;', `${fmtN(blockAmt)} ₽`));
    if (wowFund > 0) hdr.appendChild(span('font-size:11px;color:#f59e0b;font-weight:600;', `WOW: ${fmtN(wowAmt)} ₽`));

    if (writable) {
      const editBtn = btn14('Изменить', () => showBlockModal(block, premFund, data!.blocks));
      const delBtn  = btn14('✕', async () => {
        if (!confirm(`Удалить блок «${block.name}»? Все пункты будут удалены.`)) return;
        delBtn.disabled = true;
        await deleteBlock(block.id);
        await load();
      }, 'color:var(--text-muted);');
      hdr.append(editBtn, delBtn);
    }
    card.appendChild(hdr);

    // ── Items table ───────────────────────────────────────────────────────────
    if (block.items.length > 0) {
      const tbl = document.createElement('table');
      tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

      block.items.forEach((item, i) => {
        const itemAmt = Math.round((item.weight / 100) * blockAmt);
        const tr = document.createElement('tr');
        tr.style.cssText = `border-bottom:1px solid var(--border);${i % 2 !== 0 ? 'background:var(--bg-secondary);' : ''}`;

        let html = `
          <td style="padding:8px 8px 8px 20px;width:28px;">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--accent);opacity:0.35;vertical-align:middle;"></span>
          </td>
          <td style="padding:8px 6px;font-weight:600;color:var(--text-primary);">${esc(item.name)}</td>
          <td style="padding:8px 6px;color:var(--text-muted);font-size:12px;white-space:nowrap;">
            ${item.goal ? `Цель: ${esc(item.goal)}` : ''}
          </td>
          <td style="padding:8px 6px;white-space:nowrap;">
            ${item.has_wow_goal ? `<span style="font-size:11px;font-weight:700;padding:1px 7px;border-radius:20px;background:#f59e0b18;color:#f59e0b;">WOW${item.wow_goal ? `: ${esc(item.wow_goal)}` : ''}</span>` : ''}
          </td>
          <td style="padding:8px 6px;text-align:right;white-space:nowrap;">
            <span style="font-size:11px;font-weight:600;padding:1px 7px;border-radius:20px;background:var(--bg-hover);color:var(--text-muted);">${item.weight}%</span>
          </td>
          <td style="padding:8px 6px;text-align:right;font-weight:700;color:var(--text-primary);white-space:nowrap;min-width:74px;">${fmtN(itemAmt)} ₽</td>
        `;
        tr.innerHTML = html;

        if (writable) {
          const td = document.createElement('td');
          td.style.cssText = 'padding:6px 12px 6px 4px;white-space:nowrap;text-align:right;';
          const e = btn14('Изм.', () => showItemModal(item, block, blockAmt));
          const d = btn14('✕', async () => {
            if (!confirm(`Удалить пункт «${item.name}»?`)) return;
            d.disabled = true;
            await deleteItem(item.id);
            await load();
          }, 'color:var(--text-muted);');
          td.append(e, d);
          tr.appendChild(td);
        }

        tbl.appendChild(tr);
      });

      card.appendChild(tbl);
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px 20px;color:var(--text-muted);font-size:12px;';
      empty.textContent = 'Пунктов нет.';
      card.appendChild(empty);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:7px 16px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);';

    if (block.items.length > 0) {
      footer.appendChild(span(
        `font-size:11px;font-weight:600;${itemSumOk ? 'color:var(--accent);' : 'color:#ef4444;'}`,
        `Σ пунктов = ${itemSum}%${itemSumOk ? ' ✓' : ' — должно быть 100%'}`,
      ));
    } else {
      footer.appendChild(document.createElement('span'));
    }

    if (writable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-outline';
      addBtn.style.cssText = 'font-size:11px;padding:4px 10px;';
      addBtn.textContent = '+ Пункт';
      addBtn.addEventListener('click', () => showItemModal(null, block, blockAmt));
      footer.appendChild(addBtn);
    }
    card.appendChild(footer);
    return card;
  }

  // ── Critical ─────────────────────────────────────────────────────────────────

  function buildCriticalSection(items: CriticalFactor[]): HTMLElement {
    const section = document.createElement('div');

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';
    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:10px;';
    left.appendChild(secLabel('КРИТИЧЕСКИЕ ФАКТОРЫ'));
    left.appendChild(span('font-size:11px;color:#ef4444;font-weight:600;', '⚠ при наступлении любого вся премия обнуляется'));
    titleRow.appendChild(left);

    if (writable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-outline';
      addBtn.style.cssText = 'font-size:13px;padding:6px 14px;';
      addBtn.textContent = '+ Добавить';
      addBtn.addEventListener('click', () => showCriticalModal());
      titleRow.appendChild(addBtn);
    }
    section.appendChild(titleRow);

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;color:var(--text-muted);font-size:13px;';
      empty.textContent = 'Критических факторов нет.';
      card.appendChild(empty);
    } else {
      const tbl = document.createElement('table');
      tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

      // Header
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr style="border-bottom:1px solid var(--border);">
        <th style="padding:8px 10px 8px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;width:40%;">Фактор</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">Показатель критичности</th>
        ${writable ? '<th style="width:70px;"></th>' : ''}
      </tr>`;
      tbl.appendChild(thead);

      const tbody = document.createElement('tbody');
      items.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.style.cssText = `border-bottom:1px solid var(--border);${i % 2 !== 0 ? 'background:var(--bg-secondary);' : ''}`;

        let html = `
          <td style="padding:9px 10px 9px 16px;font-weight:600;color:var(--text-primary);">
            <span style="color:#ef4444;margin-right:6px;">⚠</span>${esc(item.name)}
          </td>
          <td style="padding:9px 10px;color:var(--text-muted);">${item.indicator ? esc(item.indicator) : '—'}</td>
        `;
        tr.innerHTML = html;

        if (writable) {
          const td = document.createElement('td');
          td.style.cssText = 'padding:6px 12px;text-align:right;';
          const d = btn14('Удалить', async () => {
            if (!confirm('Удалить критический фактор?')) return;
            d.disabled = true;
            await deleteCritical(item.id);
            await load();
          }, 'color:var(--text-muted);');
          td.appendChild(d);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });

      tbl.appendChild(tbody);
      card.appendChild(tbl);
    }

    section.appendChild(card);
    return section;
  }

  // ── Modals ────────────────────────────────────────────────────────────────────

  function showBlockModal(block: MotivationBlock | null, premFund: number, allBlocks: MotivationBlock[]): void {
    const usedPct   = allBlocks.filter(b => b.id !== block?.id).reduce((s, b) => s + b.weight, 0);
    const remaining = round1(Math.max(0, 100 - usedPct));

    const { overlay, modal, close } = baseModal(block ? 'Изменить блок' : 'Новый блок');
    const nameInp   = mField(modal, 'Название блока *', 'text', block?.name ?? '', 'Рейтинг, Прибыль, Качество...');
    const weightInp = mField(modal, `Вес блока (% из premium-фонда) *`, 'number', String(block?.weight ?? remaining), '');
    weightInp.min = '0'; weightInp.max = '100'; weightInp.step = '0.1';

    const calc = mHint(modal, '');
    const hint = mHint(modal, `Доступно: ${remaining}% · Фонд: ${fmtN(premFund)} ₽`);
    hint.style.order = '-1';

    function refreshCalc(): void {
      const w = parseFloat(weightInp.value) || 0;
      calc.textContent = `= ${fmtN(Math.round(w / 100 * premFund))} ₽ из фонда`;
      calc.style.color = 'var(--accent)';
      calc.style.fontWeight = '700';
    }
    weightInp.addEventListener('input', refreshCalc);
    refreshCalc();

    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const name   = nameInp.value.trim();
      const weight = parseFloat(weightInp.value) || 0;
      if (!name)       { showErr(errEl, 'Название обязательно'); return; }
      if (weight <= 0) { showErr(errEl, 'Вес должен быть больше 0'); return; }
      errEl.style.display = 'none';
      saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...';
      try {
        if (block) await updateBlock(block.id, { name, weight });
        else       await createBlock({ name, weight });
        close(); await load();
      } catch (err) {
        saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
        showErr(errEl, (err as Error).message);
      }
    });

    document.body.appendChild(overlay);
    nameInp.focus();
  }

  function showItemModal(item: MotivationItem | null, block: MotivationBlock, blockAmt: number): void {
    const usedPct   = block.items.filter(i => i.id !== item?.id).reduce((s, i) => s + i.weight, 0);
    const remaining = round1(Math.max(0, 100 - usedPct));

    const { overlay, modal, close } = baseModal(item ? 'Изменить пункт' : 'Новый пункт');

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:var(--text-muted);margin-top:-10px;';
    sub.textContent = `Блок: ${block.name} · ${fmtN(blockAmt)} ₽`;
    modal.insertBefore(sub, modal.children[1]);

    const nameInp   = mField(modal, 'Название пункта *', 'text', item?.name ?? '', 'Производительность, Выручка...');
    const weightInp = mField(modal, 'Вес (% от блока) *', 'number', String(item?.weight ?? remaining), '');
    weightInp.min = '0'; weightInp.max = '100'; weightInp.step = '0.1';
    mHint(modal, `Доступно: ${remaining}%`);

    const calc = mHint(modal, '');
    function refreshCalc(): void {
      const w = parseFloat(weightInp.value) || 0;
      calc.textContent = `= ${fmtN(Math.round(w / 100 * blockAmt))} ₽`;
      calc.style.color = 'var(--accent)'; calc.style.fontWeight = '700';
    }
    weightInp.addEventListener('input', refreshCalc);
    refreshCalc();

    const goalInp = mField(modal, 'Цель (целевой показатель)', 'text', item?.goal ?? '', '95%, 8 мин, 1 000 000 ₽...');

    // WOW checkbox + conditional wow_goal input
    const wowRow = document.createElement('div');
    wowRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const wowCb = document.createElement('input');
    wowCb.type = 'checkbox'; wowCb.id = 'cb-wow';
    wowCb.checked = item?.has_wow_goal ?? false;
    wowCb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#f59e0b;flex-shrink:0;';
    const wowLbl = document.createElement('label');
    wowLbl.htmlFor = 'cb-wow';
    wowLbl.style.cssText = 'font-size:13px;color:var(--text-primary);cursor:pointer;';
    wowLbl.textContent = 'Есть цель по WOW фонду';
    wowRow.append(wowCb, wowLbl);
    modal.insertBefore(wowRow, modal.lastElementChild);

    const wowGoalWrap = document.createElement('div');
    wowGoalWrap.style.cssText = `display:${wowCb.checked ? 'block' : 'none'};`;
    const wowGoalLbl = document.createElement('div');
    wowGoalLbl.style.cssText = 'font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;';
    wowGoalLbl.textContent = 'Цель по WOW';
    const wowGoalInp = document.createElement('input');
    wowGoalInp.type = 'text'; wowGoalInp.value = item?.wow_goal ?? '';
    wowGoalInp.placeholder = '98%, 5 мин...';
    wowGoalInp.style.cssText = INP;
    wowGoalWrap.append(wowGoalLbl, wowGoalInp);
    modal.insertBefore(wowGoalWrap, modal.lastElementChild);

    wowCb.addEventListener('change', () => {
      wowGoalWrap.style.display = wowCb.checked ? 'block' : 'none';
      if (!wowCb.checked) wowGoalInp.value = '';
    });

    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const name    = nameInp.value.trim();
      const weight  = parseFloat(weightInp.value) || 0;
      const goal    = goalInp.value.trim() || null;
      if (!name)       { showErr(errEl, 'Название обязательно'); return; }
      if (weight <= 0) { showErr(errEl, 'Вес должен быть больше 0'); return; }
      errEl.style.display = 'none';
      saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...';
      try {
        const payload = { name, weight, goal, has_wow_goal: wowCb.checked, wow_goal: wowGoalInp.value.trim() || null };
        if (item) await updateItem(item.id, payload);
        else      await createItem(block.id, payload);
        close(); await load();
      } catch (err) {
        saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
        showErr(errEl, (err as Error).message);
      }
    });

    document.body.appendChild(overlay);
    nameInp.focus();
  }

  function showCriticalModal(): void {
    const { overlay, modal, close } = baseModal('Критический фактор');
    const nameInp = mField(modal, 'Название фактора *', 'text', '', 'Нарушение санитарных норм...');
    const indInp  = mField(modal, 'Показатель критичности', 'text', '', 'Оценка ниже 80%, результат проверки < 3...');
    mHint(modal, 'Укажите конкретное значение, при котором фактор считается наступившим.');

    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const name    = nameInp.value.trim();
      if (!name) { showErr(errEl, 'Название обязательно'); return; }
      errEl.style.display = 'none';
      saveBtn.disabled = true; saveBtn.textContent = '...';
      try {
        await createCritical({ name, indicator: indInp.value.trim() || null });
        close(); await load();
      } catch (err) {
        saveBtn.disabled = false; saveBtn.textContent = 'Добавить';
        showErr(errEl, (err as Error).message);
      }
    });
    modal.querySelector<HTMLButtonElement>('#m-save')!.textContent = 'Добавить';

    document.body.appendChild(overlay);
    nameInp.focus();
  }

  load();
  return page;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const INP = 'width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box;';

function secLabel(text: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;';
  el.textContent = text;
  return el;
}

function span(style: string, text: string): HTMLElement {
  const el = document.createElement('span');
  el.style.cssText = style;
  el.textContent = text;
  return el;
}

function sumStyle(ok: boolean): string {
  return ok
    ? 'font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:var(--accent-light);color:var(--accent);'
    : 'font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#ef444420;color:#ef4444;';
}

function btn14(label: string, handler: () => void, extra = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'btn btn-outline';
  b.style.cssText = `padding:3px 8px;font-size:11px;${extra}`;
  b.textContent = label;
  b.addEventListener('click', handler);
  return b;
}

function fundField(label: string, value: number, disabled: boolean, accentColor: string): { el: HTMLElement; inp: HTMLInputElement } {
  const el = document.createElement('div');
  el.style.cssText = 'flex:1;min-width:145px;';

  const lbl = document.createElement('div');
  lbl.style.cssText = `font-size:10px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;`;
  lbl.textContent = label;

  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display:flex;align-items:center;gap:4px;';

  const inp = document.createElement('input');
  inp.type        = 'text';
  inp.placeholder = '';
  inp.value       = value > 0 ? fmtN(value) : '';
  inp.disabled    = disabled;
  inp.style.cssText = `padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:18px;font-weight:700;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;width:100%;letter-spacing:0.01em;${disabled ? 'opacity:0.7;' : ''}`;

  inp.addEventListener('input', () => {
    const raw = inp.value.replace(/\D/g, '');
    const pos = inp.selectionStart ?? 0;
    const oldLen = inp.value.length;
    inp.value = raw ? fmtN(parseInt(raw, 10)) : '';
    const diff = inp.value.length - oldLen;
    inp.setSelectionRange(Math.max(0, pos + diff), Math.max(0, pos + diff));
  });

  const sym = document.createElement('span');
  sym.style.cssText = 'font-size:16px;font-weight:600;color:var(--text-muted);';
  sym.textContent = '₽';

  inputRow.append(inp, sym);
  el.append(lbl, inputRow);
  return { el, inp };
}

// Modal helpers
function baseModal(title: string): { overlay: HTMLElement; modal: HTMLElement; close: () => void } {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:24px;width:100%;max-width:440px;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px;';

  const h2 = document.createElement('h2');
  h2.style.cssText = 'font-size:17px;font-weight:700;margin:0;';
  h2.textContent = title;

  const errEl = document.createElement('div');
  errEl.id = 'm-err';
  errEl.style.cssText = 'color:#ef4444;font-size:12px;display:none;';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:4px;';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-outline'; cancelBtn.textContent = 'Отмена';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary'; saveBtn.textContent = 'Сохранить'; saveBtn.id = 'm-save';
  btnRow.append(cancelBtn, saveBtn);

  modal.append(h2, errEl, btnRow);
  overlay.appendChild(modal);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  cancelBtn.addEventListener('click', close);

  return { overlay, modal, close };
}

function mField(modal: HTMLElement, label: string, type: string, value: string, placeholder: string): HTMLInputElement {
  const wrap = document.createElement('div');
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;';
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.type = type; inp.value = value; inp.placeholder = placeholder;
  inp.style.cssText = INP;
  wrap.append(lbl, inp);
  modal.insertBefore(wrap, modal.lastElementChild);
  return inp;
}

function mHint(modal: HTMLElement, text: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:-4px;';
  el.textContent = text;
  modal.insertBefore(el, modal.lastElementChild);
  return el;
}

function showErr(el: HTMLElement, msg: string): void {
  el.textContent = msg; el.style.display = 'block';
}

function fmtN(n: number): string {
  return n.toLocaleString('ru-RU');
}

function parseMoney(s: string): number {
  const digits = s.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
