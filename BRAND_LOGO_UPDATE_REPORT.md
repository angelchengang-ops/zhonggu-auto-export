# Brand Logo Update Report

## Download Results

| Brand | Saved path | Status |
| --- | --- | --- |
| Volkswagen | `images/brand-logos/volkswagen.svg` | Downloaded |
| SAIC | `images/brand-logos/saic.svg` | Downloaded |
| FAW | `images/brand-logos/faw.png` | Downloaded |
| Geely | `images/brand-logos/geely.svg` | Downloaded |
| BYD | `images/brand-logos/byd.svg` | Downloaded |
| GAC | `images/brand-logos/gac.png` | Downloaded after retry |

## Download Failures

- Initial GAC download returned HTTP 429. It succeeded on retry with a browser-style User-Agent.
- No logo remains failed.

## Company Page Changes

- `company.html`: replaced the static Brand & 4S Store Network cards with `<div class="company-brand-grid" data-brand-logo-grid></div>`.
- `script.js`: added shared `brandLogoData` and renders the six brand cards into the company page.

## Home Page Changes

- `index.html`: replaced the static Home Brands grid with `<div class="brand-grid" data-brand-logo-grid></div>`.
- `script.js`: the Home page uses the same shared `brandLogoData`, avoiding duplicated hard-coded brand cards.

## Mobile Adaptation

- `style.css`: added responsive logo sizing at `max-width: 768px`.
- Home and Company brand grids retain existing responsive grid behavior.

## Image Failure Fallback

- Every rendered logo image includes `onerror="this.style.display='none'"`.
- If a logo fails to load, the card keeps the brand text visible and hides only the image.

## Local Test Address

- Company: `http://127.0.0.1:8787/company.html`
- Home: `http://127.0.0.1:8787/index.html`

## Local Test Results

- HTTP 200: `company.html`
- HTTP 200: `index.html`
- HTTP 200: `style.css`
- HTTP 200: `script.js`
- HTTP 200: all six logo files
- HTTP 200: this report
- Both pages use the shared `[data-brand-logo-grid]` rendering hook.
