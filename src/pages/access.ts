import { navigate } from '../router';
import { getAccessEntries } from '../services/storage';

export function renderAccess(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  let filterPizzeria = 'Все';

  function render(): void {
    page.replaceChildren(buildContent());
  }

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');
    const all  = getAccessEntries();

    const pizzerias = ['Все', ...Array.from(new Set(all.map(e => e.pizzeria).filter(Boolean)))];
    const filtered  = filterPizzeria === 'Все' ? all : all.filter(e => e.pizzeria === filterPizzeria);

    const pillsHtml = pizzerias.map(p => `
      <button class="filter-pill" data-piz="${p}" style="
        padding:6px 14px;font-size:13px;font-weight:500;border-radius:20px;cursor:pointer;
        border:1px solid ${filterPizzeria === p ? 'var(--accent)' : '#e5e7eb'};
        background:${filterPizzeria === p ? 'var(--accent)' : '#fff'};
        color:${filterPizzeria === p ? '#fff' : '#374151'};
        transition:all 0.15s;
      ">${p}</button>
    `).join('');

    const rowsHtml = filtered.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:56px;color:#9ca3af;font-size:14px;">Нет данных</td></tr>`
      : filtered.map(entry => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:13px 16px;">
              <div style="font-weight:600;font-size:14px;color:#111;">${entry.serviceName}</div>
              ${entry.serviceUrl ? `<a href="${entry.serviceUrl}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-top:2px;">↗ Открыть</a>` : ''}
              ${entry.notes ? `<div style="font-size:12px;color:#9ca3af;margin-top:3px;">${entry.notes}</div>` : ''}
            </td>
            <td style="padding:13px 16px;font-size:13px;color:#f97316;font-weight:500;">${entry.pizzeria || '—'}</td>
            <td style="padding:13px 16px;font-size:13px;color:#374151;font-family:monospace;">${entry.login}</td>
            <td style="padding:13px 16px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="pwd-text" data-id="${entry.id}" style="font-size:13px;font-family:monospace;color:#374151;letter-spacing:0.1em;">••••••••</span>
                <button class="pwd-toggle" data-id="${entry.id}" data-pwd="${entry.password}" title="Показать/скрыть" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;color:#9ca3af;">👁</button>
                <button class="pwd-copy" data-pwd="${entry.password}" title="Скопировать пароль" style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:5px;color:#374151;">⎘</button>
              </div>
            </td>
          </tr>
        `).join('');

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 64px;">
          <button class="btn btn-ghost" id="back-btn" style="margin-bottom:24px;">← Назад</button>
          <div style="margin-bottom:32px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:8px;">Безопасность</div>
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">Ключи доступа</h1>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;" id="pills-row">
            ${pillsHtml}
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
                  ${['Сервис','Пиццерия','Логин','Пароль'].map(h =>
                    `<th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${h}</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/'));

    wrap.querySelectorAll<HTMLButtonElement>('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        filterPizzeria = btn.dataset['piz']!;
        render();
      });
    });

    const shownPasswords = new Set<string>();

    wrap.querySelectorAll<HTMLButtonElement>('.pwd-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset['id']!;
        const pwd = btn.dataset['pwd']!;
        const txt = wrap.querySelector<HTMLElement>(`.pwd-text[data-id="${id}"]`)!;
        if (shownPasswords.has(id)) {
          shownPasswords.delete(id);
          txt.textContent = '••••••••';
          txt.style.letterSpacing = '0.1em';
        } else {
          shownPasswords.add(id);
          txt.textContent = pwd;
          txt.style.letterSpacing = '0';
        }
      });
    });

    wrap.querySelectorAll<HTMLButtonElement>('.pwd-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset['pwd']!).then(() => {
          const orig = btn.textContent;
          btn.textContent = '✓';
          btn.style.color = '#22c55e';
          setTimeout(() => { btn.textContent = orig; btn.style.color = '#374151'; }, 1500);
        });
      });
    });

    return wrap;
  }

  page.appendChild(buildContent());
  return page;
}
