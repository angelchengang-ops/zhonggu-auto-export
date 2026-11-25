const fs = require('node:fs');
const path = require('node:path');

const navigationTranslations = require('../lang.json');
const root = path.resolve(__dirname, '..');
const labels = {
  en: ['China Operations', 'Hong Kong Operations'],
  fr: ['Activités en Chine', 'Activités à Hong Kong'],
  ar: ['العمليات في الصين', 'العمليات في هونغ كونغ'],
  ru: ['Деятельность в Китае', 'Деятельность в Гонконге'],
  fa: ['فعالیت در چین', 'فعالیت در هنگ‌کنگ'],
  es: ['Operaciones en China', 'Operaciones en Hong Kong']
};
const assets = '<link rel="stylesheet" href="/assets/css/company-operations.css">\n<script defer src="/assets/js/company-operations.js"></script>';
const companyLink = /<a\b([^>]*\bhref="(?:\/|\.\.\/)*company\.html"[^>]*)>([^<]+)<\/a>/i;

function updatePage(file) {
  const source = fs.readFileSync(file, 'utf8');
  const footer = /(<footer\b[^>]*>\s*<div\b[^>]*class="[^"]*\bfooter-wrap\b[^"]*"[^>]*>)/i;
  if (!footer.test(source) || !source.includes('</head>') || source.includes('class="operations-footer"')) return;

  const language = source.match(/<html\b[^>]*\blang="([a-z]+)/i)?.[1] || 'en';
  const [china, hongKong] = labels[language] || labels.en;
  const links = `<a href="/company.html" data-i18n="operations.china">${china}</a><a href="/hong-kong" data-i18n="operations.hongKong">${hongKong}</a>`;
  let html = source.replace(footer, `$1<nav class="operations-footer">${links}</nav>`);
  html = html.replace(/(<nav\b[^>]*class="[^"]*\bmain-nav\b[^"]*"[^>]*>)([\s\S]*?)(<\/nav>)/i, (nav, start, content, end) => {
    const uniqueLinks = content.replace(/<a\b[^>]*href="\/hong-kong"[^>]*>[^<]*<\/a>/i, '');
    const renderMenu = (label) => {
      const active = ['company.html', 'hong-kong.html'].includes(path.basename(file));
      return `<details class="operations-menu"><summary${active ? ' class="active"' : ''} data-i18n="nav.company">${label}</summary><div class="operations-menu-links">${links}</div></details>`;
    };
    const label = language === 'fa' ? 'شرکت' : navigationTranslations[language]?.['nav.company'] || 'Company';
    const dropdown = companyLink.test(uniqueLinks)
      ? uniqueLinks.replace(companyLink, (_, attrs, existingLabel) => renderMenu(existingLabel))
      : uniqueLinks + renderMenu(label);
    return start + dropdown + end;
  });
  html = html.replace('</head>', assets + '\n</head>');
  fs.writeFileSync(file, html);
}

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.html')) updatePage(fullPath);
  }
}

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  const fullPath = path.join(root, entry.name);
  if (entry.isFile() && entry.name.endsWith('.html')) updatePage(fullPath);
  if (entry.isDirectory() && ['ar', 'es', 'fa', 'fr', 'ru', 'landing', 'new-cars'].includes(entry.name)) scan(fullPath);
}
