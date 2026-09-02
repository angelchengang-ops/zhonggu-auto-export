const fs = require('fs');
const path = require('path');

const WEBSITE_ID = '90433778-44ce-4a64-9f99-a3c9986fe41f';
const TRACKING_TAG = `<script defer src="https://cloud.umami.is/script.js" data-website-id="${WEBSITE_ID}"></script>`;
const htmlFiles = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['admin', 'node_modules', 'tmp', '__pycache__'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('yandex_')) htmlFiles.push(full);
  }
};

walk('.');

let changed = 0;
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(`data-website-id="${WEBSITE_ID}"`) || !html.includes('</head>')) continue;
  // Optional analytics must never delay first-party scripts on lightweight pages.
  const tag = html.includes('data-lightweight-page="true"') ? TRACKING_TAG.replace(' defer ', ' async ') : TRACKING_TAG;
  html = html.replace('</head>', `  ${tag}\n</head>`);
  fs.writeFileSync(file, html, 'utf8');
  changed += 1;
}

console.log(`Injected Umami analytics into ${changed} HTML files.`);
