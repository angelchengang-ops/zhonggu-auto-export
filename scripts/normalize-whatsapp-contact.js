const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const NEW_DISPLAY = '+86 18661888866';
const NEW_DIGITS = '8618661888866';
const NEW_WA = `https://wa.me/${NEW_DIGITS}`;
const oldDigits = ['4474', '73271351'].join('');

const textExtensions = new Set([
  '.html', '.js', '.json', '.xml', '.txt', '.md', '.css', '.toml'
]);

const trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean)
  .filter((file) => textExtensions.has(path.extname(file).toLowerCase()));

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
