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
import { renderAdminHome } from './pages/admin-home';
import { renderAdminContact } from './pages/admin-contact';
import { renderAdminMotivation } from './pages/admin-motivation';
import { renderMotivation } from './pages/motivation';
import { renderProjectsTemplates } from './pages/projects-templates';
import { renderProjectsAssignments } from './pages/projects-assignments';
import { renderMotivationReview } from './pages/motivation-review';
import { renderSchedule } from './pages/schedule';
import { renderScheduleOverview } from './pages/schedule-overview';
import { isAuthenticated, isManagement } from './services/auth';

const PUBLIC_PATHS = new Set(['/login']);

function guardRoute(path: string): string | null {
  const cleanPath = path.split('#')[0];
  if (PUBLIC_PATHS.has(cleanPath)) return null;
  if (!isAuthenticated()) return '/login';
  if (cleanPath.startsWith('/admin') && !isManagement()) return '/';
  if (cleanPath === '/schedule' && isManagement()) return '/schedule/overview';
  if (cleanPath === '/schedule/overview' && !isManagement()) return '/schedule';
  if (cleanPath === '/motivation' && isManagement()) return '/admin';
  return null;
}

function matchRoute(path: string): () => HTMLElement {
  const p = path.split('#')[0]; // strip hash — hash is read by pages via window.location.hash

  if (p === '/login')        return renderLogin;
  if (p === '/')             return renderHome;
  if (p === '/regulations')  return renderRegulations;
  if (p === '/access')       return renderAccess;
  if (p === '/instructions') return renderInstructions;
  if (p === '/contacts')     return renderContacts;
  if (p === '/org')          return renderOrgChart;
  if (p === '/rates')             return renderRates;
  if (p === '/motivation')        return renderMotivation;
  if (p === '/schedule')          return renderSchedule;
  if (p === '/schedule/overview') return renderScheduleOverview;
  if (p === '/admin')             return renderAdmin;

  if (p === '/admin/employee/new')   return () => renderAdminEmployee();
  if (p === '/admin/department/new') return () => renderAdminDepartment();
  if (p === '/admin/access/new')     return () => renderAdminAccess();
  if (p === '/admin/rates/new')      return () => renderAdminRates();
  if (p === '/admin/users/new')      return () => renderAdminUsersForm();
  if (p === '/admin/home')           return renderAdminHome;
  if (p === '/admin/contacts/new')    return () => renderAdminContact();
  if (p === '/admin/motivation/new')    return () => renderAdminMotivation();
  if (p === '/admin/motivation/review')      return renderMotivationReview;
  if (p === '/admin/projects/templates')    return renderProjectsTemplates;
  if (p === '/admin/projects/assignments')  return renderProjectsAssignments;

  const empMatch  = p.match(/^\/admin\/employee\/(.+)$/);
  if (empMatch)  return () => renderAdminEmployee(empMatch[1]);

  const deptMatch = p.match(/^\/admin\/department\/(.+)$/);
  if (deptMatch) return () => renderAdminDepartment(deptMatch[1]);

  const accMatch  = p.match(/^\/admin\/access\/(.+)$/);
  if (accMatch)  return () => renderAdminAccess(accMatch[1]);

  const rateMatch = p.match(/^\/admin\/rates\/(.+)$/);
  if (rateMatch) return () => renderAdminRates(rateMatch[1]);

  const userMatch = p.match(/^\/admin\/users\/(.+)$/);
  if (userMatch) return () => renderAdminUsersForm(userMatch[1]);

  const contactMatch = p.match(/^\/admin\/contacts\/(.+)$/);
  if (contactMatch)  return () => renderAdminContact(contactMatch[1]);

  const motivMatch = p.match(/^\/admin\/motivation\/(.+)$/);
  if (motivMatch)  return () => renderAdminMotivation(motivMatch[1]);

  return renderHome;
}

function dispatchNav(path: string): void {
  window.dispatchEvent(new CustomEvent('pix:navigate', { detail: { path } }));
}

let outlet: HTMLElement | null = null;

function renderCurrent(): void {
  if (!outlet) return;
  const path = window.location.pathname + window.location.hash;
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
  const target = redirect ?? path;
  window.history.pushState(null, '', target);
  outlet?.replaceChildren(matchRoute(target)());
  dispatchNav(target);
}

export function initRouter(appOutlet: HTMLElement): void {
  outlet = appOutlet;
  window.addEventListener('popstate', renderCurrent);
  renderCurrent();
}
