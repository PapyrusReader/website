const { test } = require('node:test');
const assert = require('node:assert/strict');
const { releaseDownloads, serviceStatus } = require('../services.js');
function release() {
  return { tag_name: 'v0.0.3+4', draft: false, prerelease: false, assets: [
    { name: 'papyrus-v0.0.3+4-windows-x64-setup.exe', browser_download_url: 'https://github.com/PapyrusReader/client/releases/download/v0.0.3%2B4/papyrus-v0.0.3%2B4-windows-x64-setup.exe' },
  ] };
}
test('latest asset links follow the published version and omit absent formats', () => {
  const result = releaseDownloads(release());
  assert.equal(result.version, '0.0.3+4');
  assert.match(result.links.installer, /v0.0.3%2B4/);
  assert.equal(result.links.deb, undefined);
});
test('drafts, malformed releases and unexpected download destinations are rejected', () => {
  for (const changed of [{ draft: true }, { prerelease: true }, { tag_name: '../bad' }, { assets: [] }]) {
    assert.throws(() => releaseDownloads({ ...release(), ...changed }));
  }
  const value = release();
  value.assets[0].browser_download_url = 'https://example.com/installer.exe';
  assert.throws(() => releaseDownloads(value));
});
test('status snapshots report monitored results and reject stale or incomplete data', () => {
  const now = Date.now();
  const snapshot = { checked_at: new Date(now).toISOString(), services: { api: 'operational', sync: 'disrupted' } };
  assert.deepEqual(serviceStatus(snapshot, now).states, snapshot.services);
  assert.throws(() => serviceStatus(snapshot, now + 180001));
  assert.throws(() => serviceStatus(snapshot, now - 60001));
  assert.throws(() => serviceStatus({ ...snapshot, checked_at: 'invalid' }, now));
  assert.throws(() => serviceStatus({ ...snapshot, services: { api: 'operational' } }, now));
});
