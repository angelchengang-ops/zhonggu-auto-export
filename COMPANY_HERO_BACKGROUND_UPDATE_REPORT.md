# Company Hero Background Update Report

## Background Image Path

- Final path: `images/company/company-hero-bg.png`
- Source file copied from: `images/company/未来港口与运输场景.png`

## Modified Files

- `style.css`
- `COMPANY_HERO_BACKGROUND_UPDATE_REPORT.md`

## Hero Class

- Company page hero uses: `.company-hero`
- Existing HTML section remains: `<section class="company-hero company-hero-redesign">`

## Implementation Notes

- `.company-hero` now uses `images/company/company-hero-bg.png` as the full-width background.
- A left-to-right dark gradient overlay keeps the white title readable.
- The old `images/company/loading1.jpg` background was removed from the Hero background logic.
- The media section can still use `Export Loading` as a gallery caption; it is no longer part of the Hero background.
- Mobile CSS keeps the background positioned `center right` with `min-height: 520px`.

## Local Test Results

- HTTP 200: `company.html`
- HTTP 200: `style.css`
- HTTP 200: `images/company/company-hero-bg.png`
- HTTP 200: this report
- `company.html` keeps the existing Hero text: `Reliable Vehicle Export Partner from China`.
- `.company-hero` CSS references `images/company/company-hero-bg.png`.
- The old `loading1.jpg` image is not used by the Hero background; it remains only in the lower media/gallery section.
