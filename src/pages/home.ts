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

function buildCard(item: NavItem): HTMLElement {
  const card = document.createElement('div');
  card.className = 'section-card';

  const badgeHtml = item.badge
    ? `<span class="badge badge-${item.badge.variant}">${item.badge.text}</span>`
    : '';

  card.innerHTML = `
    <div class="section-card-header">
      <span class="section-card-title">${item.title}</span>
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
    <section style="background: linear-gradient(180deg, #fafaf7 0%, #ffffff 100%); padding: 80px 0;">
      <div class="container" style="text-align:center;">
        <div style="font-size:12px; font-weight:600; letter-spacing:0.12em; color:var(--text-secondary); text-transform:uppercase; margin-bottom:20px;">Портал сотрудника</div>
        <h1 style="font-size:48px; font-weight:700; line-height:1.15; color:var(--text); margin-bottom:20px; letter-spacing:-0.03em;">
          Всё что нужно для работы в <span style="color:var(--accent);">PiX</span>
        </h1>
        <p style="font-size:17px; color:var(--text-secondary); max-width:480px; margin:0 auto 40px; line-height:1.6;">
          Регламенты, инструкции, ключи доступа и контакты команды — в одном месте, всегда под рукой.
        </p>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-primary btn-lg" id="btn-open">Открыть портал</button>
          <button class="btn btn-outline btn-lg" id="btn-more">Подробнее</button>
        </div>
      </div>
    </section>

    <section style="padding: 72px 0;">
      <div class="container">
        <div class="block-label">Разделы</div>
        <div class="cards-grid" id="cards-grid"></div>
      </div>
    </section>

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

  return page;
}
