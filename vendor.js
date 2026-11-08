'use strict';
/* ==========================================================================
   VENDOR — stock for sale, selling, buying from customers, trades and a ledger.
   Lives alongside (not inside) your binder collections.

   Data model (persisted in S with everything else):
   S.stock  : { [lotId]: Lot }
              Lot = { id, cardId, v, c, q, cost, price, added, src }
              One lot per card + printing + condition. cost = average cost per copy in GBP (null = unknown).
              price = your asking price (null = use the selling rule from the price-sticker settings).
   S.ledger : [ Txn ] (append-only; mistakes are voided, never deleted, so totals stay auditable)
              Txn = { id, t:'sale'|'buy'|'trade', at, method, lines:[Line], total, note, void }
              Line = { cardId, v, c, q, unit, cost, dir }   sale: unit = price each, cost = cost each (profit)
                                                            buy: unit = paid each; trade: dir 'out' | 'in'
   S.vendor : work in progress (basket, buy list, trade lists, current tab, buy rule) — survives a reload at the venue.
   ========================================================================== */
const METHODS = { cash:'Cash', card:'Card', other:'Other' };
/* Print language matters when selling, not for the binder side (a card's artwork is the same in every language). */
const LANGS = { en:'English', ja:'Japanese', de:'German', fr:'French', it:'Italian', es:'Spanish', pt:'Portuguese', nl:'Dutch', pl:'Polish', ko:'Korean', zh:'Chinese' };
const LSHORT = { en:'EN', ja:'JP', de:'DE', fr:'FR', it:'IT', es:'ES', pt:'PT', nl:'NL', pl:'PL', ko:'KR', zh:'CN' };
const langOf = x => LANGS[x?.lang] ? x.lang : 'en';
/* Market prices come from English-language listings; this is your % for other languages (default 100 = same). */
const langFactor = lang => { const p = +S.vendor?.langAdj?.[lang]; return lang && lang !== 'en' && p > 0 ? p / 100 : 1; };
const VTABS = { stock:'Stock', sell:'Sell', buy:'Buy', trade:'Trade', ledger:'Ledger' };
const round2 = n => Math.round(n * 100) / 100;
const vNum = v => { const n = parseFloat(String(v ?? '').replace(/[£,\s]/g, '')); return Number.isFinite(n) ? n : null; };
UI.vfind = { add:[], buy:[], get:[] };

function initVendorState() {
  S.stock ||= {}; S.ledger ||= [];
  S.vendor = { basket:[], buy:[], give:[], get:[], langAdj:{}, defLang:'en', vtab:'stock', buyPct:60, buyRound:0.1, method:'cash', buyMethod:'cash', total:null, range:'today', sort:'name', adding:false, ...S.vendor };
}
function vendorCardIds() {
  const ids = new Set(Object.values(S.stock || {}).map(l => l.cardId));
  (S.ledger || []).forEach(t => t.lines.forEach(l => ids.add(l.cardId)));
  const V = S.vendor || {};
  [...(V.buy || []), ...(V.get || [])].forEach(l => ids.add(l.cardId));
  return ids;
}

/* ---------- stock primitives ---------- */
const findLot = (cardId, v, c, lang = 'en') => Object.values(S.stock).find(l => l.cardId === cardId && l.v === v && (l.c || '') === (c || '') && langOf(l) === (LANGS[lang] ? lang : 'en'));
function addToStock(cardId, v, c, q, cost, src, lang = 'en') {
  v = VARIANTS[v] && v !== 'any' ? v : 'normal'; c = CONDITIONS.includes(c) ? c : ''; lang = LANGS[lang] ? lang : 'en';
  let l = findLot(cardId, v, c, lang);
  if (l) {
    // weighted average cost; if either side's cost is unknown, keep the known one (approximation, documented)
    if (cost != null && l.cost != null) l.cost = round2((l.cost * l.q + cost * q) / (l.q + q));
    else if (l.cost == null && cost != null) l.cost = cost;
    l.q += q;
  } else { l = { id:'l_' + uid(), cardId, v, c, lang, q, cost:cost ?? null, price:null, added:today(), src }; S.stock[l.id] = l; }
  return l;
}
function takeFromStock(lotId, q) { const l = S.stock[lotId]; if (!l) return 0; const n = Math.min(l.q, q); l.q -= n; if (l.q <= 0) delete S.stock[lotId]; return n; }
const mktFor = (cardId, v, lang) => { const g = priceOf(S.cards[cardId], v)?.gbp; return g != null ? round2(g * langFactor(lang)) : null; };
const mktBadge = (cardId, v) => { const pi = priceOf(S.cards[cardId], v); return pi ? priceDot(pi) + trendTag(pi) : ''; };
const lotMarket = l => mktFor(l.cardId, l.v, langOf(l));
const lotAsk = l => l.price > 0 ? l.price : rulePrice({ id:l.cardId, v:l.v, lang:langOf(l) });
function buyOffer(cardId, v, lang) {
  const m = mktFor(cardId, v, lang); if (m == null) return null;
  const V = S.vendor, x = m * (+V.buyPct || 60) / 100, step = +V.buyRound;
  return round2(step > 0 ? Math.floor(x / step + 1e-9) * step : x);   // offers round DOWN (epsilon avoids 4.8 → 4.7 float error)
}
function lotLabel(l, withCond = true) {
  const c = S.cards[l.cardId] || {};
  return `${esc(c.name || l.cardId)}${l.v && l.v !== 'normal' ? ` <span class="vtag">${VSHORT[l.v] || esc(VARIANTS[l.v])}</span>` : ''}${langOf(l) !== 'en' ? ` <span class="vtag" style="background:var(--info);color:#fff">${LSHORT[langOf(l)]}</span>` : ''}${withCond && l.c ? ` <span class="vtag" style="background:var(--surface-2);color:var(--text-2)">${esc(l.c)}</span>` : ''}`;
}
const cardSub = id => { const c = S.cards[id] || {}; return `${esc(c.set_name || '')} · ${esc(c.number || '')}`; };
const thumb = id => { const u = safeUrl(S.cards[id]?.img_s); return u ? `<img src="${esc(u)}" alt="" loading="lazy">` : '<span class="ph"></span>'; };

/* ---------- prices: online first, fall back to what's saved ---------- */
async function freshen(ids) {
  const want = [...new Set(ids)].filter(id => { const c = S.cards[id]; return c && !c.custom; });
  if (!want.length || navigator.onLine === false) return false;
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 8000);
  try { return (await tcgdexPrices(want, null, ac.signal)) > 0; }   // skips cards checked in the last hour
  catch { return false; } finally { clearTimeout(timer); save(); }
}
function priceAge(id) {
  const f = Date.parse(S.cards[id]?.price?.fetched || 0);
  if (!f) return '<span class="small muted">no price</span>';
  return Date.now() - f < 15 * 6e4 ? '<span class="small up">live</span>' : `<span class="small muted" title="Offline or not refreshed — last fetched price">saved ${new Date(f).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span>`;
}

/* ---------- ledger ---------- */
function ledgerIn(range) {
  const now = new Date(), t0 = today();
  const from = range === 'today' ? t0 : range === '7d' ? new Date(now - 6 * 864e5).toISOString().slice(0, 10) : range === 'month' ? t0.slice(0, 8) + '01' : '';
  return S.ledger.filter(t => !from || t.at.slice(0, 10) >= from);
}
function ledgerTotals(list) {
  const r = { sales:0, salesN:0, cogs:0, profit:0, unknownCost:0, bought:0, buyN:0, trades:0, by:{ cash:0, card:0, other:0 }, paidBy:{ cash:0, card:0, other:0 } };
  for (const t of list) {
    if (t.void) continue;
    if (t.t === 'sale') { r.sales += t.total; r.salesN++; r.by[t.method] = (r.by[t.method] || 0) + t.total;
      for (const l of t.lines) { if (l.cost != null) { r.cogs += l.cost * l.q; r.profit += (l.unit - l.cost) * l.q; } else r.unknownCost += l.q; } }
    else if (t.t === 'buy') { r.bought += t.total; r.buyN++; r.paidBy[t.method] = (r.paidBy[t.method] || 0) + t.total; }
    else if (t.t === 'trade') r.trades++;
  }
  return r;
}
function record(t, method, lines, total, note = '') {
  const txn = { id:'t_' + uid(), t, at:new Date().toISOString(), method, lines, total:round2(total), note, void:false };
  S.ledger.push(txn); return txn;
}
function voidTxn(id) {
  const t = S.ledger.find(x => x.id === id); if (!t || t.void) return;
  let short = 0;
  for (const l of t.lines) {
    const back = t.t === 'sale' || (t.t === 'trade' && l.dir === 'out');
    if (back) addToStock(l.cardId, l.v, l.c, l.q, l.cost ?? null, 'void', langOf(l));
    else { const lot = findLot(l.cardId, l.v || 'normal', l.c || '', langOf(l)); const n = lot ? takeFromStock(lot.id, l.q) : 0; short += l.q - n; }
  }
  t.void = true; t.voidAt = new Date().toISOString(); save(); renderVendor();
  toast(`${t.t === 'sale' ? 'Sale' : t.t === 'buy' ? 'Purchase' : 'Trade'} voided — stock put back${short ? ` (${short} card${short === 1 ? '' : 's'} already gone from stock)` : ''}`, short ? 'warn' : 'success');
}

/* ==========================================================================
   RENDER
   ========================================================================== */
function renderVendor() { $('#view').innerHTML = vendorHtml(); }
function vendorHtml() {
  const V = S.vendor, lots = Object.values(S.stock);
  const copies = lots.reduce((n, l) => n + l.q, 0), mkt = lots.reduce((n, l) => n + (lotMarket(l) || 0) * l.q, 0);
  const cost = lots.reduce((n, l) => n + (l.cost || 0) * l.q, 0), ask = lots.reduce((n, l) => n + (lotAsk(l) || 0) * l.q, 0);
  const T = ledgerTotals(ledgerIn('today'));
  const tabs = Object.entries(VTABS).map(([k, n]) => `<button role="tab" data-vact="tab" data-tab="${k}" aria-selected="${V.vtab === k}">${n}${k === 'sell' && V.basket.length ? ` (${V.basket.reduce((a, b) => a + b.q, 0)})` : k === 'buy' && V.buy.length ? ` (${V.buy.length})` : ''}</button>`).join('');
  const body = { stock:stockHtml, sell:sellHtml, buy:buyHtml, trade:vtradeHtml, ledger:ledgerHtml }[V.vtab] || stockHtml;
  return `<div class="ov">
    <div class="stats">
      <div class="stat hero"><div class="ring" style="--p:0" data-label="${copies}"></div><span class="k">Stock for sale</span><span class="v">${lots.length} card${lots.length === 1 ? '' : 's'}</span><span class="s">${copies} cop${copies === 1 ? 'y' : 'ies'} · asking ${GBP.format(ask)}</span></div>
      <div class="stat"><span class="k">Stock value</span><span class="v">${GBP.format(mkt)}</span><span class="s">cost ${GBP.format(cost)}</span></div>
      <div class="stat"><span class="k">Today's takings</span><span class="v">${GBP.format(T.sales)}</span><span class="s">${T.salesN} sale${T.salesN === 1 ? '' : 's'} · cash ${GBP.format(T.by.cash)}</span></div>
      <div class="stat"><span class="k">Today's profit</span><span class="v ${T.profit >= 0 ? 'up' : 'down'}">${T.salesN ? (T.profit >= 0 ? '+' : '−') + GBP.format(Math.abs(T.profit)) : '—'}</span><span class="s">bought ${GBP.format(T.bought)}${T.unknownCost ? ` · ${T.unknownCost} no cost` : ''}</span></div>
    </div>
    <div class="row" style="justify-content:space-between"><div class="tabs" role="tablist" aria-label="Vendor">${tabs}</div>
      <span class="small muted">${navigator.onLine === false ? 'Offline — using saved prices' : 'Online — prices refresh as you add cards'}</span></div>
    ${body()}</div>`;
}
function finderHtml(ctx, placeholder) {
  const res = UI.vfind[ctx] || [];
  return `<form class="row v-find" data-find="${ctx}" style="flex-wrap:nowrap"><div class="search" style="flex:1"><svg class="i"><use href="#i-search"/></svg><input class="inp" name="q" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${esc(placeholder)}"></div><button class="btn">Find</button></form>
    ${res.length ? `<div class="picker">${res.map(c => `<button class="titem" style="text-align:left" data-vact="pick" data-ctx="${ctx}" data-card="${esc(c.id)}">${thumb(c.id)}<span class="t"><b>${esc(c.name)}</b><span>${esc(c.set_name)} · ${esc(c.number)}${c.rarity ? ' · ' + esc(c.rarity) : ''}</span></span><span class="price small">${priceHtml(priceOf(c))}</span>${ic('plus')}</button>`).join('')}</div>` : ''}`;
}
function stockFilterHtml(ctx) {
  return `<div class="search"><svg class="i"><use href="#i-search"/></svg><input class="inp" data-vfilter="${ctx}" value="${esc(UI.vfilter?.[ctx] || '')}" placeholder="Search your stock — name, set or number" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Search your stock"></div>`;
}
function filteredLots(ctx) {
  const f = (UI.vfilter?.[ctx] || '').toLowerCase().split(/\s+/).filter(Boolean);
  const lots = Object.values(S.stock).filter(l => { const c = S.cards[l.cardId]; if (!c) return false; const hay = `${c.name} ${c.set_name} ${c.set_id} ${c.number} ${VARIANTS[l.v]} ${l.c} ${LANGS[langOf(l)]} ${LSHORT[langOf(l)]}`.toLowerCase(); return f.every(t => hay.includes(t)); });
  const sort = S.vendor.sort;
  return lots.sort(sort === 'value' ? (a, b) => (lotAsk(b) || 0) - (lotAsk(a) || 0) : sort === 'new' ? (a, b) => (b.added || '').localeCompare(a.added || '') : (a, b) => (S.cards[a.cardId]?.name || '').localeCompare(S.cards[b.cardId]?.name || '') || SORTS.release(S.cards[a.cardId], S.cards[b.cardId]));
}
function lotRows(ctx, lots) {
  if (!lots.length) return `<p class="small muted" style="margin:8px 0">${Object.keys(S.stock).length ? 'Nothing in stock matches that search.' : 'No stock yet. Add cards, buy from a customer, or move spares in from a collection.'}</p>`;
  return lots.slice(0, 300).map(l => { const ask = lotAsk(l), m = lotMarket(l);
    return `<div class="titem" style="grid-template-columns:40px 1fr auto auto">${thumb(l.cardId)}
      <button class="t" style="background:none;border:0;padding:0;text-align:left" data-vact="${ctx === 'stock' ? 'lot' : ctx === 'sell' ? 'basket-add' : 'give-add'}" data-lot="${l.id}"><b>${lotLabel(l)}</b><span>${cardSub(l.cardId)} · ×${l.q}${l.cost != null ? ` · cost ${GBP.format(l.cost)}` : ''}</span></button>
      <span style="display:grid;justify-items:end"><b class="price">${ask != null ? GBP.format(ask) : '—'}</b><span class="small muted pwrap">${mktBadge(l.cardId, l.v)}mkt ${m != null ? GBP.format(m) : '—'}</span></span>
      ${ctx === 'stock' ? `<button class="btn sm" data-vact="basket-add" data-lot="${l.id}" aria-label="Sell">${ic('plus', 'sm')}Sell</button>` : `<button class="btn sm" data-vact="${ctx === 'sell' ? 'basket-add' : 'give-add'}" data-lot="${l.id}">${ic('plus', 'sm')}Add</button>`}</div>`; }).join('');
}
function stockHtml() {
  const V = S.vendor, col = active();
  const spares = col ? col.cardIds.reduce((n, id) => n + (S.cards[id] ? spareCount(col, S.cards[id]) : 0), 0) : 0;
  return `<section class="panel">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2>Stock for sale</h2><p class="muted small" style="margin:0">Separate from your binders. Tap a card to edit quantity, condition, cost or asking price.</p></div>
      <div class="row">
        <button class="btn sm primary" data-vact="toggle-add">${ic('plus', 'sm')}Add stock</button>
        ${spares ? `<button class="btn sm" data-vact="move-spares">${ic('layers', 'sm')}Move ${spares} spare${spares === 1 ? '' : 's'} from “${esc(col.name)}”</button>` : ''}
        <button class="btn sm" data-act="labels">${ic('sticker', 'sm')}Price stickers</button>
        <button class="btn sm" data-act="share-trade"${Object.keys(S.stock).length ? '' : ' disabled'}>${ic('share', 'sm')}Share</button>
        <button class="btn sm" data-vact="stock-csv"${Object.keys(S.stock).length ? '' : ' disabled'}>${ic('download', 'sm')}CSV</button>
      </div></div>
    ${V.adding ? `<div style="margin-top:12px;padding:12px;border:1px dashed var(--line-2);border-radius:var(--r)"><b class="small">Add cards to stock</b> <span class="small muted">— search by name or printed code, then set quantity, condition and cost.</span><div style="margin-top:8px">${finderHtml('add', 'Card name or code, e.g. PBL 42')}</div></div>` : ''}
    ${langPanelHtml()}
    <div class="row" style="margin-top:12px;flex-wrap:nowrap"><div style="flex:1">${stockFilterHtml('stock')}</div>
      <select class="inp" data-vin="sort" style="width:auto" aria-label="Sort stock"><option value="name"${V.sort === 'name' ? ' selected' : ''}>Name</option><option value="value"${V.sort === 'value' ? ' selected' : ''}>Price ↓</option><option value="new"${V.sort === 'new' ? ' selected' : ''}>Newest</option></select></div>
    <div class="tlist" id="v-list-stock">${lotRows('stock', filteredLots('stock'))}</div></section>`;
}
function langSelect(key, i, val) {
  return `<select class="inp" data-vin="${key}" data-i="${i}" style="min-height:34px;font-size:13px;padding:0 26px 0 8px;width:auto" aria-label="Language">${Object.entries(LANGS).map(([k, n]) => `<option value="${k}"${k === val ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
}
function langPanelHtml() {
  const V = S.vendor, adj = V.langAdj || {}, set = Object.keys(adj).length;
  return `<details style="margin-top:12px"><summary class="small" style="cursor:pointer;min-height:32px">Languages &amp; pricing${set ? ` · ${Object.entries(adj).map(([k, p]) => `${LSHORT[k]} ${p}%`).join(', ')}` : ''}</summary>
    <div style="padding:10px 0 0;display:grid;gap:10px">
      <p class="small muted" style="margin:0">Market prices come from English-language listings, and as far as I know Cardmarket's price guide isn't split by language. Set what each language is worth as a % of that, e.g. 80 = 80%. Blank = same as English. Used for stock value, asking prices, buy offers and trades.</p>
      <div class="row"><label class="f" for="v-deflang" style="margin:0">New cards default to</label>${langSelect('deflang', 0, V.defLang || 'en').replace('data-i="0"', 'id="v-deflang"')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${Object.entries(LANGS).filter(([k]) => k !== 'en').map(([k, n]) => `<label class="row small" style="flex-wrap:nowrap;justify-content:space-between;gap:6px">${n}<input class="inp mono" data-vin="ladj" data-lang="${k}" inputmode="decimal" placeholder="100" value="${adj[k] ? esc(adj[k]) : ''}" style="width:72px;min-height:36px;font-size:15px" aria-label="${n} as % of market"></label>`).join('')}</div>
    </div></details>`;
}
function basketTotals() {
  const B = S.vendor.basket, sub = round2(B.reduce((n, b) => n + (b.unit ?? 0) * b.q, 0));
  const total = S.vendor.total != null ? S.vendor.total : sub;
  const cost = B.reduce((n, b) => { const l = S.stock[b.lotId]; return n + (l?.cost != null ? l.cost * b.q : 0); }, 0);
  const unknown = B.filter(b => S.stock[b.lotId]?.cost == null).reduce((n, b) => n + b.q, 0);
  return { sub, total, profit:round2(total - cost), unknown };
}
function methodPicker(key) {
  return `<div class="tabs" role="radiogroup" aria-label="Payment method">${Object.entries(METHODS).map(([k, n]) => `<button type="button" role="radio" data-vact="method" data-key="${key}" data-m="${k}" aria-selected="${S.vendor[key] === k}" aria-checked="${S.vendor[key] === k}">${n}</button>`).join('')}</div>`;
}
function sellHtml() {
  const V = S.vendor, B = V.basket, t = basketTotals();
  return `<div class="trade${B.length ? ' sale-first' : ''}">
    <section class="panel"><h2>Find in stock</h2><p class="muted">Tap a card to add it to the sale.</p>${stockFilterHtml('sell')}<div class="tlist" id="v-list-sell">${lotRows('sell', filteredLots('sell').filter(l => (B.find(b => b.lotId === l.id)?.q || 0) < l.q))}</div></section>
    <section class="panel"><h2>Sale</h2>
      ${B.length ? `<div class="tlist">${B.map((b, i) => { const l = S.stock[b.lotId]; if (!l) return '';
        return `<div class="titem line">${thumb(l.cardId)}<div class="t"><b>${lotLabel(l)}</b><span>${cardSub(l.cardId)} · ${l.q} in stock</span></div>
          <div class="stepper"><button type="button" data-vact="bq" data-i="${i}" data-d="-1" aria-label="One fewer">${ic('minus', 'sm')}</button><output>${b.q}</output><button type="button" data-vact="bq" data-i="${i}" data-d="1" aria-label="One more">${ic('plus', 'sm')}</button></div>
          <div style="display:grid;justify-items:end;gap:4px"><input class="inp mono" data-vin="bunit" data-i="${i}" inputmode="decimal" value="${b.unit != null ? b.unit.toFixed(2) : ''}" placeholder="£ each" style="width:84px;min-height:36px;font-size:15px" aria-label="Price each"><button class="btn sm ghost icon" data-vact="brm" data-i="${i}" aria-label="Remove">${ic('x', 'sm')}</button></div></div>`; }).join('')}</div>
      <div class="ttotal"><span>Subtotal</span><span class="price">${GBP.format(t.sub)}</span></div>
      <div class="row" style="justify-content:space-between;margin-top:8px"><label class="f" for="v-total" style="margin:0">Total charged <small class="muted">(e.g. a bundle deal)</small></label><input id="v-total" class="inp mono" data-vin="total" inputmode="decimal" value="${V.total != null ? V.total.toFixed(2) : ''}" placeholder="${t.sub.toFixed(2)}" style="width:110px"></div>
      <div class="row" style="justify-content:space-between;margin-top:10px">${methodPicker('method')}<span class="small ${t.profit >= 0 ? 'up' : 'down'}">profit ${t.profit >= 0 ? '+' : '−'}${GBP.format(Math.abs(t.profit))}${t.unknown ? ` <span class="muted">(${t.unknown} no cost)</span>` : ''}</span></div>
      <div class="verdict" style="margin-top:12px;font-size:20px">${GBP.format(t.total)}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-vact="bclear">Clear</button><button class="btn primary" data-vact="sell"${B.some(b => b.unit == null) ? ' disabled title="Every card needs a price"' : ''}>${ic('check', 'sm')}Complete sale</button></div>`
      : `<p class="small muted">Nothing in this sale yet.</p>`}
    </section></div>`;
}
function buyHtml() {
  const V = S.vendor, L = V.buy;
  const total = round2(L.reduce((n, b) => n + (b.unit ?? buyOffer(b.cardId, b.v, langOf(b)) ?? 0) * b.q, 0)), mkt = L.reduce((n, b) => n + (mktFor(b.cardId, b.v, langOf(b)) || 0) * b.q, 0);
  return `<div class="trade">
    <section class="panel"><h2>Buy from a customer</h2><p class="muted">Search what they're selling. Offers start at your % of market (rounded down).</p>
      <div class="grid2" style="margin-bottom:10px"><div><label class="f" for="v-bpct">Offer % of market</label><input id="v-bpct" class="inp mono" data-vin="buyPct" inputmode="decimal" value="${esc(V.buyPct)}"></div>
        <div><label class="f" for="v-bround">Round offers down to</label><select id="v-bround" class="inp" data-vin="buyRound">${[['0', 'No rounding'], ['0.05', '5p'], ['0.1', '10p'], ['0.5', '50p'], ['1', '£1']].map(([v, n]) => `<option value="${v}"${+V.buyRound === +v ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div>
      ${finderHtml('buy', 'Card name or code, e.g. PBL 42')}</section>
    <section class="panel"><h2>Offer</h2>
      ${L.length ? `<div class="tlist">${L.map((b, i) => { const c = S.cards[b.cardId] || {}, off = buyOffer(b.cardId, b.v, langOf(b)), m = mktFor(b.cardId, b.v, langOf(b));
        return `<div class="titem line">${thumb(b.cardId)}<div class="t"><b>${esc(c.name)}</b><span class="pwrap">${cardSub(b.cardId)} · ${mktBadge(b.cardId, b.v)}mkt ${m != null ? GBP.format(m) : '—'} ${priceAge(b.cardId)}</span>
            <div class="row" style="margin-top:6px;gap:6px;flex-wrap:nowrap">
              <select class="inp" data-vin="buyv" data-i="${i}" style="min-height:34px;font-size:13px;padding:0 26px 0 8px" aria-label="Printing">${variantsOf(c).map(v => `<option value="${v}"${v === b.v ? ' selected' : ''}>${VARIANTS[v]}</option>`).join('')}</select>
              <select class="inp" data-vin="buyc" data-i="${i}" style="min-height:34px;font-size:13px;padding:0 26px 0 8px;width:auto" aria-label="Condition">${CONDITIONS.map(k => `<option${k === b.c ? ' selected' : ''}>${k}</option>`).join('')}</select>
              ${langSelect('buyl', i, langOf(b))}</div></div>
          <div style="display:grid;justify-items:end;gap:4px"><div class="stepper"><button type="button" data-vact="yq" data-i="${i}" data-d="-1" aria-label="One fewer">${ic('minus', 'sm')}</button><output>${b.q}</output><button type="button" data-vact="yq" data-i="${i}" data-d="1" aria-label="One more">${ic('plus', 'sm')}</button></div>
            <input class="inp mono" data-vin="bu" data-i="${i}" inputmode="decimal" value="${b.unit != null ? b.unit.toFixed(2) : ''}" placeholder="${off != null ? off.toFixed(2) : '£ each'}" style="width:84px;min-height:36px;font-size:15px" aria-label="Offer each">
            <button class="btn sm ghost icon" data-vact="yrm" data-i="${i}" aria-label="Remove">${ic('x', 'sm')}</button></div></div>`; }).join('')}</div>
      <div class="ttotal"><span>Market value</span><span class="price">${GBP.format(mkt)}</span></div>
      <div class="row" style="justify-content:space-between;margin-top:10px">${methodPicker('buyMethod')}<span class="small muted">${mkt ? `${Math.round(total / mkt * 100)}% of market` : ''}</span></div>
      <div class="verdict" style="margin-top:12px;font-size:20px">Offer ${GBP.format(total)}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-vact="yclear">Clear</button><button class="btn primary" data-vact="buy"${L.some(b => (b.unit ?? buyOffer(b.cardId, b.v, langOf(b))) == null) ? ' disabled title="Every card needs an offer"' : ''}>${ic('check', 'sm')}Complete purchase</button></div>`
      : `<p class="small muted">No cards in this offer yet.</p>`}
    </section></div>`;
}
function vtradeHtml() {
  const V = S.vendor;
  const gv = V.give.reduce((n, g) => { const l = S.stock[g.lotId]; return n + ((l && lotMarket(l)) || 0) * g.q; }, 0);
  const rv = V.get.reduce((n, g) => n + (mktFor(g.cardId, g.v, langOf(g)) || 0) * g.q, 0), diff = rv - gv;
  const line = (side, it, i) => { const isGive = side === 'give', l = isGive ? S.stock[it.lotId] : null, id = isGive ? l?.cardId : it.cardId; if (!id) return '';
    const val = isGive ? lotMarket(l) : mktFor(id, it.v, langOf(it));
    return `<div class="titem line">${thumb(id)}<div class="t"><b>${isGive ? lotLabel(l) : esc(S.cards[id]?.name)}</b><span>${cardSub(id)}${isGive ? ` · ${l.q} in stock` : ` · ${esc(VARIANTS[it.v])}`}</span>${isGive ? '' : `<div style="margin-top:6px">${langSelect('getl', i, langOf(it))}</div>`}</div>
      <div class="stepper"><button type="button" data-vact="tq" data-side="${side}" data-i="${i}" data-d="-1" aria-label="One fewer">${ic('minus', 'sm')}</button><output>${it.q}</output><button type="button" data-vact="tq" data-side="${side}" data-i="${i}" data-d="1" aria-label="One more">${ic('plus', 'sm')}</button></div>
      <div style="display:grid;justify-items:end;gap:2px"><span class="price">${val != null ? GBP.format(val * it.q) : '—'}</span><button class="btn sm ghost icon" data-vact="trm" data-side="${side}" data-i="${i}" aria-label="Remove">${ic('x', 'sm')}</button></div></div>`; };
  return `<section class="panel"><h2>Trade</h2><p class="muted">Swap cards from your stock for a customer's cards, compared at current ${(S.settings.priceSource || CONFIG.priceSource) === 'tcgplayer' ? 'TCGplayer' : 'Cardmarket'} prices in GBP. Applying it updates your stock and logs the trade.</p>
    <div class="trade">
      <div><b>You give (from stock)</b><div class="tlist">${V.give.map((g, i) => line('give', g, i)).join('') || '<p class="small muted" style="margin:6px 0">Search your stock below.</p>'}</div>
        <div class="ttotal"><span>Total</span><span class="price">${GBP.format(gv)}</span></div><div style="margin-top:8px">${stockFilterHtml('give')}</div><div class="tlist" id="v-list-give" style="max-height:260px;overflow:auto">${UI.vfilter?.give ? lotRows('give', filteredLots('give')) : ''}</div></div>
      <div><b>You get</b><div class="tlist">${V.get.map((g, i) => line('get', g, i)).join('') || '<p class="small muted" style="margin:6px 0">Search for the customer’s cards below.</p>'}</div>
        <div class="ttotal"><span>Total</span><span class="price">${GBP.format(rv)}</span></div><div style="margin-top:8px">${finderHtml('get', 'Card name or code, e.g. PBL 42')}</div></div>
    </div>
    ${V.give.length || V.get.length ? `<div class="verdict ${Math.abs(diff) < 0.5 ? '' : diff > 0 ? 'up' : 'down'}" style="margin-top:14px">${Math.abs(diff) < 0.5 ? 'About even' : diff > 0 ? `You come out ${GBP.format(diff)} ahead` : `You give ${GBP.format(-diff)} more than you get`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-vact="tclear">Clear</button><button class="btn primary" data-vact="trade"${V.give.length && V.get.length ? '' : ' disabled'}>${ic('check', 'sm')}Apply trade</button></div>` : ''}
  </section>`;
}
function ledgerHtml() {
  const V = S.vendor, list = ledgerIn(V.range), T = ledgerTotals(list);
  const ranges = { today:'Today', '7d':'Last 7 days', month:'This month', all:'All time' };
  const margin = T.sales ? Math.round(T.profit / Math.max(0.01, T.sales - (T.unknownCost ? 0 : 0)) * 100) : 0;
  return `<section class="panel">
    <div class="row" style="justify-content:space-between"><h2>Sales &amp; purchases</h2>
      <div class="row"><select class="inp" data-vin="range" style="width:auto" aria-label="Period">${Object.entries(ranges).map(([k, n]) => `<option value="${k}"${V.range === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn sm" data-vact="ledger-csv"${list.length ? '' : ' disabled'}>${ic('download', 'sm')}CSV</button></div></div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><span class="k">Takings</span><span class="v">${GBP.format(T.sales)}</span><span class="s">cash ${GBP.format(T.by.cash)} · card ${GBP.format(T.by.card)}${T.by.other ? ` · other ${GBP.format(T.by.other)}` : ''}</span></div>
      <div class="stat"><span class="k">Profit</span><span class="v ${T.profit >= 0 ? 'up' : 'down'}">${T.salesN ? (T.profit >= 0 ? '+' : '−') + GBP.format(Math.abs(T.profit)) : '—'}</span><span class="s">${T.salesN ? `${margin}% margin · cost of cards ${GBP.format(T.cogs)}` : 'no sales'}${T.unknownCost ? ` · ${T.unknownCost} sold with no cost` : ''}</span></div>
      <div class="stat"><span class="k">Bought</span><span class="v">${GBP.format(T.bought)}</span><span class="s">${T.buyN} purchase${T.buyN === 1 ? '' : 's'} · cash ${GBP.format(T.paidBy.cash)}</span></div>
      <div class="stat"><span class="k">Cash change</span><span class="v">${(T.by.cash - T.paidBy.cash >= 0 ? '+' : '−') + GBP.format(Math.abs(T.by.cash - T.paidBy.cash))}</span><span class="s">cash taken − cash paid out</span></div>
    </div>
    <div class="tlist" style="margin-top:12px">${list.length ? [...list].reverse().map(t => { const d = new Date(t.at), items = t.lines.reduce((n, l) => n + l.q, 0);
      const prof = t.t === 'sale' ? t.lines.reduce((n, l) => n + (l.cost != null ? (l.unit - l.cost) * l.q : 0), 0) : null;
      const names = t.lines.map(l => `${l.dir === 'out' ? '−' : l.dir === 'in' ? '+' : ''}${l.q > 1 ? l.q + '× ' : ''}${esc(S.cards[l.cardId]?.name || l.cardId)}${l.v && l.v !== 'normal' ? ' (' + esc(VARIANTS[l.v] || l.v) + ')' : ''}${langOf(l) !== 'en' ? ' [' + LSHORT[langOf(l)] + ']' : ''}`).join(', ');
      return `<div class="titem" style="grid-template-columns:1fr auto auto;${t.void ? 'opacity:.5' : ''}"><div class="t"><b>${t.t === 'sale' ? 'Sale' : t.t === 'buy' ? 'Bought' : 'Trade'} · ${d.toLocaleDateString('en-GB', { day:'numeric', month:'short' })} ${d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}${t.t !== 'trade' ? ' · ' + esc(METHODS[t.method] || t.method) : ''}${t.void ? ' · VOID' : ''}</b><span style="white-space:normal">${items} card${items === 1 ? '' : 's'}: ${names}</span></div>
        <span style="display:grid;justify-items:end"><b class="price"${t.void ? ' style="text-decoration:line-through"' : ''}>${t.t === 'buy' ? '−' : ''}${GBP.format(t.total)}</b>${prof != null ? `<span class="small ${prof >= 0 ? 'up' : 'down'}">${prof >= 0 ? '+' : '−'}${GBP.format(Math.abs(prof))}</span>` : ''}</span>
        ${t.void ? '<span></span>' : `<button class="btn sm ghost" data-vact="void" data-id="${esc(t.id)}">Void</button>`}</div>`; }).join('') : '<p class="small muted">Nothing recorded in this period.</p>'}</div>
  </section>`;
}

/* ==========================================================================
   ACTIONS
   ========================================================================== */
function vSave(full = true) { save(); if (full) renderVendor(); }
async function vendorAction(t, e) {
  const V = S.vendor, a = t.dataset.vact, i = +t.dataset.i;
  switch (a) {
    case 'tab': V.vtab = VTABS[t.dataset.tab] ? t.dataset.tab : 'stock'; vSave(); break;
    case 'toggle-add': V.adding = !V.adding; vSave(); break;
    case 'lot': openLot(t.dataset.lot); break;
    case 'basket-add': {
      const l = S.stock[t.dataset.lot]; if (!l) return;
      const b = V.basket.find(x => x.lotId === l.id);
      if (b) { if (b.q < l.q) b.q++; else { toast('That’s all the copies in stock', 'warn'); return; } }
      else V.basket.push({ lotId:l.id, q:1, unit:lotAsk(l) });
      V.total = null; vSave();
      if (V.vtab !== 'sell') toast(`Added to sale (${V.basket.reduce((n, x) => n + x.q, 0)})`, 'success', { label:'Go to sale', fn:() => { V.vtab = 'sell'; vSave(); } });
      if (await freshen([l.cardId])) { const bb = V.basket.find(x => x.lotId === l.id); if (bb && l.price == null) bb.unit = lotAsk(l); renderVendor(); }
      break; }
    case 'bq': { const b = V.basket[i], l = S.stock[b?.lotId]; if (!b || !l) return; b.q = Math.max(1, Math.min(l.q, b.q + Number(t.dataset.d))); V.total = null; vSave(); break; }
    case 'brm': V.basket.splice(i, 1); V.total = null; vSave(); break;
    case 'bclear': V.basket = []; V.total = null; vSave(); break;
    case 'method': if (METHODS[t.dataset.m]) { V[t.dataset.key === 'buyMethod' ? 'buyMethod' : 'method'] = t.dataset.m; vSave(); } break;
    case 'sell': completeSale(); break;
    case 'pick': await pickCard(t.dataset.ctx, t.dataset.card); break;
    case 'yq': { const b = V.buy[i]; if (!b) return; b.q = Math.max(1, Math.min(999, b.q + Number(t.dataset.d))); vSave(); break; }
    case 'yrm': V.buy.splice(i, 1); vSave(); break;
    case 'yclear': V.buy = []; vSave(); break;
    case 'buy': completeBuy(); break;
    case 'give-add': { const l = S.stock[t.dataset.lot]; if (!l) return; const g = V.give.find(x => x.lotId === l.id); if (g) g.q = Math.min(l.q, g.q + 1); else V.give.push({ lotId:l.id, q:1 }); vSave(); break; }
    case 'tq': { const arr = V[t.dataset.side], it = arr?.[i]; if (!it) return; const max = t.dataset.side === 'give' ? (S.stock[it.lotId]?.q || 1) : 999; it.q = Math.max(1, Math.min(max, it.q + Number(t.dataset.d))); vSave(); break; }
    case 'trm': V[t.dataset.side]?.splice(i, 1); vSave(); break;
    case 'tclear': V.give = []; V.get = []; vSave(); break;
    case 'trade': completeTrade(); break;
    case 'void': if (await confirmDlg('Void this entry?', 'It stays in the ledger, crossed out and excluded from totals, and the stock changes it made are reversed.', 'Void')) voidTxn(t.dataset.id); break;
    case 'move-spares': moveSpares(); break;
    case 'stock-csv': download(`PokeBinder_stock_${today()}.csv`, stockCsv(), 'text/csv;charset=utf-8'); break;
    case 'ledger-csv': download(`PokeBinder_ledger_${V.range}_${today()}.csv`, ledgerCsv(ledgerIn(V.range)), 'text/csv;charset=utf-8'); break;
  }
}
async function pickCard(ctx, id) {
  const c = (UI.vfind[ctx] || []).find(x => x.id === id) || S.cards[id]; if (!c) return;
  mergeCard(c); const V = S.vendor, v = primaryVariant(S.cards[id]);
  if (ctx === 'add') { UI.vfind.add = []; openLot(null, id); return; }
  const dl = V.defLang && LANGS[V.defLang] ? V.defLang : 'en';
  if (ctx === 'buy') { const ex = V.buy.find(b => b.cardId === id && b.v === v && langOf(b) === dl); if (ex) ex.q++; else V.buy.push({ cardId:id, v, c:'NM', lang:dl, q:1, unit:null }); UI.vfind.buy = []; }
  if (ctx === 'get') { const ex = V.get.find(b => b.cardId === id && b.v === v && langOf(b) === dl); if (ex) ex.q++; else V.get.push({ cardId:id, v, c:'NM', lang:dl, q:1 }); UI.vfind.get = []; }
  vSave();
  if (await freshen([id])) renderVendor();
}
function completeSale() {
  const V = S.vendor, t = basketTotals(); if (!V.basket.length) return;
  const snap = snapshot();
  const scale = t.sub > 0 ? t.total / t.sub : 1;   // a bundle price is spread across the lines so per-card profit stays meaningful
  const lines = [];
  for (const b of V.basket) { const l = S.stock[b.lotId]; if (!l) continue; const n = takeFromStock(l.id, b.q); if (!n) continue;
    lines.push({ cardId:l.cardId, v:l.v, c:l.c, lang:langOf(l), q:n, unit:round2((b.unit || 0) * scale), cost:l.cost ?? null }); }
  if (!lines.length) { toast('Those cards are no longer in stock', 'error'); return; }
  record('sale', V.method, lines, t.total); V.basket = []; V.total = null; vSave();
  undoable(`Sold for ${GBP.format(t.total)} (${METHODS[V.method]})`, snap);
}
function completeBuy() {
  const V = S.vendor; if (!V.buy.length) return;
  const snap = snapshot(), lines = [];
  for (const b of V.buy) { const lang = langOf(b), unit = b.unit ?? buyOffer(b.cardId, b.v, lang); if (unit == null) continue;
    addToStock(b.cardId, b.v, b.c, b.q, unit, 'buy', lang); lines.push({ cardId:b.cardId, v:b.v, c:b.c, lang, q:b.q, unit, cost:unit }); }
  const total = lines.reduce((n, l) => n + l.unit * l.q, 0);
  record('buy', V.buyMethod, lines, total); V.buy = []; vSave();
  undoable(`Bought ${lines.reduce((n, l) => n + l.q, 0)} card(s) for ${GBP.format(total)} — added to stock`, snap);
}
function completeTrade() {
  const V = S.vendor; if (!V.give.length || !V.get.length) return;
  const snap = snapshot(), lines = [];
  let basis = 0;   // what the cards you gave cost you (market value where cost unknown) becomes the cost of what you got
  for (const g of V.give) { const l = S.stock[g.lotId]; if (!l) continue; const n = takeFromStock(l.id, g.q); if (!n) continue;
    basis += (l.cost ?? lotMarket(l) ?? 0) * n; lines.push({ cardId:l.cardId, v:l.v, c:l.c, lang:langOf(l), q:n, unit:lotMarket(l) ?? 0, cost:l.cost ?? null, dir:'out' }); }
  const getVal = V.get.reduce((n, g) => n + (mktFor(g.cardId, g.v, langOf(g)) || 0) * g.q, 0);
  for (const g of V.get) { const m = mktFor(g.cardId, g.v, langOf(g)) || 0, unitCost = getVal > 0 ? round2(basis * (m / getVal)) : round2(basis / V.get.reduce((n, x) => n + x.q, 0));
    addToStock(g.cardId, g.v, g.c, g.q, unitCost, 'trade', langOf(g)); lines.push({ cardId:g.cardId, v:g.v, c:g.c, lang:langOf(g), q:g.q, unit:m, cost:unitCost, dir:'in' }); }
  record('trade', 'other', lines, getVal); V.give = []; V.get = []; vSave();
  undoable('Trade applied — stock updated', snap);
}
async function moveSpares() {
  const col = active(); if (!col) return;
  const plan = [];
  for (const id of col.cardIds) { const c = S.cards[id]; if (!c) continue; for (const sp of sparesOf(col, c)) plan.push({ id, sv:sp.v, n:sp.n, c }); }
  const n = plan.reduce((a, p) => a + p.n, 0); if (!n) return;
  if (!await confirmDlg('Move spares into stock?', `${n} spare cop${n === 1 ? 'y' : 'ies'} leave “${col.name}” and go into your stock for sale, keeping their condition and the price you paid as cost. The copy in each binder pocket stays.`, 'Move to stock')) return;
  const snap = snapshot();
  for (const p of plan) { const rec = col.copies[p.id][p.sv]; const v = p.sv === 'any' ? primaryVariant(p.c, col) : p.sv;
    rec.q -= p.n; addToStock(p.id, v, rec.c, p.n, rec.p ?? null, 'spares'); }
  syncOwned(col); col.updated = Date.now(); S.vendor.vtab = 'stock'; vSave();
  undoable(`Moved ${n} spare${n === 1 ? '' : 's'} into stock`, snap);
}

/* ---------- lot editor ---------- */
function openLot(lotId, newCardId) {
  const l = lotId ? S.stock[lotId] : null, id = l ? l.cardId : newCardId, c = S.cards[id]; if (!c) return;
  UI.lot = { lotId, cardId:id };
  $('#lot-title').textContent = c.name;
  $('#lot-sub').innerHTML = `${cardSub(id)}${c.rarity ? ' · ' + esc(c.rarity) : ''}`;
  $('#lot-img').innerHTML = thumb(id);
  $('#lot-v').innerHTML = variantsOf(c).map(v => `<option value="${v}"${v === (l?.v || primaryVariant(c)) ? ' selected' : ''}>${VARIANTS[v]}</option>`).join('');
  $('#lot-c').value = l?.c || 'NM'; $('#lot-q').value = l?.q || 1;
  $('#lot-l').innerHTML = Object.entries(LANGS).map(([k, n]) => `<option value="${k}"${k === (l ? langOf(l) : (S.vendor.defLang || 'en')) ? ' selected' : ''}>${n}</option>`).join('');
  $('#lot-cost').value = l?.cost != null ? l.cost.toFixed(2) : ''; $('#lot-price').value = l?.price != null ? l.price.toFixed(2) : '';
  $('#lot-del').classList.toggle('hidden', !l); $('#lot-save').textContent = l ? 'Save' : 'Add to stock';
  lotMarketNote(); $('#dlg-lot').showModal();
  freshen([id]).then(ok => { if (ok) lotMarketNote(); });
}
function lotMarketNote() {
  const id = UI.lot?.cardId, v = $('#lot-v').value, lang = $('#lot-l').value || 'en', m = mktFor(id, v, lang), rp = rulePrice({ id, v, lang });
  $('#lot-market').innerHTML = `Market ${m != null ? GBP.format(m) : '—'}${lang !== 'en' && langFactor(lang) !== 1 ? ` (${Math.round(langFactor(lang) * 100)}% for ${LANGS[lang]})` : ''} ${priceAge(id)} · selling rule gives ${rp != null ? GBP.format(rp) : '—'}`;
  $('#lot-price').placeholder = rp != null ? rp.toFixed(2) : '£';
}
$('#lot-v').addEventListener('change', lotMarketNote);
$('#lot-l').addEventListener('change', lotMarketNote);
$('#lot-save').addEventListener('click', () => {
  const { lotId, cardId } = UI.lot, v = $('#lot-v').value, c = CONDITIONS.includes($('#lot-c').value) ? $('#lot-c').value : '', lang = LANGS[$('#lot-l').value] ? $('#lot-l').value : 'en';
  const q = Math.max(0, Math.min(9999, Math.floor(vNum($('#lot-q').value) ?? 1))), cost = vNum($('#lot-cost').value), price = vNum($('#lot-price').value);
  const costV = cost != null && cost >= 0 && cost < 1e5 ? round2(cost) : null, priceV = price > 0 && price < 1e5 ? round2(price) : null;
  if (lotId) {
    const l = S.stock[lotId]; if (!l) return;
    if (!q) delete S.stock[lotId];
    else { const other = findLot(cardId, v, c, lang);
      if (other && other.id !== l.id) { delete S.stock[l.id]; addToStock(cardId, v, c, q, costV, l.src, lang); if (priceV) other.price = priceV; }   // edited into an existing lot: merge
      else Object.assign(l, { v, c, lang, q, cost:costV, price:priceV }); }
  } else if (q) { const l = addToStock(cardId, v, c, q, costV, 'manual', lang); if (priceV) l.price = priceV; }
  $('#dlg-lot').close(); vSave(); toast(lotId ? 'Stock updated' : `Added ${q} to stock`, 'success');
});
$('#lot-del').addEventListener('click', async () => {
  const { lotId } = UI.lot; if (!lotId) return;
  if (!await confirmDlg('Remove from stock?', 'Removes these copies from your stock without recording a sale.', 'Remove')) return;
  const snap = snapshot(); delete S.stock[lotId]; $('#dlg-lot').close(); vSave(); undoable('Removed from stock', snap);
});
$('#lot-sell').addEventListener('click', () => { const { lotId } = UI.lot; $('#dlg-lot').close(); if (lotId) vendorAction({ dataset:{ vact:'basket-add', lot:lotId } }); });

/* ---------- inputs ---------- */
document.addEventListener('change', e => {
  const el = e.target; if (!el.dataset?.vin || UI.view !== 'vendor') return;
  const V = S.vendor, i = +el.dataset.i, k = el.dataset.vin;
  if (k === 'sort' && ['name', 'value', 'new'].includes(el.value)) V.sort = el.value;
  else if (k === 'range' && ['today', '7d', 'month', 'all'].includes(el.value)) V.range = el.value;
  else if (k === 'bunit') { const n = vNum(el.value); if (V.basket[i]) V.basket[i].unit = n > 0 && n < 1e5 ? round2(n) : null; V.total = null; }
  else if (k === 'total') { const n = vNum(el.value); V.total = n >= 0 && n < 1e6 && el.value.trim() !== '' ? round2(n) : null; }
  else if (k === 'buyPct') { const n = vNum(el.value); V.buyPct = n > 0 && n <= 200 ? n : 60; }
  else if (k === 'buyRound') V.buyRound = [0, 0.05, 0.1, 0.5, 1].includes(+el.value) ? +el.value : 0.1;
  else if (k === 'bu') { const n = vNum(el.value); if (V.buy[i]) V.buy[i].unit = n >= 0 && n < 1e5 && el.value.trim() !== '' ? round2(n) : null; }
  else if (k === 'buyv') { if (V.buy[i] && VARIANTS[el.value]) V.buy[i].v = el.value; }
  else if (k === 'buyc') { if (V.buy[i] && CONDITIONS.includes(el.value)) V.buy[i].c = el.value; }
  else if (k === 'buyl') { if (V.buy[i] && LANGS[el.value]) V.buy[i].lang = el.value; }
  else if (k === 'getl') { if (V.get[i] && LANGS[el.value]) V.get[i].lang = el.value; }
  else if (k === 'deflang') { if (LANGS[el.value]) V.defLang = el.value; }
  else if (k === 'ladj') { const n = vNum(el.value), lg = el.dataset.lang; if (LANGS[lg] && lg !== 'en') { (V.langAdj ||= {}); if (n > 0 && n <= 500) V.langAdj[lg] = n; else delete V.langAdj[lg]; } }
  else return;
  vSave();
});
let vfT;
document.addEventListener('input', e => {
  const ctx = e.target.dataset?.vfilter; if (!ctx) return;
  clearTimeout(vfT); vfT = setTimeout(() => {   // update just the list so the search box keeps focus
    (UI.vfilter ||= {})[ctx] = e.target.value.trim();
    const box = $('#v-list-' + ctx); if (!box) return;
    let lots = filteredLots(ctx);
    if (ctx === 'sell') lots = lots.filter(l => (S.vendor.basket.find(b => b.lotId === l.id)?.q || 0) < l.q);
    box.innerHTML = ctx === 'give' && !UI.vfilter.give ? '' : lotRows(ctx, lots);
  }, 120);
});
document.addEventListener('submit', async e => {
  const ctx = e.target.dataset?.find; if (!ctx) return;
  e.preventDefault();
  const term = e.target.q.value.trim(); if (!term) return;
  const btn = e.target.querySelector('button'); btn.disabled = true;
  try {
    let res;
    if (/^([A-Za-z]{2,5}|PR-[A-Za-z]{2,4})[\s-]*[A-Za-z]{0,4}\d{1,4}/.test(term)) res = (await codeSearch(term)).results;
    else res = await apiFetchAll(buildQuery('name', term), null, null, 40);
    UI.vfind[ctx] = res.slice(0, 40);
    if (!res.length) toast('No cards found', 'warn');
  } catch {
    const t = term.toLowerCase(); UI.vfind[ctx] = Object.values(S.cards).filter(c => c.name.toLowerCase().includes(t)).slice(0, 40);
    toast(`Offline — showing ${UI.vfind[ctx].length} card(s) saved on this device`, 'warn');
  } finally { btn.disabled = false; }
  renderVendor();
  document.querySelector(`form[data-find="${ctx}"] input`)?.focus();
});
window.addEventListener('online', () => { if (UI.view === 'vendor') renderVendor(); });
window.addEventListener('offline', () => { if (UI.view === 'vendor') renderVendor(); });

/* ---------- sharing & exports ---------- */
function shareStock() {
  const lots = Object.values(S.stock); if (!lots.length) { toast('Your stock is empty', 'warn'); return; }
  const name = L().stall || 'For sale';
  shareRows(lots.map(l => ({ col:{ name }, c:{ ...S.cards[l.cardId], cardId:l.cardId, variant:l.v === 'normal' ? '' : l.v, lang:langOf(l) }, sp:l.q, own:true, price:lotAsk(l) })), 'sale');
}
function stockCsv() {
  const head = ['card_id','name','printing','condition','language','set_name','set_id','number','rarity','quantity','cost_each_gbp','asking_each_gbp','market_each_gbp','price_date','added','source'];
  const rows = Object.values(S.stock).map(l => { const c = S.cards[l.cardId] || {}, pi = priceOf(c, l.v);
    return [l.cardId, c.name, VARIANTS[l.v], l.c, LANGS[langOf(l)], c.set_name, c.set_id, c.number, c.rarity, l.q, l.cost ?? '', lotAsk(l) ?? '', pi?.gbp != null ? pi.gbp.toFixed(2) : '', pi?.date || '', l.added, l.src].map(csvCell).join(','); });
  return '﻿' + [head.join(','), ...rows].join('\r\n');
}
function ledgerCsv(list) {
  const head = ['date','time','type','payment','status','card_id','name','printing','condition','language','set_name','number','direction','quantity','unit_gbp','cost_each_gbp','line_total_gbp','line_profit_gbp','transaction_total_gbp','transaction_id'];
  const rows = [];
  for (const t of list) { const d = new Date(t.at);
    for (const l of t.lines) { const c = S.cards[l.cardId] || {};
      rows.push([t.at.slice(0, 10), d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }), t.t, t.t === 'trade' ? '' : METHODS[t.method] || t.method, t.void ? 'void' : 'ok', l.cardId, c.name, VARIANTS[l.v] || '', l.c || '', LANGS[langOf(l)], c.set_name, c.number,
        l.dir || (t.t === 'sale' ? 'out' : 'in'), l.q, l.unit?.toFixed(2), l.cost != null ? l.cost.toFixed(2) : '', (l.unit * l.q).toFixed(2), t.t === 'sale' && l.cost != null ? ((l.unit - l.cost) * l.q).toFixed(2) : '', t.total.toFixed(2), t.id].map(csvCell).join(',')); } }
  return '﻿' + [head.join(','), ...rows].join('\r\n');
}

/* ---------- backups: validate and merge ---------- */
function sanitizeVendor(st, cards) {
  const stock = {}, ledger = [], num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v < hi ? round2(v) : null;
  for (const [k, l] of Object.entries(st?.stock || {})) {
    if (!/^l_[a-z0-9]{1,30}$/.test(k) || !l || l.id !== k || !cards[l.cardId]) continue;
    const q = Math.floor(numOr(l.q, 0)); if (q < 1 || q > 9999) continue;
    stock[k] = { id:k, cardId:l.cardId, v:VARIANTS[l.v] && l.v !== 'any' ? l.v : 'normal', c:CONDITIONS.includes(l.c) ? l.c : '', lang:LANGS[l.lang] ? l.lang : 'en', q, cost:num(l.cost, 0, 1e5), price:num(l.price, 0.01, 1e5),
      added:/^\d{4}-\d{2}-\d{2}$/.test(l.added) ? l.added : today(), src:['spares', 'buy', 'manual', 'trade', 'void'].includes(l.src) ? l.src : 'manual' };
  }
  for (const t of (Array.isArray(st?.ledger) ? st.ledger : []).slice(-20000)) {
    if (!t || !/^t_[a-z0-9]{1,30}$/.test(t.id) || !['sale', 'buy', 'trade'].includes(t.t) || isNaN(Date.parse(t.at))) continue;
    const lines = (Array.isArray(t.lines) ? t.lines : []).filter(l => l && cards[l.cardId]).slice(0, 500).map(l => ({ cardId:l.cardId, v:VARIANTS[l.v] ? l.v : 'normal', c:CONDITIONS.includes(l.c) ? l.c : '', lang:LANGS[l.lang] ? l.lang : 'en',
      q:Math.max(1, Math.min(9999, Math.floor(numOr(l.q, 1)))), unit:num(l.unit, 0, 1e5) ?? 0, cost:num(l.cost, 0, 1e5), ...(l.dir === 'in' || l.dir === 'out' ? { dir:l.dir } : {}) }));
    if (!lines.length) continue;
    ledger.push({ id:t.id, t:t.t, at:new Date(t.at).toISOString(), method:METHODS[t.method] ? t.method : 'other', lines, total:num(t.total, 0, 1e7) ?? 0, note:str(t.note, 200), void:!!t.void });
  }
  return { stock, ledger };
}
function mergeVendor(inc) {
  for (const l of Object.values(inc.stock || {})) if (!S.stock[l.id]) S.stock[l.id] = l;
  const have = new Set(S.ledger.map(t => t.id));
  for (const t of inc.ledger || []) if (!have.has(t.id)) S.ledger.push(t);
  S.ledger.sort((a, b) => a.at.localeCompare(b.at));
}
