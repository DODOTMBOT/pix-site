import { navigate } from '../router';
import { getUser, logout, isManagement, roleLabel } from '../services/auth';
import { toggleTheme, updateToggleButton } from '../services/theme';

const NAV_LINKS = [
  { label: 'Регламенты', path: '/regulations' },
  { label: 'Инструкции', path: '/instructions' },
  { label: 'Ставки',     path: '/rates' },
  { label: 'Структура',  path: '/org' },
  { label: 'Доступы',    path: '/access' },
  { label: 'Контакты',   path: '/contacts' },
];

export function renderHeader(): HTMLElement {
  const header = document.createElement('header');

  function render(): void {
    const user = getUser();
    const curPath = window.location.pathname;

    const navHtml = NAV_LINKS.map(l =>
      `<button class="header-nav-link${curPath === l.path ? ' active' : ''}" data-path="${l.path}">${l.label}</button>`
    ).join('');

    const userArea = user
      ? `
        <div class="header-right">
          <button id="theme-toggle" class="theme-btn" title="Тёмная тема">🌙</button>
          ${isManagement()
            ? `<button class="btn btn-ghost" style="font-size:13px;padding:6px 12px;" id="header-admin">Панель</button>`
            : ''}
          <div style="text-align:right;line-height:1.3;">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${roleLabel(user.role)}</div>
          </div>
          <button class="btn btn-outline" style="padding:7px 14px;font-size:13px;" id="header-logout">Выйти</button>
        </div>`
      : `
        <div class="header-right">
          <button id="theme-toggle" class="theme-btn" title="Тёмная тема">🌙</button>
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

        <nav class="header-nav">
          ${navHtml}
        </nav>

        ${userArea}
      </div>
    `;

    header.querySelector('#header-logo')!.addEventListener('click', () => navigate('/'));

    header.querySelectorAll<HTMLButtonElement>('.header-nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(btn.dataset['path']!);
        render();
      });
    });

    const themeBtn = header.querySelector('#theme-toggle');
    if (themeBtn) {
      updateToggleButton();
      themeBtn.addEventListener('click', () => toggleTheme());
    }

    header.querySelector('#header-login')?.addEventListener('click', () => navigate('/login'));

    header.querySelector('#header-admin')?.addEventListener('click', () => navigate('/admin'));

    header.querySelector('#header-logout')?.addEventListener('click', () => {
      logout();
      render();
      navigate('/login');
    });
  }

  render();
  return header;
}
