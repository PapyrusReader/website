const fs = require('fs');
const { version } = require('../package.json');
const assetVersion = process.env.BUILD_REVISION || version;

const file = 'build/index.html';
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/css\/style\.css/g, `css/style.css?v=${assetVersion}`);
html = html.replace(/js\/(main|theme)\.js/g, (_, name) => `js/${name}.js?v=${assetVersion}`);
fs.writeFileSync(file, html);
fs.writeFileSync('build/version.json', JSON.stringify({ version, revision: process.env.BUILD_REVISION || null }) + '\n');
