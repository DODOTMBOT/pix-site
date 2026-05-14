import { isManagement } from '../services/auth';
import { getSchedules, saveSchedule } from '../services/schedules';
import type { ScheduleEntry, UserSchedule } from '../services/schedules';

const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

// ── Date helpers ───────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

function weekKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekNum(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const year = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - year.getTime()) / 86400000) + 1) / 7);
}

function fmtWeekLabel(monday: Date): string {
  const sun = addDays(monday, 6);
  const wn  = getWeekNum(monday);
  const sm  = monday.getMonth(), em = sun.getMonth();
  const sy  = monday.getFullYear(), ey = sun.getFullYear();
  let range: string;
  if (sm === em && sy === ey) {
    range = `${monday.getDate()}–${sun.getDate()} ${MONTHS_GEN[em]} ${ey}`;
  } else if (sy === ey) {
    range = `${monday.getDate()} ${MONTHS_GEN[sm]} – ${sun.getDate()} ${MONTHS_GEN[em]} ${ey}`;
  } else {
    range = `${monday.getDate()} ${MONTHS_GEN[sm]} ${sy} – ${sun.getDate()} ${MONTHS_GEN[em]} ${ey}`;
  }
  return `Неделя ${wn} · ${range}`;
}

// ── Hours helpers ─────────────────────────────────────────────────────────────

function calcH(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? Math.round(mins / 6) / 10 : 0;
}

function fmtH(h: number): string {
  if (h === 0) return '—';
  return Number.isInteger(h) ? `${h}ч` : `${h}ч`;
}

function sumH(entries: ScheduleEntry[]): number {
  return Math.round(entries.reduce((s, e) => s + calcH(e.start_time, e.end_time), 0) * 10) / 10;
}

// ── Day state ─────────────────────────────────────────────────────────────────

interface DayState { off: boolean; start: string; end: string; }

function stateFromEntries(entries: ScheduleEntry[]): DayState[] {
  return Array.from({ length: 7 }, (_, d) => {
    const e = entries.find(e => e.day === d);
    if (e?.start_time && e?.end_time) return { off: false, start: e.start_time, end: e.end_time };
    return { off: true, start: '09:00', end: '18:00' };
  });
}

function stateToEntries(state: DayState[]): ScheduleEntry[] {
  return state.map((s, d) => ({
    day:        d,
    start_time: s.off ? null : s.start,
    end_time:   s.off ? null : s.end,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function renderSchedules(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';
  if (isManagement()) {
    renderManagementView(page);
  } else {
    renderManagerView(page);
  }
  return page;
}

// ── Manager: editable own schedule ───────────────────────────────────────────

function renderManagerView(page: HTMLElement): void {
  let monday   = getMondayOf(new Date());
  let state    : DayState[] = Array.from({ length: 7 }, () => ({ off: true, start: '09:00', end: '18:00' }));
  let isSaving = false;

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      const data = await getSchedules(weekKey(monday));
      state = stateFromEntries(data[0]?.entries ?? []);
      render();
    } catch {
      page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
    }
  }

  function render(): void { page.replaceChildren(buildLayout()); }

  function buildLayout(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:580px;';

    // Header row
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;';
    hdr.innerHTML = `<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Мой график</h1>`;
    hdr.appendChild(buildWeekNav());
    wrap.appendChild(hdr);

    // Days card
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    for (let d = 0; d < 7; d++) card.appendChild(buildDayRow(d));

    // Total footer
    const totalRow = document.createElement('div');
    totalRow.id = 'sched-total';
    totalRow.style.cssText = 'padding:14px 20px;border-top:2px solid var(--border);display:flex;align-items:center;justify-content:flex-end;gap:12px;background:var(--bg-secondary);';
    refreshTotal(totalRow);
    card.appendChild(totalRow);

    wrap.appendChild(card);

    // Save button
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;margin-top:16px;';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Сохранить график';
    saveBtn.addEventListener('click', async () => {
      if (isSaving) return;
      isSaving = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Сохранение...';
      try {
        await saveSchedule(weekKey(monday), stateToEntries(state));
        saveBtn.textContent = '✓ Сохранено';
        setTimeout(() => { saveBtn.textContent = 'Сохранить график'; saveBtn.disabled = false; isSaving = false; }, 1800);
      } catch {
        saveBtn.textContent = 'Ошибка';
        setTimeout(() => { saveBtn.textContent = 'Сохранить график'; saveBtn.disabled = false; isSaving = false; }, 1800);
      }
    });
    footer.appendChild(saveBtn);
    wrap.appendChild(footer);

    return wrap;
  }

  function buildWeekNav(): HTMLElement {
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const prev = document.createElement('button');
    prev.className = 'btn btn-outline';
    prev.style.cssText = 'padding:6px 12px;font-size:13px;';
    prev.textContent = '←';
    prev.addEventListener('click', () => { monday = addDays(monday, -7); load(); });

    const label = document.createElement('div');
    label.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;min-width:220px;text-align:center;';
    label.textContent = fmtWeekLabel(monday);

    const next = document.createElement('button');
    next.className = 'btn btn-outline';
    next.style.cssText = 'padding:6px 12px;font-size:13px;';
    next.textContent = '→';
    next.addEventListener('click', () => { monday = addDays(monday, 7); load(); });

    nav.append(prev, label, next);
    return nav;
  }

  function buildDayRow(d: number): HTMLElement {
    const s    = state[d];
    const date = addDays(monday, d);

    const row = document.createElement('div');
    row.style.cssText = [
      'display:flex;align-items:center;gap:14px;padding:12px 20px;',
      'border-bottom:1px solid var(--border);transition:background 0.1s;',
      d >= 5 ? 'background:var(--bg-secondary);' : '',
    ].join('');

    // Day label
    const lbl = document.createElement('div');
    lbl.style.cssText = 'width:90px;flex-shrink:0;display:flex;align-items:baseline;gap:6px;';
    lbl.innerHTML = `
      <span style="font-weight:700;font-size:14px;color:var(--text-primary);">${DAYS_SHORT[d]}</span>
      <span style="font-size:12px;color:var(--text-muted);">${date.getDate()} ${MONTHS_GEN[date.getMonth()]}</span>
    `;

    // Time area
    const timeArea = document.createElement('div');
    timeArea.style.cssText = 'flex:1;display:flex;align-items:center;gap:8px;';

    // Hours badge
    const badge = document.createElement('div');
    badge.style.cssText = 'width:44px;text-align:right;font-size:13px;font-weight:700;flex-shrink:0;';

    function rebuild(): void {
      timeArea.innerHTML = '';

      if (s.off) {
        badge.style.color = 'var(--text-muted)';
        badge.textContent = '—';

        const btn = document.createElement('button');
        btn.className = 'btn btn-outline';
        btn.style.cssText = 'font-size:12px;padding:5px 16px;color:var(--text-muted);border-style:dashed;';
        btn.textContent = 'Выходной';
        btn.addEventListener('click', () => { s.off = false; rebuild(); tickTotal(); });
        timeArea.appendChild(btn);
      } else {
        const t1 = makeTimeInput(s.start);
        const sep = document.createElement('span');
        sep.style.cssText = 'color:var(--text-muted);font-size:15px;';
        sep.textContent = '–';
        const t2 = makeTimeInput(s.end);

        const offBtn = document.createElement('button');
        offBtn.title = 'Отметить выходным';
        offBtn.style.cssText = 'margin-left:4px;background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-muted);padding:4px 6px;border-radius:4px;transition:background 0.1s;font-family:inherit;';
        offBtn.textContent = 'вых';
        offBtn.addEventListener('mouseenter', () => { offBtn.style.background = 'var(--bg-hover)'; });
        offBtn.addEventListener('mouseleave', () => { offBtn.style.background = 'none'; });
        offBtn.addEventListener('click', () => { s.off = true; rebuild(); tickTotal(); });

        function sync(): void {
          s.start = t1.value;
          s.end   = t2.value;
          const h = calcH(s.start, s.end);
          badge.style.color = h > 0 ? 'var(--accent)' : '#ef4444';
          badge.textContent = fmtH(h);
          tickTotal();
        }

        t1.addEventListener('input', sync);
        t2.addEventListener('input', sync);
        timeArea.append(t1, sep, t2, offBtn);
        sync();
      }
    }

    rebuild();
    row.append(lbl, timeArea, badge);
    return row;
  }

  function tickTotal(): void {
    const el = document.getElementById('sched-total');
    if (el) refreshTotal(el);
  }

  function refreshTotal(el: HTMLElement): void {
    const total = sumH(stateToEntries(state));
    const low   = total > 0 && total < 40;
    el.innerHTML = `
      <span style="font-size:13px;color:var(--text-muted);">Итого за неделю:</span>
      <span style="font-size:20px;font-weight:800;color:${total === 0 ? 'var(--text-muted)' : low ? '#f59e0b' : 'var(--accent)'};">
        ${total === 0 ? '—' : fmtH(total)}
      </span>
      ${low ? `<span style="font-size:12px;color:#f59e0b;background:#f59e0b1a;border-radius:20px;padding:3px 10px;">⚠ меньше 40ч</span>` : ''}
    `;
  }

  load();
}

// ── Management: read-only overview of all managers ────────────────────────────

function renderManagementView(page: HTMLElement): void {
  let monday = getMondayOf(new Date());

  async function load(): Promise<void> {
    page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;
    try {
      const data = await getSchedules(weekKey(monday));
      page.replaceChildren(buildLayout(data));
    } catch {
      page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
    }
  }

  function buildLayout(data: UserSchedule[]): HTMLElement {
    const wrap = document.createElement('div');

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;';
    hdr.innerHTML = `<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">Графики управляющих</h1>`;

    // Week nav
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const prev = document.createElement('button');
    prev.className = 'btn btn-outline';
    prev.style.cssText = 'padding:6px 12px;font-size:13px;';
    prev.textContent = '←';
    prev.addEventListener('click', () => { monday = addDays(monday, -7); load(); });
    const weekLabel = document.createElement('div');
    weekLabel.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;min-width:220px;text-align:center;';
    weekLabel.textContent = fmtWeekLabel(monday);
    const next = document.createElement('button');
    next.className = 'btn btn-outline';
    next.style.cssText = 'padding:6px 12px;font-size:13px;';
    next.textContent = '→';
    next.addEventListener('click', () => { monday = addDays(monday, 7); load(); });
    nav.append(prev, weekLabel, next);
    hdr.appendChild(nav);
    wrap.appendChild(hdr);

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:80px;color:var(--text-muted);font-size:15px;';
      empty.textContent = 'Управляющих нет.';
      wrap.appendChild(empty);
      return wrap;
    }

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);';

    const table = document.createElement('table');
    table.style.cssText = 'table-layout:fixed;width:100%;';

    // Build column day dates
    const dayDates = Array.from({ length: 7 }, (_, d) => {
      const dt = addDays(monday, d);
      return `${DAYS_SHORT[d]}<br><span style="font-weight:400;font-size:10px;color:var(--text-muted);">${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]}</span>`;
    });

    let thHtml = `<tr>
      <th style="width:150px;">Управляющий</th>
      <th style="width:130px;">Пиццерия</th>
    `;
    for (let d = 0; d < 7; d++) {
      thHtml += `<th style="width:82px;text-align:center;padding:10px 4px;">${dayDates[d]}</th>`;
    }
    thHtml += `<th style="width:80px;text-align:center;">Итого</th></tr>`;

    const thead = document.createElement('thead');
    thead.innerHTML = thHtml;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(u => {
      const total      = sumH(u.entries);
      const noSchedule = u.entries.length === 0;
      const low        = !noSchedule && total < 40;

      const tr = document.createElement('tr');
      if (low) tr.style.background = '#f59e0b06';

      let html = `
        <td style="font-weight:600;font-size:13px;">${esc(u.user_name ?? '')}</td>
        <td style="color:var(--text-secondary);font-size:12px;">${u.pizzeria_name ? esc(u.pizzeria_name) : '<span style="color:var(--text-muted);">—</span>'}</td>
      `;

      for (let d = 0; d < 7; d++) {
        const e = u.entries.find(e => e.day === d);
        const h = e ? calcH(e.start_time, e.end_time) : 0;
        if (e?.start_time && e?.end_time) {
          const s = e.start_time.slice(0, 5);
          const f = e.end_time.slice(0, 5);
          html += `<td style="text-align:center;padding:8px 4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-primary);line-height:1.3;">${s}–${f}</div>
            <div style="font-size:10px;color:var(--text-muted);">${fmtH(h)}</div>
          </td>`;
        } else {
          html += `<td style="text-align:center;color:var(--text-muted);font-size:12px;">—</td>`;
        }
      }

      if (noSchedule) {
        html += `<td style="text-align:center;">
          <span style="font-size:11px;color:var(--text-muted);font-style:italic;">не заполнен</span>
        </td>`;
      } else {
        html += `<td style="text-align:center;padding:8px 4px;">
          <div style="font-size:16px;font-weight:800;color:${low ? '#f59e0b' : 'var(--accent)'};">${fmtH(total)}</div>
          ${low ? `<div style="font-size:10px;color:#f59e0b;font-weight:600;">⚠ недобор</div>` : ''}
        </td>`;
      }

      tr.innerHTML = html;

      // Highlight low-hours row with left border
      if (low) {
        tr.style.cssText += 'box-shadow:inset 3px 0 0 #f59e0b;';
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    card.appendChild(table);
    wrap.appendChild(card);

    // Legend
    const legend = document.createElement('div');
    legend.style.cssText = 'margin-top:12px;display:flex;align-items:center;gap:8px;';
    legend.innerHTML = `
      <div style="width:12px;height:12px;border-radius:2px;background:#f59e0b;flex-shrink:0;"></div>
      <span style="font-size:12px;color:var(--text-muted);">Менее 40 часов в неделю</span>
    `;
    wrap.appendChild(legend);

    return wrap;
  }

  load();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTimeInput(value: string): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type  = 'time';
  inp.value = value;
  inp.style.cssText = 'padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:var(--bg-input);color:var(--text-primary);outline:none;width:108px;';
  return inp;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
