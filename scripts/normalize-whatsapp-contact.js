const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const NEW_DISPLAY = '+86 18661888866';
const NEW_DIGITS = '8618661888866';
const NEW_WA = `https://wa.me/${NEW_DIGITS}`;
const oldDigits = ['4474', '73271351'].join('');

const textExtensions = new Set([
  '.html', '.js', '.json', '.xml', '.txt', '.md', '.css', '.toml'
]);

const ignoredDirs = new Set(['.git', 'node_modules', '.npm-cache', 'tmp', 'media-inbox', 'media-processed', 'media-trash', '__pycache__']);
const listTextFiles = (dir, prefix = '') => {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) files.push(...listTextFiles(path.join(dir, entry.name), path.join(prefix, entry.name)));
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = path.join(prefix, entry.name);
    if (textExtensions.has(path.extname(entry.name).toLowerCase())) files.push(relative);
  }
  return files;
};
const trackedFiles = listTextFiles(ROOT);

let changed = 0;
for (const relative of trackedFiles) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) continue;
  let before;
  try { before = fs.readFileSync(file, 'utf8'); } catch { continue; }
  let after = before
    .replace(new RegExp(oldDigits, 'g'), NEW_DIGITS)
    .replace(/\+44\s*7473\s*271351/g, NEW_DISPLAY)
    .replace(/44[\s-]*7473[\s-]*271351/g, NEW_DIGITS)
    .replace(/https:\/\/wa\.me\/8618661888866\?text=/g, `${NEW_WA}?text=`)
    .replace(/https:\/\/api\.whatsapp\.com\/send\?phone=8618661888866&text=/g, `${NEW_WA}?text=`);
  if (path.extname(relative).toLowerCase() === '.html') {
    after = after.replace(/href="#contact-whatsapp"/g, `href="${NEW_WA}"`);
  }
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed += 1;
  }
}

console.log(`Normalized WhatsApp contact details in ${changed} tracked files.`);
