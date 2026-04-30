interface SectionPageOptions {
  title: string;
  subtitle: string;
  onBack: () => void;
}

export function buildSectionPage({ title, subtitle, onBack }: SectionPageOptions): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page-enter';

  page.innerHTML = `
    <div class="container">
      <section style="padding: 40px 0 48px;">
        <button class="btn btn-ghost" id="back-btn">← Назад</button>
        <div style="margin-top: 24px;">
          <div style="font-size:11px; font-weight:600; letter-spacing:0.12em; color:var(--text-secondary); text-transform:uppercase; margin-bottom:14px;">Раздел</div>
          <h1 style="font-size:28px; font-weight:700; letter-spacing:-0.02em; color:var(--text); margin-bottom:8px;">${title}</h1>
          <p style="font-size:14px; color:var(--text-secondary); margin-bottom:40px;">${subtitle}</p>
          <div class="placeholder-card">
            <div class="placeholder-title">Раздел в разработке</div>
            <div class="placeholder-sub">Содержимое появится в ближайшее время</div>
          </div>
        </div>
      </section>
    </div>
  `;

  page.querySelector('#back-btn')!.addEventListener('click', onBack);

  return page;
}
