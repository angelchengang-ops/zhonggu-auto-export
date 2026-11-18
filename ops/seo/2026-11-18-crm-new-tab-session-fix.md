# CRM new-tab session fix

The admin landing page and daily report rejected a new tab before checking the server because its sessionStorage login marker was absent. Both now verify the existing server session first. Tab storage is optional UI caching, not an authorization prerequisite. The daily report validates the admin identity and distinguishes unavailable/forbidden authentication from an expired session; a 401 still redirects to login, including when expiry happens between authentication and fetching the report.

No server authentication, cookie handling, session lifetime, customer data, prices, or inquiry submission behavior changes. The already verified daily synthetic inquiry is not resubmitted.

Validation: 106 tests pass, including seven new tests executing the actual page authentication functions with empty/unavailable storage, expired sessions, invalid roles and service errors. Site integrity: 153 HTML files, 125 unique sitemap URLs, no issues. Eight local browser cases cover both pages at 1200px/390px plus expired, forbidden and unavailable responses; no overflow and no protected statistics rendered for rejected authentication. These error cases use simulated responses, not a live account logout.

Release baseline: c77d8a604cad1af41675d0a6aa2ca3219cb1d6f7. After deployment verify fresh tabs on production and the existing authenticated daily-report tab. Sanitized live receipts and continuity record are kept in the local task output folder.
