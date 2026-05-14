import { navigate } from '../router';
import { authFetch, isManagement } from '../services/auth';

interface PizzeriaDetail {
  id:           number;
  name:         string;
  city:         string | null;
  street:       string | null;
  house:        string | null;
  legal_entity: string | null;
  opening_date: string | null;
  manager:      { id: number; name: string } | null;
  curator:      { id: number; name: string; job_title: string | null } | null;
  is_archived:  number;
}

export function renderPizzeriaView(id: string): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';
  page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;

  authFetch(`/api/pizzerias/${id}`)
    .then(r => r.json())
    .then((p: PizzeriaDetail) => page.replaceChildren(buildView(p)))
    .catch(() => {
      page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
    });

  return page;
}

function buildView(p: PizzeriaDetail): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'max-width:900px;';

  const address  = [p.city, p.street, p.house].filter(Boolean).join(', ') || null;
  const openDate = p.opening_date
    ? new Date(p.opening_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // ── Top nav ───────────────────────────────────────────────────────────────────
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;';
  nav.innerHTML = `<button class="btn btn-ghost" id="back-btn">← Пиццерии</button>`;
  if (isManagement()) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-outline';
    editBtn.textContent = 'Редактировать';
    editBtn.addEventListener('click', () => navigate(`/pizzerias/${p.id}/edit`));
    nav.appendChild(editBtn);
  }
  nav.querySelector('#back-btn')!.addEventListener('click', () => navigate('/pizzerias'));
  root.appendChild(nav);

  // ── Hero row: photo + two info cards ─────────────────────────────────────────
  const hero = document.createElement('div');
  hero.style.cssText = 'display:grid;grid-template-columns:260px 1fr 1fr;gap:16px;margin-bottom:16px;';

  // Photo card
  const initials = p.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const photoCard = document.createElement('div');
  photoCard.style.cssText = `
    background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 60%, #1e3a8a 100%);
    border-radius:20px;
    padding:28px 24px 24px;
    display:flex;flex-direction:column;justify-content:flex-end;
    min-height:200px;
    box-shadow:0 8px 24px rgba(37,99,235,0.30);
    position:relative;overflow:hidden;
  `;
  photoCard.innerHTML = `
    <div style="
      position:absolute;top:-20px;right:-20px;
      width:130px;height:130px;border-radius:50%;
      background:rgba(255,255,255,0.07);
    "></div>
    <div style="
      position:absolute;top:16px;right:16px;
      width:70px;height:70px;border-radius:50%;
      background:rgba(255,255,255,0.12);
      display:flex;align-items:center;justify-content:center;
      font-size:22px;font-weight:800;color:rgba(255,255,255,0.9);
      letter-spacing:-0.02em;
    ">${esc(initials)}</div>
    <div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">${esc(p.name)}</div>
    ${p.city ? `<div style="color:rgba(255,255,255,0.65);font-size:13px;margin-bottom:12px;">${esc(p.city)}</div>` : '<div style="margin-bottom:12px;"></div>'}
    ${openDate ? `
      <div style="
        display:inline-flex;align-items:center;gap:6px;
        background:rgba(255,255,255,0.15);
        border-radius:20px;padding:5px 14px;
        font-size:12px;color:#fff;font-weight:600;
        width:fit-content;
      ">С ${esc(openDate)}</div>
    ` : ''}
  `;
  hero.appendChild(photoCard);

  // Team card
  const teamCard = infoCard('Команда', [
    {
      icon: personIcon('#2563eb'),
      label: 'Управляющий',
      value: p.manager?.name ?? '—',
      sub: p.manager ? 'Manager' : '',
    },
    {
      icon: personIcon('#7c3aed'),
      label: 'Куратор ТУ',
      value: p.curator?.name ?? '—',
      sub: p.curator?.job_title ?? '',
    },
  ]);
  hero.appendChild(teamCard);

  // Details card
  const detailsCard = infoCard('Реквизиты', [
    {
      icon: buildingIcon(),
      label: 'Юридическое лицо',
      value: p.legal_entity ?? '—',
      sub: '',
    },
    {
      icon: mapPinIcon(),
      label: 'Адрес',
      value: address ?? '—',
      sub: '',
    },
  ]);
  hero.appendChild(detailsCard);

  root.appendChild(hero);

  // ── Quick-nav tiles ───────────────────────────────────────────────────────────
  const tiles = document.createElement('div');
  tiles.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;';

  const sections: { label: string; sub: string; path: string; color: string }[] = [
    { label: 'Контакты',  sub: 'Поставщики и партнёры', path: '/contacts',    color: '#0ea5e9' },
    { label: 'Ставки',    sub: 'Оклады и тарифы',       path: '/rates',       color: '#10b981' },
    { label: 'Доступы',   sub: 'Логины и пароли',       path: '/credentials', color: '#f59e0b' },
    { label: 'Мотивация', sub: 'Бонусы и правила',      path: '/motivation',  color: '#8b5cf6' },
  ];

  sections.forEach(s => {
    const tile = document.createElement('div');
    tile.style.cssText = `
      background:var(--bg-card);
      border:1px solid var(--border);
      border-radius:16px;
      padding:20px;
      cursor:pointer;
      transition:box-shadow 0.15s,transform 0.15s;
      box-shadow:var(--shadow-sm);
    `;
    tile.innerHTML = `
      <div style="
        width:40px;height:40px;border-radius:12px;
        background:${s.color}18;
        display:flex;align-items:center;justify-content:center;
        margin-bottom:14px;
      ">
        <div style="width:18px;height:18px;border-radius:50%;background:${s.color};opacity:0.85;"></div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:3px;">${s.label}</div>
      <div style="font-size:12px;color:var(--text-muted);">${s.sub}</div>
    `;
    tile.addEventListener('mouseenter', () => {
      tile.style.boxShadow = `0 4px 20px rgba(0,0,0,0.1)`;
      tile.style.transform = 'translateY(-2px)';
    });
    tile.addEventListener('mouseleave', () => {
      tile.style.boxShadow = 'var(--shadow-sm)';
      tile.style.transform = '';
    });
    tile.addEventListener('click', () => navigate(s.path));
    tiles.appendChild(tile);
  });

  root.appendChild(tiles);
  return root;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function infoCard(title: string, items: { icon: string; label: string; value: string; sub: string }[]): HTMLElement {
  const card = document.createElement('div');
  card.style.cssText = `
    background:var(--bg-card);
    border:1px solid var(--border);
    border-radius:20px;
    padding:22px 22px 18px;
    box-shadow:var(--shadow-sm);
    display:flex;flex-direction:column;gap:0;
  `;
  card.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">${esc(title)}</div>`;

  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:12px;padding:${i > 0 ? '12px 0 0' : '0'};${i > 0 ? 'border-top:1px solid var(--border);margin-top:12px;' : ''}`;
    row.innerHTML = `
      <div style="width:36px;height:36px;border-radius:10px;background:var(--bg-hover);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${item.icon}</div>
      <div style="min-width:0;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:1px;">${esc(item.label)}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.value)}</div>
        ${item.sub ? `<div style="font-size:11px;color:var(--text-muted);">${esc(item.sub)}</div>` : ''}
      </div>
    `;
    card.appendChild(row);
  });

  return card;
}

function personIcon(color: string): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" fill="${color}" opacity="0.85"/>
    <path d="M2 13c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="${color}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.85"/>
  </svg>`;
}

function buildingIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="4" width="12" height="10" rx="1.5" stroke="var(--text-muted)" stroke-width="1.4"/>
    <path d="M5 14V10h6v4" stroke="var(--text-muted)" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M5 7h1M8 7h1M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4" stroke="var(--text-muted)" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
}

function mapPinIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5z" stroke="var(--text-muted)" stroke-width="1.4"/>
    <circle cx="8" cy="6" r="1.5" fill="var(--text-muted)"/>
  </svg>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
