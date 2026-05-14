import { login } from '../services/auth';
import { loadContext } from '../services/pizzeriaContext';
import { rebuildHeader } from '../components/header';
import { navigate } from '../router';

export function renderLogin(): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: var(--bg-primary);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;

  function render(errorMsg = ''): void {
    page.innerHTML = `
      <div style="width:100%;max-width:400px;">

        <div style="text-align:center;margin-bottom:36px;">
          <div style="
            width:60px;height:60px;
            background:var(--accent);
            color:#fff;font-size:15px;font-weight:800;letter-spacing:0.02em;
            display:inline-flex;align-items:center;justify-content:center;
            border-radius:16px;margin-bottom:16px;
            box-shadow:var(--shadow-accent);
          ">PiX</div>
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.03em;margin-bottom:4px;color:var(--accent);">PiX</div>
          <div style="font-size:13px;color:var(--text-muted);">Dodo Pizza · Внутренняя сеть</div>
        </div>

        <div style="
          background:var(--bg-card);
          border:1px solid var(--border);
          border-radius:20px;
          padding:36px;
          box-shadow:var(--shadow-lg);
        ">
          <h1 style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:24px;">Вход в систему</h1>

          ${errorMsg ? `
            <div style="
              background:rgba(239,68,68,0.08);
              border:1px solid rgba(239,68,68,0.25);
              border-radius:var(--radius-sm);
              padding:10px 14px;
              font-size:13px;color:#ef4444;
              margin-bottom:20px;
            ">${errorMsg}</div>
          ` : ''}

          <form id="login-form" novalidate>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;">Email</label>
              <input
                id="f-email"
                type="email"
                autocomplete="email"
                placeholder="you@pix-dodo.ru"
                style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;"
              >
            </div>
            <div style="margin-bottom:28px;">
              <label style="display:block;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;">Пароль</label>
              <input
                id="f-password"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;box-sizing:border-box;"
              >
            </div>
            <button
              type="submit"
              id="submit-btn"
              class="btn btn-primary btn-lg"
              style="width:100%;box-shadow:var(--shadow-accent);"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    `;

    const emailIn = page.querySelector<HTMLInputElement>('#f-email')!;
    const pwdIn   = page.querySelector<HTMLInputElement>('#f-password')!;

    [emailIn, pwdIn].forEach(el => {
      el.addEventListener('focus', () => {
        el.style.borderColor = 'var(--border-focus)';
        el.style.boxShadow   = '0 0 0 3px var(--accent-light)';
      });
      el.addEventListener('blur', () => {
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow   = 'none';
      });
    });

    page.querySelector<HTMLFormElement>('#login-form')!.addEventListener('submit', async e => {
      e.preventDefault();
      const btn   = page.querySelector<HTMLButtonElement>('#submit-btn')!;
      const email = emailIn.value.trim();
      const pwd   = pwdIn.value;

      if (!email || !pwd) { render('Введите email и пароль'); return; }

      btn.disabled    = true;
      btn.textContent = 'Вход...';

      try {
        await login(email, pwd);
        await loadContext();
        rebuildHeader();
        navigate('/');
      } catch (err) {
        render((err as Error).message || 'Ошибка входа');
      }
    });
  }

  render();
  return page;
}
