import { navigate } from '../router';
import type { NavItem } from '../types';

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Регламенты',
    description: 'Стандарты работы, правила и процедуры компании',
    path: '/regulations',
    badge: { text: 'обновлено', variant: 'orange' },
  },
  {
    title: 'Ключи доступа',
    description: 'Логины, пароли и системные доступы',
    path: '/access',
  },
  {
    title: 'Инструкции',
    description: 'Пошаговые гайды и обучающие материалы',
    path: '/instructions',
    badge: { text: '12 файлов', variant: 'gray' },
  },
  {
    title: 'Контакты',
    description: 'Команда, поставщики и служба поддержки',
    path: '/contacts',
  },
];

const CARD_ICONS: Record<string, string> = {
  'Регламенты':    '📋',
  'Ключи доступа': '🔑',
  'Инструкции':    '📖',
  'Контакты':      '👥',
};

function buildCard(item: NavItem): HTMLElement {
  const card = document.createElement('div');
  card.className = 'section-card';

  const badgeHtml = item.badge
    ? `<span class="badge badge-${item.badge.variant}">${item.badge.text}</span>`
    : '';

  const icon = CARD_ICONS[item.title] ?? '📄';

  card.innerHTML = `
    <div class="section-card-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="section-card-icon">${icon}</span>
        <span class="section-card-title">${item.title}</span>
      </div>
      ${badgeHtml}
    </div>
    <p class="section-card-desc">${item.description}</p>
    <span class="section-card-arrow">→</span>
  `;

  card.addEventListener('click', () => navigate(item.path));
  return card;
}

export function renderHome(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  page.innerHTML = `
    <!-- Hero -->
    <section style="padding:88px 0 80px;position:relative;overflow:hidden;">
      <!-- Декоративная сетка точек -->
      <div aria-hidden="true" style="
        position:absolute;right:0;top:0;width:420px;height:100%;
        background-image:radial-gradient(circle, rgba(249,115,22,0.18) 1.5px, transparent 1.5px);
        background-size:28px 28px;
        -webkit-mask-image:linear-gradient(to left, rgba(0,0,0,0.5), transparent);
        mask-image:linear-gradient(to left, rgba(0,0,0,0.5), transparent);
        pointer-events:none;
      "></div>

      <div class="container" style="text-align:center;position:relative;">
        <div style="
          display:inline-flex;align-items:center;gap:8px;
          background:var(--accent-light);border:1px solid rgba(249,115,22,0.25);
          border-radius:20px;padding:4px 14px;margin-bottom:28px;
        ">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;"></span>
          <span style="font-size:12px;font-weight:600;letter-spacing:0.1em;color:var(--accent);text-transform:uppercase;">Портал сотрудника</span>
        </div>

        <h1 style="
          font-size:52px;font-weight:800;line-height:1.1;
          letter-spacing:-0.035em;margin-bottom:22px;
          color:var(--text-primary);
        ">
          Всё для работы в
          <span style="background:linear-gradient(135deg,#f97316,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">PiX</span>
        </h1>

        <p style="
          font-size:17px;color:var(--text-secondary);
          max-width:460px;margin:0 auto 40px;line-height:1.65;
        ">
          Регламенты, инструкции, доступы и контакты команды —<br>в одном месте, всегда под рукой.
        </p>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary btn-lg" id="btn-open">
            Открыть портал
            <span style="font-size:16px;">→</span>
          </button>
          <button class="btn btn-outline btn-lg" id="btn-org">Структура</button>
        </div>
      </div>
    </section>

    <!-- Разделы -->
    <section style="padding:64px 0 72px;">
      <div class="container">
        <div class="block-label">Разделы</div>
        <div class="cards-grid" id="cards-grid"></div>
      </div>
    </section>

    <!-- Метрики -->
    <section class="metrics-section">
      <div class="container">
        <div class="metrics-inner">
          <div class="metric-item">
            <div class="metric-value">3</div>
            <div class="metric-label">Пиццерии</div>
          </div>
          <div class="metric-item">
            <div class="metric-value">47</div>
            <div class="metric-label">Сотрудников</div>
          </div>
          <div class="metric-item">
            <div class="metric-value accent">12</div>
            <div class="metric-label">Документов</div>
          </div>
        </div>
      </div>
    </section>
  `;

  const grid = page.querySelector('#cards-grid')!;
  NAV_ITEMS.forEach(item => grid.appendChild(buildCard(item)));

  page.querySelector('#btn-open')!.addEventListener('click', () => navigate('/regulations'));
  page.querySelector('#btn-org')!.addEventListener('click', () => navigate('/org'));

  return page;
}
