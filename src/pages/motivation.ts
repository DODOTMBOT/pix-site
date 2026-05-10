import { getUser, isManagement } from '../services/auth';
import { getPlanByPizzeriaMonth, getMetrics, savePlan } from '../services/storage';
import { calcMotivation } from '../services/motivationCalc';
import { navigate } from '../router';
import type { MotivationPlan } from '../types';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function monthLabel(month: string): string {
  return new Date(month + '-01').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
}

function dirPrefix(dir: 'higher' | 'lower'): string {
  return dir === 'higher' ? '≥' : '≤';
}

export function renderMotivation(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  if (isManagement()) { navigate('/admin'); return page; }

  const user = getUser();
  if (!user) { navigate('/login'); return page; }

  const pizzerias = user.pizzerias ?? [];

  let selectedPizzeria = pizzerias[0] ?? '';
  const currentMonth   = new Date().toISOString().slice(0, 7);

  function build(): void {
    page.replaceChildren(renderContent(selectedPizzeria));
  }

  function renderContent(pizzeria: string): HTMLElement {
    const metrics = getMetrics();
    const plan    = pizzeria ? getPlanByPizzeriaMonth(pizzeria, currentMonth) : undefined;

    const wrap = document.createElement('div');
    wrap.className = 'motivation-page';

    // ── Header ───────────────────────────────────────────────────────────────
    const pizzeriaSelect = pizzerias.length > 1
      ? `<select id="piz-select" style="padding:5px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-input,var(--bg-primary));color:var(--text-primary);outline:none;">
           ${pizzerias.map(p => `<option value="${p}" ${p === pizzeria ? 'selected' : ''}>${p}</option>`).join('')}
         </select>`
      : `<span>📍 ${pizzeria || '—'}</span>`;

    wrap.innerHTML = `
      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-label">МОЯ МОТИВАЦИЯ</div>
        <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin:4px 0 8px;">Система мотивации</h1>
        <div class="motivation-meta">
          ${pizzeriaSelect}
          <span>📅 ${monthLabel(currentMonth)}</span>
        </div>
      </div>
    `;

    wrap.querySelector('#piz-select')?.addEventListener('change', e => {
      selectedPizzeria = (e.target as HTMLSelectElement).value;
      build();
    });

    if (!plan) {
      const empty = document.createElement('div');
      empty.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:40px;text-align:center;">
          <div style="font-size:36px;margin-bottom:12px;">📋</div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">План не настроен</div>
          <div style="font-size:13px;color:var(--text-secondary);">План на этот месяц ещё не настроен руководством</div>
        </div>
      `;
      wrap.appendChild(empty);
      return wrap;
    }

    // ── Calc result ──────────────────────────────────────────────────────────
    const result = calcMotivation(plan, metrics);

    // ── Fund cards ───────────────────────────────────────────────────────────
    const resultHtml = result.isReset
      ? '<span style="color:#dc2626;font-size:14px;font-weight:600;">Обнулён</span>'
      : `${fmt(result.totalAmount)} ₽`;

    const fundsEl = document.createElement('div');
    fundsEl.className = 'funds-overview';
    fundsEl.innerHTML = `
      <div class="fund-card">
        <div class="fund-label">Премиальный фонд</div>
        <div class="fund-amount">${fmt(plan.bonusFund)} ₽</div>
      </div>
      <div class="fund-card wow">
        <div class="fund-label">WOW фонд</div>
        <div class="fund-amount">${fmt(plan.wowFund)} ₽</div>
      </div>
      <div class="fund-card result">
        <div class="fund-label">Текущий расчёт</div>
        <div class="fund-amount" id="current-result">${resultHtml}</div>
      </div>
    `;
    wrap.appendChild(fundsEl);

    // ── Metrics blocks ───────────────────────────────────────────────────────
    const ratingsMetrics = metrics.filter(m => m.block === 'ratings');
    const profitMetrics  = metrics.filter(m => m.block === 'profit');

    function buildBlock(blockMetrics: typeof metrics, blockLabel: string, blockWeight: number): HTMLElement {
      const targets = plan!.targets.filter(t => blockMetrics.some(m => m.id === t.metricId));
      if (targets.length === 0) return document.createElement('div');

      const rows = targets.map(t => {
        const metric = blockMetrics.find(m => m.id === t.metricId);
        if (!metric) return '';

        const prefix = dirPrefix(metric.direction);
        const unit   = metric.unit ? ` ${metric.unit}` : '';

        let statusHtml = '';
        if (t.wowFulfilled === true)  statusHtml = `<span class="status-wow">⭐ WOW!</span>`;
        else if (t.fulfilled === true) statusHtml = `<span class="status-ok">✓ Выполнено</span>`;
        else if (t.fulfilled === false) statusHtml = `<span class="status-fail">✗ Не выполнено</span>`;
        else statusHtml = `<span class="status-pending">Ожидает проверки</span>`;

        const targetStr = t.targetValue ? `${prefix} ${t.targetValue}${unit}` : '—';
        const wowStr    = t.wowValue    ? `${prefix} ${t.wowValue}${unit}`    : '—';

        return `
          <tr>
            <td style="font-weight:500;">${metric.name}${unit ? ` (${metric.unit})` : ''}</td>
            <td class="target-cell">${targetStr}</td>
            <td class="wow-cell">${wowStr}</td>
            <td>
              <input type="text" class="result-input" data-mid="${metric.id}"
                value="${t.result ?? ''}" placeholder="введите результат">
            </td>
            <td class="status-cell">${statusHtml}</td>
          </tr>
        `;
      }).join('');

      const card = document.createElement('div');
      card.className = 'metrics-card';
      card.innerHTML = `
        <h3>${blockLabel} <span class="block-weight">(${blockWeight}% фонда)</span></h3>
        <table class="motivation-table">
          <thead>
            <tr>
              <th>Показатель</th>
              <th>Цель</th>
              <th>WOW цель</th>
              <th>Мой результат</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
      return card;
    }

    if (ratingsMetrics.length > 0) wrap.appendChild(buildBlock(ratingsMetrics, 'Рейтинги', plan.ratingsWeight));
    if (profitMetrics.length  > 0) wrap.appendChild(buildBlock(profitMetrics,  'Прибыль',  plan.profitWeight));

    // ── Reset conditions ─────────────────────────────────────────────────────
    if (plan.resetConditions.length > 0) {
      const resetEl = document.createElement('div');
      resetEl.className = 'reset-info-card';
      const items = plan.resetConditions.map(rc => {
        const triggered = rc.triggered ?? false;
        const critStr   = rc.criticalValue ? ` (крит. значение: ${rc.criticalValue})` : '';
        return `
          <li class="reset-item${triggered ? ' triggered' : ''}">
            <span>${rc.description}${critStr}</span>
            <span class="reset-status ${triggered ? 'red' : 'gray'}">
              ${triggered ? '🔴 Сработало' : '⚪ Не сработало'}
            </span>
          </li>
        `;
      }).join('');
      resetEl.innerHTML = `
        <h3 style="font-size:14px;font-weight:700;margin:0 0 14px;">⚠️ Условия обнуления премии</h3>
        <ul class="reset-list">${items}</ul>
      `;
      wrap.appendChild(resetEl);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'motivation-footer';
    footer.innerHTML = `
      <button class="btn btn-primary" id="save-results">Сохранить результаты</button>
      <div class="footer-note">После сохранения ТУ проверит и поставит статус выполнения</div>
      <span id="save-ok" style="font-size:13px;color:#16a34a;display:none;">Сохранено ✓</span>
    `;

    footer.querySelector('#save-results')!.addEventListener('click', () => {
      const inputs = wrap.querySelectorAll<HTMLInputElement>('.result-input');
      const updated: MotivationPlan = {
        ...plan!,
        targets: plan!.targets.map(t => {
          const input = Array.from(inputs).find(el => el.dataset['mid'] === t.metricId);
          return input ? { ...t, result: input.value } : t;
        }),
      };
      savePlan(updated);
      const ok = footer.querySelector<HTMLElement>('#save-ok')!;
      ok.style.display = 'inline';
      setTimeout(() => { ok.style.display = 'none'; }, 2500);
    });

    wrap.appendChild(footer);
    return wrap;
  }

  page.appendChild(renderContent(selectedPizzeria));
  return page;
}
