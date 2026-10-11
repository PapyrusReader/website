(async () => {
  'use strict';
  const label = document.getElementById('release-label');
  try {
    const response = await fetch('https://api.github.com/repos/PapyrusReader/client/releases/latest', { signal: AbortSignal.timeout(8000), credentials: 'omit' });
    if (!response.ok) throw new Error('Release lookup failed');
    const release = window.PapyrusSite.releaseDownloads(await response.json());
    for (const link of document.querySelectorAll('[data-download]')) {
      const url = release.links[link.dataset.download];
      link.hidden = !url;
      if (url) link.href = url;
    }
    document.getElementById('release-notes').href = release.notes;
    label.textContent = `Latest release ${release.version}`;
  } catch {
    label.textContent += ' · Latest release check unavailable';
  }
})();
