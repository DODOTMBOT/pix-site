import './styles/global.css';
import './styles/components.css';
import { initTheme }    from './services/theme';
import { getUser, logout } from './services/auth';
import { loadContext }  from './services/pizzeriaContext';
import { renderHeader } from './components/header';
import { renderFooter } from './components/footer';
import { initRouter }   from './router';

initTheme();

const app = document.getElementById('app')!;

const layout = document.createElement('div');
layout.className = 'layout';

const main = document.createElement('main');
main.style.cssText = 'flex: 1;';
main.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);">Загрузка...</div>`;

const headerEl = renderHeader();
layout.appendChild(headerEl);
layout.appendChild(main);
layout.appendChild(renderFooter());
app.appendChild(layout);

(async () => {
  if (getUser()) {
    try {
      await loadContext();
    } catch {
      // Any failure to restore session (expired token, network error) → log out and go to login.
      // authFetch already handles 401 by redirecting, but if loadContext() fails for other
      // reasons (parse error, server down) we still clear auth so the user isn't stuck on
      // empty pages.
      logout();
    }
  }
  initRouter(main);
})();
