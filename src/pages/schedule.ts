import { navigate } from '../router';
import { getUser, isManagement } from '../services/auth';
import type { WeekShifts, ScheduleRow } from '../services/scheduleApi';
import {
  DAY_KEYS, DAY_LABELS,
  currentISOWeek, shiftWeek, getWeekLabel, totalHours,
  fetchSchedule, saveScheduleRow, deleteScheduleRow,
} from '../services/scheduleApi';

export function renderSchedule(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'schedule-page page-enter';

  const user = getUser();
  const pizzerias: string[] = user?.pizzerias.length
    ? user.pizzerias
    : [];

  if (!user) {
    page.innerHTML = `<p style="padding:40px;color:var(--text-muted)">Не авторизован</p>`;
    return page;
  }

  let currentWeek = currentISOWeek();
  let currentPizzeria = pizzerias[0] ?? '';
  let rows: ScheduleRow[] = [];
  let saving = false;

  function buildHeader(): string {
    const pizzeriaSelect = (isManagement() || pizzerias.length > 1)
      ? `<select class="sched-pizzeria-select" id="sched-pizzeria">
          ${pizzerias.map(p => `<option value="${p}"${p === currentPizzeria ? ' selected' : ''}>${p}</option>`).join('')}
        </select>`
      : `<span class="sched-pizzeria-label">${currentPizzeria || '—'}</span>`;

    return `
      <div class="sched-header">
        <div class="sched-title-row">
          <h2 class="sched-title">График работы</h2>
          ${isManagement() ? `<a class="btn btn-ghost sched-overview-btn" id="sched-overview-btn" href="#" style="font-size:13px;">Обзор всех →</a>` : ''}
        </div>
        <div class="week-nav">
          <button class="btn btn-outline week-btn" id="week-prev">← Пред.</button>
          <div class="week-label-wrap">
            <div class="week-label" id="week-label">${getWeekLabel(currentWeek)}</div>
            <div class="week-code">${currentWeek}</div>
          </div>
          <button class="btn btn-outline week-btn" id="week-next">След. →</button>
        </div>
        <div class="sched-meta-row">
          ${pizzeriaSelect}
        </div>
      </div>
    `;
  }

  function buildTableHtml(): string {
    if (!currentPizzeria) {
      return `<div class="sched-empty">Нет доступных пиццерий</div>`;
    }

    const dayHeaderCells = DAY_KEYS.map(d =>
      `<th class="sched-day-header">${DAY_LABELS[d]}</th>`
    ).join('');

    const rowsHtml = rows.map((row, ri) => {
      const hours = totalHours(row.shifts);
      const warning = hours > 40;
      const dayCells = DAY_KEYS.map(d => {
        const s = row.shifts[d] ?? { start: '09:00', end: '18:00', off: false };
        return `
          <td class="sched-cell${s.off ? ' sched-cell-off' : ''}" data-row="${ri}" data-day="${d}">
            <label class="toggle" title="Выходной">
              <input type="checkbox" class="day-off-chk" data-row="${ri}" data-day="${d}"${s.off ? ' checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <div class="time-inputs${s.off ? ' hidden' : ''}">
              <input type="time" class="time-input" data-row="${ri}" data-day="${d}" data-field="start" value="${s.start ?? '09:00'}">
              <span class="time-dash">–</span>
              <input type="time" class="time-input" data-row="${ri}" data-day="${d}" data-field="end" value="${s.end ?? '18:00'}">
            </div>
          </td>`;
      }).join('');

      return `
        <tr class="sched-row" data-ri="${ri}" data-id="${row.id}">
          <td class="sched-employee-cell">
            <input class="sched-emp-input" type="text" value="${row.employee}" data-row="${ri}" placeholder="Имя сотрудника">
            <button class="sched-del-btn" data-row="${ri}" title="Удалить">✕</button>
          </td>
          ${dayCells}
          <td class="sched-total-cell">
            <span class="sched-hours${warning ? ' warning-badge' : ''}">${hours} ч</span>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="sched-table-wrap">
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="sched-emp-header">Сотрудник</th>
              ${dayHeaderCells}
              <th class="sched-total-header">Итого</th>
            </tr>
          </thead>
          <tbody id="sched-tbody">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="sched-footer">
        <button class="btn btn-outline sched-add-btn" id="sched-add-row">+ Добавить сотрудника</button>
        <button class="btn btn-primary sched-save-btn" id="sched-save"${saving ? ' disabled' : ''}>
          ${saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    `;
  }

  function renderAll(): void {
    page.innerHTML = buildHeader() + `<div id="sched-body"></div>`;
    bindHeader();
    renderBody();
  }

  function renderBody(): void {
    const body = page.querySelector<HTMLElement>('#sched-body')!;
    body.innerHTML = `<div class="sched-loading">Загрузка...</div>`;

    if (!currentPizzeria) {
      body.innerHTML = buildTableHtml();
      return;
    }

    fetchSchedule(currentWeek, currentPizzeria)
      .then(data => {
        rows = data;
        body.innerHTML = buildTableHtml();
        bindTable(body);
      })
      .catch(() => {
        body.innerHTML = `<div class="sched-empty">Ошибка загрузки. Проверьте подключение.</div>`;
      });
  }

  function bindHeader(): void {
    page.querySelector('#week-prev')?.addEventListener('click', () => {
      currentWeek = shiftWeek(currentWeek, -1);
      updateWeekDisplay();
      renderBody();
    });

    page.querySelector('#week-next')?.addEventListener('click', () => {
      currentWeek = shiftWeek(currentWeek, 1);
      updateWeekDisplay();
      renderBody();
    });

    page.querySelector<HTMLSelectElement>('#sched-pizzeria')?.addEventListener('change', e => {
      currentPizzeria = (e.target as HTMLSelectElement).value;
      renderBody();
    });

    page.querySelector('#sched-overview-btn')?.addEventListener('click', e => {
      e.preventDefault();
      navigate('/schedule/overview');
    });
  }

  function updateWeekDisplay(): void {
    const lbl = page.querySelector('#week-label');
    const code = page.querySelector('.week-code');
    if (lbl)  lbl.textContent = getWeekLabel(currentWeek);
    if (code) code.textContent = currentWeek;
  }

  function getShiftsFromDom(tbody: Element, ri: number): WeekShifts {
    const shifts: WeekShifts = {};
    for (const d of DAY_KEYS) {
      const offChk = tbody.querySelector<HTMLInputElement>(`.day-off-chk[data-row="${ri}"][data-day="${d}"]`);
      const startIn = tbody.querySelector<HTMLInputElement>(`.time-input[data-row="${ri}"][data-day="${d}"][data-field="start"]`);
      const endIn   = tbody.querySelector<HTMLInputElement>(`.time-input[data-row="${ri}"][data-day="${d}"][data-field="end"]`);
      shifts[d] = {
        off:   offChk?.checked ?? false,
        start: startIn?.value  ?? '09:00',
        end:   endIn?.value    ?? '18:00',
      };
    }
    return shifts;
  }

  function updateTotalCell(tbody: Element, ri: number): void {
    const shifts = getShiftsFromDom(tbody, ri);
    const hours   = totalHours(shifts);
    const warning = hours > 40;
    const span = tbody.querySelector<HTMLElement>(`.sched-row[data-ri="${ri}"] .sched-hours`);
    if (span) {
      span.textContent = `${hours} ч`;
      span.className = `sched-hours${warning ? ' warning-badge' : ''}`;
    }
  }

  function bindTable(body: HTMLElement): void {
    const tbody = body.querySelector('#sched-tbody')!;

    // Off toggle
    tbody.querySelectorAll<HTMLInputElement>('.day-off-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        const ri = chk.dataset['row']!;
        const d  = chk.dataset['day']!;
        const cell = tbody.querySelector<HTMLElement>(`.sched-cell[data-row="${ri}"][data-day="${d}"]`);
        const inputs = cell?.querySelector<HTMLElement>('.time-inputs');
        if (cell)   cell.classList.toggle('sched-cell-off', chk.checked);
        if (inputs) inputs.classList.toggle('hidden', chk.checked);
        updateTotalCell(tbody, parseInt(ri, 10));
      });
    });

    // Time inputs update total
    tbody.querySelectorAll<HTMLInputElement>('.time-input').forEach(inp => {
      inp.addEventListener('change', () => {
        updateTotalCell(tbody, parseInt(inp.dataset['row']!, 10));
      });
    });

    // Delete row
    tbody.querySelectorAll<HTMLButtonElement>('.sched-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ri = parseInt(btn.dataset['row']!, 10);
        const row = rows[ri];
        if (row?.id) {
          if (!confirm(`Удалить строку "${row.employee}"?`)) return;
          try { await deleteScheduleRow(row.id); } catch { /* ignore */ }
        }
        rows.splice(ri, 1);
        body.innerHTML = buildTableHtml();
        bindTable(body);
      });
    });

    // Add row
    body.querySelector('#sched-add-row')?.addEventListener('click', () => {
      rows.push({ id: 0, week: currentWeek, pizzeria: currentPizzeria, employee: '', shifts: {} });
      body.innerHTML = buildTableHtml();
      bindTable(body);
      const inputs = body.querySelectorAll<HTMLInputElement>('.sched-emp-input');
      inputs[inputs.length - 1]?.focus();
    });

    // Save
    body.querySelector('#sched-save')?.addEventListener('click', async () => {
      if (saving) return;
      saving = true;
      const saveBtn = body.querySelector<HTMLButtonElement>('#sched-save')!;
      saveBtn.textContent = 'Сохранение...';
      saveBtn.disabled = true;

      const empInputs = Array.from(tbody.querySelectorAll<HTMLInputElement>('.sched-emp-input'));
      const saves = rows.map((row, ri) => {
        const employee = empInputs[ri]?.value.trim() ?? row.employee;
        const shifts   = getShiftsFromDom(tbody, ri);
        return saveScheduleRow({ week: currentWeek, pizzeria: currentPizzeria, employee, shifts });
      });

      try {
        await Promise.all(saves);
        saveBtn.textContent  = '✓ Сохранено';
        saveBtn.style.background = '#16a34a';
        setTimeout(() => {
          saving = false;
          renderBody();
        }, 2000);
      } catch {
        saving = false;
        saveBtn.textContent = 'Ошибка — повторить';
        saveBtn.disabled    = false;
        saveBtn.style.background = '#dc2626';
        setTimeout(() => {
          saveBtn.textContent = 'Сохранить';
          saveBtn.style.background = '';
        }, 3000);
      }
    });
  }

  renderAll();
  return page;
}
