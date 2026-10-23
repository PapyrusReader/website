const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('built pages inline critical assets and invalidate cached URLs when asset contents change', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'papyrus-build-test-'));
  const write = (name, contents) => fs.writeFileSync(path.join(directory, name), contents);
  const read = (name) => fs.readFileSync(path.join(directory, name), 'utf8');
  try {
    for (const name of ['build/css', 'build/js', 'build/status', 'public/img']) {
      fs.mkdirSync(path.join(directory, name), { recursive: true });
    }
    write('build/css/style.css', 'body{color:red}');
    write('build/js/theme.js', 'window.theme = "$&";');
    write('build/js/main.js', 'window.ready = true;');
    write('public/img/book.webp', 'first image');
    const build = () => {
      for (const [file, prefix] of [['index.html', ''], ['status/index.html', '/']]) {
        write(`build/${file}`, `<script src="${prefix}js/theme.js"></script><link rel="stylesheet" href="${prefix}css/style.css"><script src="${prefix}js/main.js" defer></script><img src="${prefix}public/img/book.webp" srcset="${prefix}public/img/book.webp 768w">`);
      }
      execFileSync(process.execPath, [path.resolve(__dirname, '../../scripts/stamp-version.js')], { cwd: directory });
    };
    build();
    const before = read('build/index.html');
    for (const file of ['build/index.html', 'build/status/index.html']) {
      const html = read(file);
      assert.ok(html.includes('<style>body{color:red}</style>'));
      assert.ok(html.includes('<script>window.theme = "$&";</script>'));
      assert.doesNotMatch(html, /src="[^"]*theme\.js|rel="stylesheet"/);
      assert.match(html, /book\.webp\?v=[a-f0-9]{16} 768w/);
      assert.match(html, /main\.js\?v=[a-f0-9]{16}" defer/);
    }
    write('public/img/book.webp', 'replacement image');
    build();
    const after = read('build/index.html');
    assert.notEqual(before.match(/book\.webp\?v=\w+/)[0], after.match(/book\.webp\?v=\w+/)[0]);
    assert.equal(before.match(/main\.js\?v=\w+/)[0], after.match(/main\.js\?v=\w+/)[0]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
