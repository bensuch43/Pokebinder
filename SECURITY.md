# PokéBinder Studio security review

**App:** PokéBinder Studio v2.4.0 · **Reviewed:** 6 November 2026 · **Scope:** the whole static PWA (`index.html`, `app.js`, `sw.js`, manifest) as hosted on GitHub Pages, and its use of three public read-only APIs. Owner-authorised review. There is no backend, account system or server-side storage.

## Summary

There are no P0 or P1 findings. The app has no server, no login and no secrets in its code, so most of the usual risk categories (exposed database, missing authorisation, account takeover) don't apply. The real attack surface is **untrusted data rendered in the browser**: card data from two community APIs, restored backup files, and share links that anyone can craft. Before this review, all of these were partly trusted. They are now validated and escaped, and a strict Content Security Policy blocks injected scripts even if an escaping bug slipped through. One data-loss risk remains (Safari storage eviction), and the fix for that is user behaviour rather than code.

| Priority | Found | Fixed in 2.4 | Remaining |
|---|---|---|---|
| P0 | 0 | — | 0 |
| P1 | 0 | — | 0 |
| P2 | 4 | 3 | 1 (accepted, documented) |
| P3 | 3 | 2 | 1 (platform limit) |

## Findings

### [P2] Share links were a new channel for attacker-controlled content (19 XSS, 16 input validation). Fixed.
- **Where:** `decodeShare()` and `openShare()` in `app.js`.
- **Impact:** a crafted `#s=` link could try to inject HTML or script into the viewer page.
- **Evidence:** a test link with `<img onerror>` in the collection name, `<script>` in a card name, `javascript:` as a card ID and `__proto__` as a card ID. The result was `window.__pwned` stayed undefined, the text rendered literally, and the bad IDs were dropped.
- **Fix applied:**
  - Every field is type-checked and length-capped, and card IDs must match `^[A-Za-z0-9._-]{1,60}$`.
  - At most 1,500 items are accepted, and decompression is capped at 4 MB to stop decompression bombs.
  - Image URLs are rebuilt from the card-ID pattern and never taken from the link.
  - All output is escaped.
- **Secret rotation needed?** No.

### [P2] Backup restore trusted the file wholesale (16, 19, prototype pollution). Fixed.
- **Where:** `sanitizeState()` and the restore handler.
- **Impact:** a malicious backup someone sends you could plant `javascript:` links, `__proto__` keys, absurd quantities or bad layout values.
- **Evidence:** a test backup containing all of those. After restore, the URLs were blanked, `__proto__` was dropped (the object prototype was unchanged), the quantity was clamped to 999, a negative price paid was dropped and the layout was reset to 3×3.
- **Fix applied:** collections and cards are rebuilt field by field from an allowlist. Collections whose IDs don't match the expected pattern are discarded. A "replace" restore keeps this device's own settings.
- **Secret rotation needed?** No.

### [P2] The API key was included in backup files (14 secrets exposure). Fixed.
- **Where:** the backup download handler.
- **Impact:** sharing a backup file to move devices also shared your Pokémon TCG API key.
- **Evidence:** before the fix, the backup JSON contained `settings.apiKey`. After the fix, a test with the key set to `SECRET-KEY-123` showed it is absent from the file.
- **Fix applied:** the key is stripped from backups and is never put into share links.
- **Secret rotation needed?** Only if you have already sent an older backup to someone **and** had an API key set. In that case, regenerate the key on the Pokémon TCG developer portal.

### [P2] Your data can be wiped by Safari if the app isn't installed (44 backups). Accepted and mitigated.
- **Where:** platform behaviour, not app code.
- **Impact:** Safari can delete a website's stored data after about 7 days without a visit, unless the site has been added to the Home Screen. Your collection would be lost if you have no backup.
- **Mitigations in the app:**
  - "Ask browser to keep data" (persistent storage request) in Settings.
  - A backup nudge appears once you have more than 50 owned cards.
  - Backups merge correctly across devices.
- **What you need to do:** install the app to your Home Screen and keep a recent backup.

### [P3] No Content Security Policy (46 security headers). Fixed.
- **Fix applied:** all JavaScript moved out of the page into `app.js`, and this CSP added:
  - `script-src 'self'`
  - `connect-src` limited to the three APIs
  - `object-src 'none'`
  - `base-uri 'none'`
  - `referrer: no-referrer`

  Injected inline script will not run even if an escaping bug is introduced later. No violations were logged across the full test run.
- **Trade-off:** `style-src` allows inline styles because the app sets per-element CSS variables. Inline styles can't execute script, so this is low risk.

### [P3] External links and URLs from the APIs were trusted (19). Fixed.
- **Fix applied:** every `href` and `src` built from API or user data goes through `safeUrl()`, which allows `https:` only. Outbound links use `rel="noopener noreferrer"`.

### [P3] Clickjacking headers can't be set (46). Platform limit.
- GitHub Pages doesn't allow custom response headers, and `frame-ancestors` doesn't work in a meta tag. Risk is low: there's no login, and the destructive actions (delete, reset, replace, apply trade) all need a confirmation and offer undo. Moving to Cloudflare Pages or Azure Static Web Apps would allow the header if you ever need it.

## Prioritised fix order

All code fixes are done in v2.4. The remaining actions are yours:

1. Install the app to your Home Screen on each device and download a backup.
2. If you sent an older backup to anyone while an API key was set, rotate the key.

## Not applicable or verified safe

- **Accounts, authentication and authorisation (4–6, 9, 24–26, 33–34, 47):** no accounts, sessions or cookies.
- **Database and storage rules, tenant isolation (7–8, 41, 49):** there's no server database. Data lives in the user's own browser (IndexedDB).
- **SQL/NoSQL injection, SSRF, file upload, path traversal (17–18, 21–23):** no server. The API query strings are URL-encoded and only go to fixed hosts.
- **Hardcoded secrets (1–3, 13–14):** I searched the repo for key patterns and found none. The optional API key is entered by the user, stored locally and sent only to `api.pokemontcg.io`.
- **Dependencies (37–38):** there are none. No CDN scripts, no npm packages and no fonts are loaded from third parties.
- **CSV injection:** cells starting with `= + - @` are prefixed with `'` in CSV exports.
- **Service worker:** caches only same-origin files and card images. API responses are never cached by the worker.
- **Share-link privacy:** the list travels in the URL fragment (`#s=…`), which browsers don't send to GitHub's servers. The people you send the link to can, of course, read it.
