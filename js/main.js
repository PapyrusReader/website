(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const menuButton = document.getElementById('menu-toggle');
  const links = document.getElementById('nav-links');
  const themeButton = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');
  const closeMenu = () => {
    links.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  menuButton.hidden = false;
  menuButton.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && links.classList.contains('is-open')) { closeMenu(); menuButton.focus(); }
  });
  document.addEventListener('click', (event) => {
    if (!links.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', (event) => {
    if (!links.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.matchMedia('(max-width: 720px)').addEventListener('change', closeMenu);
  const libraryPreview = document.querySelector('.library-preview');
  const libraryDialog = document.getElementById('library-dialog');
  const updatePreviewImage = () => {
    const image = libraryDialog.querySelector('img');
    image.src = libraryPreview.querySelector('[data-library-full-size]').href;
    image.alt = libraryPreview.querySelector('img').alt;
  };
  if (libraryPreview && libraryDialog) {
    libraryPreview.querySelector('[data-library-full-size]').addEventListener('click', (event) => {
      event.preventDefault();
      updatePreviewImage();
      libraryDialog.showModal();
    });
    libraryDialog.addEventListener('click', () => libraryDialog.close());
  }
  const updateThemeUI = () => {
    const theme = document.documentElement.dataset.theme;
    const next = theme === 'dark' ? 'light' : 'dark';
    if (libraryPreview) {
      libraryPreview.querySelector('[data-library-dark]').media = theme === 'dark' ? 'all' : 'not all';
      libraryPreview.querySelector('img').alt = `Papyrus in ${theme} mode, with physical books and ebooks displayed together in a cover grid`;
      libraryPreview.querySelectorAll('[data-library-full-size]').forEach((link) => {
        link.href = `public/img/library-${theme}.jpg`;
      });
      if (libraryDialog && libraryDialog.open) updatePreviewImage();
    }
    themeLabel.textContent = next === 'dark' ? 'Dark' : 'Light';
    themeButton.querySelector('svg').innerHTML = next === 'dark'
      ? '<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
    themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  };
  if (window.PapyrusTheme) {
    themeButton.hidden = false;
    updateThemeUI();
    themeButton.addEventListener('click', () => window.PapyrusTheme.toggle());
    window.addEventListener('papyrus:themechange', updateThemeUI);
  }
})();
