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

// ─── Block editor row ─────────────────────────────────────────────────────────

function buildBlockRow(
  block: HomeBlock,
  index: number,
  total: number,
  onUpdate: (updated: HomeBlock) => void,
  onDelete: () => void,
  onMove: (dir: -1 | 1) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:12px;';

  row.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Блок ${index + 1}</span>
      <div style="display:flex;gap:6px;">
        <button data-action="up"  style="border:1px solid var(--border);background:var(--bg-card);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px;" ${index === 0 ? 'disabled' : ''}>▲</button>
        <button data-action="down" style="border:1px solid var(--border);background:var(--bg-card);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px;" ${index === total - 1 ? 'disabled' : ''}>▼</button>
        <button data-action="del"  style="border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#ef4444;">✕</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div>
        <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Заголовок</label>
        <input data-field="title" type="text" value="${block.title}" style="${IS}">
      </div>
      <div>
        <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Ссылка</label>
        <input data-field="link" type="text" value="${block.link ?? ''}" placeholder="/org" style="${IS}">
      </div>
    </div>

    <div style="margin-bottom:12px;">
      <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Описание</label>
      <input data-field="description" type="text" value="${block.description}" style="${IS}">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:12px;align-items:end;">
      <div>
        <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Размер</label>
        <div style="display:flex;gap:12px;padding-top:4px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="radio" name="size-${block.id}" value="large" ${block.size === 'large' ? 'checked' : ''} style="accent-color:var(--accent);"> Широкий
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="radio" name="size-${block.id}" value="small" ${block.size === 'small' ? 'checked' : ''} style="accent-color:var(--accent);"> Узкий
          </label>
        </div>
      </div>
      <div>
        <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Цвет фона</label>
        <input data-field="bgColor" type="color" value="${block.bgColor ?? '#1a1a1a'}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;cursor:pointer;padding:2px;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Фото</label>
        <input data-field="photo-file" type="file" accept="image/*" style="display:none;" id="photo-file-${block.id}">
        <label for="photo-file-${block.id}" style="display:flex;align-items:center;justify-content:center;width:100%;height:36px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-secondary);background:var(--bg-card);">
          ${block.photo ? '📷 Изм.' : '📷 Добавить'}
        </label>
      </div>
    </div>

    ${block.photo ? `
      <div style="margin-top:10px;display:flex;align-items:center;gap:10px;">
        <img src="${block.photo}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
        <button data-action="remove-photo" style="font-size:12px;color:#ef4444;border:1px solid #fecaca;background:var(--bg-card);border-radius:6px;padding:4px 10px;cursor:pointer;">Удалить фото</button>
      </div>` : ''}
  `;

  // Text/select inputs
  row.querySelectorAll<HTMLInputElement>('input[data-field]').forEach(inp => {
    const field = inp.dataset['field']!;
    if (field === 'photo-file') return;
    inp.addEventListener('input', () => {
      onUpdate({ ...block, [field]: inp.value });
    });
  });

  // Color input
  row.querySelector<HTMLInputElement>('input[type=color]')?.addEventListener('input', e => {
    onUpdate({ ...block, bgColor: (e.target as HTMLInputElement).value });
  });

  // Size radio
  row.querySelectorAll<HTMLInputElement>(`input[name="size-${block.id}"]`).forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) onUpdate({ ...block, size: r.value as 'large' | 'small' });
    });
  });

  // Photo file
  row.querySelector<HTMLInputElement>(`#photo-file-${block.id}`)?.addEventListener('change', async e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    onUpdate({ ...block, photo: b64 });
  });

  // Action buttons
  row.querySelector('[data-action="up"]')?.addEventListener('click', () => onMove(-1));
  row.querySelector('[data-action="down"]')?.addEventListener('click', () => onMove(1));
  row.querySelector('[data-action="del"]')?.addEventListener('click', onDelete);
  row.querySelector('[data-action="remove-photo"]')?.addEventListener('click', () => {
    onUpdate({ ...block, photo: undefined });
  });

  return row;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function renderAdminHome(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  let state: HomeSettings = JSON.parse(JSON.stringify(getHomeSettings()));

  function buildContent(): HTMLElement {
    const wrap = document.createElement('div');

    wrap.innerHTML = `
      <div class="container">
        <section style="padding:40px 0 80px;max-width:700px;">
          <button class="btn btn-ghost" id="back-btn" style="margin-bottom:24px;">← Назад</button>
          <h1 style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;color:var(--text-primary);">Редактирование главной страницы</h1>

          <!-- ── Текст ── -->
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">
            <h2 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text-primary);">Текст</h2>
            <div style="margin-bottom:14px;">
              <label style="font-size:13px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Заголовок <span style="color:#6b7280;font-weight:400;">(\\n = перенос строки)</span></label>
              <textarea id="f-headline" rows="2" style="${IS}resize:vertical;">${state.headline}</textarea>
            </div>
            <div>
              <label style="font-size:13px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Подзаголовок</label>
              <textarea id="f-sub" rows="3" style="${IS}resize:vertical;">${state.subheadline}</textarea>
            </div>
          </div>

          <!-- ── Фотографии ── -->
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div>
                <h2 style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:2px;">Фотографии карусели</h2>
                <p style="font-size:12px;color:var(--text-muted);">До 8 фотографий</p>
              </div>
              <label id="add-photos-label" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--accent);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;">
                + Добавить фото
                <input type="file" id="add-photos-input" accept="image/*" multiple style="display:none;">
              </label>
            </div>
            <div id="photos-grid" style="display:flex;flex-wrap:wrap;gap:10px;"></div>
          </div>

          <!-- ── Блоки ── -->
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <h2 style="font-size:15px;font-weight:600;color:var(--text-primary);">Блоки страницы</h2>
              <button class="btn btn-outline" id="add-block-btn" style="font-size:13px;padding:7px 14px;">+ Добавить блок</button>
            </div>
            <div id="blocks-list"></div>
          </div>

          <!-- ── Save ── -->
          <div style="display:flex;align-items:center;gap:16px;">
            <button class="btn btn-primary" id="save-btn" style="padding:11px 28px;">Сохранить</button>
            <span id="save-ok" style="font-size:14px;color:#16a34a;display:none;">Сохранено ✓</span>
          </div>
        </section>
      </div>
    `;

    wrap.querySelector('#back-btn')!.addEventListener('click', () => navigate('/admin'));

    // Headline / sub sync
    wrap.querySelector<HTMLTextAreaElement>('#f-headline')!.addEventListener('input', e => {
      state.headline = (e.target as HTMLTextAreaElement).value;
    });
    wrap.querySelector<HTMLTextAreaElement>('#f-sub')!.addEventListener('input', e => {
      state.subheadline = (e.target as HTMLTextAreaElement).value;
    });

    // Photos grid
    const photosGrid = wrap.querySelector('#photos-grid')!;
    function renderPhotos(): void {
      photosGrid.innerHTML = '';
      state.photos.forEach((src, i) => {
        const item = document.createElement('div');
        item.style.cssText = 'position:relative;display:inline-block;';
        item.innerHTML = `
          <img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">
          <button data-idx="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
        `;
        item.querySelector('button')!.addEventListener('click', () => {
          state.photos.splice(i, 1);
          renderPhotos();
        });
        photosGrid.appendChild(item);
      });
      if (!state.photos.length) {
        photosGrid.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Фотографий нет</p>';
      }
    }
    renderPhotos();

    wrap.querySelector<HTMLInputElement>('#add-photos-input')!.addEventListener('change', async e => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      const remaining = 8 - state.photos.length;
      const toProcess = files.slice(0, remaining);
      const b64s = await Promise.all(toProcess.map(fileToBase64));
      state.photos.push(...b64s);
      (e.target as HTMLInputElement).value = '';
      renderPhotos();
    });

    // Blocks list
    const blocksList = wrap.querySelector('#blocks-list')!;
    function renderBlocks(): void {
      blocksList.innerHTML = '';
      state.blocks.forEach((block, i) => {
        const row = buildBlockRow(
          block,
          i,
          state.blocks.length,
          updated => { state.blocks[i] = updated; renderBlocks(); },
          () => { state.blocks.splice(i, 1); renderBlocks(); },
          dir => {
            const j = i + dir;
            if (j < 0 || j >= state.blocks.length) return;
            [state.blocks[i], state.blocks[j]] = [state.blocks[j], state.blocks[i]];
            renderBlocks();
          },
        );
        blocksList.appendChild(row);
      });
    }
    renderBlocks();

    wrap.querySelector('#add-block-btn')!.addEventListener('click', () => {
      state.blocks.push({ id: uid(), title: 'Новый блок', description: 'Описание', size: 'small', bgColor: '#374151' });
      renderBlocks();
    });

    // Save
    const saveBtn  = wrap.querySelector<HTMLButtonElement>('#save-btn')!;
    const saveOk   = wrap.querySelector<HTMLElement>('#save-ok')!;
    saveBtn.addEventListener('click', () => {
      saveHomeSettings(state);
      saveOk.style.display = 'inline';
      setTimeout(() => { saveOk.style.display = 'none'; }, 3000);
    });

    return wrap;
  }

  page.appendChild(buildContent());
  return page;
}
