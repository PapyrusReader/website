((root) => {
  'use strict';
  const repository = 'https://github.com/PapyrusReader/client';
  const suffixes = {
    installer: 'windows-x64-setup.exe', windows_archive: 'windows-x64.zip',
    deb: 'linux-x64.deb', appimage: 'linux-x64.AppImage', linux_archive: 'linux-x64.tar.gz',
    android: 'android-universal.aab', web: 'web.zip', instructions: 'INSTALL.md',
    checksums: 'SHA256SUMS', manifest: 'release-manifest.json',
  };
  function releaseDownloads(release) {
    if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+\+[1-9]\d*$/.test(release.tag_name) || !Array.isArray(release.assets)) {
      throw new Error('Invalid release');
    }
    const base = `${repository}/releases/download/${encodeURIComponent(release.tag_name)}/`;
    const assets = new Map(release.assets.map(asset => [asset.name, asset]));
    const links = {};
    for (const [key, suffix] of Object.entries(suffixes)) {
      const name = ['checksums', 'manifest'].includes(key) ? suffix : `papyrus-${release.tag_name}-${suffix}`;
      const asset = assets.get(name);
      if (!asset) continue;
      const expected = base + encodeURIComponent(name);
      if (asset.browser_download_url !== expected) throw new Error('Unexpected download destination');
      links[key] = expected;
    }
    if (!Object.keys(links).length) throw new Error('No release downloads');
    return { version: release.tag_name.slice(1), notes: `${repository}/releases/tag/${encodeURIComponent(release.tag_name)}`, links };
  }
  async function checkService(url, service, fetcher = fetch, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const start = performance.now();
    try {
      const response = await fetcher(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
      if (!response.ok) return { state: 'unavailable', message: `HTTP ${response.status}` };
      const data = await response.json();
      const healthy = service === 'api' ? data.status === 'healthy' : data.ready === true && data.started === true;
      return { state: healthy ? 'healthy' : 'unavailable', message: healthy ? `${Math.round(performance.now() - start)} ms` : 'Health check did not pass' };
    } catch (error) {
      return { state: 'unknown', message: controller.signal.aborted ? 'Check timed out' : 'Could not check from this browser' };
    } finally {
      clearTimeout(timer);
    }
  }
  const api = { releaseDownloads, checkService };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PapyrusSite = api;
})(globalThis);
