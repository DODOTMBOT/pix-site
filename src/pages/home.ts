import { navigate } from '../router';
import { getHomeSettings } from '../services/storage';
import type { HomeBlock } from '../types';

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
  min-height: 280px;
}

.photo-card {
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
  display: block;
}

.carousel-empty {
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
}

@keyframes carouselSpin {
  from { transform: rotate(var(--start-rotate, 0deg)) translateY(var(--start-y, 0px)); }
  to   { transform: rotate(calc(var(--start-rotate, 0deg) + 360deg)) translateY(var(--start-y, 0px)); }
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

const SIZES = [
  { w: 110, h: 148, rotate: -6, y: 10,  opacity: 0.60 },
  { w: 130, h: 173, rotate: -3, y: 5,   opacity: 0.75 },
  { w: 150, h: 198, rotate: -1, y: 0,   opacity: 0.90 },
  { w: 170, h: 226, rotate:  0, y: -8,  opacity: 1.00 },
  { w: 150, h: 198, rotate:  1, y: 0,   opacity: 0.90 },
  { w: 130, h: 173, rotate:  3, y: 5,   opacity: 0.75 },
  { w: 110, h: 148, rotate:  6, y: 10,  opacity: 0.60 },
];

const PLACEHOLDER_ICONS  = ['🍕', '👥', '📋', '🔑', '📖', '⭐', '🚀'];
const PLACEHOLDER_COLORS = ['#f3f4f6', '#fef3c7', '#dbeafe', '#d1fae5', '#fce7f3', '#ede9fe', '#e0f2fe'];

function buildCarousel(allPhotos: string[]): HTMLElement {
  const section = document.createElement('section');
  section.className = 'photos-section';

  const carousel = document.createElement('div');
  carousel.className = 'photos-carousel';
  section.appendChild(carousel);

  let offset = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function getVisible(): string[] {
    const count = Math.min(7, Math.max(allPhotos.length, 7));
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      if (allPhotos.length > 0) {
        result.push(allPhotos[(offset + i) % allPhotos.length]);
      } else {
        result.push('');
      }
    }
    return result;
  }

  function renderCards(): void {
    const visible = getVisible();
    carousel.innerHTML = visible.map((src, i) => {
      const s = SIZES[i] ?? SIZES[3];
      const imgContent = src
        ? `<img src="${src}" alt="Фото">`
        : `<div class="photo-placeholder" style="background:${PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length]};width:${s.w}px;height:${s.h}px;">${PLACEHOLDER_ICONS[i % PLACEHOLDER_ICONS.length]}</div>`;
      return `<div class="photo-card" style="
        width:${s.w}px;height:${s.h}px;
        transform:rotate(${s.rotate}deg) translateY(${s.y}px);
        opacity:${s.opacity};
        --start-rotate:${s.rotate}deg;
        --start-y:${s.y}px;
        transition:transform 0.5s ease, opacity 0.5s ease;
      ">${imgContent}</div>`;
    }).join('');
  }

  function start(): void {
    if (allPhotos.length <= 1) return;
    timer = setInterval(() => {
      offset = (offset + 1) % allPhotos.length;
      renderCards();
    }, 3000);
  }

  function stop(): void {
    if (timer !== null) { clearInterval(timer); timer = null; }
  }

  renderCards();
  start();

  section.addEventListener('mouseenter', () => {
    stop();
    carousel.querySelectorAll<HTMLElement>('.photo-card').forEach(card => {
      card.style.animation = 'carouselSpin 6s linear infinite';
    });
  });

  section.addEventListener('mouseleave', () => {
    carousel.querySelectorAll<HTMLElement>('.photo-card').forEach(card => {
      card.style.animation = '';
    });
    start();
  });

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
