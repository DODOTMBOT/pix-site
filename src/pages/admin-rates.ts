import { navigate } from '../router';
import { getRateDocument, saveRateDocument } from '../services/storage';
import type { RateDocument, RateSection, RateCell } from '../types';

const IS = 'padding:7px 10px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:var(--font);color:#111;outline:none;background:#fff;transition:border-color 0.15s;';

function mkBtn(label: string, onClick: () => void, color = '#374151'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.style.cssText = `background:none;border:1px solid #e5e7eb;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;color:${color};flex-shrink:0;transition:background 0.1s;`;
  b.addEventListener('click', onClick);
  return b;
}

function focusStyle(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
  el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
}

export function renderAdminRates(docId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const isNew    = !docId;
  const existing = docId ? getRateDocument(docId) : undefined;

  let metaPizzeria = existing?.pizzeria ?? '';
  let metaTitle    = existing?.title    ?? 'Система оплаты труда';
  const sections: RateSection[] = existing?.sections
    ? JSON.parse(JSON.stringify(existing.sections))
    : [];

  let pizInputRef: HTMLInputElement | null = null;

  function render(): void { page.replaceChildren(buildPage()); }

  // ─── Cell ─────────────────────────────────────────────────────────────────

  function buildCell(si: number, ti: number, ri: number, ci: number): HTMLElement {
    const cells = sections[si].tables[ti].rows[ri].cells;
    const cell  = cells[ci];
    const el    = document.createElement('div');
    el.style.cssText = 'border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;background:#fafaf9;min-width:110px;display:flex;flex-direction:column;gap:4px;';

    const val = document.createElement('input');
    val.type = 'text';
    val.value = cell.value;
    val.placeholder = 'Значение';
    val.style.cssText = IS + 'width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;';
    val.addEventListener('input', () => { cell.value = val.value; });
    focusStyle(val);
    el.appendChild(val);

    const row2 = document.createElement('div');
    row2.style.cssText = 'display:flex;align-items:center;gap:4px;';

    const boldLabel = document.createElement('label');
    boldLabel.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:10px;color:#6b7280;cursor:pointer;white-space:nowrap;';
    const boldCb = document.createElement('input');
    boldCb.type = 'checkbox';
    boldCb.checked = !!cell.bold;
    boldCb.addEventListener('change', () => { cell.bold = boldCb.checked || undefined; });
    boldLabel.appendChild(boldCb);
    boldLabel.appendChild(document.createTextNode('Жирный'));
    row2.appendChild(boldLabel);

    const alignSel = document.createElement('select');
    alignSel.style.cssText = IS + 'padding:2px 4px;font-size:10px;flex:1;';
    [['left','← Лево'],['center','Центр'],['right','Право →']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = l; o.selected = (cell.align ?? 'center') === v;
      alignSel.appendChild(o);
    });
    alignSel.addEventListener('change', () => { cell.align = alignSel.value as RateCell['align']; });
    focusStyle(alignSel);
    row2.appendChild(alignSel);

    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.textContent = '✕';
    delBtn.style.cssText = 'background:none;border:none;color:#9ca3af;cursor:pointer;font-size:11px;padding:0;flex-shrink:0;';
    delBtn.addEventListener('click', () => { cells.splice(ci, 1); render(); });
    row2.appendChild(delBtn);

    el.appendChild(row2);
    return el;
  }

  // ─── Row ──────────────────────────────────────────────────────────────────

  function buildRow(si: number, ti: number, ri: number): HTMLElement {
    const rows = sections[si].tables[ti].rows;
    const row  = rows[ri];
    const el   = document.createElement('div');
    el.style.cssText = 'border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-bottom:6px;background:#fff;';

    // Controls row
    const ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;';

    const hlSel = document.createElement('select');
    hlSel.style.cssText = IS + 'padding:3px 6px;font-size:12px;';
    [['none','Обычная'],['orange','Оранжевая'],['dark','Тёмная']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = l;
      o.selected = (row.cells[0]?.highlight ?? 'none') === v;
      hlSel.appendChild(o);
    });
    hlSel.addEventListener('change', () => {
      const hl = hlSel.value as RateCell['highlight'];
      row.cells.forEach(c => { c.highlight = hl; });
    });
    ctrl.appendChild(hlSel);

    const hdrLabel = document.createElement('label');
    hdrLabel.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;cursor:pointer;';
    const hdrCb = document.createElement('input');
    hdrCb.type = 'checkbox'; hdrCb.checked = !!row.isHeader;
    hdrCb.addEventListener('change', () => { row.isHeader = hdrCb.checked || undefined; });
    hdrLabel.appendChild(hdrCb);
    hdrLabel.appendChild(document.createTextNode('Заголовок'));
    ctrl.appendChild(hdrLabel);

    const spacer = document.createElement('span');
    spacer.style.flex = '1';
    ctrl.appendChild(spacer);

    if (ri > 0)               ctrl.appendChild(mkBtn('▲', () => { [rows[ri-1], rows[ri]] = [rows[ri], rows[ri-1]]; render(); }));
    if (ri < rows.length - 1) ctrl.appendChild(mkBtn('▼', () => { [rows[ri], rows[ri+1]] = [rows[ri+1], rows[ri]]; render(); }));
    ctrl.appendChild(mkBtn('🗑 Строку', () => { rows.splice(ri, 1); render(); }, '#ef4444'));

    el.appendChild(ctrl);

    // Cells
    const cellsWrap = document.createElement('div');
    cellsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;';
    row.cells.forEach((_, ci) => cellsWrap.appendChild(buildCell(si, ti, ri, ci)));

    const addCellBtn = document.createElement('button');
    addCellBtn.type = 'button'; addCellBtn.textContent = '+ Ячейка';
    addCellBtn.style.cssText = 'font-size:11px;color:var(--accent);background:none;border:1px dashed #e5e7eb;border-radius:6px;cursor:pointer;padding:6px 10px;align-self:center;';
    addCellBtn.addEventListener('click', () => {
      const hl = hlSel.value as RateCell['highlight'];
      row.cells.push({ value: '', highlight: hl === 'none' ? undefined : hl });
      render();
    });
    cellsWrap.appendChild(addCellBtn);
    el.appendChild(cellsWrap);

    return el;
  }

  // ─── Table ────────────────────────────────────────────────────────────────

  function buildTable(si: number, ti: number): HTMLElement {
    const sec   = sections[si];
    const table = sec.tables[ti];
    const el    = document.createElement('div');
    el.style.cssText = 'border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px;background:#fafaf9;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:10px;font-weight:700;color:#fff;background:#6b7280;border-radius:4px;padding:2px 7px;letter-spacing:0.05em;flex-shrink:0;';
    badge.textContent = 'ТАБЛ.';
    header.appendChild(badge);

    const nameIn = document.createElement('input');
    nameIn.type = 'text'; nameIn.value = table.title; nameIn.placeholder = 'Название таблицы';
    nameIn.style.cssText = IS + 'flex:1;';
    nameIn.addEventListener('input', () => { table.title = nameIn.value; });
    focusStyle(nameIn);
    header.appendChild(nameIn);

    if (ti > 0)                  header.appendChild(mkBtn('▲', () => { [sec.tables[ti-1], sec.tables[ti]] = [sec.tables[ti], sec.tables[ti-1]]; render(); }));
    if (ti < sec.tables.length-1) header.appendChild(mkBtn('▼', () => { [sec.tables[ti], sec.tables[ti+1]] = [sec.tables[ti+1], sec.tables[ti]]; render(); }));
    header.appendChild(mkBtn('🗑 Таблицу', () => { sec.tables.splice(ti, 1); render(); }, '#ef4444'));

    el.appendChild(header);

    const noteIn = document.createElement('input');
    noteIn.type = 'text'; noteIn.value = table.note ?? ''; noteIn.placeholder = 'Заметка под таблицей (необязательно)';
    noteIn.style.cssText = IS + 'width:100%;box-sizing:border-box;font-size:12px;margin-bottom:10px;';
    noteIn.addEventListener('input', () => { table.note = noteIn.value || undefined; });
    focusStyle(noteIn);
    el.appendChild(noteIn);

    table.rows.forEach((_, ri) => el.appendChild(buildRow(si, ti, ri)));

    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button'; addRowBtn.textContent = '+ Добавить строку';
    addRowBtn.style.cssText = 'font-size:12px;color:var(--accent);background:none;border:none;cursor:pointer;padding:2px 0;';
    addRowBtn.addEventListener('click', () => { table.rows.push({ cells: [] }); render(); });
    el.appendChild(addRowBtn);

    return el;
  }

  // ─── Section ──────────────────────────────────────────────────────────────

  function buildSection(si: number): HTMLElement {
    const sec = sections[si];
    const el  = document.createElement('div');
    el.style.cssText = 'border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.06);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;';

    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:10px;font-weight:700;color:#fff;background:#f97316;border-radius:4px;padding:2px 7px;letter-spacing:0.05em;flex-shrink:0;';
    badge.textContent = 'РАЗДЕЛ';
    header.appendChild(badge);

    const nameIn = document.createElement('input');
    nameIn.type = 'text'; nameIn.value = sec.title; nameIn.placeholder = 'Название раздела';
    nameIn.style.cssText = IS + 'flex:1;';
    nameIn.addEventListener('input', () => { sec.title = nameIn.value; });
    focusStyle(nameIn);
    header.appendChild(nameIn);

    if (si > 0)                   header.appendChild(mkBtn('▲', () => { [sections[si-1], sections[si]] = [sections[si], sections[si-1]]; render(); }));
    if (si < sections.length - 1) header.appendChild(mkBtn('▼', () => { [sections[si], sections[si+1]] = [sections[si+1], sections[si]]; render(); }));
    header.appendChild(mkBtn('🗑 Раздел', () => { sections.splice(si, 1); render(); }, '#ef4444'));

    el.appendChild(header);

    sec.tables.forEach((_, ti) => el.appendChild(buildTable(si, ti)));

    const addTableBtn = document.createElement('button');
    addTableBtn.type = 'button'; addTableBtn.textContent = '+ Добавить таблицу';
    addTableBtn.style.cssText = 'font-size:13px;color:var(--accent);background:none;border:none;cursor:pointer;padding:4px 0;';
    addTableBtn.addEventListener('click', () => { sec.tables.push({ id: crypto.randomUUID(), title: '', rows: [] }); render(); });
    el.appendChild(addTableBtn);

    return el;
  }

  // ─── Page ─────────────────────────────────────────────────────────────────

  function buildPage(): HTMLElement {
    const outer    = document.createElement('div');
    const container = document.createElement('div');
    container.className = 'container';
    const sec = document.createElement('section');
    sec.style.cssText = 'padding:40px 0 64px;max-width:900px;';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-ghost'; backBtn.textContent = '← Назад';
    backBtn.style.marginBottom = '24px';
    backBtn.addEventListener('click', () => navigate('/admin'));
    sec.appendChild(backBtn);

    const h1 = document.createElement('h1');
    h1.style.cssText = 'font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;';
    h1.textContent = isNew ? 'Новый документ ставок' : 'Редактирование ставок';
    sec.appendChild(h1);

    // Meta card
    const metaCard = document.createElement('div');
    metaCard.style.cssText = 'background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);display:grid;grid-template-columns:1fr 1fr;gap:16px;';

    function metaField(labelText: string, required: boolean, inputEl: HTMLInputElement): HTMLElement {
      const wrap = document.createElement('div');
      const lbl  = document.createElement('label');
      lbl.style.cssText = 'display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;';
      lbl.innerHTML = labelText + (required ? ' <span style="color:#ef4444">*</span>' : '');
      wrap.appendChild(lbl);
      inputEl.style.cssText = IS + 'width:100%;box-sizing:border-box;';
      focusStyle(inputEl);
      wrap.appendChild(inputEl);
      return wrap;
    }

    const pizIn = document.createElement('input');
    pizIn.type = 'text'; pizIn.value = metaPizzeria; pizIn.placeholder = 'Немчиновка-1';
    pizIn.addEventListener('input', () => { metaPizzeria = pizIn.value; });
    pizInputRef = pizIn;

    const titIn = document.createElement('input');
    titIn.type = 'text'; titIn.value = metaTitle; titIn.placeholder = 'Система оплаты труда';
    titIn.addEventListener('input', () => { metaTitle = titIn.value; });

    metaCard.appendChild(metaField('Пиццерия', true,  pizIn));
    metaCard.appendChild(metaField('Заголовок', false, titIn));
    sec.appendChild(metaCard);

    const pizErr = document.createElement('div');
    pizErr.style.cssText = 'font-size:12px;color:#ef4444;margin-top:-16px;margin-bottom:16px;display:none;';
    pizErr.textContent = 'Введите название пиццерии';
    sec.appendChild(pizErr);

    // Sections
    sections.forEach((_, si) => sec.appendChild(buildSection(si)));

    const addSecBtn = document.createElement('button');
    addSecBtn.type = 'button'; addSecBtn.textContent = '+ Добавить раздел';
    addSecBtn.style.cssText = 'font-size:14px;color:var(--accent);background:none;border:none;cursor:pointer;padding:8px 0;font-weight:500;display:block;margin-bottom:32px;';
    addSecBtn.addEventListener('click', () => { sections.push({ id: crypto.randomUUID(), title: '', tables: [] }); render(); });
    sec.appendChild(addSecBtn);

    // Save / Cancel
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:12px;';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.className = 'btn btn-primary'; saveBtn.textContent = 'Сохранить';
    saveBtn.style.padding = '11px 28px';
    saveBtn.addEventListener('click', () => {
      const piz = metaPizzeria.trim();
      if (!piz) {
        pizErr.style.display = 'block';
        if (pizInputRef) pizInputRef.style.borderColor = '#ef4444';
        return;
      }
      const doc: RateDocument = {
        id: docId ?? crypto.randomUUID(),
        pizzeria: piz,
        title: metaTitle.trim() || 'Система оплаты труда',
        sections,
        updatedAt: new Date().toISOString(),
      };
      saveRateDocument(doc);
      navigate('/admin');
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button'; cancelBtn.className = 'btn btn-outline'; cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', () => navigate('/admin'));

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    sec.appendChild(actions);

    container.appendChild(sec);
    outer.appendChild(container);
    return outer;
  }

  page.appendChild(buildPage());
  return page;
}
