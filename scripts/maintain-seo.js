const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://zhongguauto.com';
const LASTMOD = '2026-07-17';
const PAGE_LASTMOD = '2026-07-20';
const EXCLUDED_LANDING_DIRS = new Set(['export-cars-to-africa']);

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/^\uFEFF/, '');
const write = (relative, content) => {
  const file = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (existing === content) return;
  fs.writeFileSync(file, content, 'utf8');
};
const writeOptional = (relative, content) => {
  try { write(relative, content); } catch (error) { if (error.code !== 'EPERM') throw error; }
};
const siteUrl = (pathname = '') => `${SITE}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
const cleanPath = (value = '') => String(value || '').replace(/^\/+/, '');
const assetUrl = (value = '') => /^https?:\/\//i.test(String(value || '')) ? String(value) : siteUrl(cleanPath(value));
const xml = (urls, frequency = 'monthly', lastmod = LASTMOD) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc><lastmod>${lastmod}</lastmod><changefreq>${frequency}</changefreq></url>`).join('\n')}\n</urlset>\n`;
const xmlWithImages = (entries, frequency = 'monthly') => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.map((entry) => `  <url><loc>${entry.url}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${frequency}</changefreq>${entry.image ? `<image:image><image:loc>${entry.image}</image:loc></image:image>` : ''}</url>`).join('\n')}\n</urlset>\n`;
const normalizePublishedUrls = (content) => content
  .replace(/https:\/\/www\.zhongguauto\.com/g, SITE)
  .replace(/https:\/\/zhongguauto\.com/g, SITE)
  .replace(/(https:\/\/zhongguauto\.com\/(?:(?:fr|ar)\/)?landing\/[a-z0-9-]+)\/?(?=["'<\s])/g, '$1/');

const cars = JSON.parse(read('cars.json'));
const vehicleImage = (car = {}) => cleanPath(car.sitemapImage || car.mainImage || car.image || (Array.isArray(car.images) ? car.images[0] : ''));
const vehicleCanonicalPath = (car = {}) => cleanPath(car.canonicalPath || car.urlPath || `${car.id}.html`);
const vehicleEntries = cars
  .filter((car) => car.id && car.id !== 'mg5-85900-rmb')
  .map((car) => ({ url: siteUrl(vehicleCanonicalPath(car)), image: vehicleImage(car) ? assetUrl(vehicleImage(car)) : '' }));
const vehicleUrls = vehicleEntries.map((entry) => entry.url);
const pages = [
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
].map(siteUrl);

const landingRoot = path.join(ROOT, 'landing');
const landingDirs = fs.existsSync(landingRoot)
  ? fs.readdirSync(landingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !EXCLUDED_LANDING_DIRS.has(entry.name) && fs.existsSync(path.join(landingRoot, entry.name, 'index.html')))
    .map((entry) => siteUrl(`landing/${entry.name}/`))
  : [];
const localizedLanding = [];
for (const code of ['fr', 'ar']) {
  const localizedRoot = path.join(ROOT, code, 'landing');
  if (!fs.existsSync(localizedRoot)) continue;
  for (const entry of fs.readdirSync(localizedRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(localizedRoot, entry.name, 'index.html'))) {
      localizedLanding.push(siteUrl(`${code}/landing/${entry.name}/`));
    }
  }
}

const pageSitemap = xml(pages, 'monthly', PAGE_LASTMOD);
const landingSitemap = xml([...landingDirs, ...localizedLanding]);
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

const normalizeRootFile = (relative) => {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, 'utf8');
  const after = normalizePublishedUrls(before);
  if (after !== before) writeOptional(relative, after);
};
const normalizeTree = (relativeDir) => {
  const dir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      normalizeTree(relative);
    } else if (entry.isFile() && ['.html', '.xml'].includes(path.extname(entry.name).toLowerCase())) {
      normalizeRootFile(relative);
    }
  }
};
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (entry.isFile() && ['.html', '.xml'].includes(path.extname(entry.name).toLowerCase())) normalizeRootFile(entry.name);
}
for (const relativeDir of ['landing', 'fr', 'ar', 'ru']) normalizeTree(relativeDir);
normalizeRootFile('scripts/generate-vehicle-pages.js');
normalizeRootFile('scripts/maintain-seo.js');

console.log(`SEO sitemaps generated: pages=${pages.length}, landing=${landingDirs.length + localizedLanding.length}, vehicles=${vehicleUrls.length}`);
