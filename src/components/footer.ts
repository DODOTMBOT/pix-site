export function renderFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.style.cssText = 'border-top: 1px solid var(--border); padding: 24px 0; background: var(--bg); margin-top: auto;';

  footer.innerHTML = `
    <div class="container">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-size:13px; color:var(--text-secondary);">PiX · Dodo Pizza</span>
        <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">
          <div style="width:7px; height:7px; border-radius:50%; background:#22c55e; flex-shrink:0;"></div>
          <span>Система активна</span>
        </div>
      </div>
    </div>
  `;

  return footer;
}
