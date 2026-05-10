import { navigate } from '../router';
import { getHomeSettings } from '../services/storage';
import type { HomeBlock } from '../types';

const PLACEHOLDER_ICONS = ['🍕', '👥', '📋', '🔑', '📖', '⭐', '🚀'];
const PLACEHOLDER_COLORS = ['#f3f4f6', '#fef3c7', '#dbeafe', '#d1fae5', '#fce7f3', '#ede9fe', '#e0f2fe'];

// ─── Styles injected once ─────────────────────────────────────────────────────

const HOME_CSS = `
.home-page {
  background: #ffffff;
  color: #111111;
  overflow-x: hidden;
}

/* HERO */
.hero-section {
  text-align: center;
  padding: 90px 40px 48px;
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-family: 'Syne', sans-serif;
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: #111111;
  margin-bottom: 20px;
  white-space: pre-line;
}

.hero-sub {
  font-size: 17px;
  color: #6b7280;
  line-height: 1.65;
  max-width: 500px;
  margin: 0 auto 36px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #111111;
  color: white;
  padding: 14px 28px;
  border-radius: 100px;
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
}

.btn-hero-primary:hover {
  background: #f97316;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(249,115,22,0.3);
}

/* CAROUSEL */
.photos-section {
  padding: 20px 0 64px;
  overflow: hidden;
}

.photos-carousel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 40px;
}

.photo-card {
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.photo-card:nth-child(1) { width: 120px; height: 160px; transform: rotate(-6deg) translateY(10px); opacity: 0.65; }
.photo-card:nth-child(2) { width: 140px; height: 185px; transform: rotate(-3deg) translateY(5px); opacity: 0.8; }
.photo-card:nth-child(3) { width: 160px; height: 210px; transform: rotate(-1deg) translateY(2px); opacity: 0.92; }
.photo-card:nth-child(4) { width: 185px; height: 245px; transform: rotate(0deg); opacity: 1; z-index: 2; }
.photo-card:nth-child(5) { width: 160px; height: 210px; transform: rotate(1deg) translateY(2px); opacity: 0.92; }
.photo-card:nth-child(6) { width: 140px; height: 185px; transform: rotate(3deg) translateY(5px); opacity: 0.8; }
.photo-card:nth-child(7) { width: 120px; height: 160px; transform: rotate(6deg) translateY(10px); opacity: 0.65; }

.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

/* FEATURES */
.features-section {
  padding: 16px 40px 64px;
  max-width: 1100px;
  margin: 0 auto;
  border-top: 1px solid #f3f4f6;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  text-align: center;
  padding-top: 48px;
}

.feature-item { padding: 8px; }

.feature-icon {
  font-size: 30px;
  margin-bottom: 14px;
}

.feature-item h3 {
  font-family: 'Syne', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #111111;
  margin-bottom: 8px;
}

.feature-item p {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

/* BLOCKS */
.blocks-section {
  padding: 64px 40px 80px;
  max-width: 1100px;
  margin: 0 auto;
}

.blocks-title {
  font-family: 'Syne', sans-serif;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  color: #111111;
  margin-bottom: 12px;
  line-height: 1.15;
}

.blocks-sub {
  text-align: center;
  font-size: 15px;
  color: #6b7280;
  margin-bottom: 40px;
  line-height: 1.6;
}

.blocks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 220px;
  gap: 16px;
}

.block-card {
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  display: block;
  text-decoration: none;
}

.block-card.large { grid-column: span 2; }
.block-card.small { grid-column: span 1; }

.block-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.18);
}

.block-card-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.4s ease;
}

.block-card:hover .block-card-bg {
  transform: scale(1.05);
}

.block-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
}

.block-card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  color: white;
}

.block-card-content h3 {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
  line-height: 1.2;
}

.block-card-content p {
  font-size: 13px;
  opacity: 0.82;
  line-height: 1.45;
}

@media (max-width: 768px) {
  .hero-title { font-size: 36px; }
  .blocks-grid { grid-template-columns: 1fr; }
  .block-card.large, .block-card.small { grid-column: span 1; }
  .features-grid { grid-template-columns: 1fr; gap: 24px; }
}
`;

function injectStyles(): void {
  if (document.getElementById('home-styles')) return;
  const style = document.createElement('style');
  style.id = 'home-styles';
  style.textContent = HOME_CSS;
  document.head.appendChild(style);
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

function buildCarousel(photos: string[]): HTMLElement {
  const section = document.createElement('section');
  section.className = 'photos-section';

  const carousel = document.createElement('div');
  carousel.className = 'photos-carousel';

  const COUNT = 7;
  const ROTATIONS  = [-6, -3, -1, 0, 1, 3, 6];
  const TRANSLATES = [10,  5,  2, 0, 2, 5, 10];

  for (let i = 0; i < COUNT; i++) {
    const card = document.createElement('div');
    card.className = 'photo-card';

    const rot = ROTATIONS[i]  ?? 0;
    const ty  = TRANSLATES[i] ?? 0;
    card.style.setProperty('--rot', `${rot}deg`);
    card.style.setProperty('--ty',  `${ty}px`);

    if (photos[i]) {
      card.innerHTML = `<img src="${photos[i]}" alt="Фото">`;
    } else {
      const ph = document.createElement('div');
      ph.className = 'photo-placeholder';
      ph.style.background = PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length];
      ph.textContent = PLACEHOLDER_ICONS[i % PLACEHOLDER_ICONS.length];
      card.appendChild(ph);
    }

    carousel.appendChild(card);
  }

  // Hover: fan-open / fan-close effect
  carousel.addEventListener('mouseenter', () => {
    carousel.querySelectorAll<HTMLElement>('.photo-card').forEach((card, i) => {
      const spread = [-140, -90, -45, 0, 45, 90, 140];
      card.style.transform = `translateX(${spread[i] ?? 0}px) rotate(${ROTATIONS[i] ?? 0}deg) scale(1.04)`;
      card.style.opacity = '1';
    });
  });

  carousel.addEventListener('mouseleave', () => {
    carousel.querySelectorAll<HTMLElement>('.photo-card').forEach(card => {
      card.style.transform = '';
      card.style.opacity = '';
    });
  });

  section.appendChild(carousel);
  return section;
}

// ─── Block card ───────────────────────────────────────────────────────────────

function buildBlockCard(block: HomeBlock): HTMLElement {
  const card = document.createElement('div');
  card.className = `block-card ${block.size}`;

  const bgStyle = block.photo
    ? `background-image: url('${block.photo}'); background-color: ${block.bgColor ?? '#111'};`
    : `background-color: ${block.bgColor ?? '#1a1a1a'};`;

  card.innerHTML = `
    <div class="block-card-bg" style="${bgStyle}"></div>
    <div class="block-card-overlay"></div>
    <div class="block-card-content">
      <h3>${block.title}</h3>
      <p>${block.description}</p>
    </div>
  `;

  card.addEventListener('click', () => {
    if (block.link) navigate(block.link);
  });

  return card;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function renderHome(): HTMLElement {
  injectStyles();

  const settings = getHomeSettings();
  const page = document.createElement('div');
  page.className = 'home-page page-enter';

  // Hero
  const hero = document.createElement('section');
  hero.className = 'hero-section';
  hero.innerHTML = `
    <h1 class="hero-title">${settings.headline.replace(/\n/g, '<br>')}</h1>
    <p class="hero-sub">${settings.subheadline}</p>
    <div class="hero-actions">
      <button class="btn-hero-primary" id="hero-cta">Открыть портал →</button>
    </div>
  `;
  hero.querySelector('#hero-cta')!.addEventListener('click', () => navigate('/org'));
  page.appendChild(hero);

  // Carousel
  page.appendChild(buildCarousel(settings.photos));

  // Features
  const features = document.createElement('section');
  features.className = 'features-section';
  features.innerHTML = `
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">📋</div>
        <h3>Регламенты</h3>
        <p>Стандарты работы, правила, процедуры всегда под рукой</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🔑</div>
        <h3>Ключи доступа</h3>
        <p>Логины и пароли всех систем в одном защищённом месте</p>
      </div>
      <div class="feature-item">
        <div class="feature-icon">👥</div>
        <h3>Команда</h3>
        <p>Оргструктура, контакты и роли всех сотрудников сети</p>
      </div>
    </div>
  `;
  page.appendChild(features);

  // Blocks
  const blocksSection = document.createElement('section');
  blocksSection.className = 'blocks-section';
  blocksSection.innerHTML = `
    <h2 class="blocks-title">Всё необходимое<br>для эффективной работы</h2>
    <p class="blocks-sub">От ставок до регламентов — все инструменты в одном портале</p>
    <div class="blocks-grid" id="blocks-grid"></div>
  `;
  const grid = blocksSection.querySelector('#blocks-grid')!;
  settings.blocks.forEach(block => grid.appendChild(buildBlockCard(block)));
  page.appendChild(blocksSection);

  return page;
}
