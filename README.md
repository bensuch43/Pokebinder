# PokéBinder Studio v3.7

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

## Card data (v3.0): TCGdex first

- **Why:** the Pokémon TCG API stopped updating in September 2026 (its last set is 30th Celebration). TCGdex is actively maintained, covers new sets within days, and has Japanese data with Cardmarket prices.
- **English searches:** artist and card-name searches still ask the Pokémon TCG API first (complete and fast for older sets), then add anything only TCGdex has, tagged **TCGdex**. Searching a set the old API doesn't know (e.g. Delta Reign) goes straight to TCGdex. If the old API is down, searches fall back to TCGdex after about 6 seconds.
- **Other languages:** pick Japanese, Korean or Chinese in the Add cards dialog. Search by artist, set (name or code, e.g. `SV3`) or card name. English Pokémon names work (it looks up the Pokédex number); Trainer cards need the Japanese/Korean/Chinese name. Printed-code and Advanced searches are English-only.
- **Coverage:** Japanese is well covered, with images and Cardmarket prices for most cards. Korean and Chinese data on TCGdex is sparse, and Cardmarket has almost no Chinese prices, so those usually stay as custom cards with no price.
- **Card IDs:** English cards in sets the old API has keep its IDs (e.g. `swsh8-80`), so nothing in existing collections changes. Newer English cards use TCGdex IDs (`me06-086`); other languages are prefixed (`ja-SV3-118`).
- **Match custom cards:** a collection with custom cards shows a banner above the Checklist. **Match to TCGdex** swaps each custom card for the real one, keeping quantities, condition and price paid:
  - English: matched on set name + card number, with the name checked.
  - Japanese/Korean/Chinese: matched on Pokédex number + card number, and only when exactly one card fits.
  - Anything unmatched stays custom, with the reason listed under the banner. Run it again later as TCGdex adds cards.

## Deals (v3.1)

The **Deals** panel at the top of **Overview** scans the current collection for good moments to buy. Its settings are saved with each collection:

- **Scan:** needed cards (default) or all cards.
- **Flag drops of:** 5–30% (default 10%).
- **Ignore under:** skip cheap cards (default £1), where averages swing on one sale.
- **Compare Japanese prints:** also look for a Japanese card of the same Pokémon by the same artist, and flag it when it's cheaper by at least the threshold.

What gets flagged, biggest saving first:

- **▼ 7-day average below the 30-day average:** prices are dipping.
- **▼ Trend under the 30-day average:** a slower, steadier dip.
- **Japanese print … less:** the same-artist Japanese card costs less. It is usually the same artwork but not always, so check before buying.
- **⚠ A copy is listed at £x:** the cheapest listing is under half the trend. It's any condition (often Poor), so it's shown as a prompt to check, never as a deal on its own.

**Limits:** these are Cardmarket-wide averages from its hourly price guide, not individual listings, so condition, seller country and postage aren't accounted for. Cards that rarely sell can show big swings. The first scan of a large collection takes a minute or two; Japanese lookups are cached for a week.

## What's new in v3.7: Send to Cardmarket

Cost to complete has a **Send to Cardmarket** button. It sends the cards within your budget, or every card if no budget is set.

Another website can't fill your Cardmarket basket, so the route is a Cardmarket **wants list** followed by its **Shopping Wizard**. In the Wizard, choose **Reduce Shipments** for fewer sellers, or **Reduce Price** for the lowest total. There are two ways to build the list:

- **Exact versions (best for artwork lists):** "Your cards" lists each card with its set and number. **Open** goes to that exact card's Cardmarket page so you can add it to the wants list there. Opened rows are ticked so you keep your place. Cards without a direct product link open a search instead.
- **Quick paste:** the list is formatted the way Cardmarket accepts it for Pokémon (`1x Name Ability Attack…`), split into blocks of 150 lines. Tested in v3.6.1: set codes and plain names are rejected. **Pasted lines aren't pinned to a set.** Cardmarket matches "this card, any expansion" and may show a Japanese print as the sample picture, so edit each entry to the right set before running the Wizard.

Wants entries accept any language unless you set one, so the Wizard may pick French or German copies if they're cheapest. Set English or Japanese only if you prefer. Japanese picks from "Any language" are marked so you can set the Japanese expansion. The temporary paste-test tool from v3.6.1 has been removed.

## What's new in v3.6

- **Cost to complete has two orders** (saved per collection):
  - **Most cards for the money** (default): cheapest first, so a budget completes as many slots as possible.
  - **Best value now**: cards trading furthest below their own 30-day average come first. Cards that jumped this week (7-day average 15%+ above the 30-day) go last, marked "Wait". Below the Deals minimum price there's no trend signal (one sale moves the average), so those cards are simply cheapest first.
  The budget is filled in list order, skipping any card that doesn't fit.
- **Any language** (option): each needed card can be filled by the matching Japanese print when it's cheaper. "Matching" uses the same rule as Deals: same Pokémon, same artist and same rarity type. The Japanese card's picture is shown so you can confirm the artwork. Reverse holo and 1st edition slots stay English, as Japanese sets don't have like-for-like versions. Turning the option on looks up Japanese prints straight away for up to 60 cards; larger collections get a "Check the other N" button. Results are cached for a week.
- **Copies record a language.** Each printing in a card's ⓘ panel has a language (default English). A copy in any language counts for the slot. A Japanese copy is valued at its matching Japanese print when one is known. Other languages use the card's Cardmarket price, because the price guide doesn't split prices by language. The language shows in CSV exports, and carries over when spares move into Vendor stock.
- **Limit:** one language per printing per card. If you hold an English and a Japanese copy of the same printing, pick the main one.

## What's new in v3.5

**Collectors**
- **New-card watch.** In a collection's settings, set "Watch for new cards by artist" (a collection created from an artist search follows that artist automatically). Once a day, when you open the app, it checks TCGdex and tells you about cards by that artist that weren't there before; **Review** runs the artist search with cards you already have hidden. Overview shows the watch with **Check now**. The first check records what's there, so you're only told about cards added after that; it also says how many TCGdex cards by that artist aren't in the collection.
- **Cost to complete** (Overview): needed cards cheapest first, with the total, a set filter and a budget box ("£50 buys the cheapest 23 of 41", highlighted). **Copy buy list** copies the cards within budget as text.
- **Since you last looked.** If you've scanned Deals for a collection before, it re-checks once a day when you open the app and shows a banner when targets are hit or new deals appear. Untick "Re-check once a day" in Deals to stop it. This only happens when the app is opened; notifications while it's closed would need a server.

**Vendors**
- **Check tab** (first in Vendor): type a printed code or name, see market, your selling price (sticker rule), your buying offer and how many you have in stock, with printing buttons. Sell, Buy and Trade in add the card straight to those screens. Vendor searches now include new sets from TCGdex.
- **Needs attention** (Stock tab):
  - lots not sold for N days (default 90), with a 10% mark-down;
  - lots with a fixed price X% (default 15) away from your sticker rule, with **Use rule**;
  - lots whose sticker no longer matches the asking price, with **Reprint these** (a new sticker source, "Stock whose price changed since its sticker").
  The app now remembers the price each stock sticker was printed at, and when a lot last sold.

## What's new in v3.4

- **More reliable printings (normal / holo / reverse holo / 1st edition).** About a third of TCGdex's English cards have no printing data, so the app now treats a printing as existing if *any* of these sources lists it:
  - TCGdex's own printing list;
  - TCGplayer's live listings (one price per printing), via TCGdex;
  - Cardmarket's reverse-holo price columns, via TCGdex (cards from 2002 on, when reverse holos began);
  - the Pokémon TCG API data captured when the card was added.
  This uses the same request as the price refresh, so it costs nothing extra.
- **See and correct printings.** Each card's ⓘ panel lists the printings that exist and which sources say so. **Not a real printing** hides one (restorable); **Add printing** still adds one. A printing you hold copies of always shows.
- **Existing collections pick up printings at the next price refresh.** Turning on master-set mode re-checks every card.
- **Stamps aren't printings.** Staff, prerelease, league and similar stamped versions are ignored when working out printings; only 1st edition counts.
- **Share links are shorter again** (packed as bytes instead of text, and `index.html` dropped from the address). On a realistic want list they are 25–35% shorter for 10–25 cards and about 15% shorter for large lists. Links from every earlier version still open.

## What's new in v3.3

- **Exports are always grouped by set, oldest set first,** then by card number. This applies to CSV, text, JSON and share links, whatever sort the binder uses. Sets with no release date (custom cards) come last. With "All collections", each collection is listed in turn and ordered this way inside.
- **Include prices** is one switch for every export format, and the choice is remembered. When off: CSV drops the market-price columns and the paid columns, text drops prices and the total, JSON drops price data, and share links carry no prices. A for-sale list from Vendor always includes prices.
- **Share links are about five times shorter.** A 25-card list went from about 1,080 characters to about 260; a 208-card list from about 5,500 to about 990. Links now carry card IDs only; the page that opens the link looks up names and pictures (cards saved on that device first, then the Pokémon TCG API, then TCGdex). If the person opening it is offline and doesn't have the cards saved, they see set codes and numbers only. Custom cards still travel with their names. Older links keep working.
- **Truly short links** (a dozen characters) would need a server to store the list, which this app deliberately doesn't have.

## What's new in v3.2

- **Deals results are saved** per collection and survive closing the app. After each scan, rows that are new or whose flags changed since the previous scan are tagged **New**.
- **Target prices:** set "Your target price" in a card's ⓘ panel. Deals flags the card (★, listed first) when its price is at or below the target, whatever the drop threshold.
- **Japanese prints side by side:** the English and Japanese pictures are shown together with both prices. **Not the same card** hides a pairing, with Undo, and a "hidden Japanese matches" list lets you restore any.
- **Vendor:** a card added from a Japanese, Korean or Chinese search is always treated as that language (tag on stock and stickers), and its price is used as-is. The language % in Vendor settings only applies to English cards you mark as another language.
- **Share links** now carry pictures for new-set and Japanese cards.
- **Offline:** TCGdex card images are saved for offline use, alongside the older image source.
- **Reliability:** TCGdex requests retry twice when the service is busy, and a refresh or scan tells you how many cards couldn't be checked.
- **Storage:** Settings shows saved lookups and offline images. **Clear caches and unused cards** clears lookups, unused cards, saved Deals results and the image cache. Old lookups also expire by themselves (30 days).
- **Phone usability:** all buttons, links and form controls are at least 44px high on touch screens, minimum text size is 12px, and the green ▲ is darker in light mode.
- **Deliberate exception:** captions overlaid on card thumbnails stay at 10–11.5px, because larger text would cover the artwork.

## Prices (GBP)

- **Source (v2.9):** Cardmarket's official price guide (EUR), fetched per card from **TCGdex**, which republishes it every hour. The Pokémon TCG API's prices stopped updating on 1 July 2026, so they're only used for cards TCGdex can't match, and are always flagged stale. TCGplayer (USD) is still selectable in Settings but comes from the same frozen API.
- **Which figure:** Settings → Price figure. Trend (default, Cardmarket's headline figure), 30-day average, 7-day average, or lowest listing. The lowest listing includes Poor copies, so it's often misleadingly low. There is no free condition-filtered figure.
- **Status dots:** 🟢 **good** = your chosen figure, under 3 days old · 🟠 **fallback** = chosen figure missing, so another fresh figure (trend → 30-day → 7-day) is used · 🔴 **stale** = older than 3 days, or only the frozen API price exists. The ⓘ panel lists every figure with its date and source. Reverse holos use Cardmarket's reverse-holo columns.
- **Trend arrows:** ▲/▼ with a percentage when the 7-day average is more than 5% above or below the 30-day average.
- **Links:** "Find on Cardmarket" opens a Cardmarket search for the card name (the old prices.pokemontcg.io links no longer load). Pick the right set and number from the results.
- **Conversion:** GBP is calculated using the ECB reference rate from Frankfurter (`CONFIG.fxUrl`, no key needed). The rate is cached for 12 hours, and you can override it in Settings. If no rate is available, prices show in EUR or USD rather than a guessed rate.
- **Dates:** every price keeps the source's own **price date** (the date that source last updated it) and the date the app **fetched** it. Prices older than 3 days get a red dot.
- **Where prices appear:** a Value column in Checklist (tap the heading to sort high to low), a price panel in ⓘ, the value owned and to-complete under the progress bar, to-complete per set, the text want list and printed checklist, and nine CSV columns (`price_gbp`, `price_native`, `price_currency`, `price_source`, `price_metric`, `price_date`, `fx_gbp_per_unit`, `fx_source`, `price_fetched`).
- **Refresh:** tap ↻ Refresh prices to re-check every card in the collection on TCGdex (6 at a time, so a 200-card collection takes a little while). Cards TCGdex can't match are then tried on the Pokémon TCG API. One card can be refreshed from its ⓘ panel. The vendor screens refresh automatically before pricing (cards checked in the last hour are skipped, 8-second limit, saved prices used if offline).
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
