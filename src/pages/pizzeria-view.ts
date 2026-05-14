import { navigate } from '../router';
import { authFetch, isManagement } from '../services/auth';

interface PizzeriaDetail {
  id:           number;
  name:         string;
  city:         string | null;
  street:       string | null;
  house:        string | null;
  legal_entity: string | null;
  opening_date: string | null;
  manager:      { id: number; name: string } | null;
  curator:      { id: number; name: string; job_title: string | null } | null;
  is_archived:  number;
}

export function renderPizzeriaView(id: string): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = 'padding:32px 40px;';
  page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Загрузка...</div>`;

  authFetch(`/api/pizzerias/${id}`)
    .then(r => r.json())
    .then((p: PizzeriaDetail) => page.replaceChildren(buildView(p)))
    .catch(() => {
      page.innerHTML = `<div style="color:var(--text-muted);padding:40px 0;">Ошибка загрузки</div>`;
    });

  return page;
}

function buildView(p: PizzeriaDetail): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'max-width:740px;';

  const address  = [p.city, p.street, p.house].filter(Boolean).join(', ') || null;
  const openDate = p.opening_date
    ? new Date(p.opening_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // ── Header ────────────────────────────────────────────────────────────────────
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:16px;';
  hdr.innerHTML = `
    <div>
      <button class="btn btn-ghost" id="back-btn" style="margin-bottom:12px;">← Пиццерии</button>
      <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.03em;margin-bottom:4px;">${esc(p.name)}</h1>
      ${address ? `<div style="font-size:14px;color:var(--text-muted);">${esc(address)}</div>` : ''}
    </div>
    ${isManagement() ? `<button class="btn btn-outline" id="edit-btn" style="flex-shrink:0;margin-top:32px;">Редактировать</button>` : ''}
  `;
  hdr.querySelector('#back-btn')!.addEventListener('click', () => navigate('/pizzerias'));
  hdr.querySelector('#edit-btn')?.addEventListener('click', () => navigate(`/pizzerias/${p.id}/edit`));
  wrap.appendChild(hdr);

  // ── Main card ─────────────────────────────────────────────────────────────────
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:0;';

  const rows: [string, string][] = [
    ['Адрес',            address ?? '—'],
    ['Юридическое лицо', p.legal_entity ?? '—'],
    ['Дата открытия',    openDate ?? '—'],
    ['Управляющий',      p.manager?.name ?? '—'],
    ['Куратор ТУ',       p.curator
      ? p.curator.name + (p.curator.job_title ? ` · ${p.curator.job_title}` : '')
      : '—'],
  ];

  rows.forEach(([label, value], i) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:baseline;gap:12px;padding:14px 0;${i < rows.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}`;
    row.innerHTML = `
      <span style="font-size:13px;color:var(--text-muted);min-width:160px;flex-shrink:0;">${esc(label)}</span>
      <span style="font-size:14px;color:var(--text-primary);font-weight:500;">${esc(value)}</span>
    `;
    card.appendChild(row);
  });

  wrap.appendChild(card);
  return wrap;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
