import { renderHome } from './pages/home';
import { renderRegulations } from './pages/regulations';
import { renderAccess } from './pages/access';
import { renderInstructions } from './pages/instructions';
import { renderContacts } from './pages/contacts';
import { renderOrgChart } from './pages/orgchart';
import { renderAdmin } from './pages/admin';
import { renderAdminEmployee } from './pages/admin-employee';

function matchRoute(path: string): () => HTMLElement {
  if (path === '/')             return renderHome;
  if (path === '/regulations')  return renderRegulations;
  if (path === '/access')       return renderAccess;
  if (path === '/instructions') return renderInstructions;
  if (path === '/contacts')     return renderContacts;
  if (path === '/org')          return renderOrgChart;
  if (path === '/admin')        return renderAdmin;
  if (path === '/admin/employee/new') return () => renderAdminEmployee();

  const editMatch = path.match(/^\/admin\/employee\/(.+)$/);
  if (editMatch) return () => renderAdminEmployee(editMatch[1]);

  return renderHome;
}

let outlet: HTMLElement | null = null;

function renderCurrent(): void {
  if (!outlet) return;
  const render = matchRoute(window.location.pathname);
  outlet.replaceChildren(render());
}

export function navigate(path: string): void {
  window.history.pushState(null, '', path);
  renderCurrent();
}

export function initRouter(appOutlet: HTMLElement): void {
  outlet = appOutlet;
  window.addEventListener('popstate', renderCurrent);
  renderCurrent();
}
