const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://zhongguauto.com';
const LASTMOD = '2026-07-17';
const PAGE_LASTMOD = '2026-07-20';
const EXCLUDED_LANDING_DIRS = new Set(['export-cars-to-africa']);
const skippedWrites = [];

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/^\uFEFF/, '');
const write = (relative, content) => {
  const file = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (existing === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
};
const writeOptional = (relative, content) => {
  try { return write(relative, content); } catch (error) {
    if (error.code !== 'EPERM') throw error;
    skippedWrites.push(relative);
    return false;
  }
};
const siteUrl = (pathname = '') => `${SITE}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
const cleanPath = (value = '') => String(value || '').replace(/^\/+/, '');
const assetUrl = (value = '') => /^https?:\/\//i.test(String(value || '')) ? String(value) : siteUrl(cleanPath(value));
const unique = (items) => [...new Set(items.filter(Boolean))];
const xmlEscape = (value = '') => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const xml = (urls, frequency = 'monthly', lastmod = LASTMOD) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${xmlEscape(url)}</loc><lastmod>${lastmod}</lastmod><changefreq>${frequency}</changefreq></url>`).join('\n')}\n</urlset>\n`;
const xmlWithImages = (entries, frequency = 'monthly') => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.map((entry) => `  <url><loc>${xmlEscape(entry.url)}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${frequency}</changefreq>${entry.image ? `<image:image><image:loc>${xmlEscape(entry.image)}</image:loc></image:image>` : ''}</url>`).join('\n')}\n</urlset>\n`;

const landingToRoot = new Map([
  ['/landing/china-used-car-exporter/', '/china-used-car-exporter.html'],
  ['/landing/china-new-car-exporter/', '/china-new-car-exporter.html'],
  ['/landing/chinese-vehicle-export-company/', '/chinese-vehicle-export-company.html'],
  ['/landing/buy-cars-from-china/', '/buy-cars-from-china.html'],
  ['/landing/byd-car-exporter-china/', '/byd-car-exporter-china.html'],
  ['/landing/bestune-car-exporter-china/', '/bestune-car-exporter-china.html'],
  ['/landing/toyota-used-cars-china/', '/toyota-used-cars-china.html'],
  ['/landing/honda-used-cars-china/', '/honda-used-cars-china.html'],
  ['/landing/export-cars-to-algeria/', '/export-cars-from-china-to-algeria.html'],
  ['/landing/export-cars-to-uae/', '/export-cars-from-china-to-uae.html'],
  ['/landing/export-cars-to-africa/', '/export-cars-from-china-to-africa.html'],
  ['/landing/export-cars-to-central-asia/', '/export-cars-from-china-to-central-asia.html'],
  ['/landing/export-cars-to-southeast-asia/', '/export-cars-from-china-to-southeast-asia.html'],
  ['/fr/landing/export-cars-to-algeria/', '/fr/export-cars-from-china-to-algeria.html'],
  ['/ar/landing/export-cars-to-algeria/', '/ar/export-cars-from-china-to-algeria.html']
]);
const rootToLanding = new Map([
  ['/geely-binyue-export-algeria.html', '/landing/geely-binyue-export-algeria/'],
  ['/geely-car-exporter-china.html', '/landing/geely-car-exporter-china/'],
  ['/geely-coolray-exporter-china.html', '/landing/geely-coolray-exporter-china/'],
  ['/geely-suv-exporter-china.html', '/landing/geely-suv-exporter-china/'],
  ['/ready-stock-cars-export-to-algeria.html', '/landing/ready-stock-cars-export-to-algeria/'],
  ['/cif-car-price-to-algiers.html', '/landing/cif-car-price-to-algiers/'],
  ['/china-to-algeria-car-shipping.html', '/landing/china-to-algeria-car-shipping/']
]);
const deadAliases = new Map([
  ['/used-toyota-corolla-2023', '/used-toyota-corolla-2023-001.html'],
  ['/used-toyota-corolla-2023.html', '/used-toyota-corolla-2023-001.html'],
  ['/used-vw-tacqua-2023', '/used-vw-tacqua-2023-001.html'],
  ['/used-vw-tacqua-2023.html', '/used-vw-tacqua-2023-001.html']
]);
const explicitAliases = new Map([
  ['/index.html', '/'],
  ['/export-to-algeria', '/export-cars-from-china-to-algeria.html'],
  ['/process.html', '/export-process.html'],
  ['/export-to-algeria/', '/export-cars-from-china-to-algeria.html'],
  ...deadAliases.entries()
]);

for (const [rootPath, landingPath] of rootToLanding.entries()) {
  explicitAliases.set(rootPath, landingPath);
  explicitAliases.set(rootPath.replace(/\.html$/, ''), landingPath);
}
for (const [landingPath, rootPath] of landingToRoot.entries()) {
  explicitAliases.set(landingPath, rootPath);
  explicitAliases.set(landingPath.replace(/\/$/, ''), rootPath);
  explicitAliases.set(`${landingPath}index.html`, rootPath);
}

const rootToLandingFileNames = new Set([...rootToLanding.keys()].map((item) => item.slice(1)));
const landingToRootDirs = new Set([...landingToRoot.keys()].map((item) => item.replace(/^\//, '')));
const ignoredDirs = new Set(['.git', 'node_modules', '.npm-cache', 'tmp', 'media-inbox', 'media-processed', 'media-trash', '__pycache__']);
const sitemapExcludedDirs = new Set(['admin', 'public/admin', 'tmp']);
const sitemapExcludedFiles = new Set(['404.html', 'thank-you.html', 'vehicle.html', 'IMAGE_PREVIEW_INDEX.html', 'yandex_a5df6318b9ba25fb.html']);

const splitSuffix = (value) => {
  const input = String(value || '');
  const index = input.search(/[?#]/);
  if (index === -1) return { pathPart: input, suffix: '' };
  return { pathPart: input.slice(0, index), suffix: input.slice(index) };
};
const normalizePathname = (value) => {
  const { pathPart, suffix } = splitSuffix(value);
  if (!pathPart) return `${pathPart}${suffix}`;
  let pathname = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  pathname = pathname.replace(/\/index\.html$/i, '/index.html');
  const lower = pathname.toLowerCase();
  if (explicitAliases.has(lower)) return `${explicitAliases.get(lower)}${suffix}`;

  const landingNoSlash = lower.match(/^\/(?:fr\/|ar\/)?landing\/[a-z0-9-]+$/);
  if (landingNoSlash) return `${pathname}/`.replace(/\/\//g, '/').replace(/^\//, '/') + suffix;

  return `${pathname}${suffix}`;
};
const normalizeInternalReference = (value = '') => {
  const input = String(value || '');
  if (/^https?:\/\/(?:www\.)?zhongguauto\.com$/i.test(input)) return SITE;
  const absoluteMatch = input.match(/^https?:\/\/(?:www\.)?zhongguauto\.com(\/[^\s"'<)]*)$/i);
  if (absoluteMatch) return `${SITE}${normalizePathname(absoluteMatch[1])}`;
  if (/^\.\.\/index\.html(?:[?#].*)?$/i.test(input) || /^index\.html(?:[?#].*)?$/i.test(input)) {
    const { suffix } = splitSuffix(input);
    return `/${suffix}`;
  }
  if (/^\/(?:index\.html|export-to-algeria(?:\/)?|used-toyota-corolla-2023(?:\.html)?|used-vw-tacqua-2023(?:\.html)?)(?:[?#].*)?$/i.test(input)) {
    return normalizePathname(input);
  }
  if (/^\/(?:fr\/|ar\/)?landing\/[a-z0-9-]+(?:\/index\.html|\/)?(?:[?#].*)?$/i.test(input)) {
    return normalizePathname(input);
  }
  if (/^\/[a-z0-9-]+(?:\.html)?(?:[?#].*)?$/i.test(input)) {
    return normalizePathname(input);
  }
  return input;
};
const normalizeContent = (content) => {
  let output = content
    .replace(/https:\/\/(?:www\.)?zhongguauto\.com(\/[^\s\"'<)]*)/gi, (_match, pathname) => `${SITE}${normalizePathname(pathname)}`)
    .replace(/https:\/\/(?:www\.)?zhongguauto\.com\b/gi, SITE)
    .replace(/\b(href|src|action|content|data-url|data-source-url|data-canonical|data-href)=(['\"])([^'\"]+)\2/gi, (match, attr, quote, value) => {
      const normalized = normalizeInternalReference(value);
      return normalized === value ? match : `${attr}=${quote}${normalized}${quote}`;
    });

  output = output
    .replace(/\bhref=(['\"])\.\.\/index\.html([?#][^'\"]*)?\1/gi, (_match, quote, suffix = '') => `href=${quote}/${suffix}${quote}`)
    .replace(/\bhref=(['\"])index\.html([?#][^'\"]*)?\1/gi, (_match, quote, suffix = '') => `href=${quote}/${suffix}${quote}`)
    .replace(/\bhref=(['\"])\/index\.html([?#][^'\"]*)?\1/gi, (_match, quote, suffix = '') => `href=${quote}/${suffix}${quote}`)
    .replace(/\bhref=(['\"])(\/(?:fr\/|ar\/)?landing\/[a-z0-9-]+)([?#][^'\"]*)?\1/gi, (_match, quote, pathname, suffix = '') => `href=${quote}${normalizePathname(`${pathname}${suffix}`)}${quote}`);

  return output;
};

const listFiles = (dir, predicate, prefix = '') => {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) files.push(...listFiles(path.join(dir, entry.name), predicate, path.join(prefix, entry.name)));
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = path.join(prefix, entry.name).replace(/\\/g, '/');
    if (predicate(relative, entry.name)) files.push(relative);
  }
  return files;
};
const normalizeTextFiles = () => {
  let changed = 0;
  const files = listFiles(ROOT, (_relative, name) => ['.html', '.xml'].includes(path.extname(name).toLowerCase()));
  for (const relative of files) {
    const before = read(relative);
    const after = normalizeContent(before);
    if (after !== before && writeOptional(relative, after)) changed += 1;
  }
  return changed;
};

const cars = JSON.parse(read('cars.json'));
const vehicleImage = (car = {}) => cleanPath(car.sitemapImage || car.mainImage || car.image || (Array.isArray(car.images) ? car.images[0] : ''));
const vehicleCanonicalPath = (car = {}) => cleanPath(car.canonicalPath || car.urlPath || `${car.id}.html`);
const vehicleCanonicalUrlsAll = new Set(cars.filter((car) => car.id).map((car) => siteUrl(vehicleCanonicalPath(car))));
const vehicleEntries = cars
  .filter((car) => car.id && car.id !== 'mg5-85900-rmb')
  .map((car) => ({ url: siteUrl(vehicleCanonicalPath(car)), image: vehicleImage(car) ? assetUrl(vehicleImage(car)) : '' }));
const vehicleUrls = vehicleEntries.map((entry) => entry.url);
const importerSeoPagePaths = [
  'company.html',
  'car-importer-center.html',
  'wholesale-cars-from-china.html',
  'geely-coolray-ready-stock-nansha-port.html',
  'used-bestune-b70-wholesale.html',
  'bestune-yueyi-03-wholesale.html',
  'used-bestune-yueyi-07-phev-export.html',
  'bestune-k1-europe.html',
  'export-cars-from-china-to-algeria.html',
  'export-cars-from-china-to-central-asia.html'
];

const htmlCanonical = (relative) => {
  const match = read(relative).match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? normalizeInternalReference(match[1]) : '';
};
const isSitemapCandidate = (relative, canonical) => {
  if (!canonical || !canonical.startsWith(SITE)) return false;
  if (sitemapExcludedFiles.has(path.basename(relative))) return false;
  if (relative.startsWith('landing/') || relative.startsWith('fr/landing/') || relative.startsWith('ar/landing/')) return false;
  if ([...sitemapExcludedDirs].some((dir) => relative === `${dir}.html` || relative.startsWith(`${dir}/`))) return false;
  if (rootToLandingFileNames.has(relative)) return false;
  if (vehicleCanonicalUrlsAll.has(canonical)) return false;
  if ([...deadAliases.values()].some((target) => canonical === siteUrl(target))) return false;
  return true;
};
const normalizedFiles = normalizeTextFiles();

const importerSeoPageUrls = importerSeoPagePaths
  .filter((relative) => fs.existsSync(path.join(ROOT, relative)))
  .map((relative) => htmlCanonical(relative) || siteUrl(relative));

const pageUrls = unique([
  ...listFiles(ROOT, (_relative, name) => path.extname(name).toLowerCase() === '.html')
    .map((relative) => ({ relative, canonical: htmlCanonical(relative) }))
    .filter(({ relative, canonical }) => isSitemapCandidate(relative, canonical))
    .map(({ canonical }) => canonical),
  ...importerSeoPageUrls
]).sort();

const landingHtmlFiles = listFiles(path.join(ROOT, 'landing'), (_relative, name) => name === 'index.html', 'landing')
  .concat(listFiles(path.join(ROOT, 'fr', 'landing'), (_relative, name) => name === 'index.html', 'fr/landing'))
  .concat(listFiles(path.join(ROOT, 'ar', 'landing'), (_relative, name) => name === 'index.html', 'ar/landing'));
const landingUrls = unique(landingHtmlFiles
  .filter((relative) => {
    const dir = relative.replace(/index\.html$/, '');
    if (landingToRootDirs.has(dir)) return false;
    if (relative.startsWith('landing/') && EXCLUDED_LANDING_DIRS.has(dir.replace(/^landing\//, '').replace(/\/$/, ''))) return false;
    return true;
  })
  .map((relative) => htmlCanonical(relative))
  .filter((canonical) => canonical && canonical.startsWith(SITE) && canonical.endsWith('/')))
  .sort();

const pageSitemap = xml(pageUrls, 'monthly', PAGE_LASTMOD);
const landingSitemap = xml(landingUrls);
const vehicleSitemap = xmlWithImages(vehicleEntries, 'weekly');
write('sitemap-pages-current.xml', pageSitemap);
write('sitemap-landing-current.xml', landingSitemap);
write('sitemap-vehicles-current.xml', vehicleSitemap);
writeOptional('sitemap-pages.xml', pageSitemap);
writeOptional('sitemap-landing.xml', landingSitemap);
writeOptional('sitemap-vehicles.xml', vehicleSitemap);
const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap-pages-current.xml</loc><lastmod>${PAGE_LASTMOD}</lastmod></sitemap>\n  <sitemap><loc>${SITE}/sitemap-landing-current.xml</loc><lastmod>${LASTMOD}</lastmod></sitemap>\n  <sitemap><loc>${SITE}/sitemap-vehicles-current.xml</loc><lastmod>${LASTMOD}</lastmod></sitemap>\n</sitemapindex>\n`;
write('sitemap-index.xml', sitemapIndex);
writeOptional('sitemap.xml', sitemapIndex);

const robotsPath = 'robots.txt';
let robots = fs.existsSync(path.join(ROOT, robotsPath)) ? read(robotsPath) : 'User-agent: *\nAllow: /\n';
if (/^Sitemap:/m.test(robots)) robots = robots.replace(/^Sitemap:.*$/m, `Sitemap: ${SITE}/sitemap-index.xml`);
else robots = `${robots.trim()}\n\nSitemap: ${SITE}/sitemap-index.xml\n`;
writeOptional(robotsPath, robots.endsWith('\n') ? robots : `${robots}\n`);

console.log(`SEO sitemaps generated: pages=${pageUrls.length}, landing=${landingUrls.length}, vehicles=${vehicleUrls.length}, normalizedFiles=${normalizedFiles}, skippedWrites=${skippedWrites.length}`);
if (skippedWrites.length) console.warn(`SEO optional writes skipped: ${skippedWrites.slice(0, 12).join(', ')}${skippedWrites.length > 12 ? '...' : ''}`);
