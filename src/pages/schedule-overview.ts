import { navigate } from '../router';
import type { ScheduleRow } from '../services/scheduleApi';
import {
  DAY_KEYS, DAY_LABELS,
  currentISOWeek, shiftWeek, getWeekLabel, totalHours,
  fetchOverview,
} from '../services/scheduleApi';

export function renderScheduleOverview(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'schedule-page page-enter';

  let currentWeek = currentISOWeek();
  let rows: ScheduleRow[] = [];

  function groupByPizzeria(data: ScheduleRow[]): Map<string, ScheduleRow[]> {
    const map = new Map<string, ScheduleRow[]>();
    for (const row of data) {
      const arr = map.get(row.pizzeria) ?? [];
      arr.push(row);
      map.set(row.pizzeria, arr);
    }
    return map;
  }

  function buildOverviewHtml(): string {
    const grouped = groupByPizzeria(rows);

    const dayHeaderCells = DAY_KEYS.map(d =>
      `<th class="sched-day-header">${DAY_LABELS[d]}</th>`
    ).join('');

    let sectionsHtml = '';

    if (grouped.size === 0) {
      sectionsHtml = `<div class="sched-empty">Нет данных за эту неделю</div>`;
    } else {
      grouped.forEach((pRows, pizzeria) => {
        const pizzeriaTotal = pRows.reduce((sum, r) => sum + totalHours(r.shifts), 0);

        const rowsHtml = pRows.map(row => {
          const hours   = totalHours(row.shifts);
          const warning = hours > 40;

          const dayCells = DAY_KEYS.map(d => {
            const s = row.shifts[d];
            if (!s || s.off) return `<td class="sched-cell sched-cell-off overview-cell">–</td>`;
            return `<td class="sched-cell overview-cell">${s.start ?? ''}<br><span style="color:var(--text-muted);font-size:11px;">${s.end ?? ''}</span></td>`;
          }).join('');

          return `
            <tr>
              <td class="sched-employee-cell overview-emp">${row.employee}</td>
              ${dayCells}
              <td class="sched-total-cell">
                <span class="sched-hours${warning ? ' warning-badge' : ''}">${hours} ч</span>
              </td>
            </tr>`;
        }).join('');

        sectionsHtml += `
          <div class="overview-section">
            <div class="overview-pizzeria-header">
              <span>${pizzeria}</span>
              <span class="overview-total-badge">${Math.round(pizzeriaTotal * 10) / 10} ч</span>
            </div>
            <div class="sched-table-wrap">
              <table class="schedule-table overview-table">
                <thead>
                  <tr>
                    <th class="sched-emp-header">Сотрудник</th>
                    ${dayHeaderCells}
                    <th class="sched-total-header">Итого</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>`;
      });
    }

    return sectionsHtml;
  }

  function renderAll(): void {
    page.innerHTML = `
      <div class="sched-header">
        <div class="sched-title-row">
          <button class="btn btn-ghost" id="ov-back" style="font-size:13px;">← Назад</button>
          <h2 class="sched-title">Обзор графиков</h2>
        </div>
        <div class="week-nav">
          <button class="btn btn-outline week-btn" id="week-prev">← Пред.</button>
          <div class="week-label-wrap">
            <div class="week-label" id="week-label">${getWeekLabel(currentWeek)}</div>
            <div class="week-code">${currentWeek}</div>
          </div>
          <button class="btn btn-outline week-btn" id="week-next">След. →</button>
        </div>
      </div>
      <div id="ov-body"><div class="sched-loading">Загрузка...</div></div>
    `;

    page.querySelector('#ov-back')?.addEventListener('click', () => navigate('/schedule'));

    page.querySelector('#week-prev')?.addEventListener('click', () => {
      currentWeek = shiftWeek(currentWeek, -1);
      updateWeekDisplay();
      loadData();
    });

    page.querySelector('#week-next')?.addEventListener('click', () => {
      currentWeek = shiftWeek(currentWeek, 1);
      updateWeekDisplay();
      loadData();
    });

    loadData();
  }

  function updateWeekDisplay(): void {
    const lbl  = page.querySelector('#week-label');
    const code = page.querySelector('.week-code');
    if (lbl)  lbl.textContent = getWeekLabel(currentWeek);
    if (code) code.textContent = currentWeek;
  }

  function loadData(): void {
    const body = page.querySelector<HTMLElement>('#ov-body')!;
    body.innerHTML = `<div class="sched-loading">Загрузка...</div>`;

    fetchOverview(currentWeek)
      .then(data => {
        rows = data;
        body.innerHTML = buildOverviewHtml();
      })
      .catch(() => {
        body.innerHTML = `<div class="sched-empty">Ошибка загрузки. Проверьте подключение.</div>`;
      });
  }

  renderAll();
  return page;
}
