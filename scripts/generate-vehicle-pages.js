const fs = require('fs');
const path = require('path');

const SITE = 'https://www.zhongguauto.com';
const STYLE_VERSION = '20260716-used-detail-compact-phone';
const rootDir = path.join(__dirname, '..');
const cars = JSON.parse(fs.readFileSync(path.join(rootDir, 'cars.json'), 'utf8').replace(/^\uFEFF/, ''));
const manualImageMapPath = path.join(rootDir, 'manual-image-map.json');
const manualImageMap = fs.existsSync(manualImageMapPath) ? JSON.parse(fs.readFileSync(manualImageMapPath, 'utf8').replace(/^\uFEFF/, '')) : {};
const blockedPlaceholderFiles = new Set((manualImageMap.placeholderFilesDoNotUse || []).map((item) => path.basename(String(item || '').trim()).toLowerCase()).filter(Boolean));
const hasCjk = (value = '') => /[\u3400-\u9fff]/.test(String(value || ''));
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const escapeAttr = escapeHtml;
const cleanPath = (value = '') => String(value || '').replace(/^\/+/, '');
const isRemoteAsset = (value = '') => /^https?:\/\//i.test(String(value || ''));
const absoluteUrl = (value = '') => isRemoteAsset(value) ? String(value) : `${SITE}/${cleanPath(value)}`;
const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);
const unique = (items = []) => [...new Set(items.filter(Boolean))];
const slugify = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const assetExists = (value = '') => isRemoteAsset(value) || fs.existsSync(path.join(rootDir, cleanPath(value)));
const isBlockedPlaceholder = (value = '') => blockedPlaceholderFiles.has(path.basename(cleanPath(value)).toLowerCase());
const isUsableImage = (value = '') => Boolean(cleanPath(value)) && !isBlockedPlaceholder(value) && assetExists(value);
const cjkMap = new Map([
  ['一汽奔腾', 'FAW Bestune'],
  ['中型SUV', 'Mid-size SUV'],
  ['中型车', 'Midsize sedan'],
  ['5门5座SUV', '5-door, 5-seat SUV'],
  ['4门5座掀背车', '4-door, 5-seat liftback'],
  ['前置前驱', 'Front-engine, front-wheel drive'],
  ['麦弗逊式独立悬架', 'MacPherson independent suspension'],
  ['多连杆式独立悬架', 'Multi-link independent suspension'],
  ['国VI', 'China VI emission standard'],
  ['汽油', 'Petrol'],
  ['插电式混合动力', 'Plug-in Hybrid']
]);
const pickText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value || fallback;
  if (Array.isArray(value)) return value.map((item) => pickText(item, '')).find(Boolean) || fallback;
  if (typeof value === 'object') {
    if (typeof value.en === 'string' && value.en.trim()) return value.en;
    const nested = Object.values(value).map((item) => pickText(item, '')).find((item) => item && !hasCjk(item));
    return nested || fallback;
  }
  return fallback;
};
const englishValue = (value = '') => {
  const raw = String(pickText(value, '')).replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const mapped = cjkMap.get(raw) || raw;
  if (/^(null|undefined|pending_confirmation)$/i.test(mapped)) return '';
  if (/^0(?:\.0+)?(?:\s*(?:kW|Nm|L|mm|kg|km))?$/i.test(mapped)) return '';
  if (/car\.autohome\.com\.cn|config\/spec|config\/series/i.test(mapped)) return '';
  if (hasCjk(mapped)) return '';
  return mapped;
};
const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeVehicleName = (name, brand = '') => {
  const cleanedName = String(name || '').replace(/\s+/g, ' ').trim();
  const cleanedBrand = String(brand || '').replace(/\s+/g, ' ').trim();
  if (!cleanedName || !cleanedBrand) return cleanedName;
  const brandPrefix = escapeRegExp(cleanedBrand);
  return cleanedName.replace(new RegExp(`^${brandPrefix}\\s+(${brandPrefix}\\S*)`, 'i'), '$1').replace(new RegExp(`^(${brandPrefix})\\s+\\1\\b`, 'i'), '$1').replace(/\s+/g, ' ').trim();
};
const vehicleNameFromParts = (brand, model, year = '') => {
  const cleanedBrand = String(brand || '').replace(/\s+/g, ' ').trim();
  const cleanedModel = normalizeVehicleName(model, cleanedBrand);
  const startsWithBrand = cleanedBrand && new RegExp(`^${escapeRegExp(cleanedBrand)}\\b`, 'i').test(cleanedModel);
  return [startsWithBrand ? '' : cleanedBrand, cleanedModel, year].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};
const getVehicleName = (car) => englishValue(car.pageTitle || car.title || car.cardTitle) || vehicleNameFromParts(englishValue(car.brand), englishValue(car.model || car.name), englishValue(car.year || car.modelYear));
const getCardTitle = (car) => englishValue(car.cardTitle || car.title || car.model || car.name) || getVehicleName(car);
const isUsed = (car) => car?.isUsed === true || String(car.category || car.type || car.condition || '').toLowerCase().includes('used');
const isNewGalleryCar = (car) => !isUsed(car) && (car?.multiImageGallery === true || englishValue(car.detailPageVariant) === 'new_car_gallery');
const hasDetailGallery = (car) => isUsed(car) || isNewGalleryCar(car);
const getPrice = (car) => englishValue(car.salePriceDisplay || car.fobPriceDisplay || car.fobNanShaUsd || car.price || car.fobRange || '');
const getUsdPrice = (car) => {
  const source = getPrice(car);
  if (!source || !/us\$|usd/i.test(source)) return '';
  const match = String(source).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? match[0] : '';
};
const imageFromManualMap = (car) => {
  const byId = manualImageMap.carIds?.[car.id];
  if (isUsableImage(byId)) return cleanPath(byId);
  const candidates = unique([slugify(car.id), slugify(`${pickText(car.brand)} ${pickText(car.model || car.name)}`), slugify(pickText(car.model || car.name)), slugify(getVehicleName(car))]);
  for (const [group, image] of Object.entries(manualImageMap.modelGroups || {})) {
    const key = slugify(group);
    if (candidates.some((candidate) => candidate === key || candidate.startsWith(`${key}-`) || candidate.includes(key))) {
      if (isUsableImage(image)) return cleanPath(image);
    }
  }
  return '';
};
const getImage = (car) => {
  const mappedImage = isUsed(car) ? '' : imageFromManualMap(car);
  if (mappedImage) return mappedImage;
  const dataImage = [car.mainImage, car.image, ...toArray(car.images), ...toArray(car.gallery), ...toArray(car.photos), ...toArray(car.mediaImages), ...toArray(car.photoUrls)].find(isUsableImage);
  if (dataImage) return cleanPath(dataImage);
  return 'images/new-cars/generic-new-car-bg-01.png';
};
const getImages = (car) => {
  const mainImage = getImage(car);
  const candidates = [mainImage, car.mainImage, car.image, ...toArray(car.images), ...toArray(car.gallery), ...toArray(car.photos), ...toArray(car.mediaImages), ...toArray(car.photoUrls)];
  const images = unique(candidates.map(cleanPath).filter(isUsableImage));
  return images.length ? images : [mainImage];
};
const videoSourceFrom = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return pickText(value.src || value.url || value.path || value.videoUrl || value.video_url || value.localVideo || value.local_video || value.mp4 || value.file, '');
  return pickText(value, '');
};
const videoTitleFrom = (value, index) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return englishValue(value.title || value.name || value.label) || `Vehicle video ${index + 1}`;
  return `Vehicle video ${index + 1}`;
};
const videoTypeFor = (source) => /\.webm(?:$|[?#])/i.test(source) ? 'video/webm' : (/\.mov(?:$|[?#])/i.test(source) ? 'video/quicktime' : 'video/mp4');
const isYoutubeVideo = (source) => /(?:youtube\.com|youtu\.be)/i.test(source);
const isUsableVideoSource = (source = '') => Boolean(cleanPath(source)) && (isRemoteAsset(source) || assetExists(source));
const getVideos = (car) => {
  const candidates = [...toArray(car.videos), car.video, car.videoUrl, car.video_url, ...toArray(car.mediaVideos), car.youtubeUrl, car.youtube_url, car.localVideo, car.local_video, car.mp4];
  const seen = new Set();
  return candidates.map((item, index) => {
    const source = videoSourceFrom(item);
    if (!isUsableVideoSource(source)) return null;
    const src = isRemoteAsset(source) ? source : cleanPath(source);
    if (seen.has(src)) return null;
    seen.add(src);
    return { src, title: videoTitleFrom(item, index), type: videoTypeFor(src), youtube: isYoutubeVideo(src) };
  }).filter(Boolean);
};
const getDescription = (car, name) => englishValue(car.metaDescription || car.seoDescription || car.descriptionEn || car.description) || `Get latest price, stock list and export support for ${name} from China.`;
const getNotice = (car) => car.isBatchInventory ? englishValue(car.noticeEn) || 'Vehicle mileage, color, configuration and availability may vary by unit. Please contact us for current inventory details.' : '';
const normalizedSpec = (item) => {
  if (Array.isArray(item)) return [englishValue(item[0]), englishValue(item[1])];
  if (item && typeof item === 'object') return [englishValue(item.label || item.name), englishValue(item.value || item.text)];
  return ['', ''];
};
const technicalSpecs = (car) => toArray(car.detailSpecs).map(normalizedSpec).filter(([label, value]) => label && value);
const compactSpecs = (items) => items.filter(([, value]) => englishValue(value)).map(([label, value]) => [label, englishValue(value)]);
const summarySpecs = (car) => isNewGalleryCar(car) ? compactSpecs([
  ['Vehicle type', car.vehicleType || 'Brand New Car'],
  ['Model year', car.modelYear || car.year],
  ['Version', car.configuration || car.trimEn || car.trim],
  ['CLTC range', car.cltcRange || car.range],
  ['Mileage', car.mileage],
  ['Exterior colors', car.availableColor || car.color],
  ['Location', car.locationDisplay || car.location],
  ['Inventory status', car.inventoryStatusDisplay || car.inventoryStatus || 'In stock']
]) : compactSpecs([
  ['Year', car.year || car.modelYear],
  ['Model / trim', car.configuration || car.trimEn || car.trim],
  ['Mileage', car.mileage],
  ['Exterior colors', car.availableColor || car.color],
  ['Interior color', car.interiorColor],
  ['Location', car.locationDisplay || car.location],
  ['Inventory type', car.isBatchInventory ? 'Batch Inventory' : car.status],
  ['Condition', car.accidentHistory || car.accidentStatus || car.conditionSummary]
]);
const overviewSpecs = (car) => compactSpecs([
  ['Brand', car.brand],
  ['Model', car.model],
  ['Model year', car.modelYear || car.year],
  ['Version', car.configuration || car.trimEn],
  ['Vehicle type', isNewGalleryCar(car) ? (car.vehicleType || 'Brand New Car') : ''],
  ['Energy type', car.energyType || car.fuel],
  ['CLTC range', isNewGalleryCar(car) ? (car.cltcRange || car.range) : ''],
  ['Official guide price', isNewGalleryCar(car) ? car.guidePriceDisplay : ''],
  ['Engine', isNewGalleryCar(car) ? '' : car.engine],
  ['Transmission', car.transmission],
  ['Location', car.locationDisplay || car.location]
]);
const conditionSpecs = (car) => {
  if (isNewGalleryCar(car)) {
    return compactSpecs([
      ['Vehicle type', car.vehicleType || 'Brand New Car'],
      ['Inventory status', car.inventoryStatusDisplay || car.inventoryStatus || 'In stock'],
      ['Availability', car.availabilityNote || 'In stock / ample stock; contact us for current quantity.'],
      ['Mileage', car.mileage || 'New vehicle; delivery mileage may vary'],
      ['Exterior colors', car.availableColor || car.color]
    ]);
  }
  const availability = car.isBatchInventory
    ? 'Mileage, color and configuration may vary by unit. Contact us for current stock.'
    : getNotice(car);
  return compactSpecs([
    ['Accident History', car.accidentHistory || car.accidentStatus || 'No accidents reported'],
    ['Overall Condition', car.overallCondition || 'Good'],
    ['Maintenance Records', car.maintenanceRecords || 'To be provided'],
    ['Inventory Status', car.isBatchInventory ? 'Batch inventory available' : (car.inventoryStatusDisplay || car.status)],
    ['Availability', availability]
  ]);
};
const renderMedia = (images, name, car) => {
  const items = images.length ? images : ['images/new-cars/generic-new-car-bg-01.png'];
  const main = items[0];
  const alt = `${name} export from China`;
  if (!hasDetailGallery(car)) return `<div class="detail-media"><img src="${escapeAttr(main)}" alt="${escapeAttr(alt)}" loading="eager"></div>`;
  const thumbs = items.length > 1 ? `<div class="vehicle-thumbnails" aria-label="Vehicle photo gallery">${items.map((image, index) => {
    const label = `${name} photo ${index + 1}`;
    return `<button class="vehicle-thumbnail" type="button" data-gallery-src="${escapeAttr(image)}" data-gallery-alt="${escapeAttr(label)}" aria-label="Show photo ${index + 1}" aria-current="${index === 0 ? 'true' : 'false'}"><img src="${escapeAttr(image)}" alt="${escapeAttr(label)}" loading="lazy"></button>`;
  }).join('')}</div>` : '';
  return `<div class="detail-media used-car-gallery${items.length > 1 ? ' has-thumbnails' : ''}" data-vehicle-gallery><div class="vehicle-main-image"><img class="vehicle-gallery-main" data-gallery-main src="${escapeAttr(main)}" alt="${escapeAttr(alt)}" loading="eager"></div>${thumbs}</div>`;
};
const renderGalleryScript = (car, images) => hasDetailGallery(car) && images.length > 1 ? `<script>(function(){document.querySelectorAll('[data-vehicle-gallery]').forEach(function(gallery){var main=gallery.querySelector('[data-gallery-main]');gallery.addEventListener('click',function(event){var button=event.target.closest('[data-gallery-src]');if(!button||!main)return;main.src=button.dataset.gallerySrc;main.alt=button.dataset.galleryAlt||main.alt;gallery.querySelectorAll('[data-gallery-src]').forEach(function(item){item.setAttribute('aria-current',item===button?'true':'false'});});});})();</script>` : '';
const renderVideoSection = (videos) => {
  if (!videos.length) return '';
  const cards = videos.map((video, index) => {
    const title = video.title || `Vehicle video ${index + 1}`;
    if (video.youtube) return `<article class="vehicle-video-card"><h3>${escapeHtml(title)}</h3><a class="btn btn-light" href="${escapeAttr(video.src)}" target="_blank" rel="noopener">Open video</a></article>`;
    return `<article class="vehicle-video-card"><h3>${escapeHtml(title)}</h3><video controls preload="metadata" playsinline><source src="${escapeAttr(video.src)}" type="${escapeAttr(video.type)}">Your browser does not support this video.</video></article>`;
  }).join('');
  return `<section class="vehicle-video-section" aria-label="Vehicle videos"><h2>Vehicle Video</h2><div class="vehicle-video-list">${cards}</div></section>`;
};
const renderSpecGrid = (items, className = '') => items.length ? `<div class="vehicle-info-grid ${className}">${items.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>` : '';
const renderTechnicalSpecs = (items) => items.length ? `<div class="vehicle-spec-table">${items.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>` : '';
const hiddenInput = (name, value = '') => `<input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(value)}">`;
const leadSourceFor = (car) => isNewGalleryCar(car) ? 'new_car_detail' : 'used_car_detail';
const inventoryTypeFor = (car) => isNewGalleryCar(car) ? englishValue(car.inventoryType || car.listingType) || 'brand_new_batch_inventory' : (car.isBatchInventory ? 'batch_inventory' : '');
const callingCodeOptions = [
  ['+213', 'Algeria (+213)'],
  ['+7', 'Russia / Kazakhstan (+7)'],
  ['+966', 'Saudi Arabia (+966)'],
  ['+971', 'United Arab Emirates (+971)'],
  ['+226', 'Burkina Faso (+226)'],
  ['+86', 'China (+86)'],
  ['+20', 'Egypt (+20)'],
  ['+234', 'Nigeria (+234)'],
  ['+254', 'Kenya (+254)'],
  ['+255', 'Tanzania (+255)'],
  ['+233', 'Ghana (+233)'],
  ['+998', 'Uzbekistan (+998)']
];
const renderCallingCodeOptions = () => callingCodeOptions.map(([value, label]) => `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`).join('');
const inquiryPhoneFields = () => `<label><span>WhatsApp Country Code</span><select name="calling_code" autocomplete="tel-country-code" required><option value="" selected>Select code</option>${renderCallingCodeOptions()}</select></label><label><span>WhatsApp Number</span><input type="tel" name="phone_number" autocomplete="tel-national" inputmode="tel" pattern="[0-9 ()-]{5,20}" placeholder="Number without +" required></label><input type="hidden" name="whatsapp" value="">`;
const inquiryHiddenFields = (car, name, url) => {
  const leadSource = leadSourceFor(car);
  return [hiddenInput('vehicle_id', car.id), hiddenInput('vehicle_name', name), hiddenInput('model_year', englishValue(car.modelYear || car.year)), hiddenInput('page_url', url), hiddenInput('source_url', url), hiddenInput('lead_source', leadSource), hiddenInput('source', leadSource), hiddenInput('sale_price', getPrice(car)), hiddenInput('inventory_type', inventoryTypeFor(car))].join('');
};
const ctaAttrs = (car, name, url) => `data-title="${escapeAttr(name)}" data-model="${escapeAttr(name)}" data-year="${escapeAttr(englishValue(car.modelYear || car.year))}" data-price="${escapeAttr(getPrice(car))}" data-url="${escapeAttr(url)}" data-vehicle-id="${escapeAttr(car.id)}" data-lead-source="${escapeAttr(leadSourceFor(car))}" data-inventory-type="${escapeAttr(inventoryTypeFor(car))}"`;
const render = (car) => {
  const id = car.id;
  if (!id) return '';
  const name = getVehicleName(car);
  const cardTitle = getCardTitle(car);
  const url = `${SITE}/${id}.html`;
  const galleryImages = getImages(car);
  const videos = getVideos(car);
  const img = galleryImages[0];
  const imgUrl = absoluteUrl(img);
  const description = getDescription(car, name);
  const ogTitle = englishValue(car.seoTitle || car.metaTitle) || `${name} | Vehicle Export from China`;
  const mediaMarkup = renderMedia(galleryImages, name, car);
  const videoMarkup = renderVideoSection(videos);
  const galleryBehavior = renderGalleryScript(car, galleryImages);
  const summary = summarySpecs(car);
  const overview = overviewSpecs(car);
  const specs = technicalSpecs(car);
  const condition = conditionSpecs(car);
  const price = getPrice(car) || 'Contact for price';
  const newGallery = isNewGalleryCar(car);
  const leadSource = leadSourceFor(car);
  const heroEyebrow = newGallery ? 'Brand New Car Export from China' : 'Used Car Export from China';
  const purchaseEyebrow = newGallery ? 'Brand New' : 'Batch inventory';
  const priceLabel = newGallery ? 'FOB price' : 'Sale price';
  const overviewText = newGallery
    ? `${cardTitle} is available as brand-new batch inventory from Qingdao, China. FOB pricing, current colors and export timing are confirmed before order.`
    : `${cardTitle} is listed as batch used-car inventory from Qingdao, China. Vehicle details are prepared for export inquiry and stock confirmation.`;
  const availabilityHeading = newGallery ? 'Availability' : 'Condition &amp; Inventory';
  const contactHeading = newGallery ? 'Check Current Stock' : 'Check Current Availability';
  const contactText = newGallery
    ? 'Send your destination country and timing. Our sales team will confirm current stock, available colors and FOB export quotation.'
    : 'Send your destination country and timing. Our sales team will confirm current units, available colors, mileage and export quotation.';
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name, description, image: galleryImages.map((image) => absoluteUrl(image)), sku: `ZG-${id.toUpperCase()}`, brand: { '@type': 'Brand', name: englishValue(car.brand) || 'Zhonggu Auto Export' }, offers: { '@type': 'Offer', url, priceCurrency: 'USD', availability: 'https://schema.org/InStock', itemCondition: `https://schema.org/${isUsed(car) ? 'UsedCondition' : 'NewCondition'}` } };
  const usdPrice = getUsdPrice(car);
  if (usdPrice) jsonLd.offers.price = usdPrice;
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
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(ogTitle)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <meta name="twitter:image" content="${imgUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css?v=${STYLE_VERSION}">
</head><body class="vehicle-detail-page seo-page" data-vehicle-id="${escapeAttr(id)}" data-vehicle-name="${escapeAttr(name)}" data-vehicle-year="${escapeAttr(englishValue(car.year || car.modelYear))}" data-vehicle-price="${escapeAttr(price)}" data-vehicle-url="${escapeAttr(url)}">
<header class="site-header scrolled"><div class="container nav-wrap"><a class="logo" href="index.html" aria-label="Zhonggu Auto Export home"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav id="main-nav" class="main-nav" aria-label="Main navigation"><a href="index.html">Home</a><a href="new-cars.html">New Cars</a><a href="used-cars.html">Used Cars</a><a href="brands.html">Brands</a><a href="company.html">Company</a><a href="export-process.html">Export Process</a><a class="nav-cta" href="#contact">Contact Us</a></nav><select class="language-select" aria-label="Select language"><option value="en">English</option><option value="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</option><option value="ru">&#1056;&#1091;&#1089;&#1089;&#1082;&#1080;&#1081;</option><option value="fr">Fran&#231;ais</option><option value="es">Espa&#241;ol</option></select></div></header>
<main>
<section class="detail-hero used-detail-hero"><div class="container detail-grid"><article class="detail-card detail-main-panel"><p class="eyebrow">${escapeHtml(heroEyebrow)}</p><h1>${escapeHtml(name)}</h1><p>${escapeHtml(description)}</p>${mediaMarkup}${videoMarkup}</article><aside class="detail-summary purchase-card"><p class="eyebrow">${escapeHtml(purchaseEyebrow)}</p><div class="purchase-price"><small>${escapeHtml(priceLabel)}</small><strong>${escapeHtml(price)}</strong></div>${renderSpecGrid(summary, 'purchase-specs')}<a class="btn btn-primary js-inquiry-cta detail-quote-btn" href="#contact" ${ctaAttrs(car, name, url)}>Request FOB Quote</a></aside></div></section>
<section class="seo-section vehicle-overview-section"><div class="container"><h2>Vehicle Overview</h2><p>${escapeHtml(overviewText)}</p>${renderSpecGrid(overview, 'overview-specs')}</div></section>
<section class="seo-section key-specifications-section"><div class="container"><h2>Key Specifications</h2>${renderTechnicalSpecs(specs) || '<p>Detailed technical specifications can be confirmed during inquiry.</p>'}</div></section>
<section class="seo-section condition-inventory-section"><div class="container"><h2>${availabilityHeading}</h2>${renderSpecGrid(condition, 'condition-specs')}</div></section>
<section id="contact" class="contact-section"><div class="container contact-layout"><div class="contact-intro"><p class="eyebrow">Request FOB Quote</p><h2>${escapeHtml(contactHeading)}</h2><p>${escapeHtml(contactText)}</p></div><div class="inquiry-panel"><h3>Send Inquiry</h3><form class="inquiry-form" name="inquiry" method="POST" data-netlify="true" data-source-entry="${escapeAttr(leadSource)}" netlify-honeypot="bot-field" action="/thank-you.html"><input type="hidden" name="form-name" value="inquiry"><input type="hidden" name="bot-field" value="" aria-hidden="true" tabindex="-1">${inquiryHiddenFields(car, name, url)}<div class="inquiry-fields"><label><span>Name</span><input type="text" name="name" autocomplete="name" required></label><label><span>Country</span><input type="text" name="country" autocomplete="country-name" required></label>${inquiryPhoneFields()}<label class="field-wide"><span>Interested Model</span><input type="text" name="model" value="${escapeAttr(name)}" required></label><label class="field-wide"><span>Message</span><textarea name="message" rows="4">${escapeHtml(`Please send current availability, FOB quotation, colors and export timing for ${name}.`)}</textarea></label></div><button class="btn inquiry-submit" type="submit">Request FOB Quote</button></form><p class="inquiry-success" role="status" aria-live="polite" hidden>Thank you, your inquiry has been received. Our sales team will contact you soon.</p></div></div></section>
</main>${galleryBehavior}
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<footer class="site-footer"><div class="container footer-wrap"><a class="logo footer-logo" href="index.html"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><p>Reliable vehicles from China, delivered worldwide.</p><nav class="footer-market-links export-market-links" aria-label="Export markets"><span>Export Markets:</span><a href="export-cars-from-china-to-africa.html">Africa</a><a href="export-cars-from-china-to-southeast-asia.html">Southeast Asia</a><a href="export-cars-from-china-to-central-asia.html">Central Asia</a></nav><p>&copy; <span id="year"></span> Zhonggu Auto Export. All rights reserved.</p></div></footer><script src="script.js?v=20260716-used-list-crm"></script><script src="lead-gen.js?v=20260716-used-detail-crm"></script></body></html>
`;
};
let count = 0;
for (const car of cars) {
  if (!car.id) continue;
  const html = render(car);
  if (!html) continue;
  fs.writeFileSync(path.join(rootDir, `${car.id}.html`), html, 'utf8');
  count += 1;
}
console.log(`Generated ${count} vehicle detail pages.`);
