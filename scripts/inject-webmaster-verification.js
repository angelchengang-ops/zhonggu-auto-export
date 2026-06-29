const fs = require('fs');
const path = require('path');

const verifications = [
  { env: 'NEXT_PUBLIC_BING_VERIFICATION', name: 'msvalidate.01' },
  { env: 'NEXT_PUBLIC_YANDEX_VERIFICATION', name: 'yandex-verification' }
].map((item) => ({ ...item, content: process.env[item.env] })).filter((item) => item.content);

if (!verifications.length) {
  console.log('No Bing/Yandex webmaster verification env vars set; skipping meta injection.');
  process.exit(0);
}

const roots = ['.'];
const htmlFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'tmp', '__pycache__'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
};
roots.forEach(walk);

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const { name, content } of verifications) {
    const tag = `<meta name="${name}" content="${String(content).replace(/"/g, '&quot;')}">`;
    if (html.includes(`name="${name}"`)) continue;
    html = html.replace('</head>', `  ${tag}\n</head>`);
    changed = true;
  }
  if (changed) fs.writeFileSync(file, html, 'utf8');
}

console.log(`Injected webmaster verification meta into ${htmlFiles.length} HTML files.`);
