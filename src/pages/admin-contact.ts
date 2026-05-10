import { navigate } from '../router';
import { getContacts, saveContacts } from '../services/storage';
import type { Contact } from '../types';

const IS = 'width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input,var(--bg-primary));outline:none;box-sizing:border-box;';

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function compressImage(file: File, maxWidth = 400, quality = 0.75): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function renderAdminContact(contactId?: string): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  const contacts = getContacts();
  const existing = contactId ? contacts.find(c => c.id === contactId) : undefined;
  const isNew    = !existing;

  let avatar = existing?.avatar ?? '';
  let extraFields: { label: string; value: string }[] = existing?.extraFields?.map(f => ({ ...f })) ?? [];

  // ── Extra fields list ────────────────────────────────────────────────────

  let extraList: HTMLElement;

  function renderExtra(): void {
    extraList.innerHTML = '';
    extraFields.forEach((f, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;';
      row.innerHTML = `
        <input type="text" value="${f.label}" placeholder="Название (Telegram)" style="${IS}" data-i="${i}" data-field="label">
        <input type="text" value="${f.value}" placeholder="@username" style="${IS}" data-i="${i}" data-field="value">
        <button data-del="${i}" style="border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:6px 10px;cursor:pointer;color:#ef4444;font-size:13px;">×</button>
      `;
      row.querySelector<HTMLInputElement>('[data-field="label"]')!.addEventListener('input', e => {
        extraFields[i].label = (e.target as HTMLInputElement).value;
      });
      row.querySelector<HTMLInputElement>('[data-field="value"]')!.addEventListener('input', e => {
        extraFields[i].value = (e.target as HTMLInputElement).value;
      });
      row.querySelector<HTMLButtonElement>(`[data-del="${i}"]`)!.addEventListener('click', () => {
        extraFields.splice(i, 1);
        renderExtra();
      });
      extraList.appendChild(row);
    });
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="container">
      <section style="padding:40px 0 80px;max-width:640px;">
        <button class="btn btn-ghost" id="back-btn" style="margin-bottom:24px;">← Назад</button>
        <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-bottom:28px;color:var(--text-primary);">
          ${isNew ? 'Новый контакт' : 'Редактировать контакт'}
        </h1>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div style="grid-column:span 2;">
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">ФИО *</label>
              <input id="f-name" type="text" value="${existing?.name ?? ''}" style="${IS}" placeholder="Иванов Иван Иванович">
              <div id="err-name" style="color:#ef4444;font-size:12px;margin-top:4px;display:none;"></div>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Должность</label>
              <input id="f-position" type="text" value="${existing?.position ?? ''}" style="${IS}" placeholder="Управляющий">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Пиццерии</label>
              <input id="f-pizzerias" type="text" value="${existing?.pizzerias ?? ''}" style="${IS}" placeholder="Немчиновка-1, ВНИИ-1">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Телефон</label>
              <input id="f-phone" type="tel" value="${existing?.phone ?? ''}" style="${IS}" placeholder="+7 900 000-00-00">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Email</label>
              <input id="f-email" type="email" value="${existing?.email ?? ''}" style="${IS}" placeholder="email@dodo.ru">
            </div>
          </div>

          <!-- Фото -->
          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;">Фото</label>
            <div style="display:flex;align-items:center;gap:12px;">
              <div id="avatar-preview" style="width:56px;height:56px;border-radius:50%;background:#f3f4f6;border:1px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;flex-shrink:0;">
                ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">` : 'Нет фото'}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <label style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;color:var(--text-secondary);">
                  Загрузить фото
                  <input type="file" id="f-avatar" accept="image/*" style="display:none;">
                </label>
                <button id="remove-avatar" style="padding:7px 12px;border:1px solid #fecaca;background:var(--bg-card);border-radius:8px;cursor:pointer;font-size:13px;color:#ef4444;${avatar ? '' : 'display:none;'}">Удалить</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Доп поля -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 style="font-size:14px;font-weight:600;color:var(--text-primary);">Дополнительные поля</h2>
            <button id="add-extra-btn" class="btn btn-outline" style="font-size:12px;padding:6px 12px;">+ Добавить поле</button>
          </div>
          <div id="extra-list"></div>
        </div>

        <!-- Actions -->
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-primary" id="save-btn" style="padding:11px 28px;">Сохранить</button>
          <button class="btn btn-outline" id="cancel-btn">Отмена</button>
          <span id="save-err" style="font-size:13px;color:#ef4444;display:none;"></span>
        </div>
      </section>
    </div>
  `;

  extraList = wrap.querySelector('#extra-list')!;
  renderExtra();

  // Avatar upload
  const avatarInput  = wrap.querySelector<HTMLInputElement>('#f-avatar')!;
  const avatarPreview = wrap.querySelector<HTMLElement>('#avatar-preview')!;
  const removeAvatar  = wrap.querySelector<HTMLButtonElement>('#remove-avatar')!;

  avatarInput.addEventListener('change', async e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    avatar = await compressImage(file, 400, 0.75);
    avatarPreview.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">`;
    removeAvatar.style.display = '';
    avatarInput.value = '';
  });

  removeAvatar.addEventListener('click', () => {
    avatar = '';
    avatarPreview.innerHTML = 'Нет фото';
    removeAvatar.style.display = 'none';
  });

  // Add extra field
  wrap.querySelector('#add-extra-btn')!.addEventListener('click', () => {
    extraFields.push({ label: '', value: '' });
    renderExtra();
  });

  // Nav
  wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/admin'));
  wrap.querySelector('#cancel-btn')!.addEventListener('click', () => navigate('/admin'));

  // Save
  wrap.querySelector('#save-btn')!.addEventListener('click', () => {
    const name      = wrap.querySelector<HTMLInputElement>('#f-name')!.value.trim();
    const errName   = wrap.querySelector<HTMLElement>('#err-name')!;
    const saveErr   = wrap.querySelector<HTMLElement>('#save-err')!;

    if (!name) {
      errName.textContent = 'Введите ФИО';
      errName.style.display = 'block';
      return;
    }
    errName.style.display = 'none';
    saveErr.style.display = 'none';

    const contact: Contact = {
      id:          existing?.id ?? uid(),
      name,
      position:    wrap.querySelector<HTMLInputElement>('#f-position')!.value.trim(),
      pizzerias:   wrap.querySelector<HTMLInputElement>('#f-pizzerias')!.value.trim(),
      phone:       wrap.querySelector<HTMLInputElement>('#f-phone')!.value.trim(),
      email:       wrap.querySelector<HTMLInputElement>('#f-email')!.value.trim(),
      extraFields: extraFields.filter(f => f.label || f.value),
      avatar:      avatar || undefined,
    };

    const updated = isNew
      ? [...contacts, contact]
      : contacts.map(c => c.id === contact.id ? contact : c);

    saveContacts(updated);
    navigate('/admin');
  });

  page.appendChild(wrap);
  return page;
}
