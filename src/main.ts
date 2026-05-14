import './styles/global.css';
import './styles/components.css';
import { initTheme }    from './services/theme';
import { getToken, logout } from './services/auth';
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
  if (getToken()) {
    try {
      await loadContext();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401) {
        logout();
      }
    }
  }
  initRouter(main);
})();
