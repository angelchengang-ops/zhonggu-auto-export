const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const packageDir = path.dirname(require.resolve('libphonenumber-js/package.json'));
const bundle = fs.readFileSync(path.join(packageDir, 'bundle/libphonenumber-max.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
const helper = fs.readFileSync(path.join(__dirname, 'lib/phone.js'), 'utf8');
fs.writeFileSync(path.join(root, 'assets/js/phone-input.js'), bundle + '\n' + helper);
fs.copyFileSync(path.join(packageDir, 'LICENSE'), path.join(root, 'assets/js/phone-input.LICENSE.txt'));
const { pattern } = require('./lib/phone');
const ignored = new Set(['node_modules', 'tmp', 'admin', 'ops', 'data', 'media-inbox', 'media-processed', 'media-trash']);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const old = fs.readFileSync(file, 'utf8');
    if (!/script\.js|whatsapp-config\.js|whatsapp-lead-modal\.js/.test(old)) continue;
    let next = old.replace(/<input\b[^>]*\bname="phone_number"[^>]*>/g, tag =>
      tag.replace(/\s+pattern="[^"]*"/g, '').replace(/\s*\/?>$/, ` pattern="${pattern}">`));
    if (!next.includes('/assets/js/phone-input.js')) next = next.replace('</head>', '<script defer src="/assets/js/phone-input.js"></script>\n</head>');
    // Put the dependency before existing deferred scripts, not after them.
    next = next.replace(/<script defer src="\/assets\/js\/phone-input\.js(?:\?[^\"]*)?"><\/script>\s*/g, '');
    next = next.replace(/<head([^>]*)>/i, '$&\n<script defer src="/assets/js/phone-input.js"></script>');
    if (old !== next) fs.writeFileSync(file, next);
  }
}
walk(root);
console.log('Built first-party global phone rules and updated public form dependencies.');
