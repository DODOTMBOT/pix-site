import { navigate } from '../router';
import type { NavItem } from '../types';

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Регламенты',
    description: 'Стандарты работы, правила, процедуры',
    path: '/regulations',
    badge: { text: 'обновлено', variant: 'orange' },
  },
  {
    title: 'Ключи доступа',
    description: 'Логины, пароли, системные доступы',
    path: '/access',
  },
  {
    title: 'Инструкции',
    description: 'Пошаговые гайды и обучение',
    path: '/instructions',
    badge: { text: '12 файлов', variant: 'gray' },
  },
  {
    title: 'Контакты',
    description: 'Команда, поставщики, служба поддержки',
    path: '/contacts',
  },
];

function buildSectionRow(item: NavItem): HTMLElement {
  const row = document.createElement('div');
  row.className = 'section-row';

  const badgeHtml = item.badge
    ? `<span class="badge badge-${item.badge.variant}">${item.badge.text}</span>`
    : '';

  row.innerHTML = `
    <div class="section-left">
      <div class="section-title-wrap">
        <span class="section-title">${item.title}</span>
        ${badgeHtml}
      </div>
      <span class="section-desc">${item.description}</span>
    </div>
    <span class="section-arrow">›</span>
  `;

  row.addEventListener('click', () => navigate(item.path));
  return row;
}

export function renderHome(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const heroSection = `
    <section style="padding: 52px 0 48px;">
      <div style="font-size:11px; font-weight:600; letter-spacing:0.12em; color:var(--text-secondary); text-transform:uppercase; margin-bottom:18px;">Портал сотрудника</div>
      <h1 style="font-size:32px; font-weight:700; line-height:1.2; color:var(--text); margin-bottom:16px; letter-spacing:-0.02em;">
        Всё что нужно для работы в <span style="color:var(--accent);">PiX</span>
      </h1>
      <p style="font-size:15px; color:var(--text-secondary); max-width:480px; margin-bottom:32px; line-height:1.6;">
        Регламенты, инструкции, ключи доступа и контакты команды — в одном месте, всегда под рукой.
      </p>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="btn-login">Войти</button>
        <button class="btn btn-outline" id="btn-more">Подробнее</button>
      </div>
    </section>
  `;

  page.innerHTML = `
    <div class="container">
      ${heroSection}
      <div class="divider"></div>
      <section style="padding: 40px 0;">
        <div class="block-label">Разделы</div>
        <div class="sections-list" id="sections-list"></div>
      </section>
      <section style="padding: 0 0 40px;">
        <div class="metrics-grid">
          <div class="metric-cell">
            <div class="metric-value">3</div>
            <div class="metric-label">Пиццерий</div>
          </div>
          <div class="metric-cell">
            <div class="metric-value">47</div>
            <div class="metric-label">Сотрудников</div>
          </div>
          <div class="metric-cell">
            <div class="metric-value accent">12</div>
            <div class="metric-label">Документов</div>
          </div>
        </div>
      </section>
    </div>
  `;

  const list = page.querySelector('#sections-list')!;
  NAV_ITEMS.forEach(item => list.appendChild(buildSectionRow(item)));

  return page;
}
