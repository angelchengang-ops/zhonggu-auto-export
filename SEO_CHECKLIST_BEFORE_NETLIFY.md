# SEO Checklist Before Netlify

## Fixed Before Deployment

- Added unique SEO titles and meta descriptions for the main public pages.
- Added canonical URLs using the placeholder production domain: `https://www.zhongguauto.com`.
- Added Open Graph and Twitter card metadata across public HTML pages.
- Added a default OG image at `/images/og-image.jpg`.
- Replaced redirect-only SEO landing pages with real static English pages containing H1, H2 sections, featured vehicle links, export process content, FAQ, WhatsApp CTA and inquiry forms.
- Generated static vehicle detail pages for every used car with model/year SEO titles, descriptions, canonical URLs, vehicle images and Product JSON-LD schema.
- Updated vehicle card CTA links to point to static `.html` vehicle detail pages instead of query-parameter-only URLs.
- Added Organization JSON-LD to the home page and company page.
- Rebuilt `sitemap.xml` with main pages, SEO landing pages and vehicle detail pages.
- Updated `robots.txt` to allow crawling and point to the sitemap.
- Replaced the broken legacy `script.js` with a clean version that passes Node syntax checks and keeps default English rendering stable.
- Fixed language dropdown labels so the visible options are not garbled.
- Added `noindex` metadata to the internal image preview page and legacy process compatibility page.
- Updated `netlify.toml` for a static HTML deployment with root publish directory and cache headers.

## Items To Confirm

- Replace the placeholder domain `https://www.zhongguauto.com` if the final production domain is different.
- Provide Google Search Console verification code or DNS verification method after deployment.
- Confirm the final WhatsApp number and email before promoting the site.
- Replace `/images/og-image.jpg` with a designed 1200x630 social sharing image when available.

## Netlify Deployment Settings

- Build command: `echo 'Static site: no build step'`
- Publish directory: `.`
- Node version: `20`
- This is a pure static HTML/CSS/JS site. No Vite or React build output is required.

## After Going Live

- Open `https://www.zhongguauto.com/robots.txt` and verify it is accessible.
- Open `https://www.zhongguauto.com/sitemap.xml` and verify it is accessible.
- Submit the sitemap in Google Search Console.
- Use URL Inspection in Search Console for the home page, used cars page, company page and several vehicle detail pages.
- Test WhatsApp buttons on desktop and mobile.
- Test the inquiry form and confirm lead delivery/storage behavior.
- Check Netlify deploy logs for missing files, MIME errors or redirect issues.

## Important URL List

- `/`
- `/index.html`
- `/new-cars.html`
- `/used-cars.html`
- `/brands.html`
- `/company.html`
- `/export-process.html`
- `/contact.html`
- `/china-used-car-exporter.html`
- `/china-new-car-exporter.html`
- `/chinese-vehicle-export-company.html`
- `/buy-cars-from-china.html`
- `/export-cars-from-china-to-algeria.html`
- `/export-cars-from-china-to-uae.html`
- `/export-cars-from-china-to-africa.html`
- `/byd-car-exporter-china.html`
- `/geely-car-exporter-china.html`
- `/bestune-car-exporter-china.html`
- `/toyota-used-cars-china.html`
- `/honda-used-cars-china.html`
- `/used-vw-t-cross-2024-001.html`
- `/used-toyota-corolla-2023-001.html`
- `/used-toyota-rav4-2024-001.html`
- `/used-toyota-corolla-2022-001.html`
- `/used-vw-tacqua-2023-001.html`
- `/used-honda-fit-2021-001.html`
- `/used-chery-tiggo8-plus-cdm-001.html`

## Validation Notes

- `script.js`, `lead-gen.js`, and `server.js` pass Node syntax checks.
- `sitemap.xml` parses as XML.
- Public HTML pages have title, description, canonical, OG image, Twitter card and one H1.
- HTML and JSON public content was checked for garbled Chinese text patterns after the SEO update.