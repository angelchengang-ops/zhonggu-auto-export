# Company Credential Cards Style Report

## Modified Files

- `style.css`
- `lang.json`
- `script.js`
- `COMPANY_CREDENTIAL_CARDS_STYLE_REPORT.md`

## Unified Card Style

The four credential cards now use the same visual treatment:

- White background
- Subtle low-opacity slate border
- 20px border radius
- Soft shadow: `0 12px 30px rgba(15, 23, 42, 0.04)`
- Consistent padding
- Light hover lift
- Blue numbered label
- Light-blue circular visual marker on each card

## Featured Card Change

- Removed the standalone dark-blue gradient treatment from the `USD 100M+` card.
- The `USD 100M+` card keeps slightly larger title text, but its card background now matches the other three cards.

## Mobile Adaptation

- Existing responsive rules keep the credential cards at two columns on tablet and one column on small mobile.
- Mobile spacing and card height remain compact.

## Local Test Results

- `lang.json` parsed successfully.
- Style validation confirmed the dark-blue featured-card background was removed.
- HTTP 200: `http://127.0.0.1:8787/company.html`
- HTTP 200: `http://127.0.0.1:8787/style.css`
- HTTP 200: `http://127.0.0.1:8787/lang.json`
- HTTP 200: `http://127.0.0.1:8787/script.js`
