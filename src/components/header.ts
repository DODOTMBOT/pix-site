import { navigate } from '../router';
import { getUser, logout, isManagement, isSuperAdmin, roleLabel } from '../services/auth';
import { canRead } from '../services/permissions';
import { getAllPizzerias, getActivePizzeriaId, setActivePizzeria } from '../services/pizzeriaContext';
import { toggleTheme, updateToggleButton } from '../services/theme';

const IC = {
  home:        `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0L0 6.5V16h6v-5h4v5h6V6.5L8 0zm0 1.8 5.5 4.7V15H10v-5H6v5H2.5V6.5L8 1.8z"/></svg>`,
  pizza:       `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M2 1v14h12V1H2zm1 1h10v12H3V2zm2 2v2h2V4H5zm4 0v2h2V4H9zM5 8v2h2V8H5zm4 0v2h2V8H9zM5 12v2h2v-2H5zm4 0v2h2v-2H9z"/></svg>`,
  users:       `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M7 7A3 3 0 1 0 7 1a3 3 0 0 0 0 6zm0-5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c-3 0-5 1.8-5 4h1c0-1.7 1.7-3 4-3s4 1.3 4 3h1c0-2.2-2-4-5-4zm4.5-4A2.5 2.5 0 1 0 11.5 9a2.5 2.5 0 0 0 0-5zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 4c-1 0-1.9.4-2.5 1 .7.4 1.3.9 1.6 1.5H11c1.7 0 3 1 3 2.5h1c0-2-1.6-3.5-3.5-3.5z"/></svg>`,
  contacts:    `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm4 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM5 9c-1.1 0-2 .7-2 2h1c0-.4.5-.8 1-1v-.1C5 9.4 6 9 8 9s3 .4 3 .9V10c.5.2 1 .6 1 1h1c0-1.3-.9-2-2-2H5z"/></svg>`,
  rates:       `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M1 2v12h14V2H1zm1 1h12v10H2V3zm2 2v1h8V5H4zm0 3v1h5V8H4zm0 3v1h3v-1H4z"/></svg>`,
  credentials: `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 1a4 4 0 0 0-4 4 4 4 0 0 0 .3 1.5L1 9.8V14h3v-1h1v-1h2v-1.2A4 4 0 0 0 8 11a4 4 0 0 0 4-4 4 4 0 0 0-4-4zm0 1a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-1-.2L3.5 10.4V13H2v-2.8l3.4-3.4A3 3 0 0 1 5 5a3 3 0 0 1 3-3zm1.5 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>`,
  motivation:  `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 1l2 5h5l-4 3 1.5 5L8 11 3.5 14 5 9 1 6h5L8 1z"/></svg>`,
  schedule:    `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M4 1v1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2V1h-1v1H5V1H4zm0 2h1v1h1V3h4v1h1V3h2v2H2V3h2zm-2 3h10v7H2V6zm2 1v1h1V7H4zm3 0v1h1V7H7zm3 0v1h1V7h-1zM4 10v1h1v-1H4zm3 0v1h1v-1H7z"/></svg>`,
  logout:      `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M10 3.5 8.5 5l2.5 2.5H5v1h6L8.5 11 10 12.5 14 8l-4-4.5zM2 2h5V1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5v-1H2V2z"/></svg>`,
  moon:        `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M6 .278a.768.768 0 0 1 .08.858A7.208 7.208 0 0 0 5.202 4.6c0 4.02 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>`,
};

// ── Pizzeria switcher ──────────────────────────────────────────────────────────
function buildPizzeriaSwitcher(style: 'inline' | 'block'): HTMLElement {
  const wrap = document.createElement('div');
  const pizzerias  = getAllPizzerias();
  const activeId   = getActivePizzeriaId();

  if (pizzerias.length === 0) {
    wrap.style.cssText = 'font-size:12px;color:var(--text-muted);padding:4px 2px;';
    wrap.textContent = 'Пиццерий нет';
    return wrap;
  }

  if (pizzerias.length === 1) {
    wrap.style.cssText = style === 'inline'
      ? 'font-size:13px;font-weight:600;color:var(--text-primary);'
      : 'font-size:12px;color:var(--text-primary);padding:4px 2px;';
    wrap.textContent = pizzerias[0].name;
    return wrap;
  }

  const sel = document.createElement('select');
  sel.style.cssText = style === 'inline'
    ? 'background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);padding:5px 8px;font-size:13px;color:var(--text-primary);font-family:inherit;cursor:pointer;'
    : 'width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:12px;color:var(--text-primary);font-family:inherit;cursor:pointer;margin-top:4px;';

  pizzerias.forEach(p => {
    const opt = document.createElement('option');
    opt.value    = String(p.id);
    opt.textContent = p.name;
    opt.selected = p.id === activeId;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    setActivePizzeria(parseInt(sel.value, 10));
    navigate(window.location.pathname);
  });

  wrap.appendChild(sel);
  return wrap;
}

// ── Sidebar (superadmin / management) ─────────────────────────────────────────
function buildSidebar(): HTMLElement {
  const aside = document.createElement('aside');
  aside.className = 'admin-sidebar';

  // Logo
  const logo = document.createElement('div');
  logo.className = 'sidebar-logo';
  logo.innerHTML = `
    <div class="logo-mark" style="cursor:pointer;background:#1C1C1E;border-radius:10px;padding:4px 8px;display:inline-flex;align-items:center;">
      <svg viewBox="0 0 54 28" width="54" height="28" xmlns="http://www.w3.org/2000/svg">
        <!-- P -->
        <path d="M2 3h8c3.5 0 5.5 2 5.5 5s-2 4.8-5.5 4.8H6v5.2H2V3zm4 6.5h3.5c1.2 0 1.8-.6 1.8-1.5s-.6-1.5-1.8-1.5H6v3z" fill="#FF6900"/>
        <!-- i stem -->
        <rect x="20" y="7" width="4" height="11" rx="2" fill="#FF6900"/>
        <!-- i dot: mini pie chart -->
        <g transform="translate(22,3.5)">
          <path d="M0,0 L0,-3 A3,3 0 0,1 2.12,-2.12 Z" fill="#FF6900"/>
          <path d="M0,0 L2.12,-2.12 A3,3 0 1,1 0,-3 Z" fill="#FF6900" opacity="0.5"/>
        </g>
        <!-- X -->
        <path d="M29 3l5.5 8L29 18h4.5l3-4.8 3 4.8H44l-5.5-7L44 3h-4.5L36.5 8 33.5 3z" fill="#FF6900"/>
      </svg>
    </div>
    <span>Панель управления</span>
  `;
  logo.querySelector('.logo-mark')!.addEventListener('click', () => navigate('/'));
  aside.appendChild(logo);

  function buildNav(): HTMLElement {
    const curPath = window.location.pathname;

    const isActive = (path: string) =>
      path === '/' ? curPath === '/' : curPath === path || curPath.startsWith(path + '/');

    const makeItem = (label: string, path: string, icon: string): HTMLElement => {
      const el = document.createElement('a');
      el.className = `sidebar-item${isActive(path) ? ' active' : ''}`;
      el.href = path;
      el.innerHTML = `<span class="sidebar-icon">${icon}</span><span>${label}</span>`;
      el.addEventListener('click', e => { e.preventDefault(); navigate(path); });
      return el;
    };

    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';
    nav.appendChild(makeItem('Главная', '/', IC.home));
    if (isManagement() || canRead('pizzerias'))                  nav.appendChild(makeItem('Пиццерии',  '/pizzerias',   IC.pizza));
    if (isSuperAdmin())                                          nav.appendChild(makeItem('Пользователи', '/users',   IC.users));
    if (canRead('contacts'))                                     nav.appendChild(makeItem('Контакты',  '/contacts',    IC.contacts));
    if (canRead('rates'))                                        nav.appendChild(makeItem('Ставки',    '/rates',       IC.rates));
    if (canRead('credentials'))                                  nav.appendChild(makeItem('Доступы',   '/credentials', IC.credentials));
    if (canRead('motivation'))                                   nav.appendChild(makeItem('Мотивация', '/motivation',  IC.motivation));
    if (canRead('schedules_own') || canRead('schedules_all'))    nav.appendChild(makeItem('Графики',   '/schedule',    IC.schedule));
    if (isSuperAdmin())                                          nav.appendChild(makeItem('Роли',      '/roles',       IC.users));
    return nav;
  }

  function buildFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';

    // Pizzeria switcher
    const switcherLabel = document.createElement('div');
    switcherLabel.style.cssText = 'font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;padding:0 2px 4px;';
    switcherLabel.textContent = 'Активная пиццерия';
    footer.appendChild(switcherLabel);
    footer.appendChild(buildPizzeriaSwitcher('block'));

    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:var(--border);margin:10px 0;';
    footer.appendChild(divider);

    const u = getUser()!;
    const userInfo = document.createElement('div');
    userInfo.style.cssText = 'padding:0 2px 8px;';
    const displayRole = u.jobTitle || roleLabel(u.role);
    userInfo.innerHTML = `
      <div style="font-size:12px;font-weight:600;color:var(--text-primary);">${u.name}</div>
      <div style="font-size:11px;color:var(--text-muted);">${displayRole}</div>
    `;
    footer.appendChild(userInfo);

    const themeBtn = document.createElement('button');
    themeBtn.id        = 'theme-toggle';
    themeBtn.className = 'sidebar-item';
    themeBtn.title     = 'Тема';
    themeBtn.innerHTML = `<span class="sidebar-icon theme-icon-slot">${IC.moon}</span><span>Тема</span>`;
    themeBtn.addEventListener('click', toggleTheme);
    footer.appendChild(themeBtn);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'sidebar-item';
    logoutBtn.innerHTML = `<span class="sidebar-icon">${IC.logout}</span><span>Выйти</span>`;
    logoutBtn.addEventListener('click', () => {
      logout();
      rebuildHeader();
      navigate('/login');
    });
    footer.appendChild(logoutBtn);

    return footer;
  }

  let nav    = buildNav();
  let footer = buildFooter();
  aside.appendChild(nav);
  aside.appendChild(footer);

  window.addEventListener('pix:navigate' as any, () => {
    const newNav = buildNav();
    aside.replaceChild(newNav, nav);
    nav = newNav;
  });

  window.addEventListener('pix:pizzeria-changed', () => {
    const newFooter = buildFooter();
    aside.replaceChild(newFooter, footer);
    footer = newFooter;
    updateToggleButton();
  });

  return aside;
}

// ── Container ──────────────────────────────────────────────────────────────────
let _container: HTMLElement | null = null;

export function renderHeader(): HTMLElement {
  if (!_container) {
    _container = document.createElement('div');
    _container.id = 'header-root';
  }
  rebuildHeader();
  return _container;
}

export function rebuildHeader(): void {
  if (!_container) return;
  _container.innerHTML = '';

  if (!getUser()) {
    document.body.classList.remove('sidebar-mode');
    return;
  }

  document.body.classList.add('sidebar-mode');
  _container.appendChild(buildSidebar());
  updateToggleButton();
}
