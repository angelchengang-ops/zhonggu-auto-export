const fs = require('node:fs');
const path = require('node:path');
const copy = require('../data/car-sourcing-copy.json');

const root = path.resolve(__dirname, '..');
const site = 'https://zhongguauto.com';
const languageNames = {en: 'English', fr: 'Français', ar: 'العربية', ru: 'Русский', es: 'Español'};
const pagePath = (lang) => lang === 'en' ? '/car-sourcing' : '/' + lang + '/car-sourcing';
const escape = (value) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

for (const [lang, translations] of Object.entries(copy)) {
  const page = pagePath(lang);
  const url = site + page;
  const t = Object.fromEntries(Object.entries(translations).map(([key, value]) => [key, escape(value)]));
  const title = t.name + ' | Zhonggu Auto Export';
  const alternatives = Object.keys(copy).map(code => `<link rel="alternate" hreflang="${code}" href="${site + pagePath(code)}">`).join('\n');
  const languageLinks = Object.entries(languageNames).map(([code, name]) => `<a lang="${code}" hreflang="${code}" href="${pagePath(code)}"${lang === code ? ' aria-current="page"' : ''}>${name}</a>`).join(' · ');
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: translations.name,
    description: translations.included,
    url,
    provider: {'@type': 'Organization', name: 'Zhonggu Auto Export', url: site + '/'}
  }).replace(/</g, '\\u003c');
  const file = path.join(root, page.slice(1) + '.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `<!doctype html>
<html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${t.intro}">
  <link rel="canonical" href="${url}">
  ${alternatives}
  <link rel="alternate" hreflang="x-default" href="${site + pagePath('en')}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${t.intro}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${site}/images/brand/zhonggu-share-20261118.jpg">
  <script type="application/ld+json">${schema}</script>
  <link rel="stylesheet" href="/style.css">
  <script defer src="/assets/js/phone-input.js"></script>
  <script defer src="/script.js"></script>
  <script defer src="/assets/js/car-sourcing-v1.js"></script>
</head>
<body class="seo-page localized-market-page" data-lightweight-page>
  <header class="site-header scrolled">
    <div class="container nav-wrap">
      <a class="logo" href="/"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="${t.menu}"><span></span><span></span><span></span></button>
      <nav id="main-nav" class="main-nav">
        <a href="/">${t.home}</a>
        <a href="/used-cars.html">${t.used}</a>
        <a href="${page}" aria-current="page">${t.name}</a>
        <a class="nav-cta" href="/contact.html">${t.contact}</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="seo-hero"><div class="container">
      <p class="eyebrow">${t.name}</p>
      <h1>${t.headline}</h1>
      <p>${t.intro}</p>
      <div class="hero-actions"><a class="btn btn-primary" href="#sourcing-request" data-sales-quote>${t.inquiry}</a></div>
      <nav aria-label="${t.language}">${languageLinks}</nav>
    </div></section>
    <section class="seo-section"><div class="container">
      <h2>${t.browse}</h2>
      <p>${t.translate}</p>
      <div class="hero-actions">
        <a class="btn btn-light" href="https://www.guazi.com/" target="_blank" rel="noopener noreferrer">Guazi</a>
        <a class="btn btn-light" href="https://www.che168.com/" target="_blank" rel="noopener noreferrer">Autohome / Che168</a>
      </div>
    </div></section>
    <section class="seo-section"><div class="container">
      <h2>${t.fees}</h2>
      <p><strong>${t.rate}</strong></p>
      <div class="seo-card">
        <h3>${t.basicTitle}</h3><p>${t.basicScope}</p>
        <h3>${t.advancedTitle}</h3><p>${t.advancedScope}</p>
        <p>${t.separateVisits}</p>
        <p>${t.inspection}</p>
      </div>
      <p>${t.included}</p><p>${t.extra}</p>
      <div class="inquiry-panel">
        <div class="inquiry-fields"><label><span>${t.price}</span><input id="sourcing-price" type="number" min="0.01" step="0.01" inputmode="decimal" dir="ltr"></label></div>
        <p>${t.estimate} <output id="sourcing-fee" for="sourcing-price" aria-live="polite" dir="ltr">—</output></p>
      </div>
    </div></section>
    <section id="sourcing-request" class="contact-section"><div class="container inquiry-panel">
      <h2>${t.inquiry}</h2>
      <form id="quote-form" class="inquiry-form" name="car-sourcing" method="post" data-source-entry="car_sourcing" data-submitting-label="${t.submitting}" data-error-label="${t.error}" data-phone-placeholder="${t.phonePlaceholder}">
        <input type="hidden" name="source_page" value="${page}">
        <input type="hidden" name="source_url" value="${url}">
        <div class="inquiry-fields">
          <label class="field-wide"><span>${t.listing}</span><input name="listing_url" type="url" pattern="https?://.+" maxlength="2000" required dir="ltr"></label>
          <label><span>${t.customer}</span><input name="name" autocomplete="name" required></label>
          <label><span>${t.country}</span><input name="country" required></label>
          <label><span>${t.model}</span><input name="model" maxlength="120"></label>
          <label><span>${t.port}</span><input name="destinationPort"></label>
          <label><span>${t.budget}</span><input name="budget"></label>
          <label class="field-wide"><span>${t.notes}</span><textarea name="message" rows="4"></textarea></label>
        </div>
        <button class="btn inquiry-submit" type="submit">${t.inquiry}</button>
      </form>
      <p class="inquiry-success" role="status" tabindex="-1" hidden>${t.success}</p>
    </div></section>
  </main>
  <footer class="site-footer"><div class="container footer-wrap"><p>© <span id="year"></span> Zhonggu Auto Export</p></div></footer>
</body>
</html>
`);
}
