(() => {
  'use strict';
  const key = 'papyrus-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = (value) => {
    if (['light', 'light-gold', 'light-purple'].includes(value)) return 'light';
    if (['dark', 'dark-gold', 'dark-purple'].includes(value)) return 'dark';
    return null;
  };
  let preference = null;
  try {
    const stored = localStorage.getItem(key);
    preference = normalize(stored);
    if (preference && stored !== preference) localStorage.setItem(key, preference);
  } catch { /* Browsing without storage still supports theme switching. */ }
  const apply = () => {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.getElementById('meta-theme-color')?.setAttribute('content', theme === 'dark' ? '#1C1B1F' : '#FFFBFF');
    window.dispatchEvent(new Event('papyrus:themechange'));
  };
  window.PapyrusTheme = {
    toggle() {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { }
      apply();
    },
  };
  system.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) { preference = normalize(event.newValue); apply(); }
  });
  apply();
})();
