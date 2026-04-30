import type { Route } from './types';
import { renderHome } from './pages/home';
import { renderRegulations } from './pages/regulations';
import { renderAccess } from './pages/access';
import { renderInstructions } from './pages/instructions';
import { renderContacts } from './pages/contacts';

const routes: Route[] = [
  { path: '/',             render: renderHome },
  { path: '/regulations',  render: renderRegulations },
  { path: '/access',       render: renderAccess },
  { path: '/instructions', render: renderInstructions },
  { path: '/contacts',     render: renderContacts },
];

let outlet: HTMLElement | null = null;

function resolveRoute(path: string): Route {
  return routes.find(r => r.path === path) ?? routes[0];
}

function renderCurrent(): void {
  if (!outlet) return;
  const route = resolveRoute(window.location.pathname);
  const page = route.render();
  outlet.replaceChildren(page);
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
