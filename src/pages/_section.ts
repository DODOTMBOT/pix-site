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
      <section style="padding: 48px 0 64px;">
        <button class="btn btn-ghost" id="back-btn">← Назад</button>
        <div style="margin-top: 28px; margin-bottom: 32px;">
          <h1 style="font-size:36px; font-weight:700; letter-spacing:-0.02em; color:var(--text); margin-bottom:8px;">${title}</h1>
          <p style="font-size:15px; color:var(--text-secondary);">${subtitle}</p>
        </div>
        <div class="placeholder-card">
          <div class="placeholder-title">Раздел в разработке</div>
          <div class="placeholder-sub">Содержимое появится в ближайшее время</div>
        </div>
      </section>
    </div>
  `;

  page.querySelector('#back-btn')!.addEventListener('click', onBack);

  return page;
}
