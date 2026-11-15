/* Local-only appearance preference. Run in <head> before the first paint. */
(() => {
  const key = 'rcm-appearance';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch (_) {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  const icons = {
    moon: '<path d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    paper: '<path d="M14 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9Z"/><path d="M14 2v7h7M7 13h10M7 17h7"/>',
    scores: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4m8-4v4M3 10h18m-13 5 2 2 5-4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2m0 4h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>'
  };
  const svg = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
  function apply() {
    const mode = preference || (system.matches ? 'dark' : 'light');
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const dark = mode === 'dark';
      button.hidden = false;
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to day mode' : 'Switch to night mode');
      button.title = dark ? 'Switch to day mode' : 'Switch to night mode';
      button.innerHTML = svg(dark ? 'sun' : 'moon') + '<span>' + (dark ? 'Day mode' : 'Night mode') + '</span>';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#0b1120' : '#edf2f9';
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch (_) {}
      apply();
    }));
    const names = ['grid', 'paper', 'scores', 'help'];
    document.querySelectorAll('.side-nav a > span').forEach((node, i) => { node.innerHTML = svg(names[i] || 'grid'); });
    document.querySelectorAll('.tool-icon').forEach((node, i) => { node.innerHTML = svg(['paper', 'scores', 'check'][i] || 'paper'); });
    apply();
  });
  system.addEventListener?.('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
      apply();
    }
  });
})();
