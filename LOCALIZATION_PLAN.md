# Africa Market Localization Plan

## Current approach

The six Africa market landing pages remain English-first. Each page uses a localized market label, country-specific buyer context, vehicle demand, FOB inquiry messaging, shipping information, and country attribution in the inquiry form.

Only live language URLs should be published in `hreflang`. The current pages declare English and `x-default` self-references. French, Arabic, and Portuguese alternates should be added only when translated pages are complete, indexable, and linked reciprocally.

## Language roadmap

| Market | Languages | Phase |
| --- | --- | --- |
| Algeria | English, French, Arabic | English live; French and Arabic next phase |
| Egypt | English, Arabic | English live; Arabic next phase |
| Libya | English, Arabic | English live; Arabic next phase |
| Nigeria | English | Live |
| Ghana | English | Live |
| Angola / Mozambique | English, Portuguese | Future market and content phase |

## URL and hreflang structure

Recommended future patterns:

- English: `/export-cars-from-china-to-algeria.html`
- French: `/fr/export-cars-from-china-to-algeria.html`
- Arabic: `/ar/export-cars-from-china-to-algeria.html`
- Portuguese: `/pt/export-cars-from-china-to-angola.html`

Every translated page should include a canonical pointing to itself, reciprocal `hreflang` links for every available language, and an `x-default` link to the English page. Translations should preserve the Netlify `inquiry` form name and include `source_page`, `source_url`, and `country` fields.

## Content requirements

- Use market-specific search intent and buyer terminology rather than literal translation.
- Keep vehicle availability and import claims factual and confirm destination requirements before shipment.
- Preserve the official WhatsApp number: `+44 7473 271351` and `https://wa.me/447473271351`.
- Keep country flags as small market labels only; do not use flags as hero backgrounds or institutional branding.
- Add translated pages to `sitemap.xml` only when they are published.