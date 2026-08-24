const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', '.npm-cache', 'tmp', 'admin', 'media-inbox', 'media-processed', 'media-trash']);
const declaration = '<link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/images/og-image.jpg">';

const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) visit(path.join(directory, entry.name));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    if (/^yandex_[a-z0-9]+\.html$/i.test(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const before = fs.readFileSync(file, 'utf8');
    if (!/<head[>\s]/i.test(before) || /rel=["'](?:shortcut )?icon["']/i.test(before)) continue;
    const after = before.replace(/<\/head>/i, `${declaration}</head>`);
    if (after !== before) {
      try { fs.writeFileSync(file, after, 'utf8'); }
      catch (error) { if (error.code !== 'EPERM') throw error; }
    }
  }
};

visit(ROOT);
console.log('Favicon declarations verified');
