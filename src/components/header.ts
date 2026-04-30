import { navigate } from '../router';

export function renderHeader(): HTMLElement {
  const header = document.createElement('header');
  header.style.cssText = 'padding: 20px 0 0; background: var(--bg);';

  header.innerHTML = `
    <div class="container">
      <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:20px;">
        <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" id="header-logo">
          <div style="width:32px; height:32px; background:var(--accent); color:#fff; font-size:11px; font-weight:700; letter-spacing:0.03em; display:flex; align-items:center; justify-content:center; flex-shrink:0;">PiX</div>
          <div style="display:flex; flex-direction:column; gap:1px;">
            <span style="font-size:15px; font-weight:600; color:var(--text); letter-spacing:0.01em;">PiX</span>
            <span style="font-size:12px; color:var(--text-secondary);">Dodo Pizza · Внутренняя сеть</span>
          </div>
        </div>
        <span style="font-size:13px; color:var(--text-secondary);" class="header-domain">pix-dodo.ru</span>
      </div>
      <div class="divider"></div>
    </div>
  `;

  header.querySelector('#header-logo')!.addEventListener('click', () => navigate('/'));

  return header;
}
