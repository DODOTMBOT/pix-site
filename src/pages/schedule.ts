import { navigate } from '../router';
import { getUser, isManagement } from '../services/auth';
import type { WeekShifts } from '../services/scheduleApi';
import {
  DAY_KEYS,
  currentISOWeek, shiftWeek, getWeekLabel,
  fetchSchedule, saveScheduleRow,
} from '../services/scheduleApi';

const DAY_FULL: Record<string, string> = {
  mon: 'Понедельник', tue: 'Вторник', wed: 'Среда',
  thu: 'Четверг',    fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье',
};

export function renderSchedule(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'schedule-page page-enter';

  if (isManagement()) {
    navigate('/schedule/overview');
    return page;
  }

  const rawUser = getUser();
  if (!rawUser) {
    page.innerHTML = `<p style="padding:40px;color:var(--text-muted)">Не авторизован</p>`;
    return page;
  }
  const user = rawUser;

  const pizzeria = user.pizzerias[0] ?? '';
  let currentWeek = currentISOWeek();
  let shifts: WeekShifts = {};
  let saving = false;

  function calcHours(d: string): number {
    const s = shifts[d as keyof WeekShifts];
    if (!s || s.off || !s.start || !s.end) return 0;
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? Math.round(diff / 6) / 10 : 0;
  }

  function readShiftsFromDom(): WeekShifts {
    const result: WeekShifts = {};
    for (const d of DAY_KEYS) {
      const offChk  = page.querySelector<HTMLInputElement>(`.day-off-check[data-day="${d}"]`);
      const startIn = page.querySelector<HTMLInputElement>(`.time-start[data-day="${d}"]`);
      const endIn   = page.querySelector<HTMLInputElement>(`.time-end[data-day="${d}"]`);
      result[d] = {
        off:   offChk?.checked  ?? false,
        start: startIn?.value   ?? '09:00',
        end:   endIn?.value     ?? '18:00',
      };
    }
    return result;
  }

  function updateTotal(): void {
    shifts = readShiftsFromDom();
    let total = 0;
    for (const d of DAY_KEYS) total += calcHours(d);
    total = Math.round(total * 10) / 10;

    const valEl = page.querySelector<HTMLElement>('.total-value');
    if (valEl) {
      if (total < 40) {
        valEl.textContent = `${total} ч`;
        valEl.style.color = '#ef4444';
        const lbl = page.querySelector<HTMLElement>('.total-warn');
        if (lbl) lbl.textContent = '⚠️ менее 40 часов';
      } else {
        valEl.textContent = `${total} ч`;
        valEl.style.color = '#22c55e';
        const lbl = page.querySelector<HTMLElement>('.total-warn');
        if (lbl) lbl.textContent = '';
      }
    }

    for (const d of DAY_KEYS) {
      const cell = page.querySelector<HTMLElement>(`.hours-value[data-day="${d}"]`);
      if (cell) cell.textContent = String(calcHours(d));
    }
  }

  function buildRows(): string {
    return DAY_KEYS.map(d => {
      const s   = shifts[d] ?? { start: '09:00', end: '18:00', off: false };
      const hrs = calcHours(d);
      return `
        <tr class="${s.off ? 'is-off' : ''}" data-day="${d}">
          <td class="day-name">${DAY_FULL[d]}</td>
          <td>
            <label class="toggle-wrap">
              <input type="checkbox" class="day-off-check" data-day="${d}"${s.off ? ' checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-label">Выходной</span>
            </label>
          </td>
          <td><input type="time" class="time-input time-start" data-day="${d}" value="${s.start ?? '09:00'}"${s.off ? ' disabled' : ''}></td>
          <td><input type="time" class="time-input time-end"   data-day="${d}" value="${s.end   ?? '18:00'}"${s.off ? ' disabled' : ''}></td>
          <td class="hours-cell"><span class="hours-value" data-day="${d}">${hrs}</span></td>
        </tr>`;
    }).join('');
  }

  function renderPage(): void {
    const total = (() => {
      let t = 0;
      for (const d of DAY_KEYS) t += calcHours(d);
      return Math.round(t * 10) / 10;
    })();
    const totalColor  = total < 40 ? '#ef4444' : '#22c55e';
    const totalWarn   = total < 40 ? '⚠️ менее 40 часов' : '';
    const overviewBtn = isManagement()
      ? `<button class="btn btn-outline" id="sched-overview-btn" style="font-size:13px;">Обзор всех →</button>`
      : '';

    page.innerHTML = `
      <div class="page-header">
        <div class="page-label">МОЙ ГРАФИК</div>
        <h1 style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.02em;margin:4px 0 0;">График работы</h1>
        <div class="schedule-user">👤 ${user.name}</div>
      </div>

      <div class="week-nav">
        <button class="btn btn-outline week-btn" id="week-prev">← Назад</button>
        <span class="week-label" id="week-label">${getWeekLabel(currentWeek)}</span>
        <button class="btn btn-outline week-btn" id="week-next">Вперёд →</button>
        ${overviewBtn}
      </div>

      <div class="schedule-card" id="sched-card">
        <div class="sched-loading">Загрузка...</div>
      </div>

      <div class="schedule-footer">
        <div class="total-block">
          <span class="total-label">Итого за неделю:</span>
          <span class="total-value" style="color:${totalColor}">${total} ч</span>
          <span class="total-warn" style="font-size:13px;color:#ef4444;margin-left:8px;">${totalWarn}</span>
        </div>
        <button class="btn btn-primary" id="sched-save">Сохранить график</button>
      </div>
    `;

    page.querySelector('#week-prev')?.addEventListener('click', () => {
      shifts = readShiftsFromDom();
      currentWeek = shiftWeek(currentWeek, -1);
      page.querySelector('#week-label')!.textContent = getWeekLabel(currentWeek);
      loadWeek();
    });

    page.querySelector('#week-next')?.addEventListener('click', () => {
      shifts = readShiftsFromDom();
      currentWeek = shiftWeek(currentWeek, 1);
      page.querySelector('#week-label')!.textContent = getWeekLabel(currentWeek);
      loadWeek();
    });

    page.querySelector('#sched-overview-btn')?.addEventListener('click', () => navigate('/schedule/overview'));

    page.querySelector('#sched-save')?.addEventListener('click', saveWeek);

    loadWeek();
  }

  function renderTable(): void {
    const card = page.querySelector<HTMLElement>('#sched-card')!;
    card.innerHTML = `
      <table class="schedule-table">
        <thead>
          <tr>
            <th>День</th>
            <th>Выходной</th>
            <th>Начало смены</th>
            <th>Конец смены</th>
            <th>Часов</th>
          </tr>
        </thead>
        <tbody>${buildRows()}</tbody>
      </table>
    `;

    card.querySelectorAll<HTMLInputElement>('.day-off-check').forEach(chk => {
      chk.addEventListener('change', () => {
        const d   = chk.dataset['day']!;
        const tr  = card.querySelector<HTMLElement>(`tr[data-day="${d}"]`)!;
        const startIn = card.querySelector<HTMLInputElement>(`.time-start[data-day="${d}"]`)!;
        const endIn   = card.querySelector<HTMLInputElement>(`.time-end[data-day="${d}"]`)!;
        tr.classList.toggle('is-off', chk.checked);
        startIn.disabled = chk.checked;
        endIn.disabled   = chk.checked;
        updateTotal();
      });
    });

    card.querySelectorAll<HTMLInputElement>('.time-input').forEach(inp => {
      inp.addEventListener('change', updateTotal);
    });

    updateTotal();
  }

  function loadWeek(): void {
    const card = page.querySelector<HTMLElement>('#sched-card')!;
    if (!pizzeria) {
      card.innerHTML = `<div class="sched-empty">Нет привязанной пиццерии</div>`;
      return;
    }
    card.innerHTML = `<div class="sched-loading">Загрузка...</div>`;

    fetchSchedule(currentWeek, pizzeria)
      .then(rows => {
        const mine = rows.find(r => r.employee === user.name);
        shifts = mine?.shifts ?? {};
        renderTable();
      })
      .catch(() => {
        shifts = {};
        renderTable();
      });
  }

  async function saveWeek(): Promise<void> {
    if (saving) return;
    saving = true;
    const btn = page.querySelector<HTMLButtonElement>('#sched-save')!;
    btn.disabled    = true;
    btn.textContent = 'Сохранение...';

    try {
      await saveScheduleRow({
        week:     currentWeek,
        pizzeria,
        employee: user.name,
        shifts:   readShiftsFromDom(),
      });
      btn.textContent       = '✓ Сохранено';
      btn.style.background  = '#16a34a';
      setTimeout(() => {
        saving = false;
        btn.textContent      = 'Сохранить график';
        btn.style.background = '';
        btn.disabled         = false;
      }, 2000);
    } catch {
      saving = false;
      btn.textContent      = 'Ошибка — повторить';
      btn.style.background = '#dc2626';
      btn.disabled         = false;
      setTimeout(() => {
        btn.textContent      = 'Сохранить график';
        btn.style.background = '';
      }, 3000);
    }
  }

  renderPage();
  return page;
}
