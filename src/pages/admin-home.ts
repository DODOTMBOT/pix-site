import { navigate } from '../router';
import { getHomeSettings, saveHomeSettings } from '../services/storage';
import type { HomeBlock, HomeSettings } from '../types';

const IS = 'width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;';

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function renderAdminHome(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  // Structural state (photos, block list order/existence, block photos)
  // Text values are read from DOM at save time.
  const loaded  = getHomeSettings();
  let photos: string[]     = [...loaded.photos];
  let blocks: HomeBlock[]  = loaded.blocks.map(b => ({ ...b }));

  // ── Collect current values from DOM + state ──────────────────────────────

  function collectSettings(): HomeSettings {
    const headline    = (page.querySelector<HTMLTextAreaElement>('#f-headline'))?.value ?? loaded.headline;
    const subheadline = (page.querySelector<HTMLTextAreaElement>('#f-sub'))?.value ?? loaded.subheadline;

    const collectedBlocks: HomeBlock[] = [];
    page.querySelectorAll<HTMLElement>('.block-form-item').forEach(item => {
      const id    = item.dataset['id'] ?? uid();
      const photo = item.dataset['photo'] || undefined;
      collectedBlocks.push({
        id,
        photo,
        title:       (item.querySelector<HTMLInputElement>('.block-title'))?.value   ?? '',
        description: (item.querySelector<HTMLInputElement>('.block-desc'))?.value    ?? '',
        link:        (item.querySelector<HTMLInputElement>('.block-link'))?.value    ?? '',
        bgColor:     (item.querySelector<HTMLInputElement>('.block-color'))?.value   ?? '#111111',
        size:        (item.querySelector<HTMLInputElement>('.block-size-wide'))?.checked ? 'large' : 'small',
      });
    });

    return { headline, subheadline, photos, blocks: collectedBlocks };
  }

  // ── Build a block row (text inputs are NOT wired to state) ────────────────

  function buildBlockRow(block: HomeBlock, index: number, total: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'block-form-item';
    row.dataset['id']    = block.id;
    row.dataset['photo'] = block.photo ?? '';
    row.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:12px;';

    row.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Блок ${index + 1}</span>
        <div style="display:flex;gap:6px;">
          <button data-action="up"   style="border:1px solid var(--border);background:var(--bg-card);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px;" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button data-action="down" style="border:1px solid var(--border);background:var(--bg-card);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px;" ${index === total - 1 ? 'disabled' : ''}>▼</button>
          <button data-action="del"  style="border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#ef4444;">✕</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Заголовок</label>
          <input class="block-title" type="text" value="${block.title}" style="${IS}">
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Ссылка</label>
          <input class="block-link" type="text" value="${block.link ?? ''}" placeholder="/org" style="${IS}">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Описание</label>
        <input class="block-desc" type="text" value="${block.description}" style="${IS}">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:12px;align-items:end;">
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Размер</label>
          <div style="display:flex;gap:12px;padding-top:4px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <input class="block-size-wide" type="radio" name="size-${block.id}" value="large" ${block.size === 'large' ? 'checked' : ''} style="accent-color:var(--accent);"> Широкий
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <input type="radio" name="size-${block.id}" value="small" ${block.size === 'small' ? 'checked' : ''} style="accent-color:var(--accent);"> Узкий
            </label>
          </div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Цвет фона</label>
          <input class="block-color" type="color" value="${block.bgColor ?? '#1a1a1a'}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;cursor:pointer;padding:2px;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Фото</label>
          <input type="file" accept="image/*" style="display:none;" id="photo-file-${block.id}">
          <label for="photo-file-${block.id}" style="display:flex;align-items:center;justify-content:center;width:100%;height:36px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-secondary);background:var(--bg-card);">
            ${block.photo ? '📷 Изм.' : '📷 Добавить'}
          </label>
        </div>
      </div>

      ${block.photo ? `
        <div class="photo-preview" style="margin-top:10px;display:flex;align-items:center;gap:10px;">
          <img src="${block.photo}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
          <button data-action="remove-photo" style="font-size:12px;color:#ef4444;border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:4px 10px;cursor:pointer;">Удалить фото</button>
        </div>` : '<div class="photo-preview"></div>'}
    `;

    // Photo upload — only structural change, updates data-photo and preview
    row.querySelector<HTMLInputElement>(`#photo-file-${block.id}`)?.addEventListener('change', async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const b64 = await fileToBase64(file);
      row.dataset['photo'] = b64;
      const preview = row.querySelector('.photo-preview')!;
      preview.innerHTML = `
        <img src="${b64}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
        <button data-action="remove-photo" style="font-size:12px;color:#ef4444;border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:4px 10px;cursor:pointer;">Удалить фото</button>
      `;
      preview.querySelector('[data-action="remove-photo"]')?.addEventListener('click', () => {
        row.dataset['photo'] = '';
        preview.innerHTML = '';
      });
      (e.target as HTMLInputElement).value = '';
    });

    row.querySelector('[data-action="remove-photo"]')?.addEventListener('click', () => {
      row.dataset['photo'] = '';
      row.querySelector('.photo-preview')!.innerHTML = '';
    });

    return row;
  }

  // ── Blocks list manager ───────────────────────────────────────────────────

  let blocksList: HTMLElement;

  function renderBlocks(): void {
    blocksList.innerHTML = '';
    blocks.forEach((block, i) => {
      const row = buildBlockRow(block, i, blocks.length);

      // Move / delete — structural, so re-render
      row.querySelector('[data-action="up"]')?.addEventListener('click', () => {
        if (i === 0) return;
        // Capture current DOM values before re-render
        syncBlocksFromDom();
        [blocks[i], blocks[i - 1]] = [blocks[i - 1], blocks[i]];
        renderBlocks();
      });
      row.querySelector('[data-action="down"]')?.addEventListener('click', () => {
        if (i === blocks.length - 1) return;
        syncBlocksFromDom();
        [blocks[i], blocks[i + 1]] = [blocks[i + 1], blocks[i]];
        renderBlocks();
      });
      row.querySelector('[data-action="del"]')?.addEventListener('click', () => {
        syncBlocksFromDom();
        blocks.splice(i, 1);
        renderBlocks();
      });

      blocksList.appendChild(row);
    });
  }

  // Sync text-field values back into `blocks` array (called before structural re-renders)
  function syncBlocksFromDom(): void {
    page.querySelectorAll<HTMLElement>('.block-form-item').forEach((item, i) => {
      if (i >= blocks.length) return;
      blocks[i] = {
        ...blocks[i],
        photo:       item.dataset['photo'] || undefined,
        title:       item.querySelector<HTMLInputElement>('.block-title')?.value  ?? blocks[i].title,
        description: item.querySelector<HTMLInputElement>('.block-desc')?.value   ?? blocks[i].description,
        link:        item.querySelector<HTMLInputElement>('.block-link')?.value   ?? blocks[i].link,
        bgColor:     item.querySelector<HTMLInputElement>('.block-color')?.value  ?? blocks[i].bgColor,
        size:        item.querySelector<HTMLInputElement>('.block-size-wide')?.checked ? 'large' : 'small',
      };
    });
  }

  // ── Photos grid ───────────────────────────────────────────────────────────

  let photosGrid: HTMLElement;

  function renderPhotos(): void {
    photosGrid.innerHTML = '';
    if (!photos.length) {
      photosGrid.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Фотографий нет</p>';
      return;
    }
    photos.forEach((src, i) => {
      const item = document.createElement('div');
      item.style.cssText = 'position:relative;display:inline-block;';
      item.innerHTML = `
        <img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">
        <button style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
      `;
      item.querySelector('button')!.addEventListener('click', () => {
        photos.splice(i, 1);
        renderPhotos();
      });
      photosGrid.appendChild(item);
    });
  }

  // ── Build page DOM ────────────────────────────────────────────────────────

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="container">
      <section style="padding:40px 0 80px;max-width:700px;">
        <button class="btn btn-ghost" id="back-btn" style="margin-bottom:24px;">← Назад</button>
        <h1 style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;color:var(--text-primary);">Редактирование главной страницы</h1>

        <!-- Текст -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">
          <h2 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text-primary);">Текст</h2>
          <div style="margin-bottom:14px;">
            <label style="font-size:13px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Заголовок <span style="color:var(--text-muted);font-weight:400;">(\\n = перенос строки)</span></label>
            <textarea id="f-headline" rows="2" style="${IS}resize:vertical;">${loaded.headline}</textarea>
          </div>
          <div>
            <label style="font-size:13px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Подзаголовок</label>
            <textarea id="f-sub" rows="3" style="${IS}resize:vertical;">${loaded.subheadline}</textarea>
          </div>
        </div>

        <!-- Фотографии -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
              <h2 style="font-size:15px;font-weight:600;color:var(--text-primary);">Фотографии карусели</h2>
            </div>
            <label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--accent);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;">
              + Добавить фото
              <input type="file" id="add-photos-input" accept="image/*" multiple style="display:none;">
            </label>
          </div>
          <div id="photos-grid" style="display:flex;flex-wrap:wrap;gap:10px;"></div>
        </div>

        <!-- Блоки -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="font-size:15px;font-weight:600;color:var(--text-primary);">Блоки страницы</h2>
            <button class="btn btn-outline" id="add-block-btn" style="font-size:13px;padding:7px 14px;">+ Добавить блок</button>
          </div>
          <div id="blocks-list"></div>
        </div>

        <!-- Save -->
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn btn-primary" id="save-btn" style="padding:11px 28px;">Сохранить</button>
          <span id="save-ok" style="font-size:14px;color:#16a34a;display:none;">Сохранено ✓</span>
        </div>
      </section>
    </div>
  `;

  // Wire up references after innerHTML is set
  blocksList = wrap.querySelector('#blocks-list')!;
  photosGrid = wrap.querySelector('#photos-grid')!;

  renderPhotos();
  renderBlocks();

  wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/admin'));

  wrap.querySelector<HTMLInputElement>('#add-photos-input')!.addEventListener('change', async e => {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    const b64s = await Promise.all(files.map(fileToBase64));
    photos.push(...b64s);
    (e.target as HTMLInputElement).value = '';
    renderPhotos();
  });

  wrap.querySelector('#add-block-btn')!.addEventListener('click', () => {
    syncBlocksFromDom();
    blocks.push({ id: uid(), title: 'Новый блок', description: 'Описание', size: 'small', bgColor: '#374151' });
    renderBlocks();
  });

  const saveBtn = wrap.querySelector<HTMLButtonElement>('#save-btn')!;
  const saveOk  = wrap.querySelector<HTMLElement>('#save-ok')!;

  saveBtn.addEventListener('click', () => {
    const settings = collectSettings();
    console.log('Save clicked', settings);
    saveHomeSettings(settings);
    saveBtn.textContent = 'Сохранено ✓';
    saveBtn.style.background = '#22c55e';
    saveOk.style.display = 'inline';
    setTimeout(() => {
      saveBtn.textContent = 'Сохранить';
      saveBtn.style.background = '';
      saveOk.style.display = 'none';
    }, 2500);
  });

  page.appendChild(wrap);
  return page;
}
