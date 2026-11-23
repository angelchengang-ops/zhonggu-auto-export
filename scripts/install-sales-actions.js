const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, html) => fs.writeFileSync(path.join(root, file), html);
const escape = value => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"
})[entity]);
const assets = ['assets/css/sales-actions.css', 'assets/js/sales-actions.js'];
const [css, js] = assets.map(file => `/${file}?v=${createHash('sha256').update(read(file)).digest('hex').slice(0, 12)}`);
const labels = {
  en: ['Get a quote', 'Chat on WhatsApp'],
  ar: ['اطلب عرض سعر', 'تواصل عبر واتساب'],
  fr: ['Demander un devis', 'Discuter sur WhatsApp']
};
const chat = (model, label, placement, market) => {
  const url = `https://wa.me/8618661888866?text=${encodeURIComponent(`Hello, I'm interested in ${model}. [ZG-WEB]`)}`;
  return `<a class="sales-actions__link sales-actions__chat" href="${url}" target="_blank" rel="noopener noreferrer" data-whatsapp-button="true" data-whatsapp-direct data-vehicle="${escape(model)}" data-market="${escape(market)}" data-source="direct_whatsapp_${placement}">${label}</a>`;
};

const paths = [
  'index.html', 'contact.html', 'landing/geely-coolray-exporter-china/index.html',
  ...['en', 'fr', 'ar'].map(lang => `${lang === 'en' ? '' : lang + '/'}landing/geely-binyue-export-algeria/index.html`)
];
for (const dir of ['', 'new-cars']) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    const file = path.join(dir, name);
    if (name.endsWith('.html') && /<body[^>]+class="[^"]*\bvehicle-detail-page\b/.test(read(file))) paths.push(file);
  }
}

for (const file of new Set(paths)) {
  let html = read(file);
  if (html.includes('data-sales-quote')) continue;
  const lang = html.match(/<html lang="([^"]+)/)?.[1] || 'en';
  const [quoteLabel, chatLabel] = labels[lang] || labels.en;
  const vehicle = html.match(/<body[^>]+data-vehicle-name="([^"]+)"/)?.[1];
  const market = file.includes('algeria') ? 'Algeria' : '';
  const model = vehicle ? decode(vehicle) : ['index.html', 'contact.html', 'vehicle.html'].includes(file)
    ? 'Zhonggu Auto Export vehicles' : 'Geely Coolray / Binyue';
  const sold = /<body[^>]+\bvehicle-sold-page\b/.test(html);
  const localizedLanding = (lang === 'fr' || lang === 'ar') && file.includes('geely-binyue-export-algeria');
  if (localizedLanding) {
    const template = read(`${lang}/export-cars-from-china-to-algeria.html`);
    const panel = template.match(/<form\b[^>]*class="inquiry-form[^"]*"[\s\S]*?<\/form>/)?.[0];
    const contactUrl = 'https://zhongguauto.com/' + file.replace(/index\.html$/, '');
    if (!panel || !html.includes('id="quote"')) throw Error(`Missing localized quote template: ${file}`);
    const form = panel
      .replace(/(name="model" value=")[^"]*/, '$1' + model)
      .replace(/(name="source_url" value=")[^"]*/, '$1' + contactUrl)
      .replace(/(name="source_page" value=")[^"]*/, '$1' + model);
    html = html.replace(/(<section[^>]+id="quote"[\s\S]*?)<\/div><\/section>/,
      (_, start) => `${start}<div id="contact" class="inquiry-panel">${form}</div></div></section>`);
    html = html.replace(/<a class="quote-link" href="\/(?:fr|ar)\/export-cars-from-china-to-algeria\.html#contact">[^<]*<\/a>/, '');
    html = html.replace(/(<body[^>]+)>/, '$1 data-lightweight-page>');
    html = html.replace('</body>', '<script defer src="/script.js"></script></body>');
  }
  if (!html.includes('id="contact"') || !/<h1\b[^>]*>/.test(html)) throw Error(`Missing quote section or heading: ${file}`);
  const actions = placement => `<div class="sales-actions${placement === 'mobile' ? ' sales-actions--mobile' : ''}"><a class="sales-actions__link sales-actions__quote" href="#quote-form" data-sales-quote${sold ? ' data-sold' : ''}>${sold ? 'Ask about similar cars' : quoteLabel}</a>${chat(model, chatLabel, placement, market)}</div>`;
  // Existing WhatsApp links within the selected pages should open the same chat.
  html = html.replace(/<a\b([^>]+)>([\s\S]*?)<\/a>/g, (all, attrs, content) => {
    if (!/href="(?:https:\/\/wa\.me\/|#contact-whatsapp)/.test(attrs) || /floating-whatsapp-btn/.test(attrs)) return all;
    return chat(model, chatLabel, 'inline', market);
  });
  // On the English campaign landing and contact page the new pair replaces the old hero buttons.
  if (file === 'contact.html' || file === 'landing/geely-coolray-exporter-china/index.html' || file === 'index.html') {
    html = html.replace(/<div class="hero-actions">[\s\S]*?<\/div>/, old =>
      file === 'index.html' ? old.replace(/<a\b(?![^>]*href="#new-cars")[^>]*>[\s\S]*?<\/a>/g, '') : '');
  }
  html = html
    .replace(/<form class="inquiry-form\b/, '<form id="quote-form" class="inquiry-form')
    .replace(/(<body[^>]+class=")([^"]+)/, '$1$2 sales-actions-page')
    .replace(/<\/h1>/, '</h1>' + actions('hero'))
    .replace('</head>', `<link rel="stylesheet" href="${css}"></head>`)
    .replace('</body>', `${actions('mobile')}<script defer src="${js}"></script></body>`);
  write(file, html);
}
console.log(`Installed sales actions on ${new Set(paths).size} pages.`);
