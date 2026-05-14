import { renderLogin }         from './pages/login';
import { renderHome }          from './pages/home';
import { renderPizzeriasList } from './pages/pizzerias-list';
import { renderPizzeriaView }  from './pages/pizzeria-view';
import { renderPizzeriaForm }  from './pages/pizzeria-form';
import { renderUsersList }     from './pages/users-list';
import { renderUserForm }      from './pages/user-form';
import { renderContacts }      from './pages/contacts';
import { renderRates }         from './pages/rates';
import { renderCredentials }   from './pages/credentials';
import { renderMotivation }    from './pages/motivation';
import { isAuthenticated, isManagement, isSuperAdmin } from './services/auth';

const PUBLIC_PATHS = new Set(['/login']);

function renderStub(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'padding:80px 40px;text-align:center;';
  el.innerHTML = `
    <p style="font-size:16px;color:var(--text-muted);margin-bottom:20px;">
      Раздел будет доступен после следующего этапа переноса.
    </p>
    <button class="btn btn-outline" id="stub-back">Перейти на главную</button>
  `;
  el.querySelector('#stub-back')!.addEventListener('click', () => navigate('/'));
  return el;
}

function guardRoute(path: string): string | null {
  const p = path.split('?')[0].split('#')[0];
  if (PUBLIC_PATHS.has(p)) return null;
  if (!isAuthenticated()) return '/login';
  if (p === '/pizzerias' && !isManagement()) return '/';
  if (p.startsWith('/pizzerias/') && p.endsWith('/edit') && !isManagement()) return '/';
  if (p === '/pizzerias/new' && !isManagement()) return '/';
  if ((p === '/users'     || p.startsWith('/users/'))     && !isSuperAdmin())  return '/';
  return null;
}

function matchRoute(path: string): () => HTMLElement {
  const p = path.split('?')[0].split('#')[0];

  if (p === '/login') return renderLogin;
  if (p === '/')      return renderHome;

  if (p === '/pizzerias')     return renderPizzeriasList;
  if (p === '/pizzerias/new') return () => renderPizzeriaForm();

  const pizzEditMatch = p.match(/^\/pizzerias\/(\d+)\/edit$/);
  if (pizzEditMatch) return () => renderPizzeriaForm(pizzEditMatch[1]);

  const pizzViewMatch = p.match(/^\/pizzerias\/(\d+)$/);
  if (pizzViewMatch) return () => renderPizzeriaView(pizzViewMatch[1]);

  if (p === '/users')     return renderUsersList;
  if (p === '/users/new') return () => renderUserForm();

  const userMatch = p.match(/^\/users\/(.+)$/);
  if (userMatch) return () => renderUserForm(userMatch[1]);

  if (p === '/contacts')   return renderContacts;
  if (p === '/rates')      return renderRates;
  if (p === '/credentials') return renderCredentials;
  if (p === '/motivation') return renderMotivation;

  return renderStub;
}

function dispatchNav(path: string): void {
  window.dispatchEvent(new CustomEvent('pix:navigate', { detail: { path } }));
}

let outlet: HTMLElement | null = null;

function renderCurrent(): void {
  if (!outlet) return;
  const path     = window.location.pathname + window.location.search + window.location.hash;
  const redirect = guardRoute(path);
  if (redirect) {
    window.history.replaceState(null, '', redirect);
    outlet.replaceChildren(matchRoute(redirect)());
    dispatchNav(redirect);
    return;
  }
  outlet.replaceChildren(matchRoute(path)());
  dispatchNav(path);
}

export function navigate(path: string): void {
  const redirect = guardRoute(path);
  const target   = redirect ?? path;
  window.history.pushState(null, '', target);
  outlet?.replaceChildren(matchRoute(target)());
  dispatchNav(target);
}

export function initRouter(appOutlet: HTMLElement): void {
  outlet = appOutlet;
  window.addEventListener('popstate', renderCurrent);
  renderCurrent();
}
