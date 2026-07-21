const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://zhongguauto.com';
const STYLE_VERSION = '20260716-seo-market-upgrade';
const SCRIPT_VERSION = '20260716-seo-market-upgrade';
const WA_DISPLAY = '+86 18661888866';
const WA_NUMBER = '8618661888866';

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/^\uFEFF/, '');
const write = (relative, content) => {
  const file = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (existing !== content) fs.writeFileSync(file, content, 'utf8');
};
const cars = JSON.parse(read('cars.json'));
const byId = new Map(cars.map((car) => [car.id, car]));

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));
const escapeAttr = escapeHtml;
const cleanPath = (value = '') => String(value || '').replace(/^\/+/, '');
const absolute = (value = '') => /^https?:\/\//i.test(value) ? value : `${SITE}/${cleanPath(value)}`;
const pickText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value) || fallback;
  if (Array.isArray(value)) return value.map((item) => pickText(item, '')).find(Boolean) || fallback;
  if (typeof value === 'object') return value.en || Object.values(value).map((item) => pickText(item, '')).find(Boolean) || fallback;
  return fallback;
};
const priceNumber = (value = '') => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
};
const vehicleTitle = (car = {}) => pickText(car.cardTitle || car.title || car.model || car.id);
const vehiclePrice = (car = {}) => pickText(car.salePriceDisplay || car.fobPriceDisplay || car.fobNanShaUsd || car.price || 'Contact for price');
const vehicleImage = (car = {}) => cleanPath(car.mainImage || car.image || (Array.isArray(car.images) ? car.images[0] : '') || 'images/og-image.jpg');
const vehicleHref = (car = {}) => {
  const detailUrl = pickText(car.detailUrl || car.canonicalPath || car.urlPath, '');
  if (detailUrl) return /^https?:\/\//i.test(detailUrl) || detailUrl.startsWith('/') ? detailUrl : `/${cleanPath(detailUrl)}`;
  return `/${car.id}.html`;
};
const waHref = (message = '') => `https://wa.me/${WA_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

const nav = `<header class="site-header scrolled"><div class="container nav-wrap"><a class="logo" href="/index.html" aria-label="Zhonggu Auto Export home"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav id="main-nav" class="main-nav" aria-label="Main navigation"><a href="/index.html">Home</a><a href="/new-cars.html">New Cars</a><a href="/used-cars.html">Used Cars</a><a href="/brands.html">Brands</a><a href="/company.html">Company</a><a href="/export-process.html">Export Process</a><a class="nav-cta" href="/contact.html">Contact Us</a></nav></div></header>`;
const footer = `<footer class="site-footer"><div class="container footer-wrap"><a class="logo footer-logo" href="/index.html"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><p>Reliable vehicles from China, delivered worldwide.</p><nav class="footer-market-links export-market-links" aria-label="Export markets"><span>Export Markets:</span><a href="/export-cars-from-china-to-africa.html">Africa</a><a href="/export-cars-from-china-to-algeria.html">Algeria</a><a href="/export-cars-from-china-to-ivory-coast.html">Cote d'Ivoire</a><a href="/export-cars-from-china-to-ghana.html">Ghana</a><a href="/bestune-k1-europe.html">Bestune K1 Europe</a></nav><p>&copy; <span id="year"></span> Zhonggu Auto Export. All rights reserved.</p></div></footer>`;

const breadcrumbSchema = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url
  }))
});

const pageShell = ({ lang = 'en', title, description, path: pagePath, canonicalPath = pagePath, h1, bodyClass = '', market = '', body, schema = [] }) => {
  const url = `${SITE}/${canonicalPath}`;
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Zhonggu Auto Export',
      url: SITE,
      logo: `${SITE}/images/og-image.jpg`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: WA_DISPLAY,
        contactType: 'sales',
        availableLanguage: ['English', 'French', 'Arabic']
      }
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: lang,
      publisher: { '@id': `${SITE}/#organization` }
    },
    breadcrumbSchema([
      { name: 'Home', url: `${SITE}/` },
      { name: h1 || title, url }
    ]),
    ...schema
  ];
  return `<!DOCTYPE html><html lang="${escapeAttr(lang)}"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/images/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/style.css?v=${STYLE_VERSION}">
  <link rel="stylesheet" href="/assets/css/whatsapp-lead-modal.css">
</head><body class="seo-page ${escapeAttr(bodyClass)}" ${market ? `data-market-country="${escapeAttr(market)}"` : ''}>${nav}<main>${body}</main>${footer}<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script><script defer src="/script.js?v=${SCRIPT_VERSION}"></script><script defer src="/lead-gen.js?v=${SCRIPT_VERSION}"></script><script defer src="/assets/js/whatsapp-lead-modal.js"></script></body></html>
`;
};

const contactSection = ({ heading = 'Request Current FOB/CIF Price', intro, model, message, sourcePath, country = '', language = 'en', button = 'Get Latest FOB/CIF Price' }) => {
  const sourceUrl = sourcePath ? `${SITE}/${sourcePath}` : SITE;
  return `<section id="contact" class="contact-section"><div class="container contact-layout"><div class="contact-intro"><p class="eyebrow">Contact Zhonggu Auto Export</p><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(intro)}</p><a class="btn btn-light whatsapp-btn" href="${escapeAttr(waHref(message))}" data-whatsapp-button="true" data-source="website" data-source-entry="seo_market_page" data-source-button="WhatsApp" data-vehicle="${escapeAttr(model)}">${button} on WhatsApp ${WA_DISPLAY}</a></div><div class="inquiry-panel"><h3>Send Inquiry</h3><form class="inquiry-form" name="inquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thank-you.html"><input type="hidden" name="form-name" value="inquiry"><input type="hidden" name="bot-field" value="" aria-hidden="true" tabindex="-1"><input type="hidden" name="source_page" value="${escapeAttr(model)}"><input type="hidden" name="source_url" value="${escapeAttr(sourceUrl)}"><input type="hidden" name="language" value="${escapeAttr(language)}">${country ? `<input type="hidden" name="market_region" value="Africa"><input type="hidden" name="market_country" value="${escapeAttr(country)}">` : ''}<div class="inquiry-fields"><label><span>Name</span><input type="text" name="name" autocomplete="name" required></label><label><span>Country</span><input type="text" name="country" value="${escapeAttr(country)}" autocomplete="country-name" required></label><label><span>WhatsApp</span><input type="tel" name="whatsapp" autocomplete="tel" required></label><label class="field-wide"><span>Interested Model</span><input type="text" name="model" value="${escapeAttr(model)}" required></label><label class="field-wide"><span>Message</span><textarea name="message" rows="4">${escapeHtml(message)}</textarea></label></div><button class="btn inquiry-submit" type="submit">${escapeHtml(button)}</button></form><p class="inquiry-success" role="status" aria-live="polite" hidden>Thank you, your inquiry has been received.</p></div></div></section>`;
};

const vehicleCard = (car, note = '') => {
  const title = vehicleTitle(car);
  const href = `/${car.id}.html`;
  const badge = car.isUsed ? 'Used Car' : 'Brand New';
  return `<article class="seo-card"><img src="/${escapeAttr(vehicleImage(car))}" alt="${escapeAttr(title)} export vehicle" loading="lazy"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(note || pickText(car.shortDescription) || pickText(car.description) || '')}</p><p><strong>${escapeHtml(vehiclePrice(car))}</strong> ${escapeHtml(badge)}</p><a href="${escapeAttr(href)}">View vehicle details</a></article>`;
};

const staticVehicleCard = (car) => {
  const title = vehicleTitle(car);
  const href = vehicleHref(car);
  const used = car.isUsed === true || String(car.category || car.type || car.condition || '').toLowerCase().includes('used');
  const badge = used ? 'Used Car' : 'Brand New';
  const location = pickText(car.locationDisplay || car.location || '');
  const status = pickText(car.inventoryStatusLabel || car.inventoryStatusDisplay || car.inventoryStatus || car.inventoryBadge || '');
  const year = pickText(car.year || car.modelYear || '');
  const subtitle = pickText(car.cardSubtitle || car.configuration || car.trimEn || car.transmission || '');
  const extraTags = (Array.isArray(car.listingTags) ? car.listingTags : Array.isArray(car.tags) ? car.tags : []).map((item) => pickText(item, '')).filter(Boolean);
  const tags = [...new Set([car.inventoryBadge, status, ...extraTags].map((item) => pickText(item, '')).filter((item) => item && !/ample stock|contact us/i.test(item)))];
  const tagMarkup = tags.length ? `<div class="vehicle-tags">${tags.map((item) => `<span class="vehicle-tag">${escapeHtml(item)}</span>`).join('')}</div>` : '';
  return `<article class="vehicle-card static-vehicle-card" data-vehicle-id="${escapeAttr(car.id || '')}">
  <a class="vehicle-image" href="${escapeAttr(href)}" aria-label="View ${escapeAttr(title)}"><img src="${escapeAttr(vehicleImage(car))}" alt="${escapeAttr(title)} ${escapeAttr(badge)} for export from China" loading="lazy"><span class="vehicle-badge">${escapeHtml(badge)}</span></a>
  <div class="vehicle-body"><p class="vehicle-brand">${escapeHtml(pickText(car.brand, 'Zhonggu Auto Export'))}</p><h3><a href="${escapeAttr(href)}">${escapeHtml(title)}</a></h3><p class="vehicle-subtitle">${escapeHtml(subtitle)}</p><p class="vehicle-meta">${escapeHtml([year && `Year: ${year}`, location, status].filter(Boolean).join(' | '))}</p>${tagMarkup}</div>
  <div class="vehicle-footer"><div class="price"><small>${used ? 'Sale Price' : 'FOB Price'}</small><strong>${escapeHtml(vehiclePrice(car))}</strong></div><a class="vehicle-fob-btn js-inquiry-cta" href="#contact" data-title="${escapeAttr(title)}" data-url="${escapeAttr(href)}" data-vehicle-id="${escapeAttr(car.id || '')}" data-lead-source="${used ? 'used_car_list' : 'vehicle_card'}">Request FOB Quote</a></div>
</article>`;
};

const injectVehicleGrid = (html, type, cards, limitAttr) => {
  const start = `<!-- STATIC_${type.toUpperCase()}_CARS_START -->`;
  const end = `<!-- STATIC_${type.toUpperCase()}_CARS_END -->`;
  const block = `${start}\n${cards}\n${end}`;
  if (html.includes(start) && html.includes(end)) {
    return html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
  }
  const attr = type === 'new' ? `data-new-cars-limit="${limitAttr}"` : `data-used-cars-limit="${limitAttr}"`;
  const pattern = new RegExp(`(<div class="[^"]*vehicle-grid[^"]*" ${attr}></div>)`);
  return html.replace(pattern, (match) => match.replace('></div>', `>\n${block}\n</div>`));
};

const productSchema = ({ name, description, image, url, price, condition = 'NewCondition', availability = 'InStock' }) => ({
  '@type': 'Product',
  name,
  description,
  image: Array.isArray(image) ? image.map(absolute) : absolute(image),
  url: absolute(url),
  brand: { '@type': 'Brand', name: name.split(' ')[0] || 'Zhonggu Auto Export' },
  offers: {
    '@type': 'Offer',
    url: absolute(url),
    priceCurrency: 'USD',
    availability: `https://schema.org/${availability}`,
    itemCondition: `https://schema.org/${condition}`,
    ...(price ? { price } : {})
  }
});

const aggregateOfferProduct = ({ name, description, image, url, lowPrice, highPrice, condition = 'UsedCondition' }) => ({
  '@type': 'Product',
  name,
  description,
  image: Array.isArray(image) ? image.map(absolute) : absolute(image),
  url: absolute(url),
  brand: { '@type': 'Brand', name: name.split(' ')[0] || 'Zhonggu Auto Export' },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice,
    highPrice,
    availability: 'https://schema.org/InStock',
    itemCondition: `https://schema.org/${condition}`
  }
});

const marketProductSchema = ({ name, description, url, image = 'images/og-image.jpg' }) => ({
  '@type': 'Product',
  name,
  description,
  image: absolute(image),
  url: absolute(url),
  brand: { '@type': 'Brand', name: 'Zhonggu Auto Export' },
  category: 'Vehicle export service'
});

const faqSchema = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a }
  }))
});

const b70Cars = ['used-bestune-b70-2021', 'used-bestune-b70-2022', 'used-bestune-b70-2023'].map((id) => byId.get(id)).filter(Boolean);
const yueyi03Cars = ['bestune-yueyi-03-2026-445km-zhixuan-edition', 'bestune-yueyi-03-2026-565km-xinxiang-edition'].map((id) => byId.get(id)).filter(Boolean);
const yueyi07 = byId.get('used-bestune-yueyi-07-2025');
const k1 = byId.get('bestune-xiaoma-2026-222km-shanyaoma-edition');
const coolray = byId.get('geely-coolray-full-option');

const writeImporterCenterPage = () => {
  const faqs = [
    ['Who is the importer center designed for?', 'It is designed for overseas vehicle importers, car dealers, trading companies, rental fleets and other business buyers sourcing vehicles from China.'],
    ['Can Zhonggu Auto Export prepare both FOB and CIF quotations?', 'Yes. FOB quotations can be prepared after stock confirmation. CIF quotations also require the destination port and a current shipping-cost check.'],
    ['What information should an importer send?', 'Send the destination country and port, preferred models, target quantity, budget and purchasing schedule so the team can prepare a relevant stock and quotation plan.'],
    ['Can I request VINs, photos and port videos?', 'Available VIN information, current vehicle photos and port videos can be provided for confirmed stock when those materials are available.'],
    ['Do you supply both new and used vehicles?', 'Yes. Zhonggu Auto Export handles selected new vehicles, ready stock and inspected used-car inventory for export inquiries.']
  ];
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">For overseas dealers and business buyers</p><h1>Car Importer Center</h1><p>Zhonggu Auto Export helps overseas importers, dealers, trading companies and fleet buyers source new and used vehicles from China. Use this importer center to review ready stock, batch inventory, export markets and the information needed for a practical FOB or CIF quotation.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Car Importer Center">Request Importer Quote</a><a class="btn btn-light" href="/wholesale-cars-from-china.html">View Wholesale Stock</a></div></div></section>
<section class="seo-section"><div class="container"><div class="section-heading centered"><p class="eyebrow">Business buyer support</p><h2>Who We Work With</h2><p>Different buyers need different stock, documents and delivery plans.</p></div><div class="seo-card-grid"><article class="seo-card"><h3>Vehicle Importers</h3><p>Compare ready stock, model options, China loading ports and the documents available for your destination market.</p></article><article class="seo-card"><h3>Car Dealers</h3><p>Request current stock, dealer-oriented FOB quotations, available colors and repeat-order supply options.</p></article><article class="seo-card"><h3>Trading Companies</h3><p>Coordinate vehicle sourcing, export-side paperwork, inspection information and shipment preparation through one China supplier.</p></article><article class="seo-card"><h3>Rental and Fleet Buyers</h3><p>Compare practical sedans, SUVs, EVs and used-car batches for fleet expansion and mobility projects.</p></article></div></div></section>
<section class="seo-section"><div class="container"><h2>Information Available for Importers</h2><div class="vehicle-info-grid"><div><small>Stock</small><strong>Current quantity and vehicle location</strong></div><div><small>Quotation</small><strong>FOB or destination-based CIF inquiry</strong></div><div><small>Vehicle proof</small><strong>VIN, photos and videos when available</strong></div><div><small>Documents</small><strong>Export-side document coordination</strong></div><div><small>Ports</small><strong>Qingdao, Nansha and Horgos supply routes</strong></div><div><small>Timing</small><strong>Stock confirmation and shipment planning</strong></div></div></div></section>
<section class="seo-section"><div class="container"><div class="section-heading centered"><p class="eyebrow">Current supply pages</p><h2>Start with Real Vehicle Resources</h2><p>Review current ready-stock and batch-supply pages before requesting a quotation.</p></div><div class="seo-card-grid"><article class="seo-card"><h3>Geely Coolray Ready Stock</h3><p>Full Option vehicles with Package and Panoramic Sunroof at Nansha Port, China. Ask for current quantity, VINs and dealer pricing.</p><a href="/geely-coolray-ready-stock-nansha-port.html">View Nansha ready stock</a></article><article class="seo-card"><h3>Used Bestune B70 Batch Stock</h3><p>2021-2023 used B70 sedans in Qingdao with year-based FOB reference prices and unit details confirmed by VIN.</p><a href="/used-bestune-b70-wholesale.html">View B70 wholesale stock</a></article><article class="seo-card"><h3>Bestune Yueyi 03 EV</h3><p>Brand-new 445 km and 565 km CLTC versions for dealer, fleet and export quotation inquiries.</p><a href="/bestune-yueyi-03-wholesale.html">View Yueyi 03 options</a></article><article class="seo-card"><h3>Bestune K1 Europe</h3><p>EU-certified compact electric model with destination-country compliance requirements confirmed before order.</p><a href="/bestune-k1-europe.html">View Bestune K1 Europe</a></article></div></div></section>
<section class="seo-section"><div class="container"><h2>Importer Markets and Sourcing Routes</h2><nav class="market-link-grid" aria-label="Importer market pages"><a href="/export-cars-from-china-to-algeria.html">Algeria vehicle sourcing</a><a href="/export-cars-from-china-to-central-asia.html">Central Asia vehicle sourcing</a><a href="/export-cars-from-china-to-africa.html">Africa vehicle sourcing</a><a href="/export-cars-from-china-to-southeast-asia.html">Southeast Asia vehicle sourcing</a></nav></div></section>
<section class="seo-section"><div class="container"><h2>What to Include in Your Import Inquiry</h2><div class="table-scroll"><table class="market-vehicle-table"><thead><tr><th>Required detail</th><th>Why it matters</th></tr></thead><tbody><tr><th>Country and destination port</th><td>Needed to check the export route and prepare a destination-based shipping quotation.</td></tr><tr><th>Vehicle model or category</th><td>Helps us narrow new, used, fuel, EV, sedan or SUV stock.</td></tr><tr><th>Target quantity</th><td>Allows current availability and dealer or batch pricing to be checked.</td></tr><tr><th>Budget and purchasing time</th><td>Helps match the inquiry with practical stock and delivery options.</td></tr></tbody></table></div></div></section>
<section class="seo-section"><div class="container"><h2>Frequently Asked Questions</h2><div class="faq-list">${faqs.map(([q, a]) => `<article class="faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}</div></div></section>
${contactSection({ heading: 'Request an Importer Quotation', intro: 'Send your destination country, port, preferred models, quantity and purchasing schedule. We will check relevant stock and prepare the next quotation step.', model: 'Car Importer Center', sourcePath: 'car-importer-center.html', message: 'I am a vehicle importer, dealer, trading company or fleet buyer. Please send current China vehicle stock and prepare an FOB or CIF quotation for my destination.', button: 'Request Importer Quote' })}`;
  write('car-importer-center.html', pageShell({
    title: 'Car Importer Center | China Vehicle Export Supplier',
    description: 'Importer center for overseas dealers, trading companies and fleet buyers sourcing new cars, used cars, ready stock and FOB or CIF quotations from China.',
    path: 'car-importer-center.html',
    h1: 'Car Importer Center',
    body,
    schema: [faqSchema(faqs)]
  }));
};

const writeWholesaleCarsPage = () => {
  const faqs = [
    ['How do I receive the current wholesale stock list?', 'Send your destination, preferred models and target quantity through the inquiry form or WhatsApp. Current stock is checked before a quotation is issued.'],
    ['Are wholesale prices fixed?', 'No. Public prices are reference FOB prices where shown. Final quotations depend on current inventory, quantity, vehicle details, loading port and destination requirements.'],
    ['Can one quotation include several models?', 'Yes. Importers can request a mixed sourcing plan. Final loading and shipping options depend on vehicle dimensions, locations and current logistics conditions.'],
    ['Which China supply locations are available?', 'Current vehicle resources may be located in Qingdao, at Nansha Port or in Horgos. The actual location is confirmed for each vehicle before order.']
  ];
  const stockItems = [
    { name: 'Geely Coolray Full Option Ready Stock', url: '/geely-coolray-ready-stock-nansha-port.html' },
    { name: 'Used Bestune B70 Wholesale', url: '/used-bestune-b70-wholesale.html' },
    { name: 'Bestune Yueyi 03 2026 EV Export', url: '/bestune-yueyi-03-wholesale.html' },
    { name: 'Used Bestune Yueyi 07 PHEV Export', url: '/used-bestune-yueyi-07-phev-export.html' },
    { name: 'Bestune K1 Europe', url: '/bestune-k1-europe.html' }
  ];
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">China vehicle wholesale sourcing</p><h1>Wholesale Cars from China for Importers and Dealers</h1><p>Review selected ready stock, new vehicles and used-car batch inventory from China. This page is built for overseas importers, dealers, trading companies and fleet buyers who need current availability, vehicle location, FOB or CIF quotation support and export coordination.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Wholesale Cars from China">Request Current Stock List</a><a class="btn btn-light" href="/car-importer-center.html">Visit Importer Center</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Current Wholesale and Ready-Stock Resources</h2><div class="table-scroll"><table class="market-vehicle-table"><thead><tr><th>Vehicle resource</th><th>Supply type</th><th>China location</th><th>Next step</th></tr></thead><tbody><tr><th>Geely Coolray Full Option</th><td>Brand-new ready stock</td><td>Nansha Port</td><td><a href="/geely-coolray-ready-stock-nansha-port.html">Check current Coolray stock</a></td></tr><tr><th>Bestune B70 2021-2023</th><td>Used-car batch inventory</td><td>Qingdao</td><td><a href="/used-bestune-b70-wholesale.html">Compare years and FOB prices</a></td></tr><tr><th>Bestune Yueyi 03</th><td>Brand-new EV supply</td><td>China stock confirmed on inquiry</td><td><a href="/bestune-yueyi-03-wholesale.html">Compare 445 km and 565 km</a></td></tr><tr><th>Used Bestune Yueyi 07 PHEV</th><td>Used PHEV batch supply</td><td>China stock confirmed on inquiry</td><td><a href="/used-bestune-yueyi-07-phev-export.html">View Yueyi 07 export page</a></td></tr><tr><th>Bestune K1 Europe</th><td>Brand-new compact EV</td><td>China stock confirmed on inquiry</td><td><a href="/bestune-k1-europe.html">Review K1 specifications</a></td></tr></tbody></table></div><p class="market-note">Inventory changes. Current quantity, colors, VIN information, exact condition and final quotation are confirmed during inquiry.</p></div></section>
<section class="seo-section"><div class="container"><div class="section-heading centered"><p class="eyebrow">Wholesale buying support</p><h2>What a Business Buyer Can Request</h2></div><div class="seo-card-grid"><article class="seo-card"><h3>Current Stock List</h3><p>Ask for relevant models, available quantity, colors, vehicle location and expected preparation time.</p></article><article class="seo-card"><h3>FOB or CIF Quotation</h3><p>Request FOB pricing from the applicable China port or a CIF inquiry based on your destination port.</p></article><article class="seo-card"><h3>Vehicle Verification</h3><p>Request VIN information, current photos, condition details and port videos when available for confirmed stock.</p></article><article class="seo-card"><h3>Export Coordination</h3><p>Coordinate the export-side documentation, inspection information, loading plan and shipment updates.</p></article></div></div></section>
<section class="seo-section"><div class="container"><h2>Wholesale Vehicle Sourcing Process</h2><ol class="seo-list"><li>Send the destination country, port, preferred models, target quantity and purchasing time.</li><li>We check current stock, vehicle locations, specifications and available supporting materials.</li><li>Receive a stock-based FOB quotation or request a current CIF shipping calculation.</li><li>Confirm vehicle details, documents, payment terms and the loading or delivery plan before order.</li></ol></div></section>
<section class="seo-section"><div class="container"><h2>Wholesale Export Markets</h2><nav class="market-link-grid" aria-label="Wholesale vehicle export markets"><a href="/export-cars-from-china-to-algeria.html">Wholesale cars for Algeria</a><a href="/export-cars-from-china-to-central-asia.html">Wholesale cars for Central Asia</a><a href="/export-cars-from-china-to-africa.html">Wholesale cars for Africa</a><a href="/export-cars-from-china-to-southeast-asia.html">Wholesale cars for Southeast Asia</a></nav></div></section>
<section class="seo-section"><div class="container"><h2>Frequently Asked Questions</h2><div class="faq-list">${faqs.map(([q, a]) => `<article class="faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}</div></div></section>
${contactSection({ heading: 'Request the Current Wholesale Stock List', intro: 'Tell us the destination country and port, vehicle types, target quantity and purchasing time. We will check current resources before sending a quotation.', model: 'Wholesale Cars from China', sourcePath: 'wholesale-cars-from-china.html', message: 'Please send the current wholesale vehicle stock list from China. My inquiry includes destination country and port, preferred models, target quantity and purchasing schedule.', button: 'Request Current Stock List' })}`;
  write('wholesale-cars-from-china.html', pageShell({
    title: 'Wholesale Cars from China for Importers and Dealers',
    description: 'Wholesale cars from China for overseas importers and dealers. Review ready stock, new vehicles, used-car batches and request current FOB or CIF quotations.',
    path: 'wholesale-cars-from-china.html',
    h1: 'Wholesale Cars from China for Importers and Dealers',
    body,
    schema: [
      {
        '@type': 'ItemList',
        name: 'Wholesale vehicle resources from China',
        itemListElement: stockItems.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: absolute(item.url)
        }))
      },
      faqSchema(faqs)
    ]
  }));
};

const writeB70Page = () => {
  const faqs = [
    ['Can I buy several used Bestune B70 units together?', 'Yes. The B70 is offered as batch inventory from Qingdao, China. Current unit details are confirmed during inquiry.'],
    ['Are all B70 cars exactly the same?', 'No. Mileage, color, condition and configuration vary by unit and must be confirmed by VIN before order.'],
    ['What is the FOB price range?', 'Current public FOB reference prices range from US$6,000 to US$7,000 for the 2021 to 2023 model years.']
  ];
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">Used Bestune B70 wholesale</p><h1>Used Bestune B70 Wholesale</h1><p>We have batch stock of used Bestune B70 sedans from 2021 to 2023 in Qingdao, China. All units are equipped with a 1.5T petrol engine and 7-speed wet dual-clutch transmission. Typical mileage is approximately 30,000-50,000 km, with no major accidents reported. FOB prices start from US$6,000. Final mileage, color and condition are confirmed by VIN.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Used Bestune B70 Wholesale">Get Current Stock List</a><a class="btn btn-light whatsapp-btn" href="${escapeAttr(waHref('Please send the current used Bestune B70 stock list, VIN details, FOB prices and bulk order price.'))}" data-whatsapp-button="true" data-vehicle="Used Bestune B70 Wholesale">Get Bulk Order Price</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Compare 2021, 2022 and 2023 B70 Stock</h2><div class="table-scroll"><table class="market-vehicle-table"><thead><tr><th>Year</th><th>Version</th><th>Mileage</th><th>FOB price</th><th>Detail page</th></tr></thead><tbody><tr><th>2021</th><td>1.5T Automatic Lexiang Edition</td><td>Approx. 30,000-50,000 km</td><td>US$6,000</td><td><a href="/used-bestune-b70-2021.html">View 2021 B70</a></td></tr><tr><th>2022</th><td>Third Generation 1.5T Automatic Lexiang Edition</td><td>Approx. 30,000-50,000 km</td><td>US$6,500</td><td><a href="/used-bestune-b70-2022.html">View 2022 B70</a></td></tr><tr><th>2023</th><td>Third Generation 1.5T Automatic Lexiang 70th Anniversary Edition</td><td>Approx. 30,000-50,000 km</td><td>US$7,000</td><td><a href="/used-bestune-b70-2023.html">View 2023 B70</a></td></tr></tbody></table></div></div></section>
<section class="seo-section"><div class="container"><h2>Wholesale Highlights</h2><div class="vehicle-info-grid"><div><small>Engine</small><strong>1.5T petrol</strong></div><div><small>Transmission</small><strong>7-speed wet dual-clutch</strong></div><div><small>Wheelbase</small><strong>2800 mm</strong></div><div><small>Supply</small><strong>Batch inventory available</strong></div><div><small>Location</small><strong>Qingdao, China</strong></div><div><small>Condition note</small><strong>No major accidents reported; final condition confirmed by VIN</strong></div></div><p>White and black are commonly available, but actual colors vary by unit. Final mileage, condition, color and configuration must be confirmed by VIN.</p></div></section>
<section class="seo-section"><div class="container"><h2>Bestune B70 occasion pour l'export</h2><p>Pour les acheteurs en Afrique, nous proposons des Bestune B70 occasion depuis la Chine avec prix FOB Bestune B70 clair, informations de voiture d'occasion Chine, et support export voiture Chine Algerie ou export voiture Chine Cote d'Ivoire. Les details exacts de chaque vehicule sont confirmes avant commande.</p></div></section>
<section class="seo-section"><div class="container"><h2>Available Detail Pages</h2><div class="seo-card-grid">${b70Cars.map((car) => vehicleCard(car, 'Used Bestune B70 batch stock with 1.5T petrol engine, 7DCT and Qingdao export support.')).join('')}</div></div></section>
<section class="seo-section"><div class="container"><h2>FAQ</h2><div class="faq-list">${faqs.map(([q, a]) => `<article class="faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}</div></div></section>
${contactSection({ heading: 'Get Current Stock List', intro: 'Send your destination, target year and quantity. We will confirm available units by VIN before quotation.', model: 'Used Bestune B70 Wholesale', sourcePath: 'used-bestune-b70-wholesale.html', message: 'Please send me the current stock list, VIN information, colors, mileage and bulk order price for used Bestune B70 2021-2023.', button: 'Get Bulk Order Price' })}`;
  write('used-bestune-b70-wholesale.html', pageShell({
    title: 'Used Bestune B70 Wholesale | FOB From $6,000',
    description: 'Batch stock of used 2021-2023 Bestune B70 sedans from China. 1.5T automatic, 30,000-50,000 km and FOB prices from US$6,000.',
    path: 'used-bestune-b70-wholesale.html',
    h1: 'Used Bestune B70 Wholesale',
    body,
    schema: [
      aggregateOfferProduct({ name: 'Used Bestune B70 Wholesale', description: 'Batch stock of used 2021-2023 Bestune B70 sedans from Qingdao, China.', image: b70Cars.map(vehicleImage), url: '/used-bestune-b70-wholesale.html', lowPrice: 6000, highPrice: 7000, condition: 'UsedCondition' }),
      faqSchema(faqs)
    ]
  }));
};

const writeYueyi03Page = () => {
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">Brand new Bestune EV export</p><h1>Bestune Yueyi 03 2026 EV Export</h1><p>Buy the new 2026 Bestune Yueyi 03 electric SUV from China. Choose the 445 km or 565 km CLTC range version with ample stock, FOB export support and dealer quotation workflow.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Bestune Yueyi 03 Wholesale">Get Latest FOB/CIF Price</a><a class="btn btn-light whatsapp-btn" href="${escapeAttr(waHref('Please send the latest FOB/CIF price and current stock for Bestune Yueyi 03 445km and 565km versions.'))}" data-whatsapp-button="true" data-vehicle="Bestune Yueyi 03 Wholesale">Contact on WhatsApp</a></div></div></section>
<section class="seo-section"><div class="container"><h2>445 km and 565 km CLTC Versions</h2><div class="table-scroll"><table class="market-vehicle-table"><thead><tr><th>Version</th><th>Range</th><th>Battery</th><th>FOB price</th><th>Detail page</th></tr></thead><tbody><tr><th>445km Zhixuan Edition</th><td>445 km CLTC</td><td>Lithium iron phosphate (LFP)</td><td>US$11,500</td><td><a href="/bestune-yueyi-03-2026-445km-zhixuan-edition.html">View 445km Yueyi 03</a></td></tr><tr><th>565km Xinxiang Edition</th><td>565 km CLTC</td><td>Lithium iron phosphate (LFP)</td><td>US$12,800</td><td><a href="/bestune-yueyi-03-2026-565km-xinxiang-edition.html">View 565km Yueyi 03</a></td></tr></tbody></table></div></div></section>
<section class="seo-section"><div class="container"><h2>Dealer and Fleet Use</h2><p>The Bestune Yueyi 03 is a 5-door, 5-seat pure electric SUV with a 2750 mm wheelbase and 415-1601 L cargo space. It is suitable for dealers, fleet buyers and city mobility projects that need practical cabin space and clear CLTC range options.</p><div class="seo-card-grid">${yueyi03Cars.map((car) => vehicleCard(car, 'Brand-new pure electric SUV with CLTC range, LFP battery and ample stock.')).join('')}</div></div></section>
${contactSection({ heading: 'Get Latest FOB/CIF Price', intro: 'Tell us your destination market, target version and quantity. Country pages do not publish fixed prices; we confirm the latest FOB or CIF quote during inquiry.', model: 'Bestune Yueyi 03 2026 EV', sourcePath: 'bestune-yueyi-03-wholesale.html', message: 'Please send the latest FOB/CIF price, stock colors and export timing for Bestune Yueyi 03 445km and 565km CLTC versions.', button: 'Get Latest FOB/CIF Price' })}`;
  write('bestune-yueyi-03-wholesale.html', pageShell({
    title: 'Bestune Yueyi 03 2026 EV | 445km & 565km Export',
    description: 'Buy the new 2026 Bestune Yueyi 03 electric SUV from China. Choose 445 km or 565 km CLTC range with ample stock and FOB export support.',
    path: 'bestune-yueyi-03-wholesale.html',
    h1: 'Bestune Yueyi 03 2026 EV Export',
    body,
    schema: [aggregateOfferProduct({ name: 'Bestune Yueyi 03 2026 EV Export', description: 'Brand-new Bestune Yueyi 03 pure electric SUV with 445 km and 565 km CLTC versions.', image: yueyi03Cars.map(vehicleImage), url: '/bestune-yueyi-03-wholesale.html', lowPrice: 11500, highPrice: 12800, condition: 'NewCondition' })]
  }));
};

const writeYueyi07Page = () => {
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">Used PHEV SUV export</p><h1>Used Bestune Yueyi 07 PHEV Export</h1><p>Used 2025 Bestune Yueyi 07 plug-in hybrid SUV with 210 km CLTC pure-electric range, approximately 10,000 km mileage and batch export stock. The PHEV powertrain supports city electric driving and helps reduce long-distance range concerns where charging infrastructure is still developing.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Used Bestune Yueyi 07 PHEV">Get Latest FOB/CIF Price</a><a class="btn btn-light" href="/used-bestune-yueyi-07-2025.html">View Detail Page</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Key Export Information</h2><div class="vehicle-info-grid"><div><small>Model year</small><strong>2025</strong></div><div><small>Version</small><strong>210 km Youxiang Edition</strong></div><div><small>Energy type</small><strong>Plug-in Hybrid</strong></div><div><small>Pure-electric range</small><strong>210 km CLTC</strong></div><div><small>Transmission</small><strong>DHT hybrid transmission</strong></div><div><small>Wheelbase</small><strong>2772 mm</strong></div><div><small>Seats</small><strong>5-seat mid-size SUV</strong></div><div><small>FOB price</small><strong>US$13,500</strong></div></div><p>No major accidents reported. Final condition, mileage, color and configuration must be confirmed by VIN.</p></div></section>
<section class="seo-section"><div class="container"><h2>Related Vehicle Page</h2><div class="seo-card-grid">${vehicleCard(yueyi07, 'Low-mileage used PHEV SUV with batch inventory and Qingdao export support.')}</div></div></section>
${contactSection({ heading: 'Request Yueyi 07 PHEV Stock', intro: 'Send your destination and quantity. We will confirm current units, VIN details and export quotation.', model: 'Used Bestune Yueyi 07 PHEV', sourcePath: 'used-bestune-yueyi-07-phev-export.html', message: 'Please send current stock, VIN information, colors and FOB/CIF price for used 2025 Bestune Yueyi 07 PHEV 210 km CLTC.', button: 'Get Latest FOB/CIF Price' })}`;
  write('used-bestune-yueyi-07-phev-export.html', pageShell({
    title: 'Used Bestune Yueyi 07 PHEV | FOB $13,500',
    description: 'Used 2025 Bestune Yueyi 07 plug-in hybrid SUV with 210 km CLTC electric range, approximately 10,000 km mileage and batch export stock.',
    path: 'used-bestune-yueyi-07-phev-export.html',
    h1: 'Used Bestune Yueyi 07 PHEV Export',
    body,
    schema: [productSchema({ name: 'Used Bestune Yueyi 07 PHEV', description: 'Used 2025 Bestune Yueyi 07 plug-in hybrid SUV with 210 km CLTC electric range.', image: vehicleImage(yueyi07), url: '/used-bestune-yueyi-07-phev-export.html', price: 13500, condition: 'UsedCondition' })]
  }));
};

const writeK1Page = () => {
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">Bestune K1 Europe test page</p><h1>Bestune K1 Europe</h1><p>The EU-certified Bestune K1 is a compact electric city car designed for affordable urban mobility. Its small body makes it easy to drive and park in crowded European cities, while the 222 km CLTC range, LFP battery and low energy consumption help reduce daily operating costs.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Bestune K1 Europe">Request K1 Europe Quote</a><a class="btn btn-light" href="/bestune-xiaoma-2026-222km-shanyaoma-edition.html">View China Xiaoma Detail</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Bestune K1, Pony and Xiaoma</h2><p>Bestune K1, also known as Bestune Pony or Xiaoma in China, is a 2026 model brand-new pure electric 3-door, 4-seat compact city car. The 222 km driving range is measured under CLTC. Registration and local compliance requirements should be confirmed for the destination country.</p><div class="vehicle-info-grid"><div><small>Certification</small><strong>EU-certified</strong></div><div><small>Range</small><strong>222 km CLTC</strong></div><div><small>Battery</small><strong>LFP, 18.11 kWh</strong></div><div><small>Energy consumption</small><strong>8.8 kWh/100 km</strong></div><div><small>Body</small><strong>3-door, 4-seat</strong></div><div><small>Length</small><strong>3000 mm</strong></div><div><small>FOB price</small><strong>US$4,500</strong></div><div><small>Compliance note</small><strong>Confirm destination-country requirements</strong></div></div></div></section>
<section class="seo-section"><div class="container"><h2>European Test Markets</h2><div class="seo-card-grid"><article class="seo-card"><h3>Germany</h3><p>Compact EV inquiry entry for German urban mobility projects and dealer testing.</p><a href="#contact">Request Germany quote</a></article><article class="seo-card"><h3>France</h3><p>Bestune K1 electric car inquiry support for France-focused buyers.</p><a href="#contact">Request France quote</a></article><article class="seo-card"><h3>Italy</h3><p>Affordable electric city car Europe inquiry entry for Italy.</p><a href="#contact">Request Italy quote</a></article><article class="seo-card"><h3>Spain</h3><p>Compact EV Europe sourcing support for Spain test inquiries.</p><a href="#contact">Request Spain quote</a></article></div></div></section>
<section class="seo-section"><div class="container"><h2>China Detail Page</h2><div class="seo-card-grid">${vehicleCard(k1, 'Brand-new compact electric city car with 222 km CLTC range and LFP battery.')}</div></div></section>
${contactSection({ heading: 'Request Bestune K1 Europe Quote', intro: 'Tell us your destination country and quantity. We will confirm current stock, documents and export quotation.', model: 'Bestune K1 Europe', sourcePath: 'bestune-k1-europe.html', message: 'Please send current stock, FOB price and destination compliance documents available for EU-certified Bestune K1 Europe. I understand the 222 km range is CLTC and local registration requirements must be confirmed by destination country.', button: 'Request K1 Europe Quote' })}`;
  write('bestune-k1-europe.html', pageShell({
    title: 'Bestune K1 Europe | EU-Certified Compact Electric Car',
    description: 'Explore the EU-certified Bestune K1 compact electric city car with 222 km CLTC range, LFP battery and low urban operating costs.',
    path: 'bestune-k1-europe.html',
    h1: 'Bestune K1 Europe',
    body,
    schema: [productSchema({ name: 'Bestune K1 Europe', description: 'EU-certified compact electric city car with 222 km CLTC range, LFP battery and 18.11 kWh battery.', image: vehicleImage(k1), url: '/bestune-k1-europe.html', price: 4500, condition: 'NewCondition' })]
  }));
};

const writeCoolrayPage = () => {
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow">Nansha Port ready stock</p><h1>Geely Coolray Full Option Ready Stock at Nansha Port</h1><p>Geely Coolray Full Option with Package and Panoramic Sunroof is now available in ready stock at Nansha Port, China. The current FOB reference price is US$11,800 per unit. VIN information, available colors and current quantity can be provided on request. Special dealer pricing is available for bulk orders.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Geely Coolray Nansha Ready Stock">Get Bulk Order Price</a><a class="btn btn-light" href="/geely-coolray-full-option.html">View Coolray Detail Page</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Ready Stock Information</h2><div class="vehicle-info-grid"><div><small>Vehicle type</small><strong>Brand new car</strong></div><div><small>Stock location</small><strong>Nansha Port, China</strong></div><div><small>FOB reference price</small><strong>US$11,800 per unit</strong></div><div><small>Configuration</small><strong>Full Option with Package and Panoramic Sunroof</strong></div><div><small>VIN</small><strong>Available on request</strong></div><div><small>Dealer pricing</small><strong>Available for bulk orders</strong></div></div><p>Current colors and quantity are confirmed during inquiry. Ask for the current vessel schedule when you request a quotation.</p></div></section>
<section class="seo-section"><div class="container"><h2>Priority Africa Keywords</h2><p>Algeria buyers can inquire about Geely Coolray stock disponible Algerie, Geely Coolray Full Option prix FOB, Geely Coolray toit panoramique, Geely Coolray port de Nansha and Geely Coolray export Chine Algerie. Cote d'Ivoire buyers can request Geely Coolray Cote d'Ivoire, Geely Coolray prix Abidjan and export Geely Coolray Chine Abidjan. Ghana buyers can ask for Geely Coolray for sale Ghana, Geely Coolray ready stock China and Geely Coolray panoramic sunroof.</p></div></section>
<section class="seo-section"><div class="container"><h2>Related Vehicle Page</h2><div class="seo-card-grid">${vehicleCard(coolray, 'Brand-new Geely Coolray Full Option ready stock at Nansha Port with FOB reference price US$11,800.')}</div></div></section>
${contactSection({ heading: 'Get Bulk Order Price', intro: 'Send your destination port, quantity and color preference. We will confirm VIN information, current quantity, bulk order price and vessel schedule.', model: 'Geely Coolray Full Option ready stock at Nansha Port', sourcePath: 'geely-coolray-ready-stock-nansha-port.html', message: 'Please send me the current quantity, available colors, VIN information, bulk order price and shipping schedule for the Geely Coolray Full Option ready stock at Nansha Port.', button: 'Get Bulk Order Price' })}`;
  write('geely-coolray-ready-stock-nansha-port.html', pageShell({
    title: 'Geely Coolray Ready Stock at Nansha Port | FOB $11,800',
    description: 'Geely Coolray Full Option with Package and Panoramic Sunroof is in ready stock at Nansha Port. FOB US$11,800. Ask for VINs, quantity and bulk pricing.',
    path: 'geely-coolray-ready-stock-nansha-port.html',
    h1: 'Geely Coolray Full Option Ready Stock at Nansha Port',
    body,
    schema: [productSchema({ name: 'Geely Coolray Full Option Ready Stock at Nansha Port', description: 'Brand-new Geely Coolray Full Option with Package and Panoramic Sunroof ready stock at Nansha Port, China.', image: vehicleImage(coolray), url: '/geely-coolray-ready-stock-nansha-port.html', price: 11800, condition: 'NewCondition' })]
  }));
};

const marketVehicleGrid = () => `<div class="seo-card-grid">${[
  vehicleCard(coolray, 'Geely Coolray Nansha Port ready stock with panoramic sunroof.'),
  vehicleCard(b70Cars[0], 'Used Bestune B70 batch stock from Qingdao.'),
  vehicleCard(yueyi03Cars[0], 'Bestune Yueyi 03 445 km CLTC brand-new EV.'),
  vehicleCard(yueyi07, 'Used Bestune Yueyi 07 PHEV with 210 km CLTC pure-electric range.')
].join('')}</div>`;

const writeGhanaPage = () => {
  const faqs = [
    ['Can I request FOB or CIF prices for Ghana?', 'Yes. Send the model, quantity and destination port, and we will confirm the latest FOB or CIF quotation.'],
    ['Do you publish fixed country-page prices?', 'No. Country pages use Get Latest FOB/CIF Price because stock, freight and destination requirements change.'],
    ['Which models are highlighted for Ghana?', 'Used Bestune B70 batch stock, Bestune Yueyi 03, Used Bestune Yueyi 07 PHEV and Geely Coolray Nansha ready stock.']
  ];
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow market-badge">Ghana Market</p><h1>Export Cars from China to Ghana</h1><p>Zhonggu Auto Export helps Ghana dealers and importers source new cars, selected used vehicles, EVs and SUVs from China with practical FOB/CIF quotation support and export documentation coordination.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Export Cars from China to Ghana">Get Latest FOB/CIF Price</a><a class="btn btn-light whatsapp-btn" href="${escapeAttr(waHref('Please send vehicle options, FOB/CIF price and shipping details for Ghana.'))}" data-whatsapp-button="true" data-vehicle="Export Cars from China to Ghana">WhatsApp ${WA_DISPLAY}</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Priority Vehicle Options for Ghana</h2>${marketVehicleGrid()}</div></section>
<section class="seo-section"><div class="container"><h2>FOB/CIF Inquiry Workflow</h2><ol class="seo-list"><li>Send model, quantity, budget and destination port in Ghana.</li><li>We confirm current stock, photos, VIN information where available and condition details.</li><li>We prepare the latest FOB or CIF quotation based on current stock and freight.</li><li>Buyer confirms local import, tax, certification and registration requirements.</li></ol></div></section>
<section class="seo-section"><div class="container"><h2>Africa Market Links</h2><nav class="market-link-grid" aria-label="Africa market pages"><a href="/export-cars-from-china-to-algeria.html">Algeria</a><a href="/export-cars-from-china-to-ivory-coast.html">Cote d'Ivoire</a><a href="/export-cars-from-china-to-ghana.html">Ghana</a><a href="/export-cars-from-china-to-africa.html">Africa</a></nav></div></section>
<section class="seo-section"><div class="container"><h2>FAQ</h2><div class="faq-list">${faqs.map(([q, a]) => `<article class="faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}</div></div></section>
${contactSection({ heading: 'Get Latest FOB/CIF Price', intro: 'Tell us your target vehicle, quantity and destination port in Ghana. We will confirm the latest stock and quote.', model: 'Export Cars from China to Ghana', sourcePath: 'export-cars-from-china-to-ghana.html', message: 'Please send Used Bestune B70, Bestune Yueyi 03, Used Bestune Yueyi 07 PHEV and Geely Coolray Nansha ready stock options with latest FOB/CIF price for Ghana.', country: 'Ghana', button: 'Get Latest FOB/CIF Price' })}`;
  write('export-cars-from-china-to-ghana.html', pageShell({
    title: 'Export Cars from China to Ghana | New and Used Vehicles',
    description: 'Source new and used vehicles from China for Ghana, including Bestune B70 batch stock, Yueyi 03 EV, Yueyi 07 PHEV and Geely Coolray ready stock.',
    path: 'export-cars-from-china-to-ghana.html',
    h1: 'Export Cars from China to Ghana',
    market: 'Ghana',
    body,
    schema: [
      marketProductSchema({ name: 'China vehicle export service to Ghana', description: 'New and used vehicle sourcing from China for Ghana dealers and importers, with latest FOB or CIF quotation support.', url: '/export-cars-from-china-to-ghana.html' }),
      faqSchema(faqs)
    ]
  }));
};

const writeIvoryCoastPage = () => {
  const faqs = [
    ['Pouvez-vous preparer un prix FOB ou CIF pour Abidjan ?', 'Oui. Envoyez le modele, la quantite et le port de destination Abidjan pour recevoir une cotation actualisee.'],
    ['Les prix et quantites sont-ils fixes sur la page ?', 'Non. Les prix et quantites sont confirmes pendant la demande car le stock et le fret changent.'],
    ['Garantissez-vous le dedouanement local ?', 'Non. L acheteur doit confirmer les regles locales d importation, taxes, certification et immatriculation.']
  ];
  const body = `<section class="seo-hero"><div class="container"><p class="eyebrow market-badge">C&ocirc;te d&rsquo;Ivoire - Abidjan</p><h1>Voitures de Chine vers la C&ocirc;te d&rsquo;Ivoire</h1><p>Zhonggu Auto Export accompagne les concessionnaires et importateurs en C&ocirc;te d&rsquo;Ivoire pour l'achat de voitures neuves et d'occasion depuis la Chine, avec photos, informations VIN disponibles, verification d'etat et demande de prix FOB/CIF pour Abidjan.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Voitures de Chine vers la Cote d'Ivoire">Get Latest FOB/CIF Price</a><a class="btn btn-light whatsapp-btn" href="${escapeAttr(waHref('Veuillez envoyer les options de vehicules, prix FOB/CIF et details pour Abidjan, Cote dIvoire.'))}" data-whatsapp-button="true" data-vehicle="Voitures de Chine vers la Cote d'Ivoire">WhatsApp ${WA_DISPLAY}</a></div></div></section>
<section class="seo-section"><div class="container"><h2>Vehicules prioritaires pour Abidjan</h2>${marketVehicleGrid()}</div></section>
<section class="seo-section"><div class="container"><h2>Processus de demande FOB/CIF</h2><ol class="seo-list"><li>Envoyez le modele, la quantite, le budget et le port Abidjan.</li><li>Nous confirmons les photos du vehicule, les informations VIN disponibles, l'etat et le stock actuel.</li><li>Nous preparons une cotation FOB ou CIF selon le stock et le fret du moment.</li><li>L'acheteur confirme les regles locales d'importation, les taxes, la certification et l'immatriculation.</li></ol><p>Nous ne promettons pas le dedouanement local ni l'approbation d'immatriculation.</p></div></section>
<section class="seo-section"><div class="container"><h2>Pages liees</h2><nav class="market-link-grid" aria-label="Africa market pages"><a href="/export-cars-from-china-to-algeria.html">Algerie</a><a href="/export-cars-from-china-to-ghana.html">Ghana</a><a href="/used-bestune-b70-wholesale.html">Bestune B70 occasion</a><a href="/geely-coolray-ready-stock-nansha-port.html">Geely Coolray Nansha</a></nav></div></section>
<section class="seo-section"><div class="container"><h2>FAQ</h2><div class="faq-list">${faqs.map(([q, a]) => `<article class="faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}</div></div></section>
${contactSection({ heading: 'Demander le prix FOB/CIF pour Abidjan', intro: 'Envoyez le modele et la quantite. Nous confirmerons le stock, les photos, le VIN disponible et la cotation pour Abidjan.', model: "Voitures de Chine vers la Cote d'Ivoire", sourcePath: 'export-cars-from-china-to-ivory-coast.html', message: 'Veuillez envoyer les options Bestune B70 occasion, Geely Coolray Nansha, Bestune Yueyi 03 et Yueyi 07 PHEV avec prix FOB/CIF pour Abidjan.', country: "Cote d'Ivoire", language: 'fr', button: 'Get Latest FOB/CIF Price' })}`;
  write('export-cars-from-china-to-ivory-coast.html', pageShell({
    lang: 'fr',
    title: 'Voitures de Chine vers la C&ocirc;te d&rsquo;Ivoire | Export Automobile',
    description: 'Export automobile de Chine vers la Cote d Ivoire avec voitures neuves et occasion, Bestune B70, Geely Coolray, Yueyi 03 EV et Yueyi 07 PHEV.',
    path: 'export-cars-from-china-to-ivory-coast.html',
    h1: "Voitures de Chine vers la Cote d'Ivoire",
    market: "Cote d'Ivoire",
    body,
    schema: [
      marketProductSchema({ name: "Service d'export automobile de Chine vers la Cote d'Ivoire", description: "Service de sourcing de voitures neuves et d'occasion depuis la Chine vers Abidjan, Cote d'Ivoire, avec demande de prix FOB ou CIF actualisee.", url: '/export-cars-from-china-to-ivory-coast.html' }),
      faqSchema(faqs)
    ]
  }));
};

const writeAlgeriaPage = () => {
  const faqs = [
    ['Do you have Geely Coolray ready stock for Algeria?', 'We can check Geely Coolray Full Option ready stock at Nansha Port. Colors, quantity and VIN information are confirmed during inquiry.'],
    ['Can Algeria buyers request used Bestune B70 batch stock?', 'Yes. Used Bestune B70 2021-2023 batch inventory is available from Qingdao, China, with final unit details confirmed by VIN.'],
    ['Do you guarantee local import approval?', 'No. Buyers must confirm current Algeria import, tax, certification and registration rules before order.']
  ];
  const body = `<section class="seo-hero algeria-priority-hero"><div class="container"><p class="eyebrow">Algeria Vehicle Export Support</p><h1>Export Cars from China to Algeria</h1><p>Zhonggu Auto Export helps Algeria importers, dealers, trading companies and middlemen source practical vehicles from China. We keep the existing Geely Binyue and Coolray focus, and now add Geely Coolray Nansha Port ready stock, used Bestune B70 batch stock, Bestune Yueyi 03 EV and used Bestune Yueyi 07 PHEV.</p><div class="hero-actions"><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="Export Cars from China to Algeria">Get Latest FOB/CIF Price</a><a class="btn btn-light whatsapp-btn" href="${escapeAttr(waHref('Please send Geely Coolray Nansha ready stock, Bestune B70 batch stock, Yueyi 03 and Yueyi 07 PHEV options for Algeria.'))}" data-whatsapp-button="true" data-vehicle="Export Cars from China to Algeria">WhatsApp ${WA_DISPLAY}</a></div></div></section>
<section class="seo-section"><div class="container"><div class="algeria-image-row"><figure><img src="/${escapeAttr(vehicleImage(coolray))}" alt="Geely Coolray Nansha Port ready stock for Algeria"><figcaption>Geely Coolray Nansha Port ready stock</figcaption></figure><figure><img src="/images/used-cars/used-bestune-b70-2021-001/05-front-right-zhonggu.png" alt="Used Bestune B70 batch stock for Algeria"><figcaption>Used Bestune B70 batch stock</figcaption></figure><figure><img src="/images/new-cars/yueyi03-445-zhixuan/06_front_left.jpg" alt="Bestune Yueyi 03 electric SUV export option"><figcaption>Bestune Yueyi 03 EV</figcaption></figure></div></div></section>
<section class="seo-section"><div class="container"><h2>Priority Algeria Vehicle Options</h2>${marketVehicleGrid()}</div></section>
<section class="seo-section"><div class="container"><h2>Geely Binyue and Coolray SEO Focus</h2><p>Algeria buyers continue to ask about Geely Binyue and Geely Coolray compact SUV options. We preserve this page URL and canonical while adding a higher-priority entry for Geely Coolray Full Option ready stock at Nansha Port. Current colors, quantity and VIN information are confirmed during inquiry instead of being published as a fixed list.</p></div></section>
<section class="seo-section"><div class="container"><h2>FOB and CIF Price to Algiers</h2><p>To prepare a meaningful quotation, we need the target model, quantity, color preference, departure port, destination port and current vessel schedule. CIF price changes with sea freight and stock availability, so this page uses Get Latest FOB/CIF Price instead of a fixed country-page price.</p></div></section>
<section class="seo-section"><div class="container"><h2>Contenu en francais pour les acheteurs en Algerie</h2><p>Nous pouvons verifier Geely Coolray stock disponible Algerie, Bestune B70 occasion, voiture d'occasion Chine, export voiture Chine Algerie, Bestune Yueyi 03 electrique et Bestune Yueyi 07 hybride rechargeable. Les prix FOB/CIF sont confirmes selon le stock et le fret du moment.</p></div></section>
<section class="seo-section"><div class="container"><h2>Related Algeria Export Pages</h2><div class="link-cloud"><a href="/geely-coolray-ready-stock-nansha-port.html">Geely Coolray Nansha Ready Stock</a><a href="/used-bestune-b70-wholesale.html">Used Bestune B70 Wholesale</a><a href="/bestune-yueyi-03-wholesale.html">Bestune Yueyi 03 EV</a><a href="/used-bestune-yueyi-07-phev-export.html">Used Bestune Yueyi 07 PHEV</a><a href="/landing/geely-binyue-export-algeria">Geely Binyue Export to Algeria</a><a href="/landing/cif-car-price-to-algiers">CIF Car Price to Algiers</a></div></div></section>
<section class="seo-section"><div class="container"><h2>FAQ for Algeria Car Importers</h2><div class="faq-list">${faqs.map(([q, a]) => `<article class="faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}</div></div></section>
${contactSection({ heading: 'Get Latest FOB/CIF Price to Algiers', intro: 'Send target model, quantity and destination port. We will confirm current stock, FOB price, CIF price and vessel schedule when available.', model: 'Export Cars from China to Algeria', sourcePath: 'export-cars-from-china-to-algeria.html', message: 'Please send Geely Coolray Nansha ready stock, Bestune B70 batch stock, Bestune Yueyi 03 and Used Bestune Yueyi 07 PHEV options with latest FOB/CIF price to Algiers.', country: 'Algeria', button: 'Get Latest FOB/CIF Price' })}`;
  write('export-cars-from-china-to-algeria.html', pageShell({
    title: 'Export Cars from China to Algeria | Geely Coolray and Bestune Stock',
    description: 'Export cars from China to Algeria with Geely Coolray Nansha ready stock, used Bestune B70 batch stock, Yueyi 03 EV and Yueyi 07 PHEV options.',
    path: 'export-cars-from-china-to-algeria.html',
    canonicalPath: 'export-cars-from-china-to-algeria',
    h1: 'Export Cars from China to Algeria',
    market: 'Algeria',
    body,
    schema: [
      marketProductSchema({ name: 'China vehicle export service to Algeria', description: 'Vehicle sourcing and export quotation support from China to Algeria, including Geely Coolray, used Bestune B70, Yueyi 03 and Yueyi 07 PHEV options.', url: '/export-cars-from-china-to-algeria.html' }),
      faqSchema(faqs)
    ]
  }));
};

const updateHomeAndListPages = () => {
  const newCars = cars.filter((car) => !(car.isUsed === true || String(car.category || car.type || car.condition || '').toLowerCase().includes('used')));
  const usedCars = cars.filter((car) => car.isUsed === true || String(car.category || car.type || car.condition || '').toLowerCase().includes('used'));
  const newCards = newCars.map(staticVehicleCard).join('\n');
  const usedCardsAll = usedCars.map(staticVehicleCard).join('\n');
  const usedCardsSix = usedCars.slice(0, 6).map(staticVehicleCard).join('\n');

  let index = read('index.html');
  index = index.replace(/<section class="section priority-vehicles-section">[\s\S]*?<\/section>/, `<section class="section priority-vehicles-section"><div class="container"><div class="section-heading heading-row"><div><p class="eyebrow">Current export enquiries</p><h2>Priority Africa Vehicles</h2></div><p>Ready-stock and batch-supply models for Algeria, Cote d'Ivoire and Ghana inquiries.</p></div><div class="priority-vehicle-links"><a href="/geely-coolray-ready-stock-nansha-port.html">Geely Coolray Nansha Port Ready Stock</a><a href="/used-bestune-b70-wholesale.html">Used Bestune B70 Batch Stock</a><a href="/bestune-yueyi-03-wholesale.html">Bestune Yueyi 03 Ready Stock</a><a href="/used-bestune-yueyi-07-phev-export.html">Used Bestune Yueyi 07 PHEV</a></div></div></section>`);
  index = index.replace(/<section class="seo-section importer-resources-section">[\s\S]*?<\/section>/, '');
  index = index.replace('<section class="seo-section export-markets-home">', `<section class="seo-section importer-resources-section"><div class="container"><div class="section-heading centered"><p class="eyebrow">For dealers and importers</p><h2>Wholesale Importer Resources</h2><p>Review current ready stock, batch inventory and the information needed for an FOB or CIF quotation.</p></div><div class="export-market-grid"><article class="seo-card"><h3>Car Importer Center</h3><p>A practical starting point for overseas dealers, importers, trading companies and fleet buyers.</p><a href="/car-importer-center.html">Visit Importer Center</a></article><article class="seo-card"><h3>Wholesale Cars from China</h3><p>Compare selected new-car supply, used-car batches and ready stock by China location.</p><a href="/wholesale-cars-from-china.html">View Wholesale Stock</a></article><article class="seo-card"><h3>Current Export Markets</h3><p>Explore sourcing support for Algeria, Africa, Central Asia and Southeast Asia.</p><a href="/export-cars-from-china-to-algeria.html">View Import Markets</a></article></div></div></section><section class="seo-section export-markets-home">`);
  index = index.replace(/<section class="seo-section export-markets-home">[\s\S]*?<\/section><section id="contact"/, `<section class="seo-section export-markets-home"><div class="container"><div class="section-heading centered"><p class="eyebrow">Africa priority markets</p><h2>Export Markets</h2><p>Explore current vehicle sourcing, FOB/CIF quotations and export support for key Africa markets.</p></div><div class="export-market-grid"><article class="seo-card"><h3>Algeria</h3><p>Geely Coolray, Bestune B70 batch stock and Algeria-focused FOB/CIF inquiry support.</p><a href="export-cars-from-china-to-algeria.html">Export cars to Algeria</a></article><article class="seo-card"><h3>Cote d'Ivoire</h3><p>French-language Abidjan inquiry workflow for new and used vehicles from China.</p><a href="export-cars-from-china-to-ivory-coast.html">Export cars to Cote d'Ivoire</a></article><article class="seo-card"><h3>Ghana</h3><p>New cars, used stock, EVs and SUV export support for Ghana dealers.</p><a href="export-cars-from-china-to-ghana.html">Export cars to Ghana</a></article></div></div></section><section id="contact"`);
  index = index.replace(/<article class="export-solution-card priority-card">[\s\S]*?<\/article>/, `<article class="export-solution-card priority-card"><h3 data-i18n="exportSolutions.priorityMarket">Priority Africa Markets</h3><div class="solution-link-list"><a href="/export-cars-from-china-to-algeria.html">Export Cars to Algeria</a><a href="/export-cars-from-china-to-ivory-coast.html">Export Cars to Cote d'Ivoire</a><a href="/export-cars-from-china-to-ghana.html">Export Cars to Ghana</a><a href="/geely-coolray-ready-stock-nansha-port.html">Geely Coolray Nansha Ready Stock</a><a href="/used-bestune-b70-wholesale.html">Used Bestune B70 Wholesale</a></div></article>`);
  index = injectVehicleGrid(index, 'new', newCards, 'all');
  index = injectVehicleGrid(index, 'used', usedCardsSix, '6');
  write('index.html', index);

  let newPage = read('new-cars.html');
  newPage = injectVehicleGrid(newPage, 'new', newCards, 'all');
  newPage = newPage.replace('View Central Asia sourcing</a></article></div>', `View Central Asia sourcing</a></article><article class="seo-card"><h3>Africa Priority Markets</h3><a href="export-cars-from-china-to-algeria.html">Algeria</a> | <a href="export-cars-from-china-to-ivory-coast.html">Cote d'Ivoire</a> | <a href="export-cars-from-china-to-ghana.html">Ghana</a></article></div>`);
  write('new-cars.html', newPage);

  let usedPage = read('used-cars.html');
  usedPage = injectVehicleGrid(usedPage, 'used', usedCardsAll, 'all');
  if (!usedPage.includes('used-bestune-b70-wholesale.html')) {
    usedPage = usedPage.replace('<a href="export-cars-from-china-to-algeria.html">Export Cars to Algeria</a>', "<a href=\"export-cars-from-china-to-algeria.html\">Export Cars to Algeria</a><a href=\"export-cars-from-china-to-ivory-coast.html\">Export Cars to Cote d'Ivoire</a><a href=\"export-cars-from-china-to-ghana.html\">Export Cars to Ghana</a><a href=\"used-bestune-b70-wholesale.html\">Used Bestune B70 Wholesale</a><a href=\"used-bestune-yueyi-07-phev-export.html\">Used Bestune Yueyi 07 PHEV</a>");
  }
  write('used-cars.html', usedPage);
};

writeImporterCenterPage();
writeWholesaleCarsPage();
writeB70Page();
writeYueyi03Page();
writeYueyi07Page();
writeK1Page();
writeCoolrayPage();
writeGhanaPage();
writeIvoryCoastPage();
writeAlgeriaPage();
updateHomeAndListPages();

console.log('Generated SEO market upgrade pages and static vehicle cards.');
