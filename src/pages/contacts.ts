import { getContacts } from '../services/storage';

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

export function renderContacts(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'contacts-page page-enter';

  const contacts = getContacts();

  if (!contacts.length) {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-label">КОМАНДА</div>
        <h1 style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;letter-spacing:-0.02em;margin:4px 0 0;">Контакты</h1>
      </div>
      <div style="padding:60px 0;text-align:center;color:var(--text-muted);font-size:15px;">Контакты не добавлены</div>
    `;
    return page;
  }

  const cardsHtml = contacts.map(c => {
    const avatarInner = c.avatar
      ? `<img src="${c.avatar}" alt="${c.name}">`
      : initials(c.name);

    const phoneHtml = c.phone
      ? `<a href="tel:${c.phone.replace(/\s/g, '')}" class="contact-field">${c.phone}</a>`
      : '';

    const emailHtml = c.email
      ? `<a href="mailto:${c.email}" class="contact-field">${c.email}</a>`
      : '';

    const extraHtml = (c.extraFields ?? []).map(f =>
      `<div class="contact-field">
        <span class="field-label">${f.label}:</span>
        <span>${f.value}</span>
      </div>`
    ).join('');

    return `
      <div class="contact-card">
        <div class="contact-avatar">${avatarInner}</div>
        <div class="contact-info">
          <div class="contact-name">${c.name}</div>
          ${c.position ? `<div class="contact-position">${c.position}</div>` : ''}
          ${c.pizzerias ? `<div class="contact-pizzerias">${c.pizzerias}</div>` : ''}
          <div class="contact-fields">
            ${phoneHtml}
            ${emailHtml}
            ${extraHtml}
          </div>
        </div>
      </div>`;
  }).join('');

  page.innerHTML = `
    <div class="page-header">
      <div class="page-label">КОМАНДА</div>
      <h1 style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;letter-spacing:-0.02em;margin:4px 0 0;">Контакты</h1>
    </div>
    <div class="contacts-grid">${cardsHtml}</div>
  `;

  return page;
}
