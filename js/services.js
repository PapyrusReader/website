((root) => {
  'use strict';
  const repository = 'https://github.com/PapyrusReader/client';
  const suffixes = {
    installer: 'windows-x64-setup.exe', windows_archive: 'windows-x64.zip',
    deb: 'linux-x64.deb', appimage: 'linux-x64.AppImage', linux_archive: 'linux-x64.tar.gz',
    android: 'android-universal.aab', android_apk: 'android-universal.apk', web: 'web.zip', instructions: 'INSTALL.md',
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
  function serviceStatus(snapshot, now = Date.now()) {
    const checkedAt = Date.parse(snapshot?.checked_at);
    if (!Number.isFinite(checkedAt) || checkedAt > now + 60000 || now - checkedAt > 180000) {
      throw new Error('Status snapshot is stale or invalid');
    }
    const states = {};
    for (const service of ['api', 'sync']) {
      const state = snapshot.services?.[service];
      if (!['operational', 'disrupted'].includes(state)) throw new Error('Invalid service status');
      states[service] = state;
    }
    return { checkedAt, states };
  }
  const api = { releaseDownloads, serviceStatus };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PapyrusSite = api;
})(globalThis);
