const fs = require('fs');
const { createHash } = require('node:crypto');
const { version } = require('../package.json');
const stylesheet = fs.readFileSync('build/css/style.css', 'utf8');
const themeScript = fs.readFileSync('build/js/theme.js', 'utf8');

function versionAsset(url) {
  const path = url.startsWith('public/') ? url : `build/${url}`;
  const hash = createHash('sha256').update(fs.readFileSync(path)).digest('hex').slice(0, 16);
  return `${url}?v=${hash}`;
}

for (const file of ['build/index.html', 'build/status/index.html']) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<script src="(?:\.\.\/|\/)?js\/theme\.js"><\/script>/, () => `<script>${themeScript}</script>`);
  html = html.replace(/<link rel="stylesheet" href="(?:\.\.\/|\/)?css\/style\.css">/, () => `<style>${stylesheet}</style>`);
  html = html.replace(/(?:css|js|public)\/[\w./-]+\.(?:css|js|svg|webp|jpg|png|ico|webmanifest)\b/g, versionAsset);
  fs.writeFileSync(file, html);
}
fs.writeFileSync('build/version.json', JSON.stringify({ version, revision: process.env.BUILD_REVISION || null }) + '\n');
