import { navigate } from '../router';

const NAV_LINKS = [
  { label: 'Регламенты', path: '/regulations' },
  { label: 'Инструкции', path: '/instructions' },
  { label: 'Структура',  path: '/org' },
  { label: 'Контакты',   path: '/contacts' },
];

export function renderHeader(): HTMLElement {
  const header = document.createElement('header');
  header.style.cssText = `
    position: sticky;
    top: 0;
    z-index: 100;
    background: #ffffff;
    box-shadow: 0 1px 0 var(--border), 0 2px 8px rgba(0,0,0,0.04);
    height: 64px;
    display: flex;
    align-items: center;
  `;

  const navLinksHtml = NAV_LINKS.map(l =>
    `<button class="header-nav-link" data-path="${l.path}">${l.label}</button>`
  ).join('');

  header.innerHTML = `
    <div class="container" style="display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" id="header-logo">
        <div style="width:32px; height:32px; background:var(--accent); color:#fff; font-size:11px; font-weight:700; letter-spacing:0.03em; display:flex; align-items:center; justify-content:center; border-radius:7px; flex-shrink:0;">PiX</div>
        <div style="display:flex; flex-direction:column; gap:1px;">
          <span style="font-size:15px; font-weight:600; color:var(--text); letter-spacing:0.01em;">PiX</span>
          <span style="font-size:11px; color:var(--text-secondary); line-height:1;">Dodo Pizza · Внутренняя сеть</span>
        </div>
      </div>

      <nav style="display:flex; align-items:center; gap:4px;">
        ${navLinksHtml}
        <button class="btn btn-primary" style="margin-left:12px; padding:8px 18px; font-size:14px;" id="header-login">Войти</button>
      </nav>
    </div>
  `;

  header.querySelector('#header-logo')!.addEventListener('click', () => navigate('/'));
  header.querySelector('#header-login')!.addEventListener('click', () => navigate('/'));

  header.querySelectorAll<HTMLButtonElement>('.header-nav-link').forEach(btn => {
    btn.style.cssText = `
      background: none;
      border: none;
      padding: 8px 12px;
      font-size: 14px;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-btn);
      transition: color 0.15s, background 0.15s;
      font-family: var(--font);
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.color = 'var(--text)';
      btn.style.background = '#f3f4f6';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.color = 'var(--text-secondary)';
      btn.style.background = 'none';
    });
    btn.addEventListener('click', () => navigate(btn.dataset['path']!));
  });

  return header;
}
