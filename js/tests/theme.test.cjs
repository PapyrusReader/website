const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const source = readFileSync(join(__dirname, '../theme.js'), 'utf8');
function boot({ stored = null, dark = false, blocked = false } = {}) {
  const writes = [];
  const events = {};
  const system = { matches: dark, addEventListener: (_, callback) => { system.change = callback; } };
  const document = { documentElement: { dataset: {} }, getElementById: () => ({ setAttribute: (_, value) => { document.meta = value; } }) };
  const window = { matchMedia: () => system, dispatchEvent: () => {}, addEventListener: (name, callback) => { events[name] = callback; } };
  const localStorage = { getItem() { if (blocked) throw Error('unavailable'); return stored; }, setItem(key, value) { if (blocked) throw Error('unavailable'); writes.push([key, value]); } };
  runInNewContext(source, { window, document, localStorage, Event: class {} });
  return { document, window, system, events, writes };
}
test('system preference is applied before the page renders without persisting a default', () => {
  for (const dark of [false, true]) {
    const app = boot({ dark });
    assert.equal(app.document.documentElement.dataset.theme, dark ? 'dark' : 'light');
    assert.equal(app.document.meta, dark ? '#1C1B1F' : '#FFFBFF');
    assert.deepEqual(app.writes, []);
  }
});
test('system changes follow through until a visitor explicitly chooses a theme', () => {
  const app = boot();
  app.system.matches = true; app.system.change();
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  app.window.PapyrusTheme.toggle();
  assert.deepEqual(app.writes, [['papyrus-theme', 'light']]);
  app.system.change();
  assert.equal(app.document.documentElement.dataset.theme, 'light');
});
test('saved light/dark choices override the operating system', () => {
  for (const stored of ['light', 'dark']) {
    const app = boot({ stored, dark: stored === 'light' });
    assert.equal(app.document.documentElement.dataset.theme, stored);
    app.system.matches = !app.system.matches; app.system.change();
    assert.equal(app.document.documentElement.dataset.theme, stored);
    assert.deepEqual(app.writes, []);
  }
});
test('all four old color themes migrate to a light/dark preference', () => {
  for (const stored of ['light-gold', 'dark-gold', 'light-purple', 'dark-purple']) {
    const expected = stored.split('-')[0];
    const app = boot({ stored });
    assert.equal(app.document.documentElement.dataset.theme, expected);
    assert.deepEqual(app.writes, [['papyrus-theme', expected]]);
  }
});
test('invalid preferences fall back to the system without rewriting storage', () => {
  const app = boot({ stored: 'unknown', dark: true });
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  assert.deepEqual(app.writes, []);
});
test('theme switching works when browser storage is blocked', () => {
  const app = boot({ blocked: true, dark: true });
  app.window.PapyrusTheme.toggle();
  assert.equal(app.document.documentElement.dataset.theme, 'light');
  app.system.change();
  assert.equal(app.document.documentElement.dataset.theme, 'light');
});
test('cross-tab changes and clearing the preference restore expected behavior', () => {
  const app = boot({ stored: 'light', dark: true });
  app.events.storage({ key: 'papyrus-theme', newValue: 'dark' });
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  app.events.storage({ key: 'papyrus-theme', newValue: null });
  app.system.matches = false; app.system.change();
  assert.equal(app.document.documentElement.dataset.theme, 'light');
  app.events.storage({ key: 'unrelated', newValue: 'dark' });
  assert.equal(app.document.documentElement.dataset.theme, 'light');
});
