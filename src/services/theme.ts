export function initTheme(): void {
  const saved = localStorage.getItem('pix_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

export function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pix_theme', next);
  updateToggleButton();
}

export function updateToggleButton(): void {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? 'Светлая тема' : 'Тёмная тема';
}
