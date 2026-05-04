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

function matchRoute(path: string): () => HTMLElement {
  if (path === '/')             return renderHome;
  if (path === '/regulations')  return renderRegulations;
  if (path === '/access')       return renderAccess;
  if (path === '/instructions') return renderInstructions;
  if (path === '/contacts')     return renderContacts;
  if (path === '/org')          return renderOrgChart;
  if (path === '/admin')        return renderAdmin;

  if (path === '/admin/employee/new')   return () => renderAdminEmployee();
  if (path === '/admin/department/new') return () => renderAdminDepartment();
  if (path === '/admin/access/new')     return () => renderAdminAccess();

  const empMatch  = path.match(/^\/admin\/employee\/(.+)$/);
  if (empMatch)  return () => renderAdminEmployee(empMatch[1]);

  const deptMatch = path.match(/^\/admin\/department\/(.+)$/);
  if (deptMatch) return () => renderAdminDepartment(deptMatch[1]);

  const accMatch  = path.match(/^\/admin\/access\/(.+)$/);
  if (accMatch)  return () => renderAdminAccess(accMatch[1]);

  return renderHome;
}

let outlet: HTMLElement | null = null;

function renderCurrent(): void {
  if (!outlet) return;
  outlet.replaceChildren(matchRoute(window.location.pathname)());
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
