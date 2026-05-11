import { getProjectTemplates, saveProjectTemplates } from '../services/storage';
import type { ProjectTemplate, ProjectBlock, ProjectSubBlock } from '../types';

function uid(): string { return Math.random().toString(36).slice(2, 9); }

export function renderProjectsTemplates(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  let templates: ProjectTemplate[] = getProjectTemplates();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveProjectTemplates(templates), 500);
  }

  function render(): void {
    page.replaceChildren(buildContent());
  }

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'projects-templates-page';

    const headerRow = document.createElement('div');
    headerRow.className = 'page-header-row';
    headerRow.innerHTML = `
      <div>
        <div class="page-label">УПРАВЛЯЮЩИЕ</div>
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:4px 0 0;">Шаблоны проектов</h1>
      </div>
    `;
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Новый шаблон';
    addBtn.addEventListener('click', () => {
      templates.push({ id: uid(), title: 'Новый шаблон', blocks: [], createdAt: new Date().toISOString() });
      scheduleSave();
      render();
    });
    headerRow.appendChild(addBtn);
    wrap.appendChild(headerRow);

    if (templates.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:60px;text-align:center;color:#9ca3af;font-size:14px;';
      empty.textContent = 'Шаблонов нет. Создайте первый шаблон.';
      wrap.appendChild(empty);
      return wrap;
    }

    templates.forEach((tpl, ti) => wrap.appendChild(buildTemplateCard(tpl, ti)));
    return wrap;
  }

  function buildTemplateCard(tpl: ProjectTemplate, ti: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'template-card';

    const tplHeader = document.createElement('div');
    tplHeader.className = 'template-header';

    const titleInput = document.createElement('input');
    titleInput.className = 'template-title-input';
    titleInput.value = tpl.title;
    titleInput.addEventListener('input', () => { templates[ti].title = titleInput.value; scheduleSave(); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline';
    delBtn.style.cssText = 'font-size:12px;padding:5px 14px;color:#ef4444;border-color:#fecaca;';
    delBtn.textContent = 'Удалить шаблон';
    delBtn.addEventListener('click', () => { templates.splice(ti, 1); scheduleSave(); render(); });

    tplHeader.appendChild(titleInput);
    tplHeader.appendChild(delBtn);
    card.appendChild(tplHeader);

    if (tpl.blocks.length > 0) {
      const tableWrap = document.createElement('div');
      tableWrap.style.overflowX = 'auto';

      const table = document.createElement('table');
      table.className = 'blocks-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th style="width:150px;">Блок</th>
            <th style="width:110px;">Цена блока</th>
            <th style="width:110px;">Цена подблока</th>
            <th>Задачи</th>
            <th>Контрольные точки</th>
            <th style="background:#2d1a0e;">Подсказка для управляющего</th>
            <th style="width:120px;"></th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement('tbody');

      tpl.blocks.forEach((block, bi) => {
        tbody.appendChild(buildBlockRow(block, bi, ti));
        block.subBlocks.forEach((sub, si) => tbody.appendChild(buildSubBlockRow(sub, bi, si, ti)));
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
      card.appendChild(tableWrap);
    }

    const addBlockBtn = document.createElement('button');
    addBlockBtn.className = 'btn btn-secondary';
    addBlockBtn.style.marginTop = '12px';
    addBlockBtn.textContent = '+ Добавить блок';
    addBlockBtn.addEventListener('click', () => {
      templates[ti].blocks.push({ id: uid(), name: 'Новый блок', price: 0, hint: '', subBlocks: [] });
      scheduleSave();
      render();
    });
    card.appendChild(addBlockBtn);

    return card;
  }

  function buildBlockRow(block: ProjectBlock, bi: number, ti: number): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'block-row';

    const nameCell = document.createElement('td');
    nameCell.className = 'block-name-cell';
    const nameInput = document.createElement('input');
    nameInput.className = 'block-name-input';
    nameInput.value = block.name;
    nameInput.addEventListener('input', () => { templates[ti].blocks[bi].name = nameInput.value; scheduleSave(); });
    nameCell.appendChild(nameInput);

    const priceCell = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'block-price-input';
    priceInput.value = String(block.price);
    priceInput.min = '0';
    priceInput.addEventListener('input', () => { templates[ti].blocks[bi].price = parseFloat(priceInput.value) || 0; scheduleSave(); });
    priceCell.appendChild(priceInput);

    const spanCell = document.createElement('td');
    spanCell.colSpan = 3;

    const hintCell = document.createElement('td');
    hintCell.className = 'hint-cell';
    const hintInput = document.createElement('input');
    hintInput.type = 'text';
    hintInput.style.cssText = 'width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:4px 8px;font-size:12px;font-family:inherit;background:#fff8f5;outline:none;';
    hintInput.value = block.hint ?? '';
    hintInput.placeholder = 'Подсказка для управляющего...';
    hintInput.addEventListener('input', () => { templates[ti].blocks[bi].hint = hintInput.value; scheduleSave(); });
    hintCell.appendChild(hintInput);

    const actionsCell = document.createElement('td');
    actionsCell.style.whiteSpace = 'nowrap';
    const addSubBtn = document.createElement('button');
    addSubBtn.className = 'btn btn-secondary';
    addSubBtn.style.cssText = 'font-size:11px;padding:4px 8px;margin-bottom:4px;display:block;width:100%;';
    addSubBtn.textContent = '+ Подблок';
    addSubBtn.addEventListener('click', () => {
      templates[ti].blocks[bi].subBlocks.push({ id: uid(), price: 0, tasks: '', checkpoints: '', hint: '' });
      scheduleSave();
      render();
    });
    const delBlockBtn = document.createElement('button');
    delBlockBtn.className = 'btn btn-outline';
    delBlockBtn.style.cssText = 'font-size:11px;padding:4px 8px;color:#ef4444;border-color:#fecaca;display:block;width:100%;';
    delBlockBtn.textContent = 'Удалить';
    delBlockBtn.addEventListener('click', () => { templates[ti].blocks.splice(bi, 1); scheduleSave(); render(); });
    actionsCell.appendChild(addSubBtn);
    actionsCell.appendChild(delBlockBtn);

    row.appendChild(nameCell);
    row.appendChild(priceCell);
    row.appendChild(spanCell);
    row.appendChild(hintCell);
    row.appendChild(actionsCell);
    return row;
  }

  function buildSubBlockRow(sub: ProjectSubBlock, bi: number, si: number, ti: number): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'subblock-row';

    const emptyCell1 = document.createElement('td');
    const emptyCell2 = document.createElement('td');

    const priceCell = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'subblock-price';
    priceInput.value = String(sub.price);
    priceInput.min = '0';
    priceInput.addEventListener('input', () => { templates[ti].blocks[bi].subBlocks[si].price = parseFloat(priceInput.value) || 0; scheduleSave(); });
    priceCell.appendChild(priceInput);

    const tasksCell = document.createElement('td');
    const tasksTA = document.createElement('textarea');
    tasksTA.className = 'subblock-tasks';
    tasksTA.placeholder = 'Список задач...';
    tasksTA.value = sub.tasks;
    tasksTA.addEventListener('input', () => { templates[ti].blocks[bi].subBlocks[si].tasks = tasksTA.value; scheduleSave(); });
    tasksCell.appendChild(tasksTA);

    const checkCell = document.createElement('td');
    const checkTA = document.createElement('textarea');
    checkTA.className = 'subblock-checkpoints';
    checkTA.placeholder = 'Контрольные точки...';
    checkTA.value = sub.checkpoints;
    checkTA.addEventListener('input', () => { templates[ti].blocks[bi].subBlocks[si].checkpoints = checkTA.value; scheduleSave(); });
    checkCell.appendChild(checkTA);

    const hintCell = document.createElement('td');
    hintCell.className = 'hint-cell';
    const hintTA = document.createElement('textarea');
    hintTA.className = 'subblock-hint';
    hintTA.placeholder = 'Подсказка для управляющего...';
    hintTA.value = sub.hint ?? '';
    hintTA.addEventListener('input', () => { templates[ti].blocks[bi].subBlocks[si].hint = hintTA.value; scheduleSave(); });
    hintCell.appendChild(hintTA);

    const actionsCell = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline';
    delBtn.style.cssText = 'font-size:11px;padding:4px 8px;color:#ef4444;border-color:#fecaca;white-space:nowrap;';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', () => { templates[ti].blocks[bi].subBlocks.splice(si, 1); scheduleSave(); render(); });
    actionsCell.appendChild(delBtn);

    row.appendChild(emptyCell1);
    row.appendChild(emptyCell2);
    row.appendChild(priceCell);
    row.appendChild(tasksCell);
    row.appendChild(checkCell);
    row.appendChild(hintCell);
    row.appendChild(actionsCell);
    return row;
  }

  render();
  return page;
}
