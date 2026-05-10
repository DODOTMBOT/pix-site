import { login } from '../services/auth';
import { navigate } from '../router';

export function renderLogin(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: #f9fafb;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;

  function render(errorMsg = ''): void {
    page.innerHTML = `
      <div style="width:100%;max-width:400px;">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:48px;height:48px;background:var(--accent);color:#fff;font-size:16px;font-weight:700;letter-spacing:0.03em;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;margin-bottom:12px;">PiX</div>
          <div style="font-size:22px;font-weight:700;color:#111;letter-spacing:-0.02em;">PiX</div>
          <div style="font-size:13px;color:#9ca3af;margin-top:2px;">Dodo Pizza · Внутренняя сеть</div>
        </div>

        <!-- Card -->
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <h1 style="font-size:20px;font-weight:700;color:#111;margin-bottom:24px;">Вход</h1>

          ${errorMsg ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:13px;color:#ef4444;margin-bottom:20px;">
              ${errorMsg}
            </div>
          ` : ''}

          <form id="login-form" novalidate>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">Email</label>
              <input id="f-email" type="email" autocomplete="email" placeholder="you@pix-dodo.ru"
                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;background:#fff;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:24px;">
              <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">Пароль</label>
              <input id="f-password" type="password" autocomplete="current-password" placeholder="••••••••"
                style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:var(--font);color:#111;outline:none;transition:border-color 0.15s;background:#fff;box-sizing:border-box;">
            </div>
            <button type="submit" id="submit-btn" class="btn btn-primary btn-lg" style="width:100%;">Войти</button>
          </form>
        </div>
      </div>
    `;

    const emailIn = page.querySelector<HTMLInputElement>('#f-email')!;
    const pwdIn   = page.querySelector<HTMLInputElement>('#f-password')!;

    [emailIn, pwdIn].forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; });
      el.addEventListener('blur',  () => { el.style.borderColor = '#e5e7eb'; });
    });

    page.querySelector<HTMLFormElement>('#login-form')!.addEventListener('submit', async e => {
      e.preventDefault();
      const btn   = page.querySelector<HTMLButtonElement>('#submit-btn')!;
      const email = emailIn.value.trim();
      const pwd   = pwdIn.value;

      if (!email || !pwd) { render('Введите email и пароль'); return; }

      btn.disabled = true;
      btn.textContent = 'Вход...';

      try {
        await login(email, pwd);
        navigate('/');
      } catch (err) {
        render((err as Error).message || 'Ошибка входа');
      }
    });
  }

  render();
  return page;
}
