const { test } = require('node:test');
const assert = require('node:assert/strict');
const { releaseDownloads, checkService } = require('../services.js');
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
test('health checks require valid response content and never send credentials', async () => {
  const fetcher = data => async (url, options) => {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => data };
  };
  assert.equal((await checkService('https://example.com', 'api', fetcher({ status: 'healthy' }))).state, 'healthy');
  assert.equal((await checkService('https://example.com', 'sync', fetcher({ ready: true, started: true }))).state, 'healthy');
  assert.equal((await checkService('https://example.com', 'sync', fetcher({ ready: false, started: true }))).state, 'unavailable');
  assert.equal((await checkService('https://example.com', 'api', fetcher({}))).state, 'unavailable');
});
test('service failures are distinguished from network and timeout uncertainty', async () => {
  assert.equal((await checkService('', 'api', async () => ({ ok: false, status: 503 }))).state, 'unavailable');
  assert.equal((await checkService('', 'api', async () => { throw new Error('offline'); })).state, 'unknown');
  const result = await checkService('', 'api', (_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }), 5);
  assert.equal(result.state, 'unknown');
  assert.equal(result.message, 'Check timed out');
});
