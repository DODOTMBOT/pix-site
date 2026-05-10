import { renderHome } from './pages/home';
import { renderRegulations } from './pages/regulations';
import { renderAccess } from './pages/access';
import { renderInstructions } from './pages/instructions';
import { renderContacts } from './pages/contacts';
import { renderOrgChart } from './pages/orgchart';
import { renderAdmin } from './pages/admin';
import { renderAdminEmployee } from './pages/admin-employee';
import { renderAdminDepartment } from './pages/admin-department';
import { renderAdminAccess } from './pages/admin-access';
import { renderRates } from './pages/rates';
import { renderAdminRates } from './pages/admin-rates';
import { renderLogin } from './pages/login';
import { renderAdminUsersForm } from './pages/admin-users';
import { isAuthenticated, isManagement } from './services/auth';

const PUBLIC_PATHS = new Set(['/login']);

function guardRoute(path: string): string | null {
  if (PUBLIC_PATHS.has(path)) return null;
  if (!isAuthenticated()) return '/login';
  if (path.startsWith('/admin') && !isManagement()) return '/';
  return null;
}

function matchRoute(path: string): () => HTMLElement {
  if (path === '/login')        return renderLogin;
  if (path === '/')             return renderHome;
  if (path === '/regulations')  return renderRegulations;
  if (path === '/access')       return renderAccess;
  if (path === '/instructions') return renderInstructions;
  if (path === '/contacts')     return renderContacts;
  if (path === '/org')          return renderOrgChart;
  if (path === '/rates')        return renderRates;
  if (path === '/admin')        return renderAdmin;

  if (path === '/admin/employee/new')   return () => renderAdminEmployee();
  if (path === '/admin/department/new') return () => renderAdminDepartment();
  if (path === '/admin/access/new')     return () => renderAdminAccess();
  if (path === '/admin/rates/new')      return () => renderAdminRates();
  if (path === '/admin/users/new')      return () => renderAdminUsersForm();

  const empMatch  = path.match(/^\/admin\/employee\/(.+)$/);
  if (empMatch)  return () => renderAdminEmployee(empMatch[1]);

  const deptMatch = path.match(/^\/admin\/department\/(.+)$/);
  if (deptMatch) return () => renderAdminDepartment(deptMatch[1]);

  const accMatch  = path.match(/^\/admin\/access\/(.+)$/);
  if (accMatch)  return () => renderAdminAccess(accMatch[1]);

  const rateMatch = path.match(/^\/admin\/rates\/(.+)$/);
  if (rateMatch) return () => renderAdminRates(rateMatch[1]);

  const userMatch = path.match(/^\/admin\/users\/(.+)$/);
  if (userMatch) return () => renderAdminUsersForm(userMatch[1]);

  return renderHome;
}

let outlet: HTMLElement | null = null;

function renderCurrent(): void {
  if (!outlet) return;
  const path = window.location.pathname;
  const redirect = guardRoute(path);
  if (redirect) {
    window.history.replaceState(null, '', redirect);
    outlet.replaceChildren(matchRoute(redirect)());
    return;
  }
  outlet.replaceChildren(matchRoute(path)());
}

export function navigate(path: string): void {
  const redirect = guardRoute(path);
  const target = redirect ?? path;
  window.history.pushState(null, '', target);
  outlet?.replaceChildren(matchRoute(target)());
}

export function initRouter(appOutlet: HTMLElement): void {
  outlet = appOutlet;
  window.addEventListener('popstate', renderCurrent);
  renderCurrent();
}
