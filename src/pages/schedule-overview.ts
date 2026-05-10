import { navigate } from '../router';
import { authFetch } from '../services/auth';
import type { ScheduleRow } from '../services/scheduleApi';
import {
  DAY_KEYS, DAY_LABELS,
  currentISOWeek, shiftWeek, getWeekLabel, totalHours,
  fetchOverview,
} from '../services/scheduleApi';

interface Manager { id: number; name: string; pizzerias: string[]; }
interface Warning { name: string; pizzerias: string[]; hours: number; type: 'missing' | 'low'; }

export function renderScheduleOverview(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'schedule-page page-enter';

  let currentWeek = currentISOWeek();
  let rows: ScheduleRow[] = [];
  let warnings: Warning[] = [];

  // ─── Modal ──────────────────────────────────────────────────────────────────

  function buildModalHtml(): string {
    const missing = warnings.filter(w => w.type === 'missing');
    const low     = warnings.filter(w => w.type === 'low');

    const missingHtml = missing.length ? `
      <div class="alert-section">
        <div class="alert-title">Не заполнили график (${missing.length})</div>
        ${missing.map(w => `
          <div class="alert-item alert-missing">
            <span class="alert-dot red"></span>
            ${w.name}
            <span class="alert-sub">${w.pizzerias.join(', ')}</span>
          </div>`).join('')}
      </div>` : '';

    const lowHtml = low.length ? `
      <div class="alert-section">
        <div class="alert-title">Менее 40 часов (${low.length})</div>
        ${low.map(w => `
          <div class="alert-item alert-low">
            <span class="alert-dot orange"></span>
            ${w.name}
            <span class="alert-hours">${w.hours.toFixed(1)} ч</span>
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="modal-overlay" id="schedule-alert-modal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>⚠️ Внимание</h3>
            <button class="modal-close" id="close-modal">✕</button>
          </div>
          ${missingHtml}
          ${lowHtml}
          <button class="btn btn-primary" id="close-modal-btn" style="width:100%;margin-top:16px;">
            Понятно
          </button>
        </div>
      </div>`;
  }

  function showModal(): void {
    if (!warnings.length) return;
    document.querySelector('#schedule-alert-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', buildModalHtml());

    function closeModal(): void {
      document.querySelector('#schedule-alert-modal')?.remove();
    }

    document.querySelector('#close-modal')?.addEventListener('click', closeModal);
    document.querySelector('#close-modal-btn')?.addEventListener('click', closeModal);
    document.querySelector('#schedule-alert-modal')?.addEventListener('click', e => {
      if ((e.target as HTMLElement).id === 'schedule-alert-modal') closeModal();
    });
  }

  // ─── Data ───────────────────────────────────────────────────────────────────

  function computeWarnings(managers: Manager[]): void {
    warnings = [];
    const filledNames = new Set(rows.map(r => r.employee));

    for (const m of managers) {
      if (!filledNames.has(m.name)) {
        warnings.push({ name: m.name, pizzerias: m.pizzerias, hours: 0, type: 'missing' });
      }
    }

    for (const r of rows) {
      const h = totalHours(r.shifts);
      if (h < 40) {
        warnings.push({ name: r.employee, pizzerias: [], hours: h, type: 'low' });
      }
    }
  }

  // ─── Overview HTML ───────────────────────────────────────────────────────────

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

    if (grouped.size === 0) {
      return `<div class="sched-empty">Нет данных за эту неделю</div>`;
    }

    let html = '';
    grouped.forEach((pRows, pizzeria) => {
      const pizzeriaTotal = pRows.reduce((sum, r) => sum + totalHours(r.shifts), 0);

      const rowsHtml = pRows.map(row => {
        const hours   = totalHours(row.shifts);
        const warning = hours < 40;

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

      html += `
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

    return html;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  function renderAll(): void {
    page.innerHTML = `
      <div class="sched-header">
        <div class="sched-title-row">
          <button class="btn btn-ghost" id="ov-back" style="font-size:13px;">← Назад</button>
          <h2 class="sched-title">Обзор графиков</h2>
          <button class="btn btn-outline ov-warn-btn" id="ov-warn-btn" style="font-size:13px;display:none;">
            ⚠️ Предупреждения
          </button>
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

    page.querySelector('#ov-back')?.addEventListener('click', () => {
      document.querySelector('#schedule-alert-modal')?.remove();
      navigate('/schedule');
    });

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

    page.querySelector('#ov-warn-btn')?.addEventListener('click', showModal);

    loadData();
  }

  function updateWeekDisplay(): void {
    const lbl  = page.querySelector('#week-label');
    const code = page.querySelector('.week-code');
    if (lbl)  lbl.textContent = getWeekLabel(currentWeek);
    if (code) code.textContent = currentWeek;
  }

  function loadData(): void {
    const body    = page.querySelector<HTMLElement>('#ov-body')!;
    const warnBtn = page.querySelector<HTMLElement>('#ov-warn-btn')!;
    body.innerHTML = `<div class="sched-loading">Загрузка...</div>`;
    warnBtn.style.display = 'none';

    Promise.all([
      fetchOverview(currentWeek),
      authFetch('/api/users').then(r => r.json()) as Promise<{ id: number; name: string; role: string; pizzerias: string[] }[]>,
    ])
      .then(([scheduleData, allUsers]) => {
        rows = scheduleData;
        const managers: Manager[] = allUsers
          .filter(u => u.role === 'manager')
          .map(u => ({ id: u.id, name: u.name, pizzerias: u.pizzerias }));

        computeWarnings(managers);
        body.innerHTML = buildOverviewHtml();

        if (warnings.length > 0) {
          warnBtn.style.display = '';
          showModal();
        }
      })
      .catch(() => {
        body.innerHTML = `<div class="sched-empty">Ошибка загрузки. Проверьте подключение.</div>`;
      });
  }

  renderAll();
  return page;
}
