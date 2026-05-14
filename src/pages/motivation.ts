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
    wrap.style.cssText = 'max-width:860px;display:flex;flex-direction:column;gap:28px;';

    const hdr = document.createElement('div');
    hdr.innerHTML = `
      <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px;">Мотивация</h1>
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
    section.appendChild(sectionLabel('ФОНД ПРЕМИИ'));

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px 24px;box-shadow:var(--shadow-sm);';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;';

    const premField = moneyField('Премиальный фонд', fund.premium, !writable);
    const wowField  = moneyField('Фонд WOW', fund.wow, !writable);

    const totalWrap = document.createElement('div');
    totalWrap.style.cssText = 'flex:1;min-width:130px;padding-bottom:2px;';

    function refreshTotal(): void {
      const p = parseInt(premField.inp.value) || 0;
      const w = parseInt(wowField.inp.value)  || 0;
      totalWrap.innerHTML = `
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Итого</div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${fmtN(p + w)} ₽</div>
      `;
    }
    premField.inp.addEventListener('input', refreshTotal);
    wowField.inp.addEventListener('input', refreshTotal);
    refreshTotal();

    row.appendChild(premField.el);
    row.appendChild(wowField.el);
    row.appendChild(totalWrap);

    if (writable) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.style.cssText = 'padding:10px 20px;align-self:flex-end;';
      saveBtn.textContent = 'Сохранить';
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true; saveBtn.textContent = '...';
        try {
          await saveFund({ premium: parseInt(premField.inp.value) || 0, wow: parseInt(wowField.inp.value) || 0 });
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

    const blockSum    = round1(blocks.reduce((s, b) => s + b.weight, 0));
    const blockSumOk  = blocks.length === 0 || Math.abs(blockSum - 100) < 0.01;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:10px;';
    left.appendChild(sectionLabel('БЛОКИ И ПУНКТЫ'));

    if (blocks.length > 0) {
      const badge = document.createElement('span');
      badge.style.cssText = sumBadgeStyle(blockSumOk);
      badge.textContent = `Σ блоков = ${blockSum}%${blockSumOk ? ' ✓' : ' — должно быть 100%'}`;
      left.appendChild(badge);
    }

    titleRow.appendChild(left);

    if (writable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.style.cssText = 'font-size:13px;padding:7px 16px;';
      addBtn.textContent = '+ Блок';
      addBtn.addEventListener('click', () => showBlockModal(null, premFund, blocks));
      titleRow.appendChild(addBtn);
    }

    section.appendChild(titleRow);

    if (blocks.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:40px;text-align:center;color:var(--text-muted);font-size:14px;';
      empty.textContent = writable ? 'Блоков нет. Добавьте первый.' : 'Блоков нет.';
      section.appendChild(empty);
      return section;
    }

    blocks.forEach(block => section.appendChild(buildBlockCard(block, premFund, wowFund)));
    return section;
  }

  function buildBlockCard(block: MotivationBlock, premFund: number, wowFund: number): HTMLElement {
    const blockAmt   = Math.round((block.weight / 100) * premFund);
    const wowAmt     = Math.round((block.weight / 100) * wowFund);
    const itemSum    = round1(block.items.reduce((s, i) => s + i.weight, 0));
    const itemSumOk  = block.items.length === 0 || Math.abs(itemSum - 100) < 0.01;

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);margin-bottom:12px;';

    // Block header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:12px 18px;background:var(--bg-secondary);display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:15px;font-weight:700;color:var(--text-primary);flex:1;min-width:120px;';
    nameEl.textContent = block.name;

    const wBadge = document.createElement('span');
    wBadge.style.cssText = 'font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:var(--accent-light);color:var(--accent);';
    wBadge.textContent = `${block.weight}%`;

    const amtEl = document.createElement('span');
    amtEl.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);';
    amtEl.textContent = `${fmtN(blockAmt)} ₽`;

    hdr.appendChild(nameEl);
    hdr.appendChild(wBadge);
    hdr.appendChild(amtEl);

    if (wowFund > 0) {
      const wowEl = document.createElement('span');
      wowEl.style.cssText = 'font-size:12px;color:#f59e0b;font-weight:600;';
      wowEl.textContent = `WOW: ${fmtN(wowAmt)} ₽`;
      hdr.appendChild(wowEl);
    }

    if (writable) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-outline';
      editBtn.style.cssText = 'padding:4px 10px;font-size:12px;';
      editBtn.textContent = 'Изменить';
      editBtn.addEventListener('click', () => showBlockModal(block, premFund, data!.blocks));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-outline';
      delBtn.style.cssText = 'padding:4px 10px;font-size:12px;color:var(--text-muted);';
      delBtn.textContent = 'Удалить';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Удалить блок «${block.name}»? Все пункты будут удалены.`)) return;
        delBtn.disabled = true;
        await deleteBlock(block.id);
        await load();
      });

      hdr.appendChild(editBtn);
      hdr.appendChild(delBtn);
    }

    card.appendChild(hdr);

    // Items
    if (block.items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:14px 20px;color:var(--text-muted);font-size:13px;';
      empty.textContent = 'Пунктов нет.';
      card.appendChild(empty);
    } else {
      block.items.forEach((item, i) => card.appendChild(buildItemRow(item, block, blockAmt, i)));
    }

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:9px 18px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);';

    if (block.items.length > 0) {
      const sumEl = document.createElement('span');
      sumEl.style.cssText = `font-size:12px;font-weight:600;${itemSumOk ? 'color:var(--accent);' : 'color:#ef4444;'}`;
      sumEl.textContent = `Σ пунктов = ${itemSum}%${itemSumOk ? ' ✓' : ' — должно быть 100%'}`;
      footer.appendChild(sumEl);
    } else {
      footer.appendChild(document.createElement('span'));
    }

    if (writable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-outline';
      addBtn.style.cssText = 'font-size:12px;padding:5px 12px;';
      addBtn.textContent = '+ Пункт';
      addBtn.addEventListener('click', () => showItemModal(null, block, blockAmt));
      footer.appendChild(addBtn);
    }

    card.appendChild(footer);
    return card;
  }

  function buildItemRow(item: MotivationItem, block: MotivationBlock, blockAmt: number, idx: number): HTMLElement {
    const itemAmt = Math.round((item.weight / 100) * blockAmt);

    const row = document.createElement('div');
    row.style.cssText = `padding:10px 18px 10px 28px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--border);${idx % 2 !== 0 ? 'background:var(--bg-secondary);' : ''}`;

    const dot = document.createElement('span');
    dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:var(--accent);flex-shrink:0;opacity:0.4;margin-top:1px;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-primary);flex:1;min-width:100px;';
    nameEl.textContent = item.name;

    const wBadge = document.createElement('span');
    wBadge.style.cssText = 'font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:var(--bg-hover);color:var(--text-muted);flex-shrink:0;';
    wBadge.textContent = `${item.weight}%`;

    const amtEl = document.createElement('span');
    amtEl.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-primary);flex-shrink:0;min-width:76px;text-align:right;';
    amtEl.textContent = `${fmtN(itemAmt)} ₽`;

    row.appendChild(dot);
    row.appendChild(nameEl);

    if (item.goal) {
      const goalEl = document.createElement('span');
      goalEl.style.cssText = 'font-size:12px;color:var(--text-muted);flex-shrink:0;white-space:nowrap;';
      goalEl.textContent = `Цель: ${item.goal}`;
      row.appendChild(goalEl);
    }

    if (item.has_wow_goal) {
      const wowBadge = document.createElement('span');
      wowBadge.style.cssText = 'font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#f59e0b18;color:#f59e0b;flex-shrink:0;';
      wowBadge.textContent = 'WOW';
      row.appendChild(wowBadge);
    }

    row.appendChild(wBadge);
    row.appendChild(amtEl);

    if (writable) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-outline';
      editBtn.style.cssText = 'padding:3px 8px;font-size:11px;flex-shrink:0;';
      editBtn.textContent = 'Изменить';
      editBtn.addEventListener('click', () => showItemModal(item, block, blockAmt));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-outline';
      delBtn.style.cssText = 'padding:3px 8px;font-size:11px;flex-shrink:0;color:var(--text-muted);';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Удалить пункт «${item.name}»?`)) return;
        delBtn.disabled = true;
        await deleteItem(item.id);
        await load();
      });

      row.appendChild(editBtn);
      row.appendChild(delBtn);
    }

    return row;
  }

  // ── Critical ─────────────────────────────────────────────────────────────────

  function buildCriticalSection(items: CriticalFactor[]): HTMLElement {
    const section = document.createElement('div');

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:10px;';
    left.appendChild(sectionLabel('КРИТИЧЕСКИЕ ФАКТОРЫ'));

    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:11px;color:#ef4444;font-weight:600;';
    hint.textContent = 'при наступлении любого — вся премия обнуляется';
    left.appendChild(hint);

    titleRow.appendChild(left);

    if (writable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-outline';
      addBtn.style.cssText = 'font-size:13px;padding:7px 16px;';
      addBtn.textContent = '+ Добавить';
      addBtn.addEventListener('click', () => showCriticalModal());
      titleRow.appendChild(addBtn);
    }

    section.appendChild(titleRow);

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:28px 20px;text-align:center;color:var(--text-muted);font-size:13px;';
      empty.textContent = 'Критических факторов нет.';
      card.appendChild(empty);
    } else {
      items.forEach((item, i) => {
        const row = document.createElement('div');
        row.style.cssText = `padding:12px 16px;display:flex;align-items:flex-start;gap:10px;${i > 0 ? 'border-top:1px solid var(--border);' : ''}${i % 2 !== 0 ? 'background:var(--bg-secondary);' : ''}`;

        const icon = document.createElement('span');
        icon.style.cssText = 'color:#ef4444;font-size:15px;flex-shrink:0;margin-top:1px;';
        icon.textContent = '⚠';

        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:13px;color:var(--text-primary);flex:1;line-height:1.4;';
        desc.textContent = item.description;

        row.appendChild(icon);
        row.appendChild(desc);

        if (writable) {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-outline';
          delBtn.style.cssText = 'padding:4px 10px;font-size:12px;color:var(--text-muted);flex-shrink:0;';
          delBtn.textContent = 'Удалить';
          delBtn.addEventListener('click', async () => {
            if (!confirm('Удалить критический фактор?')) return;
            delBtn.disabled = true;
            await deleteCritical(item.id);
            await load();
          });
          row.appendChild(delBtn);
        }

        card.appendChild(row);
      });
    }

    section.appendChild(card);
    return section;
  }

  // ── Modals ────────────────────────────────────────────────────────────────────

  function showBlockModal(block: MotivationBlock | null, premFund: number, allBlocks: MotivationBlock[]): void {
    const usedPct   = allBlocks.filter(b => b.id !== block?.id).reduce((s, b) => s + b.weight, 0);
    const remaining = round1(Math.max(0, 100 - usedPct));

    const { overlay, modal, close } = baseModal(block ? 'Изменить блок' : 'Новый блок');

    const nameInp   = field(modal, 'Название блока *', 'text', block?.name ?? '', 'Рейтинг, Прибыль, Качество...');
    const weightInp = field(modal, 'Вес блока (% от премиального фонда) *', 'number', String(block?.weight ?? remaining), '');
    weightInp.min   = '0'; weightInp.max = '100'; weightInp.step = '0.1';

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:-8px;';
    hint.textContent = `Доступно: ${remaining}% · Фонд: ${fmtN(premFund)} ₽`;
    modal.insertBefore(hint, modal.lastElementChild);

    const calcEl = document.createElement('div');
    calcEl.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);margin-top:-4px;';
    modal.insertBefore(calcEl, modal.lastElementChild);

    function refreshCalc(): void {
      const w = parseFloat(weightInp.value) || 0;
      calcEl.textContent = `= ${fmtN(Math.round(w / 100 * premFund))} ₽ из фонда`;
    }
    weightInp.addEventListener('input', refreshCalc);
    refreshCalc();

    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const name    = nameInp.value.trim();
      const weight  = parseFloat(weightInp.value) || 0;
      if (!name)        { showErr(errEl, 'Название обязательно'); return; }
      if (weight <= 0)  { showErr(errEl, 'Вес должен быть больше 0'); return; }
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
    sub.style.cssText = 'font-size:12px;color:var(--text-muted);margin-top:-14px;margin-bottom:16px;';
    sub.textContent = `Блок: ${block.name} · ${fmtN(blockAmt)} ₽`;
    modal.insertBefore(sub, modal.firstChild!.nextSibling);

    const nameInp   = field(modal, 'Название пункта *', 'text', item?.name ?? '', 'Производительность, Выручка...');
    const weightInp = field(modal, 'Вес (% от блока) *', 'number', String(item?.weight ?? remaining), '');
    weightInp.min = '0'; weightInp.max = '100'; weightInp.step = '0.1';

    const hint2 = document.createElement('div');
    hint2.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:-8px;';
    hint2.textContent = `Доступно: ${remaining}%`;
    modal.insertBefore(hint2, modal.lastElementChild);

    const calcEl2 = document.createElement('div');
    calcEl2.style.cssText = 'font-size:14px;font-weight:700;color:var(--accent);margin-top:-4px;';
    modal.insertBefore(calcEl2, modal.lastElementChild);

    function refreshCalc2(): void {
      const w = parseFloat(weightInp.value) || 0;
      calcEl2.textContent = `= ${fmtN(Math.round(w / 100 * blockAmt))} ₽`;
    }
    weightInp.addEventListener('input', refreshCalc2);
    refreshCalc2();

    const goalInp = field(modal, 'Цель (целевой показатель)', 'text', item?.goal ?? '', '95%, 8 мин, 1 000 000 ₽...');

    const wowRow = document.createElement('div');
    wowRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const wowCb = document.createElement('input');
    wowCb.type = 'checkbox'; wowCb.id = 'cb-wow';
    if (item?.has_wow_goal) wowCb.checked = true;
    wowCb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#f59e0b;';
    const wowLbl = document.createElement('label');
    wowLbl.htmlFor = 'cb-wow';
    wowLbl.style.cssText = 'font-size:13px;color:var(--text-primary);cursor:pointer;';
    wowLbl.textContent = 'Есть цель по WOW фонду';
    wowRow.append(wowCb, wowLbl);
    modal.insertBefore(wowRow, modal.lastElementChild);

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
        const payload = { name, weight, goal, has_wow_goal: wowCb.checked };
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

    const ta = document.createElement('textarea');
    ta.rows = 3;
    ta.placeholder = 'Несоответствие санитарным нормам...';
    ta.style.cssText = `${inpStyle} resize:vertical;`;
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;';
    lbl.textContent = 'Описание *';
    const wrap = document.createElement('div');
    wrap.append(lbl, ta);
    modal.insertBefore(wrap, modal.lastElementChild);

    modal.querySelector('#m-save')!.addEventListener('click', async () => {
      const errEl   = modal.querySelector<HTMLElement>('#m-err')!;
      const saveBtn = modal.querySelector<HTMLButtonElement>('#m-save')!;
      const desc    = ta.value.trim();
      if (!desc) { showErr(errEl, 'Описание обязательно'); return; }
      errEl.style.display = 'none';
      saveBtn.disabled = true; saveBtn.textContent = '...';
      try {
        await createCritical(desc); close(); await load();
      } catch (err) {
        saveBtn.disabled = false; saveBtn.textContent = 'Добавить';
        showErr(errEl, (err as Error).message);
      }
    });
    modal.querySelector<HTMLButtonElement>('#m-save')!.textContent = 'Добавить';

    document.body.appendChild(overlay);
    ta.focus();
  }

  load();
  return page;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const inpStyle = 'width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box;';

function sectionLabel(text: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;';
  el.textContent = text;
  return el;
}

function sumBadgeStyle(ok: boolean): string {
  return ok
    ? 'font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:var(--accent-light);color:var(--accent);'
    : 'font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:#ef444420;color:#ef4444;';
}

function moneyField(label: string, value: number, disabled: boolean): { el: HTMLElement; inp: HTMLInputElement } {
  const el = document.createElement('div');
  el.style.cssText = 'flex:1;min-width:150px;';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;';
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.type = 'number'; inp.min = '0'; inp.value = String(value); inp.disabled = disabled;
  inp.style.cssText = `${inpStyle} font-size:18px;font-weight:700;${disabled ? 'opacity:0.7;' : ''}`;
  el.append(lbl, inp);
  return { el, inp };
}

function field(container: HTMLElement, label: string, type: string, value: string, placeholder: string): HTMLInputElement {
  const wrap = document.createElement('div');
  const lbl  = document.createElement('div');
  lbl.style.cssText = 'font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:5px;';
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.type = type; inp.value = value; inp.placeholder = placeholder;
  inp.style.cssText = inpStyle;
  wrap.append(lbl, inp);
  container.insertBefore(wrap, container.lastElementChild);
  return inp;
}

function baseModal(title: string): { overlay: HTMLElement; modal: HTMLElement; close: () => void } {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;width:100%;max-width:460px;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:14px;';

  const h2 = document.createElement('h2');
  h2.style.cssText = 'font-size:18px;font-weight:700;margin:0;';
  h2.textContent = title;

  const errEl = document.createElement('div');
  errEl.id = 'm-err';
  errEl.style.cssText = 'color:#ef4444;font-size:13px;display:none;';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-outline'; cancelBtn.textContent = 'Отмена';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary'; saveBtn.textContent = 'Сохранить';
  saveBtn.id = 'm-save';
  btnRow.append(cancelBtn, saveBtn);

  modal.append(h2, errEl, btnRow);
  overlay.appendChild(modal);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  cancelBtn.addEventListener('click', close);

  return { overlay, modal, close };
}

function showErr(el: HTMLElement, msg: string): void {
  el.textContent = msg;
  el.style.display = 'block';
}

function fmtN(n: number): string {
  return n.toLocaleString('ru-RU');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// suppress unused warning — used in template strings indirectly
void esc;
