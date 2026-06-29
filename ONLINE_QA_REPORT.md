# Online QA Report

Date: 2026-06-29
Production site: `https://www.zhongguauto.com`

## Executive summary

The production site, primary pages, SEO files, used-car media, and custom domain respond successfully. Three functional issues were found:

1. The static Netlify deployment has no writable media API. The existing upload screen could not authenticate or save files because every `/api/media-*` endpoint returned 404.
2. `used-cars.html` limited the seven-record inventory to six cards.
3. The used-car list did not expose the requested View Photos and Play Video controls.

The repository fixes in this QA change:

- Show all used cars.
- Add real View Photos and Play Video links.
- Replace a corrupted metadata separator with ` | `.
- Detect the media API before enabling the admin login/upload form.
- Remove the insecure default media password.
- Route `/admin` and `/admin/` to `/admin/media.html`.

## 1. Company media administration

### Route availability before this fix

| Route | Production result |
| --- | --- |
| `/admin/media.html` | 200 |
| `/admin/` | 404 |
| `/admin/cms.html` | 404 |
| `/api/health` | 404 |
| `POST /api/media-login` | 404 |

Only `admin/media.html` and its copy at `public/admin/media.html` exist. There is no Decap CMS configuration or `admin/cms.html`.

The admin HTML has a responsive breakpoint at 760 px, so the status/login page is usable at phone width. This fix also makes `/admin` and `/admin/` redirect to that page.

### Authentication and real save mechanism

The UI defines four Company Strength image slots:

- Vehicle Preparation
- Pre-shipment Inspection
- Customer Delivery
- Export Loading

It also defines two Company Video slots:

- Pre-shipment Vehicle Inspection
- International Export Loading

The browser sends uploads to `POST /api/upload-media` and active-media changes to `POST /api/set-active-media`. Those routes exist only in `server.js`. That server writes uploaded files and `data/media-config.json` using Node `fs.writeFile`.

Netlify's static publish mode does not run `server.js`, and its deployed filesystem is not a persistent writable content store. Therefore the six upload slots are not usable in production. The production 404 responses confirm this.

Before this QA, `server.js` used the public fallback password `zg2026`. The fallback has been removed. The local media server now refuses to start unless `ZHONGGU_MEDIA_PASSWORD` is set. No password or secret is committed.

The admin page now checks `/api/health` first. On static Netlify it disables the password form and clearly reports that uploads cannot be saved.


### Production implementation options

#### Option A: Decap CMS

Best for Git-backed images and occasional small assets.

- Add Decap CMS configuration under `admin/`.
- Configure GitHub or another supported Git backend with proper OAuth.
- Model the four image fields and two video fields in a media/config collection.
- Let CMS commits trigger Netlify deployments.
- Avoid large videos in Git because repository size and deploy time will grow quickly.

#### Option B: Netlify Functions plus persistent object storage

Suitable only when paired with external storage.

- Implement authenticated upload and configuration Functions.
- Store files in R2, S3, or another object store.
- Store active slot metadata in a database or durable object store.
- Do not write to a Function's local filesystem; it is temporary.
- Enforce file type, file size, authorization, rate limits, and signed upload URLs.

Large company videos should upload directly to object storage with signed URLs rather than pass through a Function request.

#### Option C: Cloudflare R2

Recommended for the two video slots and scalable mobile uploads.

- Create a private R2 bucket.
- Use a Worker or authenticated backend to issue short-lived signed upload URLs.
- Save public or signed playback URLs in persistent configuration.
- Apply CORS only to `https://www.zhongguauto.com`.
- Keep R2 API credentials server-side.
- Use a custom media domain if stable public URLs are required.

#### Option D: Synology backend

Suitable when the company controls a NAS and network availability.

- Run the existing Node media server in Docker or a managed package.
- Put it behind HTTPS reverse proxy and a dedicated API hostname.
- Store uploads in a backed-up shared folder.
- Set `ZHONGGU_MEDIA_PASSWORD` through the container environment.
- Add stronger authentication, rate limits, audit logs, and IP/VPN restrictions.
- Update the admin page to call that API hostname and configure restrictive CORS.

Do not expose the current local server directly to the public internet without these controls.

## 2. Used-car inventory

### Data and display

The live rendering source is `data/cars.raw.json`, not root `cars.json`.

| Dataset | Total records | Used-car records |
| --- | ---: | ---: |
| `data/cars.raw.json` | 36 | 7 |
| `data/used-cars.json` | 7 | 7 |
| Root `cars.json` | 36 | 7 |

The root `cars.json` previously contained six legacy used records. It is now synchronized from the authoritative `data/cars.raw.json`, so both expose the same 36 total records and seven used cars.

Before this fix, `used-cars.html` used `data-used-cars-limit="6"`. It now uses `all`, matching all seven current records.

### Language and formatting

The seven runtime used-car records contain no Chinese characters in their English display fields. Terms such as 2022 model, Pioneer Edition, Yue Connected Edition, and Trend Starter Edition do not leak into the English runtime data.

All seven use:

- Prices formatted as comma-separated RMB values, for example `128,900 RMB`.
- Mileage formatted as comma-separated ranges ending in `km`.
- English color names.
- Explicit transmission values such as Automatic, CVT, or DSG Automatic.

A mojibake separator in `script.js` was replaced by ` | `.

### Photos and videos

- Seven vehicle detail pages exist.
- All 66 unique production image/video paths returned HTTP 200.
- All seven video paths returned `video/mp4`.
- Local file references are complete; no referenced used-car media file is missing.
- The seven main images were visually checked and match their vehicle records: Volkswagen T-Cross, Toyota Corolla 2023, Toyota RAV4, Toyota Corolla 2022, Volkswagen TACQUA, Honda Fit, and Chery Tiggo 8 PLUS C-DM.
- This fix adds View Photos links to each detail page and Play Video links to each real MP4.

## 3. SEO

### Public files

| URL | Result |
| --- | --- |
| `https://www.zhongguauto.com/robots.txt` | 200, text/plain |
| `https://www.zhongguauto.com/sitemap.xml` | 200, application/xml |

The sitemap contains 27 URLs. All 27 use `https://www.zhongguauto.com`. Robots references `https://www.zhongguauto.com/sitemap.xml`.

### Page metadata

The following production pages returned 200 and passed title, description, canonical, and Open Graph URL checks:

- Home
- New Cars
- Used Cars
- Company
- Export Process
- Contact
- China Used Car Exporter
- China New Car Exporter
- Chinese Vehicle Export Company
- Buy Cars from China
- BYD Car Exporter China
- Geely Car Exporter China

All tested canonical and `og:url` values use `https://www.zhongguauto.com`. No `netlify.app`, `localhost`, or `127.0.0.1` reference exists in the tested SEO tags, robots, or sitemap.

## Verification performed

- Production HTTP checks for core pages and admin routes.
- Production API checks using an explicitly invalid QA password.
- Runtime dataset count and formatting audit.
- Local existence checks for all referenced used-car media.
- Production HEAD requests for all 66 unique used-car media resources.
- Visual contact-sheet review of all seven main vehicle images.
- Production metadata extraction for 12 main and landing pages.
- Sitemap XML parsing and hostname audit.
- JavaScript syntax and Git diff checks after fixes.

## Remaining decision

Production media upload remains intentionally disabled until a persistent authenticated backend is selected. Cloudflare R2 with signed uploads is the strongest fit for large videos; Decap CMS is the simplest Git-based option for images and configuration.
