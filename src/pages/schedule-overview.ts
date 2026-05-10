import { navigate } from '../router';
import { authFetch } from '../services/auth';
import type { ScheduleRow } from '../services/scheduleApi';
import {
  DAY_KEYS, DAY_LABELS,
  currentISOWeek, shiftWeek, getWeekLabel, totalHours,
  fetchOverview,
} from '../services/scheduleApi';

interface Manager { id: number; name: string; pizzerias: string[]; }

export function renderScheduleOverview(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'schedule-page schedule-overview-page page-enter';

  let currentWeek = currentISOWeek();
  let rows: ScheduleRow[] = [];
  let managers: Manager[] = [];

  // ─── Alerts block ──────────────────────────────────────────────────────────

  function buildAlertsHtml(): string {
    const filledNames = new Set(rows.map(r => r.employee));

    const notFilled = managers.filter(m => !filledNames.has(m.name));
    const lowHours  = rows
      .map(r => ({ name: r.employee, hours: totalHours(r.shifts), pizzeria: r.pizzeria }))
      .filter(r => r.hours < 40);

    if (!notFilled.length && !lowHours.length) return '';

    const missingHtml = notFilled.length
      ? `<div class="alert-row alert-missing">
          <span class="alert-icon">⚠️</span>
          <span>Не заполнили график:
            ${notFilled.map(m => `<strong>${m.name}</strong>${m.pizzerias.length ? ` (${m.pizzerias.join(', ')})` : ''}`).join(', ')}
          </span>
        </div>`
      : '';

    const lowHtml = lowHours.length
      ? lowHours.map(r =>
          `<div class="alert-row alert-low">
            <span class="alert-icon">🕐</span>
            <span>Менее 40 часов: <strong>${r.name}</strong> — ${r.hours} ч${r.pizzeria ? ` (${r.pizzeria})` : ''}</span>
          </div>`
        ).join('')
      : '';

    return `<div class="overview-alerts">${missingHtml}${lowHtml}</div>`;
  }

  // ─── Table ─────────────────────────────────────────────────────────────────

  function buildTableHtml(): string {
    if (!rows.length) {
      return `<div class="sched-empty">Нет данных за эту неделю</div>`;
    }

    const managerByName = new Map(managers.map(m => [m.name, m]));

    const dayHeaders = DAY_KEYS.map(d => `<th>${DAY_LABELS[d]}</th>`).join('');

    const bodyRows = rows.map(row => {
      const hours    = totalHours(row.shifts);
      const isLow    = hours < 40;
      const mgr      = managerByName.get(row.employee);
      const pizzerias = mgr?.pizzerias.join(', ') || row.pizzeria || '—';

      const dayCells = DAY_KEYS.map(d => {
        const s = row.shifts[d];
        if (!s || s.off) return `<td class="day-off">—</td>`;
        return `<td class="day-cell">${s.start ?? ''}–${s.end ?? ''}</td>`;
      }).join('');

      return `
        <tr class="${isLow ? 'row-warning' : ''}">
          <td class="emp-name-cell">${row.employee}</td>
          <td class="pizzeria-cell">${pizzerias}</td>
          ${dayCells}
          <td class="total-cell ${isLow ? 'total-low' : 'total-ok'}">${hours} ч</td>
        </tr>`;
    }).join('');

    return `
      <div class="overview-card">
        <table class="overview-table">
          <thead>
            <tr>
              <th style="text-align:left">Сотрудник</th>
              <th style="text-align:left">Пиццерия</th>
              ${dayHeaders}
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function renderAll(): void {
    page.innerHTML = `
      <div class="sched-header">
        <div class="sched-title-row">
          <button class="btn btn-ghost" id="ov-back" style="font-size:13px;">← Назад</button>
          <h2 class="sched-title">График управляющих сети PiX</h2>
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

    Promise.all([
      fetchOverview(currentWeek),
      authFetch('/api/users').then(r => r.json()) as Promise<{ id: number; name: string; role: string; pizzerias: string[] }[]>,
    ])
      .then(([scheduleData, allUsers]) => {
        rows     = scheduleData;
        managers = allUsers
          .filter(u => u.role === 'manager')
          .map(u => ({ id: u.id, name: u.name, pizzerias: u.pizzerias }));

        body.innerHTML = buildAlertsHtml() + buildTableHtml();
      })
      .catch(() => {
        body.innerHTML = `<div class="sched-empty">Ошибка загрузки. Проверьте подключение.</div>`;
      });
  }

  renderAll();
  return page;
}
