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

/* BLOCKS */
.blocks-section {
  padding: 0 40px 80px;
  max-width: 1100px;
  margin: 0 auto;
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
  .hero-section { padding: 60px 24px 32px; }
  .blocks-section { padding: 0 16px 60px; }
  .blocks-grid { grid-template-columns: 1fr; }
  .block-card.large, .block-card.small { grid-column: span 1; }
}
`;

function injectStyles(): void {
  if (document.getElementById('home-styles')) return;
  const style = document.createElement('style');
  style.id = 'home-styles';
  style.textContent = HOME_CSS;
  document.head.appendChild(style);
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

  // Blocks
  const blocksSection = document.createElement('section');
  blocksSection.className = 'blocks-section';
  blocksSection.innerHTML = `<div class="blocks-grid" id="blocks-grid"></div>`;
  const grid = blocksSection.querySelector('#blocks-grid')!;
  settings.blocks.forEach(block => grid.appendChild(buildBlockCard(block)));
  page.appendChild(blocksSection);

  return page;
}
