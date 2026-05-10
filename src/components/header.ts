import { navigate } from '../router';
import { getUser, logout, isManagement, isSuperAdmin, roleLabel } from '../services/auth';
import { toggleTheme, updateToggleButton } from '../services/theme';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IC = {
  home:       `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0L0 6.5V16h6v-5h4v5h6V6.5L8 0zm0 1.8 5.5 4.7V15H10v-5H6v5H2.5V6.5L8 1.8z"/></svg>`,
  motivation: `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M0 12 4 8l3 3 4.5-6L13 7l1-1L9.5 1.5 8.8 3 11 5 6.5 11 3.5 8 0 12zm0 2h16v1H0v-1z"/></svg>`,
  rates:      `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4h1v.9c1 .2 1.8 1 1.8 2 0 1.1-.9 2-2.3 2-.8 0-1.5-.3-2-.8l.7-.8c.4.3.8.5 1.3.5.7 0 1.1-.3 1.1-.8 0-.4-.4-.7-1.1-.7H7V6.4h.4c.7 0 1.1-.3 1.1-.7 0-.4-.3-.7-.9-.7-.5 0-.9.2-1.2.5l-.7-.8c.4-.5 1-.8 1.8-.9V3h1v1z"/></svg>`,
  calendar:   `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M5 0v1H1a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-4V0h-1v1H6V0H5zm-4 5h14v9H1V5zm1-3h3v1h1V2h4v1h1V2h3v2H1V2zm2 4h2v2H3V6zm4 0h2v2H7V6zm4 0h2v2h-2V6zM3 10h2v2H3v-2zm4 0h2v2H7v-2z"/></svg>`,
  building:   `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M2 1v14h12V1H2zm1 1h10v12H3V2zm2 2v2h2V4H5zm4 0v2h2V4H9zM5 8v2h2V8H5zm4 0v2h2V8H9zM5 12v2h2v-2H5zm4 0v2h2v-2H9z"/></svg>`,
  users:      `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M7 7A3 3 0 1 0 7 1a3 3 0 0 0 0 6zm0-5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c-3 0-5 1.8-5 4h1c0-1.7 1.7-3 4-3s4 1.3 4 3h1c0-2.2-2-4-5-4zm4.5-4A2.5 2.5 0 1 0 11.5 9a2.5 2.5 0 0 0 0-5zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 4c-1 0-1.9.4-2.5 1 .7.4 1.3.9 1.6 1.5H11c1.7 0 3 1 3 2.5h1c0-2-1.6-3.5-3.5-3.5z"/></svg>`,
  key:        `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M3.5 5A4.5 4.5 0 0 0 8 9.5 4.5 4.5 0 0 0 3.5 5zm0 1A3.5 3.5 0 1 1 7 9.5 3.5 3.5 0 0 1 3.5 6zM6.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.8.7 5.2 5.2-1.5 1.5-1.5-1.5-1 1-1.5-1.5-1.5 1.5-1.5-1.5L9 11l1-1-1.5-1.5 1.8-1.8z"/></svg>`,
  person:     `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c-3 0-5 1.8-5 4h10c0-2.2-2-4-5-4z"/></svg>`,
  layers:     `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0 .5 4 8 8l7.5-4L8 0zm0 1.3 6 3.2-6 3.2L2 4.5 8 1.3zM.5 8 8 12l7.5-4-1-.6L8 10.7l-6.5-3.3-1 .6zm0 4L8 16l7.5-4-1-.6L8 14.7l-6.5-3.3-1 .6z"/></svg>`,
  gear:       `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm5.1-.6-.5-1.2 1.9-1.3L13 1.4 11 2.8l-1.2-.5L9.5.5H6.5L6.2 2.3 5 2.8 3 1.4 1.5 2.9l1.4 1.9-.5 1.2L.5 6.4v3.2l1.9.3.5 1.2-1.4 1.9 1.5 1.5L5 13.2l1.2.5.3 1.8h3l.3-1.8 1.2-.5 2 1.3 1.5-1.5-1.4-1.9.5-1.2 1.9-.3V6.4l-1.9-.3zm.9 3.2-1.8.3-.3.8-.1.4-1 .4.2.3 1.3 1.7-.9.9-1.7-1.3-.4.2-1 .4-.1.3-.3 1.8H5.6l-.3-1.8-.1-.3-1-.4-.4.2-1.7 1.3-.9-.9 1.3-1.7.2-.3-.4-1-.1-.4-1.8-.3V6.9l1.8-.3.1-.4.4-1-.2-.3L1.2 3.2l.9-.9L3.8 4l.4-.2 1-.4.1-.3.3-1.8h2.8l.3 1.8.1.3 1 .4.4-.2 1.7-1.3.9.9-1.3 1.7-.2.3.4 1 .1.4 1.8.3v2.2z"/></svg>`,
  review:     `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M2 1v14h12V1H2zm1 1h10v12H3V2zm2 2v1h6V4H5zm0 3v1h6V7H5zm0 3v1h4v-1H5z"/></svg>`,
  logout:     `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M10 3.5 8.5 5l2.5 2.5H5v1h6L8.5 11 10 12.5 14 8l-4-4.5zM2 2h5V1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5v-1H2V2z"/></svg>`,
  moon:       `<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M6 .278a.768.768 0 0 1 .08.858A7.208 7.208 0 0 0 5.202 4.6c0 4.02 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>`,
};

// ── Nav links for regular users ───────────────────────────────────────────────
const NAV_LINKS: { label: string; path: string; managementPath?: string; managerOnly?: boolean }[] = [
  { label: 'Регламенты', path: '/regulations' },
  { label: 'Инструкции', path: '/instructions' },
  { label: 'Ставки',     path: '/rates' },
  { label: 'График',     path: '/schedule', managementPath: '/schedule/overview' },
  { label: 'Структура',  path: '/org' },
  { label: 'Доступы',    path: '/access' },
  { label: 'Контакты',   path: '/contacts' },
  { label: 'Мотивация',  path: '/motivation', managerOnly: true },
];

// ── Active item detection ─────────────────────────────────────────────────────
function getActiveId(): string {
  const path = window.location.pathname;
  const hash = window.location.hash.slice(1);

  if (path === '/schedule/overview' || path === '/schedule') return 'schedule';
  if (path === '/org')                              return 'org';
  if (path.startsWith('/admin/employee'))           return 'employees';
  if (path.startsWith('/admin/department'))         return 'departments';
  if (path.startsWith('/admin/access'))             return 'access';
  if (path.startsWith('/admin/rates'))              return 'rates';
  if (path.startsWith('/admin/contacts'))           return 'contacts';
  if (path === '/admin/motivation/review')          return 'motivation-review';
  if (path.startsWith('/admin/motivation'))         return 'motivation';
  if (path.startsWith('/admin/users'))              return 'users';
  if (path === '/admin/home')                       return 'home';
  if (path === '/admin') return hash || 'motivation';
  return '';
}

// ── Sidebar builder ───────────────────────────────────────────────────────────
function buildSidebar(onUpdate: (newNav: HTMLElement) => void): HTMLElement {
  const aside = document.createElement('aside');
  aside.className = 'admin-sidebar';

  // Logo
  const logo = document.createElement('div');
  logo.className = 'sidebar-logo';
  logo.innerHTML = `<div class="logo-mark" style="font-size:18px;font-weight:900;color:#f97316;cursor:pointer;">PiX</div><span>Панель управления</span>`;
  logo.querySelector('.logo-mark')!.addEventListener('click', () => navigate('/'));
  aside.appendChild(logo);

  // Nav (rebuilt on navigation)
  function buildNav(): HTMLElement {
    const activeId = getActiveId();
    const nav      = document.createElement('nav');
    nav.className  = 'sidebar-nav';

    const makeItem = (id: string, label: string, icon: string, onClick: () => void): HTMLElement => {
      const el = document.createElement('a');
      el.className = `sidebar-item${activeId === id ? ' active' : ''}`;
      el.innerHTML = `<span class="sidebar-icon">${icon}</span><span>${label}</span>`;
      el.addEventListener('click', e => { e.preventDefault(); onClick(); });
      return el;
    };

    const makeGroup = (
      groupId: string,
      label: string,
      items: Array<{ id: string; label: string; icon: string; onClick: () => void }>,
    ): HTMLElement => {
      const hasActive = items.some(i => getActiveId() === i.id);
      const groupEl  = document.createElement('div');
      groupEl.className = 'sidebar-group';

      const toggle = document.createElement('button');
      toggle.className = `sidebar-group-toggle${hasActive ? ' open' : ''}`;
      toggle.dataset['group'] = groupId;
      toggle.innerHTML = `<span>${label}</span><span class="toggle-arrow">›</span>`;

      const itemsEl = document.createElement('div');
      itemsEl.className = `sidebar-group-items${hasActive ? ' open' : ''}`;
      itemsEl.id = `group-${groupId}`;
      items.forEach(i => itemsEl.appendChild(makeItem(i.id, i.label, i.icon, i.onClick)));

      toggle.addEventListener('click', () => {
        const isOpen = itemsEl.classList.contains('open');
        nav.querySelectorAll('.sidebar-group-items').forEach(el => el.classList.remove('open'));
        nav.querySelectorAll('.sidebar-group-toggle').forEach(el => el.classList.remove('open'));
        if (!isOpen) { itemsEl.classList.add('open'); toggle.classList.add('open'); }
      });

      groupEl.appendChild(toggle);
      groupEl.appendChild(itemsEl);
      return groupEl;
    };

    const goTab = (tab: string) => navigate(`/admin#${tab}`);

    nav.appendChild(makeItem('home', 'Главная', IC.home, () => goTab('home')));

    nav.appendChild(makeGroup('finance', 'Финансы', [
      { id: 'motivation',        label: 'Мотивация',             icon: IC.motivation, onClick: () => goTab('motivation') },
      { id: 'motivation-review', label: 'Проверить результаты',  icon: IC.review,     onClick: () => navigate('/admin/motivation/review') },
      { id: 'rates',             label: 'Ставки',                icon: IC.rates,      onClick: () => goTab('rates') },
    ]));

    nav.appendChild(makeGroup('managers', 'Управляющие', [
      { id: 'schedule', label: 'График управляющих', icon: IC.calendar, onClick: () => navigate('/schedule/overview') },
    ]));

    nav.appendChild(makeGroup('pix', 'PiX', [
      { id: 'org',      label: 'Структура', icon: IC.building, onClick: () => navigate('/org')       },
      { id: 'contacts', label: 'Контакты',  icon: IC.users,    onClick: () => goTab('contacts')      },
      { id: 'access',   label: 'Доступы',   icon: IC.key,      onClick: () => goTab('access')        },
    ]));

    if (isSuperAdmin()) {
      nav.appendChild(makeGroup('system', 'Система', [
        { id: 'employees',   label: 'Сотрудники',   icon: IC.person,  onClick: () => goTab('employees')   },
        { id: 'departments', label: 'Отделы',        icon: IC.layers,  onClick: () => goTab('departments') },
        { id: 'users',       label: 'Пользователи',  icon: IC.gear,    onClick: () => goTab('users')       },
      ]));
    }

    return nav;
  }

  let navEl = buildNav();
  aside.appendChild(navEl);

  // Re-render nav on navigation
  const navListener = () => {
    const newNav = buildNav();
    aside.replaceChild(newNav, navEl);
    navEl = newNav;
    onUpdate(newNav);
  };
  window.addEventListener('pix:navigate' as any, navListener);

  // Footer: user info + theme + logout
  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';

  const u = getUser()!;
  const userInfo = document.createElement('div');
  userInfo.style.cssText = 'padding:8px 10px 4px;';
  userInfo.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:var(--text-primary);">${u.name}</div>
    <div style="font-size:11px;color:#9ca3af;">${roleLabel(u.role)}</div>
  `;
  footer.appendChild(userInfo);

  const themeBtn = document.createElement('button');
  themeBtn.id = 'theme-toggle';
  themeBtn.className = 'sidebar-item';
  themeBtn.innerHTML = `<span class="sidebar-icon">${IC.moon}</span><span>Тема</span>`;
  themeBtn.addEventListener('click', () => toggleTheme());
  updateToggleButton();
  footer.appendChild(themeBtn);

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'sidebar-item';
  logoutBtn.innerHTML = `<span class="sidebar-icon">${IC.logout}</span><span>Выйти</span>`;
  logoutBtn.addEventListener('click', () => { logout(); renderHeader(); navigate('/login'); });
  footer.appendChild(logoutBtn);

  aside.appendChild(footer);
  return aside;
}

// ── Horizontal header ─────────────────────────────────────────────────────────
function buildHorizontalHeader(_container: HTMLElement): HTMLElement {
  const header = document.createElement('header');

  function render(): void {
    const user    = getUser();
    const curPath = window.location.pathname;
    const mgmt    = isManagement();

    const navHtml = NAV_LINKS
      .filter(l => !(l.managerOnly && mgmt))
      .map(l => {
        const path   = mgmt && l.managementPath ? l.managementPath : l.path;
        const active = curPath === path || curPath === l.path;
        return `<button class="header-nav-link${active ? ' active' : ''}" data-path="${path}">${l.label}</button>`;
      }).join('');

    const userArea = user
      ? `<div class="header-right">
           <button id="theme-toggle" class="theme-btn" title="Тема">${IC.moon}</button>
           ${isManagement() ? `<button class="btn btn-ghost" style="font-size:13px;padding:6px 12px;" id="header-admin">Панель</button>` : ''}
           <div style="text-align:right;line-height:1.3;">
             <div class="user-name">${user.name}</div>
             <div class="user-role">${roleLabel(user.role)}</div>
           </div>
           <button class="btn btn-outline" style="padding:7px 14px;font-size:13px;" id="header-logout">Выйти</button>
         </div>`
      : `<div class="header-right">
           <button id="theme-toggle" class="theme-btn" title="Тема">${IC.moon}</button>
           <button class="btn btn-primary" style="padding:8px 18px;font-size:14px;" id="header-login">Войти</button>
         </div>`;

    header.innerHTML = `
      <div class="header-inner">
        <div class="header-logo" id="header-logo">
          <div class="logo-mark">PiX</div>
          <div>
            <span class="logo-name">PiX</span>
            <span class="logo-sub">Dodo Pizza · Внутренняя сеть</span>
          </div>
        </div>
        <nav class="header-nav">${navHtml}</nav>
        ${userArea}
      </div>
    `;

    header.querySelector('#header-logo')!.addEventListener('click', () => navigate('/'));
    header.querySelectorAll<HTMLButtonElement>('.header-nav-link').forEach(btn => {
      btn.addEventListener('click', () => { navigate(btn.dataset['path']!); render(); });
    });
    const themeBtn = header.querySelector('#theme-toggle');
    if (themeBtn) { updateToggleButton(); themeBtn.addEventListener('click', () => toggleTheme()); }
    header.querySelector('#header-login')?.addEventListener('click', () => navigate('/login'));
    header.querySelector('#header-admin')?.addEventListener('click', () => navigate('/admin'));
    header.querySelector('#header-logout')?.addEventListener('click', () => {
      logout();
      renderHeader();  // triggers container re-render
      navigate('/login');
    });

    window.addEventListener('pix:navigate' as any, render, { once: true });
  }

  render();

  // Expose re-render for container
  (header as any).__rerender = () => render();
  return header;
}

// ── Main export ───────────────────────────────────────────────────────────────
let _container: HTMLElement | null = null;

export function renderHeader(): HTMLElement {
  if (!_container) {
    _container = document.createElement('div');
    _container.id = 'header-root';
  }
  _buildHeader();
  return _container;
}

function _buildHeader(): void {
  if (!_container) return;
  const user = getUser();
  const mgmt = isManagement();

  if (user && mgmt) {
    document.body.classList.add('sidebar-mode');
    _container.innerHTML = '';
    const sidebar = buildSidebar(() => {/* nav updated */});
    _container.appendChild(sidebar);
  } else {
    document.body.classList.remove('sidebar-mode');
    _container.innerHTML = '';
    const header = buildHorizontalHeader(_container);
    _container.appendChild(header);
  }
}
