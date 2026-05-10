import { navigate } from '../router';
import { getRateDocuments } from '../services/storage';
import { filterByPizzeria } from '../services/auth';
import type { RateDocument } from '../types';

export function renderRates(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  let selectedId: string | null = null;

  function render(): void { page.replaceChildren(buildContent()); }

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');
    const docs  = filterByPizzeria(getRateDocuments());

    if (docs.length > 0 && !selectedId) selectedId = docs[0].id;
    const selectedDoc = docs.find(d => d.id === selectedId) ?? null;

    const pillsHtml = docs.map(d => `
      <button class="filter-pill" data-id="${d.id}" style="
        padding:6px 14px;font-size:13px;font-weight:500;border-radius:20px;cursor:pointer;
        border:1px solid ${selectedId === d.id ? 'var(--accent)' : '#e5e7eb'};
        background:${selectedId === d.id ? 'var(--accent)' : '#fff'};
        color:${selectedId === d.id ? '#fff' : '#374151'};
        transition:all 0.15s;
      ">${d.pizzeria}</button>
    `).join('');

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;">
          <button class="btn btn-ghost" id="back-btn" style="margin-bottom:24px;">← Назад</button>
          <div style="margin-bottom:32px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:8px;">HR</div>
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">Система оплаты труда</h1>
          </div>
          ${docs.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:32px;" id="pills-row">${pillsHtml}</div>` : ''}
          <div id="doc-content"></div>
        </section>
      </div>
    `;

    wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/'));

    wrap.querySelectorAll<HTMLButtonElement>('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => { selectedId = btn.dataset['id']!; render(); });
    });

    const docContent = wrap.querySelector('#doc-content')!;
    if (docs.length === 0) {
      docContent.innerHTML = `
        <div style="text-align:center;padding:80px 20px;">
          <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:#374151;">Данные ещё не добавлены</div>
          <div style="font-size:14px;color:#9ca3af;">Перейдите в Админку чтобы добавить документ ставок</div>
        </div>
      `;
    } else if (selectedDoc) {
      docContent.appendChild(renderDocument(selectedDoc));
    }

    return wrap;
  }

  function renderDocument(doc: RateDocument): HTMLElement {
    const el = document.createElement('div');

    if (doc.title) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:18px;font-weight:700;color:#111;margin-bottom:24px;';
      h.textContent = doc.title;
      el.appendChild(h);
    }

    doc.sections.forEach(sec => {
      const secEl = document.createElement('div');
      secEl.className = 'rate-section';

      const secTitle = document.createElement('div');
      secTitle.className = 'rate-section-title';
      secTitle.textContent = sec.title;
      secEl.appendChild(secTitle);

      sec.tables.forEach(table => {
        if (table.title) {
          const tTitle = document.createElement('div');
          tTitle.style.cssText = 'font-size:14px;font-weight:600;color:#374151;margin-bottom:8px;';
          tTitle.textContent = table.title;
          secEl.appendChild(tTitle);
        }

        const tableEl = document.createElement('table');
        tableEl.className = 'rate-table';

        const tbody = document.createElement('tbody');
        table.rows.forEach(row => {
          const tr = document.createElement('tr');
          const hl = row.cells[0]?.highlight;
          if (hl === 'orange') tr.className = 'highlight-orange';
          else if (hl === 'dark') tr.className = 'highlight-dark';

          row.cells.forEach(cell => {
            const td = document.createElement(row.isHeader ? 'th' : 'td');
            td.textContent = cell.value;
            if (cell.bold)    td.style.fontWeight = '700';
            if (cell.align)   td.style.textAlign   = cell.align;
            if (cell.colspan) td.colSpan = cell.colspan;
            if (cell.rowspan) td.rowSpan = cell.rowspan;
            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });

        tableEl.appendChild(tbody);
        secEl.appendChild(tableEl);

        if (table.note) {
          const noteEl = document.createElement('div');
          noteEl.className = 'rate-note';
          noteEl.textContent = table.note;
          secEl.appendChild(noteEl);
        }
      });

      el.appendChild(secEl);
    });

    return el;
  }

  page.appendChild(buildContent());
  return page;
}
