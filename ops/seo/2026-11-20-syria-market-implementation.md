# Syria SEO implementation and release gate — 2026-11-20

## Status
- Branch: `seo/syria-market-2026-11-20`
- Production deployment: **not completed** in this chat session.
- Google Search Console indexing / live URL inspection / sitemap submission: **not performed**, no authenticated browser or GSC API available in this session. Do not confuse repository sitemap updates with Google receipt or indexation.
- Source of edits: authenticated GitHub repository connection; no production CRM access, customer data reads, test-inquiry submissions or credentials used.

## What changed
- Six country/model/wholesale/shipping SEO pages:
  - `export-cars-from-china-to-syria.html`
  - `ar/export-cars-from-china-to-syria.html`
  - `ar/geely-coolray-syria.html`
  - `ar/mg5-syria.html`
  - `ar/chinese-cars-wholesale-syria.html`
  - `ar/shipping-cars-china-syria.html`
- Homepage market card linking English and Arabic country pages.
- Twelve 301 aliases from clean paths (with and without trailing slash) to canonical .html URLs.
- Six additions to `sitemap-pages-current.xml` and `sitemap-pages.xml`; the index `lastmod` for page sitemap updated to 2026-11-20.
- Added `tests/syria-pages.test.js` for page metadata, canonical, RTL, CRM-source labels, structured data, reciprocal country-language alternates, internal file links and sitemap/redirects.

## Content policy and business guardrails
- Focus on new unused passenger cars, B2B dealers and quote requests; no verified Syria inventory, freight rates, guaranteed customs clearance, transit times, payment acceptance or fixed prices are claimed.
- Original Syrian government communication about 2025 used-passenger-car restriction: https://sana.sy/economy/2238146/ and https://sana.sy/en/syria/362020/ .
- Actual rules, bank and counterparties screening, and port/shipping acceptance need live validation for each transaction.
- Reused existing regional-page form contract, shared scripts, mobile layout classes and CRM source/market labels. No existing model prices or product data modified.

## Checks observed so far
- GitHub file-level static checks: six pages fetched and verified for matching header/main/footer/section/form/script open/close counts, country attribution Syria, canonical, source URL, RTL for Arabic, parseable schema.org JSON-LD.
- No executable `npm run build`, `npm test`, `npm run check:site`, visual 390px/desktop verification, CRM isolation test or live Netlify deployment could be run from this connection. **These remain release blockers under docs/INQUIRY-DEVELOPMENT-STANDARD.md.**
- Do not claim actual Google indexation; GSC requires a logged-in property with URL inspection and sitemap status.

## Required release acceptance steps
1. On latest clean branch checkout run `npm ci`, `npm run build`, `npm test`, `npm run check:site`. Confirm no unintended generated-file changes and that all six pages are in generated `sitemap-pages-current.xml`.
2. Preview six pages and inspect responsive layout (desktop and 390px RTL), menus, CTA, phone input, form validation, structured JSON and safe callback behavior. Confirm CRM submission only using project authorized isolated daily test path; no real customer writes or blind posts.
3. Review PR diff and production base SHA; merge only after gates pass. Record Netlify deploy ID and completed production build.
4. On https://zhongguauto.com verify six page HTTP 200, content, canonical and hreflang, clean path 301, correct sitemap-index.xml and sitemap-pages-current.xml, and check no regressions on existing market/product pages.
5. In authenticated GSC property `zhongguauto.com`, verify Sitemaps report submission/processing for `https://zhongguauto.com/sitemap-index.xml`, use URL Inspection on six canonical URLs, distinguish live test eligibility from actual indexed status. Request indexing if needed with permission; capture date/results.
6. Add a follow-up GSC baseline after 7/30/90 days (Syria country filter, queries, impressions, clicks and effective B2B CRM inquiries); avoid claims about rank guarantees.

## Rollback
- PR branch can be closed without production effect. After release, revert the merge commit if a verified regression occurs. No customer records are altered by this branch.

## Subsequent automated verification (2026-11-20)
- GitHub Actions release gate [run 44671405667](https://github.com/angelchengang-ops/zhonggu-auto-export/actions/runs/44671405667): **success**. `npm ci`, `npm run build`, `npm test` (118 passed, 0 failed), `npm run check:site` all completed. Build generated 66 page URLs including the six Syria canonicals. The workflow uses Node 24 because the repository's test invocation uses `--test-isolation=none`, unsupported by Node 20. Netlify's own configured Node 20 build is a separate environment.
- A build-time issue was caught and repaired: `scripts/generate-seo-upgrade-pages.js` previously regenerated the homepage market section without Syria; now its source also includes the Syria market card and the regression test passed.
- Netlify reported deploy-preview **success** for an earlier PR commit at `https://deploy-preview-6--zhonggu-auto-export.netlify.app`. In a subsequent live preview check, all six URLs returned HTTP 200 with expected canonical and enquiry form markers. A newer preview build had not yet become current when the homepage check ran, so its market link and sitemap check require a fresh recheck. Do not mistake a successful preview for the production deployment.
- Browser-based 390px RTL visual inspection and isolated CRM delivery have **not** been performed. Google Search Console access is not available in this session, so its sitemap acceptance, URL inspection and indexed status remain **unverified**.

- Netlify preview smoke test [run 44672248635](https://github.com/angelchengang-ops/zhonggu-auto-export/actions/runs/44672248635): **success**. All six served URLs returned HTTP 200 and correct canonical, market and inquiry markers; preview homepage included Syria market link (rewritten to extensionless href by Netlify); `sitemap-pages-current.xml` listed all six canonical .html URLs and the sitemap index linked it. This is a preview test, not a production check or proof of Google indexation.
