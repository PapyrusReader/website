(() => {
  'use strict';

  const THEMES = {
    'light-gold': { metaColor: '#FDFAF5' },
    'dark-gold': { metaColor: '#1A1814' },
    'light-purple': { metaColor: '#FAFAFE' },
    'dark-purple': { metaColor: '#151318' },
  };

  const DEFAULT_THEME = 'light-gold';
  const RELEASES_URL = 'https://github.com/PapyrusReader/client/releases';
  const PLATFORMS = Object.fromEntries([
    ['android', 'Android'], ['ios', 'iOS'], ['windows', 'Windows'],
    ['macos', 'macOS'], ['linux', 'Linux'], ['web', 'Web'],
  ].map(([key, name]) => [key, { name }]));

  const getCurrentTheme = () =>
    document.documentElement.getAttribute('data-theme') ?? DEFAULT_THEME;

  const setTheme = (theme) => {
    if (!THEMES[theme])
      return;

    document.documentElement.setAttribute('data-theme-transitioning', '');
    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('meta-theme-color')
      ?.setAttribute('content', THEMES[theme].metaColor);

    try { localStorage.setItem('papyrus-theme', theme); } catch { }

    document.querySelectorAll('.theme-option').forEach((opt) => {
      opt.classList.toggle('is-active', opt.getAttribute('data-theme') === theme);
    });

    setTimeout(() => {
      document.documentElement.removeAttribute('data-theme-transitioning');
    }, 350);


  };

  const detectPlatform = () => {
    const ua = navigator.userAgent ?? '';
    const platform = navigator.platform ?? '';
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Win/.test(platform)) return 'windows';
    if (/Mac/.test(platform)) return 'macos';
    if (/Linux/.test(platform)) return 'linux';
    return null;
  };

  const el = (tag, className, attrs) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    }
    return node;
  };

  const faIcon = (classes) => el('i', classes, { 'aria-hidden': 'true' });

  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const themeToggle = document.getElementById('theme-toggle');
  const themeDropdown = document.getElementById('theme-dropdown');
  const themeBtn = themeToggle.querySelector('.theme-toggle-btn');
  const detailsPanel = document.getElementById('platform-details');
  const platformCards = document.querySelectorAll('.platform-card[data-platform]');
  const detectedPlatform = detectPlatform();
  let currentPlatform = null;

  const buildPanelEl = (key) => {
    const cfg = PLATFORMS[key];
    if (!cfg) return null;

    const inner = el('div', 'platform-details-inner');
    const left = el('div', 'platform-details-left');
    const header = el('div', 'platform-details-header');
    const title = el('h3', 'platform-details-title');
    title.textContent = cfg.name;
    header.appendChild(title);
    left.appendChild(header);

    const actions = el('div', 'platform-details-actions');
    const actionsRow = el('div', 'platform-actions-row');
    const releases = el('a', 'platform-download-btn', { href: RELEASES_URL });
    releases.appendChild(faIcon('fa-brands fa-github'));
    const label = document.createElement('span');
    label.textContent = 'Check available releases';
    releases.appendChild(label);
    actionsRow.appendChild(releases);
    actions.appendChild(actionsRow);
    const meta = el('span', 'platform-download-meta');
    meta.textContent = 'Platform support is under development. Release builds are not published yet.';
    actions.appendChild(meta);
    left.appendChild(actions);
    inner.appendChild(left);
    return inner;
  };

  const collapsePanel = () => {
    if (!currentPlatform) return;

    document.querySelector(`.platform-card[data-platform="${currentPlatform}"]`)
      ?.setAttribute('aria-expanded', 'false');

    detailsPanel.classList.remove('is-open');
    detailsPanel.setAttribute('hidden', '');
    detailsPanel.replaceChildren();
    currentPlatform = null;
  };

  const clearDetectedHighlight = () => {
    platformCards.forEach((c) => c.classList.remove('platform-card--detected'));
  };

  const expandPlatform = (key) => {
    clearDetectedHighlight();

    if (currentPlatform === key) {
      collapsePanel();
      return;
    }

    if (currentPlatform) collapsePanel();

    currentPlatform = key;
    const content = buildPanelEl(key);
    if (content) detailsPanel.appendChild(content);
    detailsPanel.removeAttribute('hidden');
    detailsPanel.classList.add('is-open');

    document.querySelector(`.platform-card[data-platform="${key}"]`)
      ?.setAttribute('aria-expanded', 'true');

  };

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = themeDropdown.classList.toggle('is-open');
    themeBtn.setAttribute('aria-expanded', isOpen);
  });

  themeDropdown.querySelectorAll('.theme-option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      setTheme(opt.getAttribute('data-theme'));
      themeDropdown.classList.remove('is-open');
      themeBtn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }

    if (!themeToggle.contains(e.target)) {
      themeDropdown.classList.remove('is-open');
      themeBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const targetId = anchor.getAttribute('href');

      if (targetId === '#')
        return;

      const target = document.querySelector(targetId);

      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  platformCards.forEach((card) => {
    card.addEventListener('click', () => {
      expandPlatform(card.getAttribute('data-platform'));
    });
  });

  const storedTheme = getCurrentTheme();

  document.querySelectorAll('.theme-option').forEach((opt) => {
    opt.classList.toggle('is-active', opt.getAttribute('data-theme') === storedTheme);
  });

  if (detectedPlatform) {
    platformCards.forEach((card) => {
      if (card.getAttribute('data-platform') === detectedPlatform) {
        card.classList.add('platform-card--detected');
      }
    });

    expandPlatform(detectedPlatform);
  }
})();
