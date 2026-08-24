const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://zhongguauto.com';
const sitemapFiles = ['sitemap-pages-current.xml', 'sitemap-landing-current.xml', 'sitemap-vehicles-current.xml'];
const ignoredDirs = new Set(['.git', 'node_modules', '.npm-cache', 'tmp', 'admin', 'media-inbox', 'media-processed', 'media-trash']);
const listHtml = (dir = ROOT) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? (ignoredDirs.has(entry.name) ? [] : listHtml(path.join(dir, entry.name))) : (entry.isFile() && entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []));
const values = (html, regex) => [...html.matchAll(regex)].map((match) => match[1]);
const pathForUrl = (url) => {
  const pathname = new URL(url, SITE).pathname;
  if (pathname === '/') return path.join(ROOT, 'index.html');
  if (pathname.endsWith('/')) return path.join(ROOT, pathname.slice(1), 'index.html');
  const direct = path.join(ROOT, pathname.slice(1));
  return fs.existsSync(direct) ? direct : path.join(ROOT, `${pathname.slice(1)}.html`);
};
const issues = [];
const sitemapUrls = sitemapFiles.flatMap((file) => values(fs.readFileSync(path.join(ROOT, file), 'utf8'), /<loc>([^<]+)<\/loc>/g).filter((url) => !/\.(?:jpg|jpeg|png|webp|svg)$/i.test(url)));
for (const url of [...new Set(sitemapUrls.filter((url, index) => sitemapUrls.indexOf(url) !== index))]) issues.push({ type: 'duplicate_sitemap_url', url });
for (const url of sitemapUrls) if (!fs.existsSync(pathForUrl(url))) issues.push({ type: 'missing_sitemap_target', url, source: path.relative(ROOT, pathForUrl(url)).replace(/\\/g, '/') });
const htmlFiles = listHtml();
for (const file of htmlFiles) {
  const source = path.relative(ROOT, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  const canonical = values(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/gi)[0];
  const ogUrl = values(html, /<meta\s+[^>]*property=["']og:url["'][^>]*content=["']([^"']+)/gi)[0];
  if (canonical && ogUrl && canonical !== ogUrl) issues.push({ type: 'canonical_og_mismatch', source, canonical, ogUrl });
  for (const url of values(html, /<link\s+[^>]*hreflang=["'][^"']+["'][^>]*href=["']([^"']+)/gi)) if (url.startsWith(SITE) && !fs.existsSync(pathForUrl(url))) issues.push({ type: 'missing_hreflang_target', source, url });
  for (const script of values(html, /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(script); } catch (error) { issues.push({ type: 'invalid_json_ld', source, error: error.message }); }
  }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), htmlFiles: htmlFiles.length, sitemapUrls: sitemapUrls.length, uniqueSitemapUrls: new Set(sitemapUrls).size, issues }, null, 2));
if (issues.length) process.exitCode = 1;
