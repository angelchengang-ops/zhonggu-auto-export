const fs = require('fs');
const path = require('path');
const vehicleInquiry = require('../vehicle-inquiry.js');

const SITE = 'https://www.zhongguauto.com';
const WHATSAPP = '447473271351';
const cars = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cars.json'), 'utf8'));

const escapeHtml = (value = '') => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const escapeAttr = escapeHtml;
const cleanPath = (value = '') => String(value || '').replace(/^\/+/, '');
const absoluteUrl = (value = '') => `${SITE}/${cleanPath(value)}`;
const pickText = (value, fallback = '') => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value.en || Object.values(value).find(Boolean) || fallback;
  return value || fallback;
};
const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeVehicleName = (name, brand = '') => {
  const cleanedName = String(name || '').replace(/\s+/g, ' ').trim();
  const cleanedBrand = String(brand || '').replace(/\s+/g, ' ').trim();
  if (!cleanedName || !cleanedBrand) return cleanedName;
  const brandPrefix = escapeRegExp(cleanedBrand);
  return cleanedName
    .replace(new RegExp(`^${brandPrefix}\\s+(${brandPrefix}\\S*)`, 'i'), '$1')
    .replace(new RegExp(`^(${brandPrefix})\\s+\\1\\b`, 'i'), '$1')
    .replace(/\s+/g, ' ')
    .trim();
};
const vehicleNameFromParts = (brand, model, year = '') => {
  const cleanedBrand = String(brand || '').replace(/\s+/g, ' ').trim();
  const cleanedModel = normalizeVehicleName(model, cleanedBrand);
  const startsWithBrand = cleanedBrand && new RegExp(`^${escapeRegExp(cleanedBrand)}\\b`, 'i').test(cleanedModel);
  return [startsWithBrand ? '' : cleanedBrand, cleanedModel, year].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};
const getVehicleName = (car) => vehicleInquiry.formatVehicleName(car);
const isUsed = (car) => String(car.category || car.type || '').toLowerCase().includes('used');
const getPrice = (car) => pickText(car.price || car.fobPriceDisplay || car.fobNanShaUsd || car.fobRange, '');
const getImage = (car) => {
  const name = `${pickText(car.brand)} ${pickText(car.model || car.name)} ${car.id || ''}`.toLowerCase();
  if (name.includes('geely') && name.includes('coolray')) return 'images/new-cars/geely-coolray-01.jpg';
  if (name.includes('geely') && name.includes('boyue')) return 'images/new-cars/geely-boyue-01.jpg';
  if (name.includes('mg5') || name.includes('mg mg5')) return 'images/new-cars/mg5-01.jpg';
  if (name.includes('roewe')) return 'images/cars/saic-roewe-i5-2020-01.jpg';
  return cleanPath(pickText(car.mainImage || car.image, 'images/hero/hero-car.jpg'));
};
const getDescription = (car, name) => {
  const baseModel = normalizeVehicleName(pickText(car.model || car.name), pickText(car.brand)) || name;
  if (isUsed(car)) {
    return `Get latest FOB price, stock list and export support for ${name} from China.`;
  }
  return `Get latest FOB price, stock list and export support for ${baseModel} from China.`;
};
const specs = (car) => [
  ['Year', pickText(car.year || car.modelYear)],
  ['Configuration', pickText(car.configuration || car.trimEn || car.trim)],
  ['Color', pickText(car.availableColor || car.color)],
  ['Engine', pickText(car.engine || car.fuel)],
  ['Transmission', pickText(car.transmission)],
  ['Mileage', pickText(car.mileage)],
  ['FOB price', getPrice(car)]
].filter(([, value]) => value);

const render = (car) => {
  const id = car.id;
  const name = getVehicleName(car);
  const url = `${SITE}/${id}.html`;
  const img = getImage(car);
  const imgUrl = absoluteUrl(img);
  const description = getDescription(car, name);
  const ogTitle = `${name} | FOB Price and Stock List`;
  const wa = vehicleInquiry.buildVehicleWhatsappUrl({ ...car, detailUrl: url });
  const specItems = specs(car).map(([label, value]) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`).join('');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: imgUrl,
    brand: { '@type': 'Brand', name: pickText(car.brand, 'Zhonggu Auto Export') },
    offers: { '@type': 'Offer', url, availability: 'https://schema.org/InStock' }
  };
  const price = getPrice(car);
  if (price) jsonLd.offers.price = price.replace(/[^0-9.]/g, '') || undefined;
  if (price && /usd/i.test(price)) jsonLd.offers.priceCurrency = 'USD';
  if (price && /rmb|cny/i.test(price)) jsonLd.offers.priceCurrency = 'CNY';
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeAttr(ogTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${imgUrl}">
  <meta property="og:image:secure_url" content="${imgUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeAttr(`${name} for export from China`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(ogTitle)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <meta name="twitter:image" content="${imgUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css?v=20260626-seo-netlify">
</head><body class="vehicle-detail-page seo-page" data-vehicle-id="${escapeAttr(id)}" data-vehicle-brand="${escapeAttr(pickText(car.brand))}" data-vehicle-name="${escapeAttr(name)}" data-vehicle-year="${escapeAttr(pickText(car.year || car.modelYear))}" data-vehicle-price="${escapeAttr(getPrice(car))}" data-vehicle-url="${url}">
<header class="site-header scrolled"><div class="container nav-wrap"><a class="logo" href="index.html" aria-label="Zhonggu Auto Export home"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav id="main-nav" class="main-nav" aria-label="Main navigation"><a href="index.html">Home</a><a href="new-cars.html">New Cars</a><a href="used-cars.html">Used Cars</a><a href="brands.html">Brands</a><a href="company.html">Company</a><a href="export-process.html">Export Process</a><a class="nav-cta" href="contact.html">Contact Us</a></nav><select class="language-select" aria-label="Select language"><option value="en">English</option><option value="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</option><option value="ru">&#1056;&#1091;&#1089;&#1089;&#1082;&#1080;&#1081;</option><option value="fr">Fran&#231;ais</option><option value="es">Espa&#241;ol</option></select></div></header>
<main><section class="detail-hero"><div class="container detail-grid"><article class="detail-card"><p class="eyebrow">${escapeHtml(isUsed(car) ? 'Used Car Export from China' : 'New Car Export from China')}</p><h1>${escapeHtml(name)}</h1><p>${escapeHtml(description)}</p><div class="detail-media"><img src="${escapeAttr(img)}" alt="${escapeAttr(`${name} for export from China`)}" loading="eager"></div></article><aside class="detail-summary"><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="${escapeAttr(name)}">Get FOB Price</a><a class="btn btn-light" href="${wa}" target="_blank" rel="noopener">Contact on WhatsApp</a></div><ul class="seo-list">${specItems || '<li>FOB inquiry: contact for latest price</li>'}</ul></aside></div></section>
<section class="seo-section"><div class="container"><h2>Export-ready Vehicle Information</h2><p>${escapeHtml(name)} is available for export inquiry from China. Zhonggu Auto Export can help overseas buyers confirm latest stock, FOB price, vehicle photos, export documents and shipping coordination.</p></div></section>
<section class="seo-section"><div class="container"><h2>Inspection, Documents and Shipping</h2><p>Send your destination country, quantity and preferred timing. We will reply with stock availability, quotation details and practical export next steps.</p></div></section>
<section id="contact" class="contact-section"><div class="container contact-layout"><div class="contact-intro"><p class="eyebrow">Get FOB Price</p><h2>Request Stock Availability</h2><p>Ask for the latest FOB price, condition details and export schedule for this vehicle.</p><a class="btn btn-light whatsapp-btn" href="${wa}" target="_blank" rel="noopener">Contact on WhatsApp</a></div><div class="inquiry-panel"><h3>Send Inquiry</h3><form class="inquiry-form" name="inquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thank-you.html"><input type="hidden" name="form-name" value="inquiry"><input type="hidden" name="bot-field" value="" aria-hidden="true" tabindex="-1"><div class="inquiry-fields"><label><span>Name</span><input type="text" name="name" autocomplete="name" required></label><label><span>Country</span><input type="text" name="country" autocomplete="country-name" required></label><label><span>WhatsApp</span><input type="tel" name="whatsapp" autocomplete="tel" required></label><label class="field-wide"><span>Interested Model</span><input type="text" name="model" value="${escapeAttr(name)}" required></label><label class="field-wide"><span>Message</span><textarea name="message" rows="4">Please send me the latest FOB price and stock list.</textarea></label></div><button class="btn inquiry-submit" type="submit">Submit Inquiry</button></form><p class="inquiry-success" role="status" aria-live="polite" hidden>Thank you, your inquiry has been received. Our sales team will contact you soon.</p></div></div></section></main>
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<footer class="site-footer"><div class="container footer-wrap"><a class="logo footer-logo" href="index.html"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><p>Reliable vehicles from China, delivered worldwide.</p><nav class="footer-market-links export-market-links" aria-label="Export markets"><span>Export Markets:</span><a href="export-cars-from-china-to-africa.html">Africa</a><a href="export-cars-from-china-to-southeast-asia.html">Southeast Asia</a><a href="export-cars-from-china-to-central-asia.html">Central Asia</a></nav><p>&copy; <span id="year"></span> Zhonggu Auto Export. All rights reserved.</p></div></footer><script src="vehicle-inquiry.js?v=20260701-whatsapp-fix"></script><script src="script.js?v=20260701-whatsapp-fix"></script><script src="lead-gen.js?v=20260701-whatsapp-fix"></script></body></html>
`;
};

let count = 0;
for (const car of cars) {
  if (!car.id) continue;
  fs.writeFileSync(path.join(__dirname, '..', `${car.id}.html`), render(car), 'utf8');
  count += 1;
}
console.log(`Generated ${count} vehicle detail pages.`);



