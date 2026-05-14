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
import { renderSchedules }     from './pages/schedules';
import { renderRoles }         from './pages/roles';
import { isAuthenticated, isManagement, isSuperAdmin } from './services/auth';
import { canRead, canWrite }   from './services/permissions';

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

  // Hardcoded superadmin-only — never configurable
  if ((p === '/users' || p.startsWith('/users/')) && !isSuperAdmin()) return '/';
  if (p === '/roles' && !isSuperAdmin()) return '/';

  // Management always has full read access to all sections
  if (isManagement()) {
    if ((p === '/pizzerias/new' || p.endsWith('/edit')) && !canWrite('pizzerias')) return '/';
    return null;
  }

  // Permission-based route guards for manager / shift_manager
  if (p === '/contacts'    && !canRead('contacts'))                          return '/';
  if (p === '/rates'       && !canRead('rates'))                             return '/';
  if (p === '/credentials' && !canRead('credentials'))                       return '/';
  if (p === '/motivation'  && !canRead('motivation'))                        return '/';
  if (p === '/schedule'    && !canRead('schedules_own'))                     return '/';
  if (p === '/pizzerias'   && !canRead('pizzerias'))                         return '/';
  if ((p === '/pizzerias/new' || p.endsWith('/edit')) && !canWrite('pizzerias')) return '/';
  const pizzViewMatch = p.match(/^\/pizzerias\/(\d+)$/);
  if (pizzViewMatch && !canRead('pizzerias'))                                return '/';

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
  if (p === '/schedule')   return renderSchedules;
  if (p === '/roles')      return renderRoles;

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
