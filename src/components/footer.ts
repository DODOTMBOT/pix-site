export function renderFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.style.cssText = 'border-top: 1px solid var(--border); padding: 18px 0; background: var(--bg); margin-top: auto;';

  footer.innerHTML = `
    <div class="container">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-size:13px; color:#b0b0a8;">PiX · Dodo Pizza</span>
        <div style="display:flex; align-items:center; gap:7px; font-size:13px; color:var(--text-secondary);">
          <div style="width:7px; height:7px; border-radius:50%; background:#22c55e; flex-shrink:0;"></div>
          <span>Система активна</span>
        </div>
      </div>
    </div>
  `;

  return footer;
}
