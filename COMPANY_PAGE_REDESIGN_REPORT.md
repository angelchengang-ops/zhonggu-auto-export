# Company Page Redesign Report

## Modified Files

- `company.html`
- `style.css`
- `lang.json`
- `script.js`

## Added / Redesigned Sections

- Hero section with China vehicle export positioning and two CTAs.
- Core data and qualification cards.
- About Zhonggu Auto Export company introduction.
- Brand & 4S Store Network.
- Export Service Capability process cards.
- Why Choose Us value points.
- Media Section for preparation, inspection, delivery and loading images.
- Company Videos section.
- Final CTA and existing inquiry form.

## Multilingual Status

- English and Simplified Chinese company-page text was added to `lang.json`.
- The same English and Simplified Chinese company-page text was added to `script.js` as an offline fallback.
- All `company.html` `data-i18n` keys have English and Chinese values.
- No Google translation text was used for the new company-page content.

## Mobile Adaptation

- Added responsive layouts for the new hero, qualification cards, brand grid, service steps, why-choose grid, media grid and CTA.
- Existing mobile navigation and language selector behavior was preserved.

## Existing Feature Preservation

- Existing Netlify inquiry form markup was preserved, including `name="inquiry"`, `data-netlify="true"`, `form-name`, honeypot field and original input names.
- Existing WhatsApp behavior was preserved by keeping `whatsapp-btn`, `company-whatsapp`, and `contact-whatsapp-btn` classes.
- New-car data, new-car images, used-car data, backend logic and video upload behavior were not modified.

## Local Test Address

- Local test URL: `http://localhost:8087/company.html`

## Local Test Results

- `lang.json` parsed successfully.
- All `company.html` `data-i18n` keys have English and Simplified Chinese values.
- Local HTTP checks returned 200 for `company.html`, `style.css`, `script.js`, `lang.json`, all four company images and this report.
- Netlify form markers and WhatsApp button classes remain present in `company.html`.
