# PokéBinder Studio v2

Track Pokémon TCG collections, plan which binder pocket each card goes in, print binder guides and placeholder cards, and export filtered want lists. Runs entirely in the browser and works offline once it's loaded.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: HTML, CSS and JS, with no external dependencies |
| `sw.js` | Service worker that handles offline mode and caches card images |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | Lets you install it as an app (PWA) |

## Hosting

Put all the files in one folder on any static host. GitHub Pages works and is the same pattern as Little Plates. The app needs HTTPS for offline mode and install. If you open `index.html` straight from disk it still works, but there's no service worker, so no offline mode or install.

## Using it

1. **Add cards**: search by artist, set, card name, or an advanced [Lucene query](https://docs.pokemontcg.io/api-reference/cards/search-cards). Untick anything you don't want, then add the cards to the current collection or a new one.
2. **Tick cards off**: tap a pocket in Binder view or a row in Checklist view. Tap ⓘ for card details, the exact binder position, copy to another collection, or remove.
3. **Collection settings** (⚙︎): set the pocket layout (4, 9, 12 or 16), the binder order (release date, Pokédex number, set, name) and whether each set starts on a new page.
4. **Filters** (set, status, rarity, text) apply to every view, and you can carry them into export and print.
5. **Print**: binder guide (a pocket map with tick boxes), placeholder cards (true 63 × 88 mm, 9 per A4, print at 100% scale) or a checklist.
6. **Export**: a CSV that opens in Excel with page and slot columns, a text want list (with copy to clipboard), or JSON. **Full backup and restore** is how you move data between devices. A merge combines matching collections.

## Design decisions (deliberate trade-offs)

- **Binder positions are always based on the whole collection**, never the filtered view. If you filter to "Needed", a card's page and slot stay where they really are in the binder.
- **Owned ticks are kept per collection.** The same card can be in your artist binder and your Pokédex binder, and you might physically have it in only one. If you own it in another collection, a blue dot shows on the card and the info panel names that collection.
- **Ticking a card doesn't take it off screen straight away**, even when you're filtered to "Needed". Otherwise cards would disappear as you tap them. The list catches up on the next filter change.
- **Your data lives only in this browser (IndexedDB).** There's no server and no account. The app reminds you to back up once you have more than 50 ticks.

## Missing artist credits and TCGdex

The Pokémon TCG API has **no artist** recorded for about 1,600 cards, including whole recent sets (Stellar Crown, Surging Sparks, Prismatic Evolutions, Journey Together, Destined Rivals, Mega Evolution, Perfect Order) and scattered cards elsewhere. An artist search on that API alone can never find them.

**How the app fills the gap:**

- **TCGdex (on by default).** On an artist search, the app also asks [TCGdex](https://tcgdex.dev), a second open community card database, for every card it credits to that artist. TCGdex's set codes are converted to the Pokémon TCG API's (a built-in table, with fallbacks for new sets). The full card is then fetched from the Pokémon TCG API, so images and prices still come from there.
  - A card is only added if the **name matches on both sides**.
  - Cards found this way show a "via TCGdex" badge, and CSV exports have `artist_source = TCGdex`.
  - If the two databases name **different artists** for a card, it appears unselected with the API's artist shown, so you can decide.
  - TCG Pocket (digital-only) cards are ignored.
  - Results are cached for 7 days. You can turn this off in Settings.
- **Pick by eye (optional fallback).** Tick "Also list every card with no artist credit" to list all uncredited cards from the sets in `CONFIG.uncreditedSets` (editable in Settings). Cards you add from there get the artist you searched for.
- **Manual edit.** Any card's artist can be changed from its ⓘ panel.
- **Credits never get wiped.** An artist from TCGdex or from you survives later syncs and price refreshes. If the Pokémon TCG API later credits the card itself, its credit takes over.

**Checked 6 November 2026** against snapshots of both datasets: TCGdex credits 212 physical Yuka Morii cards, and every one matched a Pokémon TCG API card. That's 205 already credited by the API, plus 7 that only TCGdex credits: Chewtle and Meltan (Stellar Crown), Applin (Surging Sparks), Karrablast (Journey Together), Smoliv (Destined Rivals), Helioptile (Mega Evolution) and Mankey (Pitch Black). The live APIs may be slightly newer than these snapshots.

## Prices (GBP)

- **Source:** the Pokémon TCG API returns Cardmarket prices (EUR, the European market and the closest to the UK) and TCGplayer prices (USD, the US market). Neither is in GBP. Cardmarket is the default, and you can switch in Settings.
- **Metric:** for Cardmarket the app uses the trend price, falling back to the 30-day average, then average sell price, then low. For TCGplayer it uses the market price (falling back to mid), taking the normal print first, then holo.
- **Conversion:** GBP is calculated using the ECB reference rate from Frankfurter (`CONFIG.fxUrl`, no key needed). The rate is cached for 12 hours, and you can override it in Settings. If no rate is available, prices show in EUR or USD rather than a guessed rate.
- **Dates:** every price keeps the source's own **price date** (the date that source last updated it) and the date the app **fetched** it. Prices older than 14 days are shown in amber.
- **Where prices appear:** a Value column in Checklist (tap the heading to sort high to low), a price panel in ⓘ, the value owned and to-complete under the progress bar, to-complete per set, the text want list and printed checklist, and nine CSV columns (`price_gbp`, `price_native`, `price_currency`, `price_source`, `price_metric`, `price_date`, `fx_gbp_per_unit`, `fx_source`, `price_fetched`).
- **Refresh:** tap ↻ Refresh prices to re-pull prices for the current collection, 60 cards per API call. One card can be refreshed from its ⓘ panel.
- **Caveat:** these are free, scheduled syncs and can lag the market. Treat them as a guide, not a valuation.

## API key

This is optional. Get one free from the Pokémon TCG developer portal and paste it into Settings. It's stored only in this browser and sent only to `api.pokemontcg.io`. Without a key the API still works, but with lower rate limits. The app backs off and retries automatically if it's rate-limited (HTTP 429).

## Upgrading from v1

When v2 first loads and has no data of its own, it imports the v1 collections, cached cards and owned ticks from the same browser. The v1 data isn't deleted. v1 kept one owned list across all collections, so on import each collection gets the ticks for its own cards.

## Config

Everything you can change is in the `CONFIG` block at the top of the script in `index.html`: API base URL, retry count, page size, default layout and undo timeout.

## Licence and attribution

This is a fan-made tool. Card data and images come from the Pokémon TCG API. Pokémon and its trademarks belong to Nintendo, Creatures, GAME FREAK and The Pokémon Company. The app isn't affiliated with or endorsed by them.
