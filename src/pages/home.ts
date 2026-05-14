import { getUser } from '../services/auth';
import { getActivePizzeria } from '../services/pizzeriaContext';

export function renderHome(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:48px 40px;';

  const user       = getUser();
  const activePiz  = getActivePizzeria();

  const subtitle = activePiz
    ? `${user?.name ?? ''} — ${activePiz.name}`
    : (user?.name ?? '');

  if (!activePiz && user) {
    page.innerHTML = `
      <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:8px;">Добро пожаловать</h1>
      <p style="font-size:15px;color:var(--text-muted);">К вам не прикреплена ни одна пиццерия. Обратитесь к руководству.</p>
    `;
    return page;
  }

  page.innerHTML = `
    <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin-bottom:8px;">Добро пожаловать</h1>
    <p style="font-size:15px;color:var(--text-secondary);">${subtitle}</p>
  `;

  return page;
}
