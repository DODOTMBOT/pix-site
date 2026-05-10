import { navigate } from '../router';
import { getMetrics, savePlan, getPlan } from '../services/storage';
import { calcMotivation } from '../services/motivationCalc';
import type { MotivationPlan, MotivationTarget, ResetCondition } from '../types';

const IS = 'width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input,var(--bg-primary));outline:none;box-sizing:border-box;';

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export function renderAdminMotivation(planId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const metrics  = getMetrics();
  const existing = planId ? getPlan(planId) : undefined;
  const isNew    = !existing;

  let targets: MotivationTarget[] = existing?.targets
    ? existing.targets.map(t => ({ ...t }))
    : metrics.map(m => ({ metricId: m.id, weight: 1, targetValue: '', wowValue: '', result: '', fulfilled: null, wowFulfilled: null }));

  let resetConditions: ResetCondition[] = existing?.resetConditions
    ? existing.resetConditions.map(r => ({ ...r }))
    : [{ id: uid(), description: '', criticalValue: '', triggered: false }];

  // ── Build DOM ─────────────────────────────────────────────────────────────

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="container">
      <section style="padding:40px 0 80px;max-width:800px;">
        <button class="btn btn-ghost" id="back-btn" style="margin-bottom:24px;">← Назад</button>
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:28px;color:var(--text-primary);">
          ${isNew ? 'Новый план мотивации' : 'Редактировать план'}
        </h1>

        <!-- Основные параметры -->
        <div class="motiv-card" style="margin-bottom:16px;">
          <h2 class="motiv-card-title">Параметры плана</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label class="motiv-label">Пиццерия *</label>
              <input id="f-pizzeria" type="text" value="${existing?.pizzeria ?? ''}" style="${IS}" placeholder="Немчиновка-1">
            </div>
            <div>
              <label class="motiv-label">Месяц *</label>
              <input id="f-month" type="month" value="${existing?.month ?? ''}" style="${IS}">
            </div>
            <div>
              <label class="motiv-label">Бонусный фонд, ₽</label>
              <input id="f-bonus" type="number" min="0" value="${existing?.bonusFund ?? ''}" style="${IS}" placeholder="50000">
            </div>
            <div>
              <label class="motiv-label">WOW-фонд, ₽</label>
              <input id="f-wow" type="number" min="0" value="${existing?.wowFund ?? ''}" style="${IS}" placeholder="20000">
            </div>
          </div>
        </div>

        <!-- Веса блоков -->
        <div class="motiv-card" style="margin-bottom:16px;">
          <h2 class="motiv-card-title">Веса блоков</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label class="motiv-label">Рейтинги, %</label>
              <input id="f-rw" type="number" min="0" max="100" value="${existing?.ratingsWeight ?? 50}" style="${IS}">
            </div>
            <div>
              <label class="motiv-label">Прибыль, %</label>
              <input id="f-pw" type="number" min="0" max="100" value="${existing?.profitWeight ?? 50}" style="${IS}">
            </div>
          </div>
          <div id="weights-hint" style="font-size:12px;color:#9ca3af;margin-top:8px;"></div>
        </div>

        <!-- Цели по показателям -->
        <div class="motiv-card" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 class="motiv-card-title" style="margin:0;">Цели по показателям</h2>
            <span style="font-size:12px;color:#9ca3af;">Вес — доля внутри блока</span>
          </div>
          <div id="targets-wrap"></div>
        </div>

        <!-- Условия обнуления -->
        <div class="motiv-card" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 class="motiv-card-title" style="margin:0;">Условия обнуления</h2>
            <button id="add-reset-btn" class="btn btn-outline" style="font-size:12px;padding:6px 12px;">+ Добавить</button>
          </div>
          <div id="reset-list"></div>
        </div>

        <!-- Итог -->
        <div id="result-block" class="motiv-card" style="margin-bottom:24px;display:none;"></div>

        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-primary" id="save-btn" style="padding:11px 28px;">Сохранить</button>
          <button class="btn btn-outline" id="preview-btn">Предварительный расчёт</button>
          <button class="btn btn-ghost" id="cancel-btn">Отмена</button>
          <span id="save-err" style="font-size:13px;color:#ef4444;display:none;"></span>
        </div>
      </section>
    </div>
  `;

  // ── Weights hint ────────────────────────────────────────────────────────
  const rwInput = wrap.querySelector<HTMLInputElement>('#f-rw')!;
  const pwInput = wrap.querySelector<HTMLInputElement>('#f-pw')!;
  const hint    = wrap.querySelector<HTMLElement>('#weights-hint')!;

  function updateHint(): void {
    const rw = parseInt(rwInput.value) || 0;
    const pw = parseInt(pwInput.value) || 0;
    const sum = rw + pw;
    hint.textContent = sum === 100 ? '' : `Сумма весов: ${sum}% (должно быть 100%)`;
    hint.style.color = sum === 100 ? '' : '#f97316';
  }
  rwInput.addEventListener('input', updateHint);
  pwInput.addEventListener('input', updateHint);
  updateHint();

  // ── Targets ────────────────────────────────────────────────────────────
  const targetsWrap = wrap.querySelector<HTMLElement>('#targets-wrap')!;

  function renderTargets(): void {
    targetsWrap.innerHTML = '';

    const ratingsMetrics = metrics.filter(m => m.block === 'ratings');
    const profitMetrics  = metrics.filter(m => m.block === 'profit');

    function renderBlock(blockMetrics: typeof metrics, label: string): void {
      if (blockMetrics.length === 0) return;

      const section = document.createElement('div');
      section.innerHTML = `
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;padding-top:4px;">${label}</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;min-width:600px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);">
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;width:160px;">Показатель</th>
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;width:60px;">Вес</th>
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Цель</th>
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">WOW</th>
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Результат</th>
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;width:90px;">Выполнено</th>
                <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;width:80px;">WOW</th>
              </tr>
            </thead>
            <tbody id="tbody-${label}"></tbody>
          </table>
        </div>
      `;
      targetsWrap.appendChild(section);

      const tbody = section.querySelector<HTMLElement>(`#tbody-${label}`)!;

      blockMetrics.forEach(metric => {
        const t = targets.find(x => x.metricId === metric.id) ?? { metricId: metric.id, weight: 1, targetValue: '', wowValue: '', result: '', fulfilled: null, wowFulfilled: null };
        if (!targets.find(x => x.metricId === metric.id)) targets.push(t);

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border)';
        const unit = metric.unit ? ` (${metric.unit})` : '';
        row.innerHTML = `
          <td style="padding:8px;font-size:13px;font-weight:500;">${metric.name}${unit}</td>
          <td style="padding:8px;">
            <input type="number" min="0" value="${t.weight}" data-mid="${metric.id}" data-field="weight"
              style="${IS}padding:6px 8px;font-size:13px;">
          </td>
          <td style="padding:8px;">
            <input type="text" value="${t.targetValue}" data-mid="${metric.id}" data-field="targetValue"
              placeholder="${metric.direction === 'higher' ? '≥' : '≤'}" style="${IS}padding:6px 8px;font-size:13px;">
          </td>
          <td style="padding:8px;">
            <input type="text" value="${t.wowValue ?? ''}" data-mid="${metric.id}" data-field="wowValue"
              placeholder="WOW" style="${IS}padding:6px 8px;font-size:13px;">
          </td>
          <td style="padding:8px;">
            <input type="text" value="${t.result ?? ''}" data-mid="${metric.id}" data-field="result"
              placeholder="факт" style="${IS}padding:6px 8px;font-size:13px;">
          </td>
          <td style="padding:8px;text-align:center;">
            <select data-mid="${metric.id}" data-field="fulfilled"
              style="${IS}padding:6px 8px;font-size:13px;width:auto;">
              <option value="" ${t.fulfilled === null ? 'selected' : ''}>—</option>
              <option value="true"  ${t.fulfilled === true  ? 'selected' : ''}>Да</option>
              <option value="false" ${t.fulfilled === false ? 'selected' : ''}>Нет</option>
            </select>
          </td>
          <td style="padding:8px;text-align:center;">
            <select data-mid="${metric.id}" data-field="wowFulfilled"
              style="${IS}padding:6px 8px;font-size:13px;width:auto;">
              <option value="" ${t.wowFulfilled === null ? 'selected' : ''}>—</option>
              <option value="true"  ${t.wowFulfilled === true  ? 'selected' : ''}>Да</option>
              <option value="false" ${t.wowFulfilled === false ? 'selected' : ''}>Нет</option>
            </select>
          </td>
        `;

        row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-mid]').forEach(el => {
          el.addEventListener('change', () => updateTarget(metric.id, el.dataset['field']!, (el as HTMLInputElement | HTMLSelectElement).value));
          el.addEventListener('input',  () => updateTarget(metric.id, el.dataset['field']!, (el as HTMLInputElement | HTMLSelectElement).value));
        });

        tbody.appendChild(row);
      });
    }

    renderBlock(ratingsMetrics, 'Рейтинги');
    renderBlock(profitMetrics,  'Прибыль');
  }

  function updateTarget(metricId: string, field: string, value: string): void {
    const t = targets.find(x => x.metricId === metricId);
    if (!t) return;
    if (field === 'weight')       t.weight = parseFloat(value) || 0;
    if (field === 'targetValue')  t.targetValue = value;
    if (field === 'wowValue')     t.wowValue = value;
    if (field === 'result')       t.result = value;
    if (field === 'fulfilled')    t.fulfilled = value === '' ? null : value === 'true';
    if (field === 'wowFulfilled') t.wowFulfilled = value === '' ? null : value === 'true';
  }

  renderTargets();

  // ── Reset conditions ────────────────────────────────────────────────────
  const resetList = wrap.querySelector<HTMLElement>('#reset-list')!;

  function renderResetConditions(): void {
    resetList.innerHTML = '';
    resetConditions.forEach((rc, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:1fr 140px auto auto;gap:8px;align-items:center;margin-bottom:8px;';
      row.innerHTML = `
        <input type="text" value="${rc.description}" placeholder="Описание условия" style="${IS}" data-ri="${i}" data-field="description">
        <input type="text" value="${rc.criticalValue ?? ''}" placeholder="Крит. значение" style="${IS}" data-ri="${i}" data-field="criticalValue">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
          <input type="checkbox" ${rc.triggered ? 'checked' : ''} data-ri="${i}" data-field="triggered" style="width:16px;height:16px;">
          Сработало
        </label>
        <button data-del="${i}" style="border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:6px 10px;cursor:pointer;color:#ef4444;font-size:13px;white-space:nowrap;">×</button>
      `;
      row.querySelector<HTMLInputElement>('[data-field="description"]')!.addEventListener('input', e => {
        resetConditions[i].description = (e.target as HTMLInputElement).value;
      });
      row.querySelector<HTMLInputElement>('[data-field="criticalValue"]')!.addEventListener('input', e => {
        resetConditions[i].criticalValue = (e.target as HTMLInputElement).value;
      });
      row.querySelector<HTMLInputElement>('[data-field="triggered"]')!.addEventListener('change', e => {
        resetConditions[i].triggered = (e.target as HTMLInputElement).checked;
      });
      row.querySelector<HTMLButtonElement>(`[data-del="${i}"]`)!.addEventListener('click', () => {
        resetConditions.splice(i, 1);
        renderResetConditions();
      });
      resetList.appendChild(row);
    });
  }

  renderResetConditions();

  wrap.querySelector('#add-reset-btn')!.addEventListener('click', () => {
    resetConditions.push({ id: uid(), description: '', criticalValue: '', triggered: false });
    renderResetConditions();
  });

  // ── Preview ─────────────────────────────────────────────────────────────
  const resultBlock = wrap.querySelector<HTMLElement>('#result-block')!;

  wrap.querySelector('#preview-btn')!.addEventListener('click', () => {
    const plan = collectPlan();
    if (!plan) return;
    const result = calcMotivation(plan, metrics);
    resultBlock.style.display = '';

    if (result.isReset) {
      resultBlock.innerHTML = `
        <h2 class="motiv-card-title">Предварительный расчёт</h2>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;color:#dc2626;font-weight:600;">
          Бонус обнулён — сработало условие обнуления
        </div>
      `;
      return;
    }

    const rows = result.breakdown.map(b => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:8px;font-size:13px;">${b.metricName}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${b.block === 'ratings' ? 'Рейтинги' : 'Прибыль'}</td>
        <td style="padding:8px;font-size:13px;text-align:right;">${fmt(b.earned)} ₽</td>
        <td style="padding:8px;font-size:13px;text-align:right;color:#f97316;">${fmt(b.wowEarned)} ₽</td>
      </tr>
    `).join('');

    resultBlock.innerHTML = `
      <h2 class="motiv-card-title">Предварительный расчёт</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Показатель</th>
            <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Блок</th>
            <th style="padding:8px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;">Бонус</th>
            <th style="padding:8px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;">WOW</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;gap:24px;padding:12px;background:var(--bg-secondary);border-radius:8px;">
        <div><span style="font-size:12px;color:#6b7280;">Бонус</span><br><span style="font-size:18px;font-weight:700;color:var(--text-primary);">${fmt(result.bonusAmount)} ₽</span></div>
        <div><span style="font-size:12px;color:#6b7280;">WOW</span><br><span style="font-size:18px;font-weight:700;color:#f97316;">${fmt(result.wowAmount)} ₽</span></div>
        <div><span style="font-size:12px;color:#6b7280;">Итого</span><br><span style="font-size:18px;font-weight:700;color:#22c55e;">${fmt(result.totalAmount)} ₽</span></div>
      </div>
    `;
  });

  // ── Collect & Save ──────────────────────────────────────────────────────
  function collectPlan(): MotivationPlan | null {
    const pizzeria = wrap.querySelector<HTMLInputElement>('#f-pizzeria')!.value.trim();
    const month    = wrap.querySelector<HTMLInputElement>('#f-month')!.value.trim();
    const saveErr  = wrap.querySelector<HTMLElement>('#save-err')!;

    if (!pizzeria || !month) {
      saveErr.textContent = 'Укажите пиццерию и месяц';
      saveErr.style.display = 'block';
      return null;
    }
    saveErr.style.display = 'none';

    return {
      id:               existing?.id ?? uid(),
      pizzeria,
      month,
      bonusFund:        parseFloat(wrap.querySelector<HTMLInputElement>('#f-bonus')!.value) || 0,
      wowFund:          parseFloat(wrap.querySelector<HTMLInputElement>('#f-wow')!.value)   || 0,
      ratingsWeight:    parseInt(rwInput.value) || 0,
      profitWeight:     parseInt(pwInput.value) || 0,
      targets:          targets.filter(t => t.targetValue || t.weight),
      resetConditions:  resetConditions.filter(r => r.description),
    };
  }

  wrap.querySelector('#save-btn')!.addEventListener('click', () => {
    const plan = collectPlan();
    if (!plan) return;
    savePlan(plan);
    navigate('/admin');
  });

  wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/admin'));
  wrap.querySelector('#cancel-btn')!.addEventListener('click', () => navigate('/admin'));

  page.appendChild(wrap);
  return page;
}
