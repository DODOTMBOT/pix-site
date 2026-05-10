import { navigate } from '../router';
import { getPlans, getMetrics, savePlan } from '../services/storage';
import { calcMotivation } from '../services/motivationCalc';
import { isManagement } from '../services/auth';
import type { MotivationPlan, MotivationMetric } from '../types';

const SS = 'padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-input,var(--bg-primary));color:var(--text-primary);outline:none;cursor:pointer;';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function monthLabel(month: string): string {
  return new Date(month + '-01').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
}

function dirPrefix(dir: 'higher' | 'lower'): string {
  return dir === 'higher' ? '≥' : '≤';
}

export function renderMotivationReview(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  if (!isManagement()) { navigate('/'); return page; }

  const metrics = getMetrics();

  let allPlans        = getPlans();
  let selectedPizzeria = '';
  let selectedMonth    = '';

  // collect distinct pizzerias & months from plans
  const pizzerias = [...new Set(allPlans.map(p => p.pizzeria))].sort();
  if (pizzerias.length > 0) selectedPizzeria = pizzerias[0];

  function monthsForPizzeria(piz: string): string[] {
    return [...new Set(allPlans.filter(p => p.pizzeria === piz).map(p => p.month))].sort().reverse();
  }

  let availableMonths = monthsForPizzeria(selectedPizzeria);
  if (availableMonths.length > 0) selectedMonth = availableMonths[0];

  function currentPlan(): MotivationPlan | undefined {
    return allPlans.find(p => p.pizzeria === selectedPizzeria && p.month === selectedMonth);
  }

  function build(): void {
    page.replaceChildren(renderContent());
  }

  function renderContent(): HTMLElement {
    allPlans        = getPlans();
    availableMonths = monthsForPizzeria(selectedPizzeria);
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      selectedMonth = availableMonths[0];
    }

    const plan = currentPlan();

    const wrap = document.createElement('div');
    wrap.className = 'motivation-page';
    wrap.style.maxWidth = '960px';

    // ── Header ────────────────────────────────────────────────────────────────
    const pizzeriaOptions = pizzerias.map(p =>
      `<option value="${p}" ${p === selectedPizzeria ? 'selected' : ''}>${p}</option>`
    ).join('');

    const monthOptions = availableMonths.map(m =>
      `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${monthLabel(m)}</option>`
    ).join('');

    wrap.innerHTML = `
      <button class="btn btn-ghost" id="back-btn" style="margin-bottom:20px;">← Назад</button>
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-label">РУКОВОДСТВО</div>
        <h1 style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin:4px 0 0;">Проверка мотивации</h1>
      </div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:24px;flex-wrap:wrap;">
        ${pizzerias.length > 0
          ? `<select id="sel-pizzeria" style="${SS}">${pizzeriaOptions}</select>
             <select id="sel-month" style="${SS}">${monthOptions || '<option value="">Нет планов</option>'}</select>`
          : `<div style="font-size:14px;color:#9ca3af;">Планов нет. <button class="btn btn-primary" id="go-new" style="margin-left:8px;">+ Создать план</button></div>`
        }
      </div>
    `;

    wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/admin'));
    wrap.querySelector('#go-new')?.addEventListener('click', () => navigate('/admin/motivation/new'));

    wrap.querySelector('#sel-pizzeria')?.addEventListener('change', e => {
      selectedPizzeria = (e.target as HTMLSelectElement).value;
      availableMonths  = monthsForPizzeria(selectedPizzeria);
      selectedMonth    = availableMonths[0] ?? '';
      build();
    });

    wrap.querySelector('#sel-month')?.addEventListener('change', e => {
      selectedMonth = (e.target as HTMLSelectElement).value;
      build();
    });

    if (!plan) {
      const empty = document.createElement('div');
      empty.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:40px;text-align:center;">
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">План не выбран</div>
          <div style="font-size:13px;color:var(--text-secondary);">Выберите пиццерию и месяц</div>
        </div>
      `;
      wrap.appendChild(empty);
      return wrap;
    }

    // ── Working copy of plan for live recalc ─────────────────────────────────
    let livePlan: MotivationPlan = JSON.parse(JSON.stringify(plan));

    function recalcAndRefresh(): void {
      const result = calcMotivation(livePlan, metrics);

      // update earned cells
      wrap.querySelectorAll<HTMLElement>('[data-earned]').forEach(el => {
        const mid     = el.dataset['earned']!;
        const entry   = result.breakdown.find(b => b.metricId === mid);
        const earned  = entry ? entry.earned + entry.wowEarned : 0;
        el.textContent = earned > 0 ? `${fmt(earned)} ₽` : '—';
        el.style.color = earned > 0 ? '#f97316' : '#9ca3af';
      });

      // update summary
      const summaryEl = wrap.querySelector<HTMLElement>('#review-summary');
      if (summaryEl) summaryEl.replaceChildren(buildSummary(result));
    }

    function buildSummary(result: ReturnType<typeof calcMotivation>): HTMLElement {
      const el = document.createElement('div');
      if (result.isReset) {
        el.innerHTML = `<div class="result-reset">ПРЕМИЯ ОБНУЛЕНА</div>`;
      } else {
        el.innerHTML = `
          <div class="result-breakdown">
            <div>Базовая премия: <strong>${fmt(result.bonusAmount)} ₽</strong></div>
            <div>WOW премия: <strong style="color:#f97316;">${fmt(result.wowAmount)} ₽</strong></div>
            <div class="result-total">ИТОГО: <strong>${fmt(result.totalAmount)} ₽</strong></div>
          </div>
        `;
      }
      return el;
    }

    // ── Fund cards ────────────────────────────────────────────────────────────
    const fundsEl = document.createElement('div');
    fundsEl.className = 'funds-overview';
    fundsEl.style.marginBottom = '16px';
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
        <div class="fund-label">Веса блоков</div>
        <div class="fund-amount" style="font-size:15px;font-weight:600;">
          Рейтинги ${plan.ratingsWeight}% / Прибыль ${plan.profitWeight}%
        </div>
      </div>
    `;
    wrap.appendChild(fundsEl);

    // ── Metrics blocks ────────────────────────────────────────────────────────
    const ratingsMetrics = metrics.filter(m => m.block === 'ratings');
    const profitMetrics  = metrics.filter(m => m.block === 'profit');

    function buildBlock(blockMetrics: MotivationMetric[], blockLabel: string, blockWeight: number): HTMLElement | null {
      const targets = livePlan.targets.filter(t => blockMetrics.some(m => m.id === t.metricId));
      if (targets.length === 0) return null;

      const rows = targets.map(t => {
        const metric = blockMetrics.find(m => m.id === t.metricId);
        if (!metric) return '';

        const prefix    = dirPrefix(metric.direction);
        const unit      = metric.unit ? ` ${metric.unit}` : '';
        const targetStr = t.targetValue ? `${prefix} ${t.targetValue}${unit}` : '—';
        const wowStr    = t.wowValue    ? `${prefix} ${t.wowValue}${unit}`    : '—';
        const resultEl  = t.result
          ? `<strong>${t.result}${unit}</strong>`
          : `<span style="color:#9ca3af;font-size:12px;">не внесён</span>`;

        const selStyle = `${SS}font-size:12px;padding:4px 8px;`;
        const fulVal   = t.fulfilled   === true ? 'true' : t.fulfilled   === false ? 'false' : '';
        const wowVal   = t.wowFulfilled === true ? 'true' : t.wowFulfilled === false ? 'false' : '';

        return `
          <tr>
            <td style="font-weight:500;">${metric.name}${unit ? ` (${metric.unit})` : ''}</td>
            <td style="color:#6b7280;">${t.weight}</td>
            <td class="target-cell">${targetStr}</td>
            <td class="wow-cell">${wowStr}</td>
            <td>${resultEl}</td>
            <td>
              <select class="fulfillment-select" data-mid="${metric.id}" data-field="fulfilled" style="${selStyle}">
                <option value="" ${fulVal === '' ? 'selected' : ''}>—</option>
                <option value="true"  ${fulVal === 'true'  ? 'selected' : ''}>Да</option>
                <option value="false" ${fulVal === 'false' ? 'selected' : ''}>Нет</option>
              </select>
            </td>
            <td>
              <select class="fulfillment-select" data-mid="${metric.id}" data-field="wowFulfilled" style="${selStyle}">
                <option value="" ${wowVal === '' ? 'selected' : ''}>—</option>
                <option value="true"  ${wowVal === 'true'  ? 'selected' : ''}>WOW</option>
                <option value="false" ${wowVal === 'false' ? 'selected' : ''}>Нет</option>
              </select>
            </td>
            <td class="earned-cell" data-earned="${metric.id}" style="font-weight:600;color:#9ca3af;">—</td>
          </tr>
        `;
      }).join('');

      const card = document.createElement('div');
      card.className = 'metrics-card';
      card.style.marginBottom = '16px';
      card.innerHTML = `
        <h3 style="font-size:14px;font-weight:700;margin:0 0 14px;">${blockLabel} <span class="block-weight">(${blockWeight}% фонда)</span></h3>
        <div style="overflow-x:auto;">
          <table class="review-table">
            <thead>
              <tr>
                <th>Показатель</th>
                <th>Вес</th>
                <th>Цель</th>
                <th>WOW цель</th>
                <th>Результат</th>
                <th>Выполнено</th>
                <th>WOW</th>
                <th>Заработано</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      card.querySelectorAll<HTMLSelectElement>('.fulfillment-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const mid   = sel.dataset['mid']!;
          const field = sel.dataset['field']! as 'fulfilled' | 'wowFulfilled';
          const val   = sel.value === '' ? null : sel.value === 'true';
          const t     = livePlan.targets.find(x => x.metricId === mid);
          if (t) t[field] = val;

          // update select border color live
          sel.style.borderColor = sel.value === 'true' ? '#22c55e' : sel.value === 'false' ? '#ef4444' : '';
          sel.style.color       = sel.value === 'true' ? '#16a34a' : sel.value === 'false' ? '#dc2626' : '';

          recalcAndRefresh();
        });

        // set initial color
        sel.style.borderColor = sel.value === 'true' ? '#22c55e' : sel.value === 'false' ? '#ef4444' : '';
        sel.style.color       = sel.value === 'true' ? '#16a34a' : sel.value === 'false' ? '#dc2626' : '';
      });

      return card;
    }

    const ratingsCard = buildBlock(ratingsMetrics, 'Рейтинги', plan.ratingsWeight);
    const profitCard  = buildBlock(profitMetrics,  'Прибыль',  plan.profitWeight);
    if (ratingsCard) wrap.appendChild(ratingsCard);
    if (profitCard)  wrap.appendChild(profitCard);

    // ── Reset conditions ──────────────────────────────────────────────────────
    if (livePlan.resetConditions.length > 0) {
      const resetCard = document.createElement('div');
      resetCard.className = 'reset-info-card';
      resetCard.style.marginBottom = '16px';

      const items = livePlan.resetConditions.map(rc => {
        const critHtml = rc.criticalValue
          ? `<span style="font-size:11px;color:#9ca3af;margin-left:8px;">крит: ${rc.criticalValue}</span>`
          : '';
        return `
          <div class="reset-row" data-rid="${rc.id}">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" class="reset-trigger" data-rid="${rc.id}" ${rc.triggered ? 'checked' : ''}
                style="width:16px;height:16px;cursor:pointer;accent-color:#ef4444;">
              <span class="reset-desc" style="font-size:13px;${rc.triggered ? 'color:#dc2626;font-weight:600;' : 'color:var(--text-primary);'}">${rc.description}${critHtml}</span>
            </label>
            <span style="font-size:12px;white-space:nowrap;${rc.triggered ? 'color:#dc2626;' : 'color:#9ca3af;'}">
              ${rc.triggered ? 'Сработало' : 'Не сработало'}
            </span>
          </div>
        `;
      }).join('');

      resetCard.innerHTML = `
        <h3 style="font-size:14px;font-weight:700;margin:0 0 14px;">Условия обнуления</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">${items}</div>
      `;

      resetCard.querySelectorAll<HTMLInputElement>('.reset-trigger').forEach(cb => {
        cb.addEventListener('change', () => {
          const rid = cb.dataset['rid']!;
          const rc  = livePlan.resetConditions.find(r => r.id === rid);
          if (rc) rc.triggered = cb.checked;
          recalcAndRefresh();

          // update label style live
          const row      = resetCard.querySelector(`[data-rid="${rid}"]`);
          const descSpan = row?.querySelector<HTMLElement>('.reset-desc');
          const status   = row?.querySelector<HTMLElement>('span:last-child');
          if (descSpan) {
            descSpan.style.color      = cb.checked ? '#dc2626' : '';
            descSpan.style.fontWeight = cb.checked ? '600' : '';
          }
          if (status) {
            status.textContent = cb.checked ? 'Сработало' : 'Не сработало';
            status.style.color = cb.checked ? '#dc2626' : '#9ca3af';
          }
        });
      });

      wrap.appendChild(resetCard);
    }

    // ── Result summary ────────────────────────────────────────────────────────
    const initResult  = calcMotivation(livePlan, metrics);
    const summaryWrap = document.createElement('div');
    summaryWrap.className = `review-result${initResult.isReset ? ' reset' : ''}`;
    summaryWrap.style.marginBottom = '16px';
    const summaryInner = document.createElement('div');
    summaryInner.id = 'review-summary';
    summaryInner.appendChild(buildSummary(initResult));
    summaryWrap.appendChild(summaryInner);
    wrap.appendChild(summaryWrap);

    // ── Actions ───────────────────────────────────────────────────────────────
    const actionsEl = document.createElement('div');
    actionsEl.className = 'motivation-footer';
    actionsEl.innerHTML = `
      <button class="btn btn-primary" id="save-review">Сохранить проверку</button>
      <button class="btn btn-outline" id="go-edit">Редактировать план</button>
      <span id="saved-ok" style="font-size:13px;color:#16a34a;display:none;">Сохранено</span>
    `;
    actionsEl.querySelector('#save-review')!.addEventListener('click', () => {
      savePlan(livePlan);
      const ok = actionsEl.querySelector<HTMLElement>('#saved-ok')!;
      ok.style.display = 'inline';
      setTimeout(() => { ok.style.display = 'none'; }, 2500);
    });
    actionsEl.querySelector('#go-edit')!.addEventListener('click', () => {
      navigate(`/admin/motivation/${plan.id}`);
    });
    wrap.appendChild(actionsEl);

    // run initial recalc to populate earned cells
    recalcAndRefresh();

    return wrap;
  }

  page.appendChild(renderContent());
  return page;
}
