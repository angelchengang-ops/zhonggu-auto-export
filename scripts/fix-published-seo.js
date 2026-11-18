const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://zhongguauto.com';
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'images',
  'videos',
  'assets',
  'data',
  'tmp',
  'media-inbox',
  'media-processed',
  'netlify'
]);

const textFixes = [
  ['Fran莽ais', 'Français'],
  ['丕賱毓乇亘賷丞', 'العربية'],
  ['馃實', '🌍'],
  ['buyer鈥檚', "buyer's"],
  ['Buyers鈥檚', "Buyers'"],
  ['Руский', 'Русский'],
  ['Common departure ports include China ports.', 'Common departure ports include Qingdao, Shanghai and Nansha, depending on vehicle location and carrier schedule.'],
  ['For Algeria-focused requests, the destination port is usually buyer destination port.', 'The destination port is confirmed with the buyer before a shipping quotation is prepared.'],
  ['Common China departure ports include China ports. For Algeria inquiries, the destination port is usually buyer destination port.', 'Common China departure ports include Qingdao, Shanghai and Nansha, depending on vehicle location and carrier schedule. The destination port is confirmed before quotation.']
];

const read = (file) => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');
const replaceAll = (content, from, to) => content.split(from).join(to);
const stripTags = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const removeInternalVehicleSections = (html, relativePath) => {
  html = html.replace(
    /<section class="seo-section vehicle-custom-section[^"]*">[\s\S]*?<\/section>/gi,
    (section) => {
      const text = stripTags(section);
      if (/\bIf This Unit Is Sold\b/i.test(text)) return '';
      if (!relativePath.startsWith('ru/') && /[\u0400-\u04ff]/.test(text)) return '';
      return section;
    }
  );

  html = replaceAll(html, 'Geely Binyue and Coolray SEO Focus', 'Geely Binyue and Coolray Supply');
  html = replaceAll(
    html,
    'Algeria buyers continue to ask about Geely Binyue and Geely Coolray compact SUV options. We preserve this page URL and canonical while adding a higher-priority entry for Geely Coolray Full Option ready stock at Nansha Port.',
    'Algeria buyers continue to ask about Geely Binyue and Geely Coolray compact SUV options. Geely Coolray Full Option ready stock at Nansha Port is highlighted alongside other currently available options.'
  );

  return html;
};

const replaceSimpleSection = (html, heading, replacement) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<section class="seo-section"><div class="container"><h2>${escaped}<\\/h2>[\\s\\S]*?<\\/div><\\/section>`, 'i');
  return html.replace(pattern, replacement);
};

const fixMgLanding = (html, relativePath) => {
  const isUsed = relativePath.includes('/mg-used-cars-china/');
  const isGeneral = relativePath.includes('/mg-car-exporter-china/');
  if (!isUsed && !isGeneral) return html;

  const pageName = isUsed ? 'MG Used Cars Export from China' : 'MG Car Exporter from China';
  const focus = isUsed ? 'selected used MG sedans and SUVs' : 'new and selected used MG sedans and SUVs';

  html = replaceAll(html, 'seo-hero algeria-priority-hero', 'seo-hero');
  html = replaceAll(html, 'Algeria Vehicle Export Support', 'MG Vehicle Export Support');
  html = replaceAll(html, 'Get Latest Geely Stock List', 'Get Current MG Stock List');
  html = replaceAll(html, 'Ask for Algeria Shipping Quote', 'Request Shipping Quote');
  html = html.replace(/<section class="seo-section"><div class="container"><div class="algeria-image-row">[\s\S]*?<\/section>/i, '');

  const buyerDemandSection = isUsed
    ? `<section class="seo-section"><div class="container"><h2>Buyer Demand and Market Fit</h2><p>Used MG buyers usually compare model year, mileage, trim, condition, color and export-ready documents before choosing a unit. Zhonggu Auto Export checks ${focus} from China for overseas dealers and importers, then confirms stock location, inspection media, FOB quotation needs, possible CIF inquiry details and purchasing schedule before replying.</p></div></section>`
    : `<section class="seo-section"><div class="container"><h2>Buyer Demand and Market Fit</h2><p>Overseas dealers and importers usually need confirmed model year, mileage or new-car status, configuration, available colors, inspection material, vehicle location and a current FOB or CIF quotation. Zhonggu Auto Export checks ${focus} according to the buyer's destination, quantity, budget and purchasing schedule.</p></div></section>`;
  html = replaceSimpleSection(html, 'Buyer Demand and Market Fit', buyerDemandSection);

  const mgSourcingSection = isUsed
    ? `<section class="seo-section"><div class="container"><h2>MG Vehicle Sourcing and Inspection</h2><p>Zhonggu Auto Export checks ${focus} through current China dealer and inventory channels. Before quotation we confirm stock status, mileage, exterior and interior condition, trim configuration, LHD/RHD requirement, available photos, VIN or inspection material and export timing.</p></div></section>`
    : `<section class="seo-section"><div class="container"><h2>MG Vehicle Sourcing</h2><p>Zhonggu Auto Export checks ${focus} from current China dealer and inventory channels. Stock, condition, mileage, configuration, left-hand or right-hand drive requirements, photos and export timing are confirmed before quotation.</p></div></section>`;
  html = replaceSimpleSection(html, 'Ready Stock and Vehicle Sourcing', mgSourcingSection);
  html = replaceSimpleSection(html, 'MG Vehicle Sourcing', mgSourcingSection);
  html = replaceSimpleSection(html, 'MG Vehicle Sourcing and Inspection', mgSourcingSection);

  const mgShippingSection = isUsed
    ? '<section class="seo-section"><div class="container"><h2>Shipping and China Port Delivery</h2><p>Vehicle location and carrier schedule determine the China loading port. Common options include Qingdao, Shanghai and Nansha. We coordinate port delivery, export documents, loading preparation and FOB/CIF shipping inquiry details after the model, quantity and destination port are provided.</p></div></section>'
    : '<section class="seo-section"><div class="container"><h2>Shipping and China Port Delivery</h2><p>Vehicle location and the selected carrier determine the loading port. Common options include Qingdao, Shanghai and Nansha. Shipping preparation and transit estimates are confirmed after the model, quantity and destination port are provided.</p></div></section>';
  html = replaceSimpleSection(html, 'Shipping and China Port Delivery', mgShippingSection);

  const mgBuyerInfoSection = isUsed
    ? `<section class="seo-section"><div class="container"><h2>What MG Used Car Buyers Should Send</h2><p>Send target MG model, model year, quantity, mileage range, condition preference, budget, destination country and port, and whether FOB or CIF pricing is required. We will respond with current availability, document status and the next export quotation step.</p></div></section>`
    : `<section class="seo-section"><div class="container"><h2>What Buyers Should Send</h2><p>Send the target MG model, year, quantity, condition preference, budget, destination country and port, and whether FOB or CIF pricing is required. We will confirm current availability and the documents available for the selected vehicle.</p></div></section>`;
  html = replaceSimpleSection(html, 'What Buyers Should Send', mgBuyerInfoSection);
  html = replaceSimpleSection(html, 'What MG Used Car Buyers Should Send', mgBuyerInfoSection);

  html = replaceAll(html, 'Do you have Geely Binyue ready stock for Algeria?', 'Can you confirm current MG stock?');
  html = replaceAll(html, 'For Algeria inquiries, Geely Binyue is a priority model. Availability changes, so we confirm current stock, colors and configuration before quotation.', 'Yes. Send the required MG model, year, condition and quantity. We will check current stock, colors, configuration and vehicle location before quotation.');
  html = replaceAll(html, 'Which ports do you usually use?', 'Which China loading ports may be used?');
  html = replaceAll(html, 'Common China departure ports include China ports. For Algeria inquiries, the destination port is usually buyer destination port.', 'Common loading ports include Qingdao, Shanghai and Nansha, depending on vehicle location and carrier schedule. The destination port is confirmed before quotation.');
  html = replaceAll(html, 'name="market_country" value="Algeria"', 'name="market_country" value="Global"');
  html = replaceAll(html, '/style.css?v=20260629-algeria-seo', '/style.css?v=20260724-seo-fix');
  html = replaceAll(html, `supports ${pageName.toLowerCase()} for`, `supports ${pageName} for`);

  return html;
};

const fixSaicLanding = (html, relativePath) => {
  const roewe = relativePath === 'landing/roewe-car-exporter-china/index.html';
  const saic = relativePath === 'landing/saic-car-exporter-china/index.html';
  if (!roewe && !saic) return html;
  const brand = roewe ? 'Roewe' : 'MG and Roewe';
  html = replaceAll(html, 'seo-hero algeria-priority-hero', 'seo-hero');
  html = replaceAll(html, 'Algeria Vehicle Export Support', `${brand} Vehicle Sourcing`);
  html = replaceAll(html, 'Get Latest Geely Stock List', `Request ${brand} Availability`);
  html = replaceAll(html, 'Ask for Algeria Shipping Quote', 'Request Shipping Quote');
  html = html.replace(/rather than broad claims or keyword-stuffed promises/g, 'for your selected vehicle and destination');
  const sections = {
    'Buyer Demand and Market Fit': roewe
      ? 'For a Roewe sourcing request, specify the model, preferred year, powertrain and new or used condition. We confirm available units and their specification sheets before preparing a quotation. A brand-level enquiry is not confirmation that a particular Roewe model is in stock.'
      : 'Start a SAIC vehicle enquiry by choosing MG or Roewe and naming the model. Brand names alone do not identify equivalent configurations. We compare each requested listing by its documented equipment, condition, quotation and availability so that the buyer can evaluate specific vehicles.',
    'Ready Stock and Vehicle Sourcing': roewe
      ? 'Roewe sourcing is handled against your requested model and configuration. Ask for vehicle-specific exterior and interior photos, stock location, equipment details and documents. For used vehicles, include the acceptable mileage and condition range. Zhonggu Auto Export provides independent sourcing and export coordination.'
      : 'Our SAIC-related sourcing enquiries cover MG and Roewe vehicles. The catalogue includes two MG5 quotations at FOB US$7,500 and US$9,000; their configurations remain to be confirmed. These are separate quotation references, not verified trim levels. Ask for the specification sheet and current availability of the chosen vehicle.',
    'Shipping and China Port Delivery': 'The loading port and preparation schedule depend on vehicle location, document readiness and the carrier. Send your destination country and port with the vehicle reference. We can then confirm port delivery arrangements and prepare an FOB quotation or a separate CIF enquiry.',
    'What Buyers Should Send': `Send the target ${brand} model, quantity, preferred year and equipment, new or used condition, budget and destination port. For a used vehicle, add your mileage limit. Specify whether you need FOB pricing or a CIF enquiry including sea freight and insurance.`
  };
  for (const [heading, content] of Object.entries(sections)) {
    html = replaceSimpleSection(html, heading, `<section class="seo-section"><div class="container"><h2>${heading}</h2><p>${content}</p>${heading === 'Ready Stock and Vehicle Sourcing' && saic ? '<div class="link-cloud"><a href="/mg5-67900-rmb.html">MG5 listing 67900 — FOB US$7,500</a><a href="/mg5-85900-rmb.html">MG5 listing 85900 — FOB US$9,000</a></div>' : ''}</div></section>`);
  }
  html = replaceAll(html, 'Do you have Geely Binyue ready stock for Algeria?', `How can I confirm ${brand} availability?`);
  html = replaceAll(html, 'For Algeria inquiries, Geely Binyue is a priority model. Availability changes, so we confirm current stock, colors and configuration before quotation.', `Send the required ${brand} model, quantity and configuration. We will check current availability and vehicle-specific documents before confirming a quotation.`);
  html = replaceAll(html, 'For ready stock vehicles, shipping preparation usually takes 7-15 days after order confirmation, depending on documents, stock handover and carrier schedule.', 'Preparation timing is confirmed for the selected vehicle after checking stock handover, documents and carrier availability.');
  html = replaceAll(html, 'name="market_country" value="Algeria"', 'name="market_country" value="Global"');
  html = replaceAll(html, 'name="market_region" value="Africa"', 'name="market_region" value="Global"');
  return html;
};

const inferOfferCount = (product) => {
  const name = String(product.name || '').toLowerCase();
  if (name.includes('bestune b70')) return 3;
  if (name.includes('yueyi 03')) return 2;
  if (Array.isArray(product.offers?.offers) && product.offers.offers.length) return product.offers.offers.length;
  return null;
};

const normalizeSchemaNode = (node) => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return node;

  if (node['@type'] === 'Product' && String(node.category || '').toLowerCase() === 'vehicle export service') {
    return {
      '@type': 'Service',
      name: node.name,
      description: node.description,
      url: node.url,
      provider: { '@id': `${SITE}/#organization` },
      ...(node.areaServed ? { areaServed: node.areaServed } : {})
    };
  }

  if (node['@type'] === 'Product') {
    const offer = node.offers;
    if (offer?.['@type'] === 'AggregateOffer' && !offer.offerCount) {
      const count = inferOfferCount(node);
      if (count) offer.offerCount = count;
    }

    if (offer?.['@type'] === 'Offer' && !offer.price && !offer.priceSpecification) {
      delete node.offers;
    }

    const hasEligibleProductResultData = Boolean(node.offers || node.review || node.aggregateRating);
    if (!hasEligibleProductResultData) return null;
  }

  return node;
};

const normalizeJsonLd = (html) => html.replace(
  /<script([^>]*type=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi,
  (full, attrs, rawJson) => {
    try {
      const parsed = JSON.parse(rawJson.trim().replace(/^\uFEFF/, ''));
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeSchemaNode).filter(Boolean);
        return normalized.length ? `<script${attrs}>${JSON.stringify(normalized).replace(/</g, '\\u003c')}</script>` : '';
      }
      if (Array.isArray(parsed['@graph'])) {
        parsed['@graph'] = parsed['@graph'].map(normalizeSchemaNode).filter(Boolean);
      } else {
        const normalized = normalizeSchemaNode(parsed);
        if (!normalized) return '';
        Object.keys(parsed).forEach((key) => delete parsed[key]);
        Object.assign(parsed, normalized);
      }
      return `<script${attrs}>${JSON.stringify(parsed).replace(/</g, '\\u003c')}</script>`;
    } catch (error) {
      console.warn(`Skipped invalid JSON-LD: ${error.message}`);
      return full;
    }
  }
);

const fixHtml = (file, relativePath) => {
  const before = read(file);
  let after = before;
  for (const [from, to] of textFixes) after = replaceAll(after, from, to);
  after = removeInternalVehicleSections(after, relativePath);
  after = fixMgLanding(after, relativePath);
  after = fixSaicLanding(after, relativePath);
  after = normalizeJsonLd(after);
  if (after !== before) write(file, after);
};

const walk = (dir, relativeDir = '') => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const relative = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolutePath, relative);
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') fixHtml(absolutePath, relative);
  }
};

walk(ROOT);
console.log('Published HTML SEO cleanup completed.');
