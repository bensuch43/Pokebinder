# PokéBinder Studio v2.8

Track Pokémon TCG collections down to the printing, plan which binder pocket each card goes in, value everything in GBP, work out trades, and share want or trade lists as a link. Print binder guides and placeholder cards. Runs entirely in the browser and works offline once it's loaded.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, styles and icons |
| `app.js` | Collections, binders, prices, sharing, stickers, storage and settings |
| `vendor.js` | The Vendor area: stock, selling, buying, trades and the ledger |
| `sw.js` | Service worker that handles offline mode and caches card images |
| `SECURITY.md` | Security review findings and what was fixed |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | Lets you install it as an app (PWA) |

## Hosting

Put all the files in one folder on any static host, and keep `app.js` next to `index.html`. GitHub Pages works and is the same pattern as Little Plates. The app needs HTTPS for offline mode and install. If you open `index.html` straight from disk it still works, but there's no service worker, so no offline mode or install.

## Using it

1. **Add cards**: search by artist, set or card name, or by **printed code**: type what's at the bottom of the card, e.g. `PBL 42, MEW 1, SVI 107/198`, which is handy for sorting a pile of pulls. There's also an advanced [Lucene query](https://docs.pokemontcg.io/api-reference/cards/search-cards) option. Untick anything you don't want, then add the cards to the current collection or a new one.
2. **Tick cards off**: tap a pocket in Binder view or a row in Checklist view. Ticking means "I have one".
3. **Card details** (ⓘ): log how many copies you have of each printing (normal, reverse holo, holo, 1st edition), plus condition, the price you paid and the date. Extra copies become **spares**. This panel also shows the exact binder position and lets you copy the card to another collection or remove it.
4. **Collection settings** (pencil icon): set the pocket layout (4, 9, 12 or 16), the binder order (release date, Pokédex number, set, name) and whether each set starts on a new page. Tick **Master set** to give every printing its own pocket. The app works out which printings exist from the price data and fetches it if needed.
5. **Overview**: a chart of collection value over time (one point per day from the prices you've fetched), plus completion and cost to complete for each set.
6. **Trades**: your spares with their values, **Share trade list** and **Share want list** links, and a trade calculator. Add what you'd give (from your spares) and what you'd get (search by name or printed code) to see who comes out ahead at current GBP prices. **Apply** updates your quantities, with undo.
6a. **Price stickers** (Trades → Price stickers, or Print → Price stickers):
   - **Cards:** pick your spares, the cards in the calculator's "You give" list, or whatever's in the current view. You get one sticker per spare copy, or one per card.
   - **Pricing:** prices start at the GBP market price. You can apply a % of market, rounding (10p, 50p, £1 or .99) and a minimum price. Type a price on any row to override it, and the app remembers it.
   - **What's on each sticker:** card name, printing (e.g. a REVERSE HOLO tag), set code and number, the price, plus your stall name and logo if you set them. Logos are converted to black and white.
   - **A4 sticker sheets:** Avery L7160, L7159, L7163 or L7651. Print from your device at A4, 100% scale. You can start part-way down a used sheet (the app remembers where you stopped) and nudge the layout in mm to line it up. **Do a test print on plain paper first.**
   - **Bluetooth label printers** (NIIMBOT, Phomemo…): iPhones don't let websites connect to Bluetooth printers, so the app makes one black-and-white PNG per sticker at 203 dpi in your label size (50×30 mm, 40×30, 40×20, 30×15, 60×40 or custom). Tap **Share images** → Save Images, then print them from the printer's app.
7. **Filters** (set, status including **Spares**, rarity, text) apply to every view, and you can carry them into export and print.
8. **Print**: binder guide (a pocket map with tick boxes), placeholder cards (true 63 × 88 mm, 9 per A4, print at 100% scale) or a checklist.
9. **Export and share**: a **share link** (a read-only page anyone can open, with your list packed into the link itself so nothing is uploaded), a CSV with page, slot, printing, quantity, spares, condition, paid and price columns, a text list, or JSON. **Full backup and restore** is how you move data between devices. A merge combines matching collections.

## Vendor (selling at trade shows)

The **Vendor** tab is separate from your binders. Collections are your personal cards; **stock** is what you're selling.

- **Stock:** add cards by name or printed code, with quantity, condition, cost each and an optional asking price. Cards in stock are grouped by card, printing and condition, and the cost is averaged when you add more copies. **Move spares** takes the spare copies out of the current collection and puts them in stock, keeping their condition and what you paid as the cost. The copy in each binder pocket stays where it is.
- **Asking price:** your own price if you've set one; otherwise the **selling rule** (% of market, rounding and minimum, set in Price stickers). Price stickers print from stock by default, and a price you type on a sticker becomes that card's asking price.
- **Sell:** add cards from stock to a sale, adjust prices per card or set a bundle total, choose Cash, Card or Other, then **Complete sale**. Stock goes down, the sale is logged, and you can undo it.
- **Buy:** search the customer's cards. The offer starts at your **buy %** of market, rounded down, and you can change any line. **Complete purchase** adds the cards to stock with what you paid as their cost.
- **Trade:** give cards from stock, get the customer's cards, and compare the values in GBP. When you apply it, the cards you get take on the cost of what you gave, split by market value, so profit stays accurate when you later sell them.
- **Ledger:** every sale, purchase and trade with time, payment method, profit per sale, and takings by method. It also shows how much cash you took in versus paid out, for Today, the last 7 days, this month or all time. Mistakes are **voided** rather than deleted: the entry stays crossed out, it's left out of the totals, and its stock changes are reversed. Both stock and ledger export as CSV.
- **Online first, offline fallback:** when you add a card to a sale, offer or trade, the app re-checks its price if it's more than an hour old and labels it "live". With no signal it uses the last price it saved and labels it with that date. Searches fall back to cards already saved on the device.
- **Share:** shares your stock as a "Cards for sale" link with asking prices.
- **Languages (Vendor only):** every stock card, offer line, trade line, sale and ledger entry carries a print language (English, Japanese, German, French, Italian, Spanish, Portuguese, Dutch, Polish, Korean, Chinese). Under **Stock → Languages & pricing** you set what each language is worth as a % of market, because the free prices come from English-language listings. Those % values feed into stock value, asking prices, buy offers and trades. You can also set the default language for new cards. Stickers show a boxed language code (e.g. **JP**) for anything that isn't English. Language is also included in the CSVs and share links. Collections ignore language on purpose, because the artwork is the same in any language.
- **Japanese limitation:** cards are looked up in the English card database. A Japanese copy is logged against its English equivalent, so its sticker shows the English set and number. Japan-only cards can't be found yet.

## Design decisions (deliberate trade-offs)

- **Binder positions are always based on the whole collection**, never the filtered view. If you filter to "Needed", a card's page and slot stay where they really are in the binder.
- **Quantities are the source of truth.** A tick is shorthand for "one copy of the main printing", and unticking sets that printing to zero. Undo is offered on bulk changes.
- **Spares count from what fills the binder.** In a normal binder, the first copy of any printing fills the pocket and the rest are spares. In master-set mode, each printing fills its own pocket. Copies carried over from older versions show as "Unspecified" and count towards the main printing.
- **Prices paid are per copy, per printing**, not per individual card. Gain or loss only counts copies where you've entered a price paid.
- **Owned cards are tracked per collection.** The same card can be in your artist binder and your Pokédex binder, and you might physically have it in only one. If you own it in another collection, a blue dot shows on the card and the info panel names that collection.
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
- **Which Cardmarket figure (v2.8):** Settings → Price figure. The default is the **lowest Excellent-or-better listing** (Cardmarket's "EX+ low"), which is the closest free figure to "cheapest decent copy on sale". You can choose the 30-day average, trend, or lowest listing in any condition instead. TCGplayer uses the market price (falling back to mid), normal print first, then holo.
- **Two Cardmarket sources:** the Pokémon TCG API (has the EX+ figure but can lag by months) and **TCGdex**, which republishes Cardmarket's official price guide every hour (no EX+ figure). Turn TCGdex prices off in Settings if you want.
- **Status dots:** 🟢 **good** = your chosen figure, under 14 days old · 🟠 **fallback** = chosen figure missing or old, so a fresh 30-day average (then trend) is shown · 🔴 **stale** = only old prices exist. The ⓘ panel lists every figure, its date and which source it came from, with the one in use highlighted. Reverse holos have no EX+ figure, so they use the reverse-holo trend, 30-day average or low.
- **Trend arrows:** ▲/▼ with a percentage when the 7-day average is more than 5% above or below the 30-day average (from the freshest source).
- **Conversion:** GBP is calculated using the ECB reference rate from Frankfurter (`CONFIG.fxUrl`, no key needed). The rate is cached for 12 hours, and you can override it in Settings. If no rate is available, prices show in EUR or USD rather than a guessed rate.
- **Dates:** every price keeps the source's own **price date** (the date that source last updated it) and the date the app **fetched** it. Prices older than 14 days get a red dot.
- **Where prices appear:** a Value column in Checklist (tap the heading to sort high to low), a price panel in ⓘ, the value owned and to-complete under the progress bar, to-complete per set, the text want list and printed checklist, and nine CSV columns (`price_gbp`, `price_native`, `price_currency`, `price_source`, `price_metric`, `price_date`, `fx_gbp_per_unit`, `fx_source`, `price_fetched`).
- **Refresh:** tap ↻ Refresh prices to re-pull prices for the current collection, 60 cards per API call, then hourly prices from TCGdex (6 at a time; cards checked in the last hour are skipped). One card can be refreshed from its ⓘ panel. The vendor screens do the same automatically before pricing.
- **Caveat:** these are free, scheduled syncs, not live listings. Live "cheapest Lightly Played copy right now" isn't available for free: Cardmarket's API isn't open to new applications and scraping breaks their terms. Treat prices as a guide, not a valuation.

## API key

This is optional. Get one free from the Pokémon TCG developer portal and paste it into Settings. It's stored only in this browser and sent only to `api.pokemontcg.io`. Without a key the API still works, but with lower rate limits. The app backs off and retries automatically if it's rate-limited (HTTP 429).

## Updates

The app checks for a new version every time you open it or switch back to it. When one arrives, you'll see **"A new version of PokéBinder is ready → Reload"**. Settings → About this version shows the running version, the offline copy and the address it's running from. **Check for updates** checks for a new version straight away. **Reload app from the internet** clears the offline copy of the app files (not your data) and reloads.

If **Running from** isn't the address you upload to, your Home Screen icon points at an older copy. Back up, open the right address in Safari, and add it to the Home Screen again.

## Upgrading

From v2.3 or earlier, the first time v2.4 opens, each ticked card becomes one copy of "Unspecified" printing, and nothing is lost. Open a card's details to say which printing it is. Older backups restore the same way.

### From v1

When v2 first loads and has no data of its own, it imports the v1 collections, cached cards and owned ticks from the same browser. The v1 data isn't deleted. v1 kept one owned list across all collections, so on import each collection gets the ticks for its own cards.

## Config

Everything you can change is in the `CONFIG` block at the top of `app.js`: API base URL, retry count, page size, default layout and undo timeout.

## Appearance

The app has dark and light themes and follows your device by default. You can choose either in Settings. It respects reduced-motion settings, and touch targets are at least 44 px.

## Licence and attribution

This is a fan-made tool. Card data and images come from the Pokémon TCG API. Pokémon and its trademarks belong to Nintendo, Creatures, GAME FREAK and The Pokémon Company. The app isn't affiliated with or endorsed by them.
