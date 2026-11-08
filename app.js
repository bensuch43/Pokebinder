'use strict';
/* ==========================================================================
   CONFIG — change here, nothing else is environment-specific
   ========================================================================== */
const CONFIG = {
  version: '2.9.0',
  apiBase: 'https://api.pokemontcg.io/v2',
  pageSize: 250,           // API max
  maxRetries: 4,           // for 429 / 5xx, exponential back-off
  setsCacheDays: 7,        // how long the set list (for autocomplete) is cached
  defaultLayout: '3x3',
  storageKey: 'state',     // IndexedDB key
  undoMs: 7000,
  /* Sets where the Pokémon TCG API has missing artist credits (whole sets from sv7 onwards are blank).
     Checked against PokemonTCG/pokemon-tcg-data, Sep 2026. Artist searches also pull uncredited cards
     from these sets so you can pick them by eye. Editable in Settings. */
  uncreditedSets: ['sv7','sv8','sv8pt5','sv9','sv10','me1','me3','me5','svp','swsh12pt5','sv2'],
  uncreditedCacheDays: 7,
  /* TCGdex (https://tcgdex.dev) — second community card database, used only to fill missing artist credits. */
  tcgdexBase: 'https://api.tcgdex.net/v2/en',
  tcgdexCacheDays: 7,
  /* Prices: the Pokémon TCG API returns Cardmarket (EUR, European market — closest to UK) and
     TCGplayer (USD, US market). Neither is in GBP, so we convert using the ECB reference rate. */
  priceSource: 'cardmarket',       // default; changeable in Settings
  priceStaleDays: 3,               // flag prices whose source date is older than this (TCGdex refreshes hourly, so 3 days old means something's wrong)
  priceBatch: 60,                  // card IDs per API call when refreshing prices
  fxUrl: 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP,USD',   // ECB rates, no key
  fxCacheHours: 12,
  /* Price-sticker sheets. Sizes/margins from Avery UK's published A4 templates — always do one test print
     on plain paper and hold it against a sheet; use the nudge boxes if your printer shifts things. */
  labelSheets: {
    L7160:{ name:'Avery L7160 / J8160 — 21 per sheet (63.5 × 38.1 mm)', cols:3, rows:7, w:63.5, h:38.1, top:15.15, left:7.25, px:66.04, py:38.1 },
    L7159:{ name:'Avery L7159 / J8159 — 24 per sheet (63.5 × 33.9 mm)', cols:3, rows:8, w:63.5, h:33.9, top:12.9, left:7.25, px:66.04, py:33.9 },
    L7163:{ name:'Avery L7163 / J8163 — 14 per sheet (99.1 × 38.1 mm)', cols:2, rows:7, w:99.1, h:38.1, top:15.15, left:4.65, px:101.6, py:38.1 },
    L7651:{ name:'Avery L7651 / J8651 — 65 per sheet (38.1 × 21.2 mm)', cols:5, rows:13, w:38.1, h:21.2, top:10.7, left:4.75, px:40.64, py:21.2 }
  },
  thermalSizes: { '50x30':'50 × 30 mm', '40x30':'40 × 30 mm', '40x20':'40 × 20 mm', '30x15':'30 × 15 mm', '60x40':'60 × 40 mm', 'custom':'Custom size' },
  thermalDpi: 203
};
/* TCGdex set ID → Pokémon TCG API set ID. Generated 2026-11-06 by matching set names (and release dates)
   across both open datasets; checked against all 212 physical Yuka Morii cards (100% matched).
   Sets not listed fall back to: learned mappings → the pattern rule (sv07→sv7, sv08.5→sv8pt5) → set-name lookup. */
const TCGDEX_SET_MAP = {"2011bw":"mcd11","2012bw":"mcd12","2014xy":"mcd14","2015xy":"mcd15","2016xy":"mcd16","2017sm":"mcd17","2018sm":"mcd18","2019sm":"mcd19","2021swsh":"mcd21","2022swsh":"mcd22","30th":"me55","base1":"base1","base2":"base2","base3":"base3","base4":"base4","base5":"base5","basep":"basep","bog":"bp","bw1":"bw1","bw10":"bw10","bw11":"bw11","bw2":"bw2","bw3":"bw3","bw4":"bw4","bw5":"bw5","bw6":"bw6","bw7":"bw7","bw8":"bw8","bw9":"bw9","bwp":"bwp","cel25":"cel25","cel25cc":"cel25c","col1":"col1","dc1":"dc1","det1":"det1","dp1":"dp1","dp2":"dp2","dp3":"dp3","dp4":"dp4","dp5":"dp5","dp6":"dp6","dp7":"dp7","dpp":"dpp","dv1":"dv1","ecard1":"ecard1","ecard2":"ecard2","ecard3":"ecard3","ex1":"ex1","ex10":"ex10","ex11":"ex11","ex12":"ex12","ex13":"ex13","ex14":"ex14","ex15":"ex15","ex16":"ex16","ex2":"ex2","ex3":"ex3","ex4":"ex4","ex5":"ex5","ex6":"ex6","ex7":"ex7","ex8":"ex8","ex9":"ex9","g1":"g1","gym1":"gym1","gym2":"gym2","hgss1":"hgss1","hgss2":"hgss2","hgss3":"hgss3","hgss4":"hgss4","hgssp":"hsp","lc":"base6","me01":"me1","me02":"me2","me02.5":"me2pt5","me03":"me3","me04":"me4","me05":"me5","neo1":"neo1","neo2":"neo2","neo3":"neo3","neo4":"neo4","np":"np","pl1":"pl1","pl2":"pl2","pl3":"pl3","pl4":"pl4","pop1":"pop1","pop2":"pop2","pop3":"pop3","pop4":"pop4","pop5":"pop5","pop6":"pop6","pop7":"pop7","pop8":"pop8","pop9":"pop9","ru1":"ru1","si1":"si1","sm1":"sm1","sm10":"sm10","sm11":"sm11","sm115":"sm115","sm12":"sm12","sm2":"sm2","sm3":"sm3","sm3.5":"sm35","sm4":"sm4","sm5":"sm5","sm6":"sm6","sm7":"sm7","sm7.5":"sm75","sm8":"sm8","sm9":"sm9","sma":"sma","smp":"smp","sv01":"sv1","sv02":"sv2","sv03":"sv3","sv03.5":"sv3pt5","sv04":"sv4","sv04.5":"sv4pt5","sv05":"sv5","sv06":"sv6","sv06.5":"sv6pt5","sv07":"sv7","sv08":"sv8","sv08.5":"sv8pt5","sv09":"sv9","sv10":"sv10","sv10.5b":"zsv10pt5","sv10.5w":"rsv10pt5","sve":"sve","svp":"svp","swsh1":"swsh1","swsh10":"swsh10","swsh10.5":"pgo","swsh10tg":"swsh10tg","swsh11":"swsh11","swsh11tg":"swsh11tg","swsh12":"swsh12","swsh12.5":"swsh12pt5","swsh12.5gg":"swsh12pt5gg","swsh12tg":"swsh12tg","swsh2":"swsh2","swsh3":"swsh3","swsh3.5":"swsh35","swsh4":"swsh4","swsh4.5":"swsh45","swsh4.5sv":"swsh45sv","swsh5":"swsh5","swsh6":"swsh6","swsh7":"swsh7","swsh8":"swsh8","swsh9":"swsh9","swsh9tg":"swsh9tg","swshp":"swshp","tk-ex-latia":"tk1a","tk-ex-latio":"tk1b","tk-ex-m":"tk2b","tk-ex-p":"tk2a","xy0":"xy0","xy1":"xy1","xy10":"xy10","xy11":"xy11","xy12":"xy12","xy2":"xy2","xy3":"xy3","xy4":"xy4","xy5":"xy5","xy6":"xy6","xy7":"xy7","xy8":"xy8","xy9":"xy9","xyp":"xyp"};
/* Printed set code (bottom of the card, e.g. "PBL") → Pokémon TCG API set ID(s). Built 2026-11-06 from the
   API's ptcgoCode values plus TCGdex's official abbreviations. Live ptcgoCodes from the API are merged in at runtime. */
const CODE_MAP = {"30C":["me55","me55c"],"AOR":["xy7"],"AQ":["ecard2"],"AR":["pl4"],"ASC":["me2pt5"],"ASR":["swsh10","swsh10tg"],"ASR:TG":["swsh10tg"],"B2":["base4"],"BCR":["bw7"],"BKP":["xy9"],"BKT":["xy8"],"BLK":["zsv10pt5"],"BLW":["bw1"],"BP":["bp"],"BRS":["swsh9","swsh9tg"],"BRS:TG":["swsh9tg"],"BS":["base1"],"BST":["swsh5"],"BUS":["sm3"],"BWP":["bwp"],"CEC":["sm12"],"CEL":["cel25","cel25c"],"CEL:CC":["cel25c"],"CES":["sm7"],"CG":["ex14"],"CIN":["sm4"],"CL":["col1"],"COL":["col1"],"CPA":["swsh35"],"CRE":["swsh6"],"CRI":["me4"],"CRZ":["swsh12pt5","swsh12pt5gg"],"CRZ:GG":["swsh12pt5gg"],"DAA":["swsh3"],"DCR":["dc1"],"DET":["det1"],"DEX":["bw5"],"DF":["ex15"],"DP":["dp1"],"DR":["ex3"],"DRI":["sv10"],"DRM":["sm75"],"DRV":["dv1"],"DRX":["bw6"],"DS":["ex11"],"DX":["ex8"],"EM":["ex9"],"EP":["bw2"],"EPO":["bw2"],"EVO":["xy12"],"EVS":["swsh7"],"EX":["ecard1"],"FCO":["xy10"],"FFI":["xy3"],"FLF":["xy2"],"FLI":["sm6"],"FO":["base3"],"FST":["swsh8"],"FUT20":["fut20"],"G1":["gym1"],"G2":["gym2"],"GE":["dp4"],"GEN":["g1"],"GRI":["sm2"],"HIF":["sm115","sma"],"HL":["ex5"],"HP":["ex13"],"HS":["hgss1"],"JTG":["sv9"],"JU":["base2"],"KSS":["xy0"],"LA":["dp6"],"LC":["base6"],"LM":["ex12"],"LOR":["swsh11","swsh11tg"],"LOR:TG":["swsh11tg"],"LOT":["sm8"],"LTR":["bw11"],"MA":["ex4"],"MCD11":["mcd11"],"MCD12":["mcd12"],"MCD14":["mcd14"],"MCD15":["mcd15"],"MCD16":["mcd16"],"MCD17":["mcd17"],"MCD18":["mcd18"],"MCD19":["mcd19"],"MCD21":["mcd21"],"MCD22":["mcd22"],"MD":["dp5"],"MEG":["me1"],"MEW":["sv3pt5"],"MT":["dp2"],"N1":["neo1"],"N2":["neo2"],"N3":["neo3"],"N4":["neo4"],"NVI":["bw3"],"NXD":["bw4"],"OBF":["sv3"],"P1":["pop1"],"P2":["pop2"],"P3":["pop3"],"P4":["pop4"],"P5":["pop5"],"P6":["pop6"],"P7":["pop7"],"P8":["pop8"],"P9":["pop9"],"PAF":["sv4pt5"],"PAL":["sv2"],"PAR":["sv4"],"PBL":["me5"],"PFL":["me2"],"PGO":["pgo"],"PHF":["xy4"],"PK":["ex16"],"PL":["pl1"],"PLB":["bw10"],"PLF":["bw9"],"PLS":["bw8"],"POR":["me3"],"PR":["basep"],"PR-BLW":["bwp"],"PR-DPP":["dpp"],"PR-HS":["hsp"],"PR-NP":["np"],"PR-SM":["smp"],"PR-SV":["svp"],"PR-SW":["swshp"],"PR-XY":["xyp"],"PRC":["xy5"],"PRE":["sv8pt5"],"RCL":["swsh2"],"RG":["ex6"],"RM":["ru1"],"RO":["base5"],"ROS":["xy6"],"RR":["pl2"],"RS":["ex1"],"SCR":["sv7"],"SF":["dp7"],"SFA":["sv6pt5"],"SHF":["swsh45","swsh45sv"],"SHF:SV":["swsh45sv"],"SI":["si1"],"SIT":["swsh12","swsh12tg"],"SIT:TG":["swsh12tg"],"SK":["ecard3"],"SLG":["sm35"],"SMP":["smp"],"SS":["ex2"],"SSH":["swsh1"],"SSP":["sv8"],"STS":["xy11"],"SUM":["sm1"],"SV":["pl3"],"SVE":["sve"],"SVI":["sv1"],"SVP":["svp"],"SW":["dp3"],"TEF":["sv5"],"TEU":["sm9"],"TK1A":["tk1a"],"TK1O":["tk1b"],"TK2M":["tk2b"],"TK2P":["tk2a"],"TM":["hgss4"],"TR":["base5","ex7"],"TRI":["hgss4"],"TRR":["ex7"],"TWM":["sv6"],"UD":["hgss3"],"UF":["ex10"],"UL":["hgss2"],"UNB":["sm10"],"UND":["hgss3"],"UNM":["sm11"],"UPR":["sm5"],"VIV":["swsh4"],"WHT":["rsv10pt5"],"XY":["xy1"]};
const LAYOUTS = { '2x2':[2,2], '3x3':[3,3], '4x3':[4,3], '3x4':[3,4], '4x4':[4,4] };
const SORT_LABEL = { release:'release date', dex:'Pokédex no.', set:'set name', name:'card name' };

/* ---------- helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const slug = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'x';
const cmpNum = (a, b) => String(a).localeCompare(String(b), undefined, { numeric:true, sensitivity:'base' });
const sleep = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted','AbortError')); }); });
const today = () => new Date().toISOString().slice(0,10);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const ic = (name, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
/* Only ever put https:// URLs into href/src — data from APIs, backups or share links is untrusted. */
const safeUrl = u => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const VARIANTS = { normal:'Normal', holo:'Holo', reverse:'Reverse holo', first:'1st edition', any:'Unspecified' };
const VSHORT = { normal:'', holo:'Holo', reverse:'Rev', first:'1st', any:'' };
const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/* ---------- storage: IndexedDB with localStorage fallback ---------- */
const Store = {
  db: null,
  open() {
    return new Promise(res => {
      if (!('indexedDB' in window)) return res(null);
      try {
        const r = indexedDB.open('pokebinder', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(this.db = r.result);
        r.onerror = r.onblocked = () => res(null);
      } catch { res(null); }
    });
  },
  get(k) {
    if (!this.db) { try { return Promise.resolve(JSON.parse(localStorage.getItem('pb2_' + k))); } catch { return Promise.resolve(null); } }
    return new Promise(res => {
      const q = this.db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null);
    });
  },
  set(k, v) {
    if (!this.db) { localStorage.setItem('pb2_' + k, JSON.stringify(v)); return Promise.resolve(); }
    return new Promise((res, rej) => {
      const tx = this.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  }
};

/* ---------- state ---------- */
let S;   // persisted state
const UI = { view:'binder', filters:{ text:'', set:'all', status:'all', rarity:'all' }, search:{ results:[], extra:[], extraFilter:'', artist:'', badges:new Map(), noSel:new Set(), sel:new Set(), abort:null, hideHave:false }, infoId:null, layout:null };

const blankState = () => ({ version:2, cards:{}, collections:{}, order:[], activeId:null,
  settings:{ apiKey:'', view:'binder' }, setsCache:null });
/* A collection's source of truth for ownership is `copies` (cardId → variant → {q,c,p,d}:
   quantity, condition, price paid per copy in GBP, date paid). `owned` is a derived cache keyed by
   binder entry (card id, or "cardId|variant" in master-set mode) — see syncOwned(). */
const newCollection = (name, opts={}) => ({ id:'c_' + uid(), name, cardIds:[], owned:{}, copies:{}, history:[],
  layout: opts.layout || CONFIG.defaultLayout, sort: opts.sort || 'release', variantSlots: !!opts.variantSlots,
  setBreaks: !!opts.setBreaks, startRight: opts.startRight ?? true, created: Date.now(), updated: Date.now() });
const active = () => S.collections[S.activeId] || null;

let saveTimer;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
async function flush() {
  clearTimeout(saveTimer);
  try { await Store.set(CONFIG.storageKey, S); }
  catch (e) { toast('Could not save — storage may be full. Export a backup. (' + (e?.message || e) + ')', 'error'); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

/* ---------- card normalisation ---------- */
function normApi(c) {
  return { id:c.id, name:c.name || '?', number:String(c.number ?? ''), set_id:c.set?.id || 'unknown', set_name:c.set?.name || 'Unknown set',
    series:c.set?.series || '', release_date:(c.set?.releaseDate || '').replace(/\//g,'-'), artist:c.artist || '', rarity:c.rarity || '',
    dex:c.nationalPokedexNumbers?.[0] ?? null, supertype:c.supertype || '', img_s:safeUrl(c.images?.small), img_l:safeUrl(c.images?.large), custom:false,
    ...(variantsFromApi(c).length ? { variants:variantsFromApi(c) } : {}),
    ...(normPrice(c) ? { price:normPrice(c) } : {}) };   // omit when absent so a merge never wipes older prices
}
/* Which printings exist, inferred from the price feeds (TCGplayer lists one price per printing). */
const TCP_VARIANT = { normal:'normal', holofoil:'holo', unlimitedHolofoil:'holo', reverseHolofoil:'reverse', '1stEditionHolofoil':'first', '1stEditionNormal':'first', unlimitedNormal:'normal' };
function variantsFromApi(c) {
  const v = new Set(Object.keys(c.tcgplayer?.prices || {}).map(k => TCP_VARIANT[k]).filter(Boolean));
  if (c.cardmarket?.prices?.reverseHoloTrend > 0 || c.cardmarket?.prices?.reverseHoloSell > 0) v.add('reverse');
  return ['normal','holo','reverse','first'].filter(x => v.has(x));
}
/* Keep the native-currency figures + the source's own date; convert to GBP at display time. */
function normPrice(c) {
  const out = {}, cm = c.cardmarket, tp = c.tcgplayer, d = s => (s || '').replace(/\//g, '-').slice(0, 10);
  if (cm?.prices) {
    const P = cm.prices;
    const hit = [['trend', P.trendPrice], ['30-day avg', P.avg30], ['avg sell', P.averageSellPrice], ['low', P.lowPrice]].find(([, v]) => v > 0);
    const n = v => v > 0 ? +v : null;
    if (hit) out.cm = { value:hit[1], metric:hit[0], low:n(P.lowPrice), avg30:n(P.avg30), avg7:n(P.avg7), avg1:n(P.avg1), trend:n(P.trendPrice),
      exLow:n(P.lowPriceExPlus),   // lowest listing in Excellent or better — the preferred figure
      updated:d(cm.updatedAt), url:safeUrl(cm.url),
      rev:[P.reverseHoloTrend, P.reverseHoloAvg30, P.reverseHoloSell].find(v => v > 0) ?? null, revLow:n(P.reverseHoloLow), revAvg30:n(P.reverseHoloAvg30), revAvg7:n(P.reverseHoloAvg7) };
  }
  if (tp?.prices) {
    const pref = ['normal','holofoil','1stEditionHolofoil','1stEditionNormal','unlimitedHolofoil','reverseHolofoil'];
    const keys = [...pref.filter(k => tp.prices[k]), ...Object.keys(tp.prices).filter(k => !pref.includes(k))];
    for (const k of keys) { const v = tp.prices[k], val = v?.market ?? v?.mid;
      if (val > 0) { out.tcp = { value:val, metric:`${v.market != null ? 'market' : 'mid'}, ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`, low:v.low ?? null, updated:d(tp.updatedAt), url:safeUrl(tp.url) }; break; } }
    if (out.tcp) { out.tcp.vars = {};
      for (const [k, v] of Object.entries(tp.prices)) { const vn = TCP_VARIANT[k], val = v?.market ?? v?.mid; if (vn && val > 0 && out.tcp.vars[vn] == null) out.tcp.vars[vn] = val; } }
  }
  if (!out.cm && !out.tcp) return null;
  out.fetched = new Date().toISOString();
  return out;
}
function normV1(c) {   // cards from PokéBinder v1 localStorage
  const img = c.image_url || '';
  return { id:c.card_id, name:c.name || '?', number:String(c.number ?? ''), set_id:c.set_code || 'unknown', set_name:c.set_name || 'Unknown set',
    series:'', release_date:(c.release_date || '').replace(/\//g,'-'), artist:c.artist || '', rarity:'', dex:null, supertype:'',
    img_s:img, img_l:img.replace(/\.png$/, '_hires.png'), custom:c.set_code === 'custom' || String(c.card_id).startsWith('custom-') };
}
function migrateV1() {
  let db, cols, owned;
  try {
    db = JSON.parse(localStorage.getItem('poke_master_db') || 'null');
    cols = JSON.parse(localStorage.getItem('poke_user_collections') || 'null');
    owned = JSON.parse(localStorage.getItem('poke_collected_ids') || '{}') || {};
  } catch { return null; }
  if (!cols || !Object.keys(cols).length) return null;
  const st = blankState();
  (db || []).forEach(c => { if (c?.card_id) st.cards[c.card_id] = normV1(c); });
  for (const [name, arr] of Object.entries(cols)) {
    const col = newCollection(name);
    for (const c of (arr || [])) {
      if (!c?.card_id) continue;
      st.cards[c.card_id] ??= normV1(c);
      if (!col.cardIds.includes(c.card_id)) col.cardIds.push(c.card_id);
      if (owned[c.card_id]) col.copies[c.card_id] = { any:{ q:1 } };
    }
    st.collections[col.id] = col; st.order.push(col.id);
  }
  st.activeId = st.order[0] || null;
  return st;
}

/* ---------- sorting, filtering, binder layout ---------- */
const SORTS = {
  release: (a,b) => (a.release_date||'9999').localeCompare(b.release_date||'9999') || a.set_id.localeCompare(b.set_id) || cmpNum(a.number,b.number) || a.name.localeCompare(b.name),
  dex:     (a,b) => (a.dex ?? 1e6) - (b.dex ?? 1e6) || SORTS.release(a,b),
  set:     (a,b) => a.set_name.localeCompare(b.set_name) || cmpNum(a.number,b.number),
  name:    (a,b) => a.name.localeCompare(b.name) || SORTS.release(a,b)
};
const cardsOf = col => col.cardIds.map(id => S.cards[id]).filter(Boolean);
const cardIdOf = entryId => String(entryId).split('|')[0];
const variantOfEntry = entryId => String(entryId).split('|')[1] || null;
/* Printings for a card in this collection: what the price feeds say exists, plus anything you've logged. */
function variantsOf(c, col) {
  const set = new Set(c.variants?.length ? c.variants : ['normal']);
  Object.keys(col?.copies?.[c.id] || {}).forEach(v => { if (v !== 'any' && VARIANTS[v]) set.add(v); });
  return ['normal','holo','reverse','first'].filter(v => set.has(v));
}
const primaryVariant = (c, col) => variantsOf(c, col)[0];
const qtyOf = (col, cardId, v) => col.copies?.[cardId]?.[v]?.q || 0;
const totalQty = (col, cardId) => Object.values(col.copies?.[cardId] || {}).reduce((n, r) => n + (r?.q || 0), 0);
/* Copies held for a binder entry ('any' = migrated / unspecified copies count towards the primary printing). */
function entryQty(col, e) {
  if (!e.variant) return totalQty(col, e.cardId);
  return qtyOf(col, e.cardId, e.variant) + (e.variant === primaryVariant(S.cards[e.cardId] || e, col) ? qtyOf(col, e.cardId, 'any') : 0);
}
/* Spare copies beyond the one that fills the pocket(s). Returns [{v, n}]. */
function sparesOf(col, c) {
  const rec = col.copies?.[c.id]; if (!rec) return [];
  const out = [];
  if (col.variantSlots) {
    const prim = primaryVariant(c, col);
    for (const v of Object.keys(rec)) {
      const slotV = v === 'any' ? prim : v;
      const filledBy = v === 'any' ? (qtyOf(col, c.id, prim) > 0 ? 0 : 1) : 1;   // 'any' only fills if primary has none
      const n = (rec[v]?.q || 0) - (variantsOf(c, col).includes(slotV) ? filledBy : 0);
      if (n > 0) out.push({ v, n });
    }
  } else {
    let slotUsed = false;
    for (const v of [...variantsOf(c, col), 'any'].filter(v => rec[v]?.q > 0)) {
      let n = rec[v].q; if (!slotUsed) { n--; slotUsed = true; }
      if (n > 0) out.push({ v, n });
    }
  }
  return out;
}
const spareCount = (col, c) => sparesOf(col, c).reduce((n, s) => n + s.n, 0);
/* Spares attributable to one binder entry (whole card, or one printing in master-set mode). */
function entrySpares(col, e) {
  const c = S.cards[e.cardId || e.id] || e, sp = sparesOf(col, c);
  if (!e.variant) return sp.reduce((n, s) => n + s.n, 0);
  const prim = primaryVariant(c, col);
  return sp.filter(s => s.v === e.variant || (s.v === 'any' && e.variant === prim)).reduce((n, s) => n + s.n, 0);
}
/* Rebuild the derived `owned` cache from `copies`. */
function syncOwned(col) {
  col.copies ||= {}; const owned = {};
  for (const id of col.cardIds) {
    const c = S.cards[id]; if (!c) continue;
    if (col.variantSlots) { for (const v of variantsOf(c, col)) if (entryQty(col, { cardId:id, variant:v }) > 0) owned[`${id}|${v}`] = true; }
    else if (totalQty(col, id) > 0) owned[id] = true;
  }
  col.owned = owned;
}
const dispName = e => e.variant && e.variant !== 'normal' ? `${e.name} (${VARIANTS[e.variant]})` : e.name;

/* Binder positions are computed over the WHOLE collection (never the filtered view)
   so a card's page/slot is stable regardless of what you're filtering on. */
function computeLayout(col) {
  const [cols, rows] = LAYOUTS[col.layout] || LAYOUTS['3x3'];
  const per = cols * rows;
  const sorted = cardsOf(col).sort(SORTS[col.sort] || SORTS.release);
  // binder entries: one per card, or one per printing in master-set mode
  const cards = col.variantSlots
    ? sorted.flatMap(c => variantsOf(c, col).map(v => ({ ...c, id:`${c.id}|${v}`, cardId:c.id, variant:v })))
    : sorted.map(c => ({ ...c, cardId:c.id, variant:null }));
  const slots = []; let lastSet = null;
  for (const c of cards) {
    if (col.setBreaks && lastSet !== null && c.set_id !== lastSet) while (slots.length % per) slots.push(null);
    slots.push(c); lastSet = c.set_id;
  }
  const pages = [];
  for (let i = 0; i < slots.length; i += per) pages.push(slots.slice(i, i + per));
  if (pages.length) { const last = pages[pages.length - 1]; while (last.length < per) last.push(null); }
  const pos = new Map();
  pages.forEach((p, pi) => p.forEach((c, si) => { if (c) pos.set(c.id, { page:pi + 1, slot:si + 1 }); }));
  return { cols, rows, per, cards, pages, pos };
}
function spreadOf(page, startRight) {
  return startRight ? { spread:Math.floor(page / 2) + 1, side:page % 2 ? 'right' : 'left' }
                    : { spread:Math.ceil(page / 2),      side:page % 2 ? 'left' : 'right' };
}
const posLabel = (col, p) => { if (!p) return '—'; const s = spreadOf(p.page, col.startRight); return `Page ${p.page}, slot ${p.slot} (spread ${s.spread}, ${s.side})`; };

function filtersActive(f = UI.filters) { return !!(f.text || f.set !== 'all' || f.status !== 'all' || f.rarity !== 'all'); }
function matches(c, col, f = UI.filters) {
  if (f.set !== 'all' && c.set_id !== f.set) return false;
  if (f.rarity !== 'all' && (c.rarity || '—') !== f.rarity) return false;
  const own = !!col.owned[c.id];
  if (f.status === 'owned' && !own) return false;
  if (f.status === 'needed' && own) return false;
  if (f.status === 'spare' && !entrySpares(col, c)) return false;
  if (f.text) {
    const hay = `${c.name} ${c.number} ${c.set_name} ${c.set_id} ${c.artist} ${c.rarity} ${c.series}`.toLowerCase();
    if (!f.text.toLowerCase().split(/\s+/).filter(Boolean).every(t => hay.includes(t))) return false;
  }
  return true;
}
function ownedElsewhere(id, exceptId) {
  const cid0 = cardIdOf(id);
  return S.order.filter(cid => cid !== exceptId && totalQty(S.collections[cid], cid0) > 0).map(cid => S.collections[cid].name);
}

/* ==========================================================================
   RENDER
   ========================================================================== */
function render() {
  const col = active();
  renderHeader(col);
  const vendor = UI.view === 'vendor';
  $('#toolbar').classList.toggle('tabs-only', !col || vendor);   // keep the view tabs reachable; hide collection stats/filters
  if (col) { syncOwned(col); UI.layout = computeLayout(col); }
  if (vendor) { renderVendor(); return; }
  if (!col) { renderWelcome(); return; }
  syncOwned(col);
  UI.layout = computeLayout(col);
  renderFilterOptions(col);
  renderProgress();
  renderView();
}

function renderHeader(col) {
  const sel = $('#col-select');
  sel.innerHTML = S.order.map(id => { const c = S.collections[id]; return `<option value="${esc(id)}"${id === S.activeId ? ' selected' : ''}>${esc(c.name)} (${c.cardIds.length})</option>`; }).join('');
  $('#colpick').classList.toggle('hidden', !col);
  $$('[data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === UI.view));
  if (col) {
    const [c, r] = LAYOUTS[col.layout] || [3,3];
    $('#layout-note').textContent = `${c * r}-pocket · ${SORT_LABEL[col.sort] || col.sort} order${col.variantSlots ? ' · master set' : ''}${col.setBreaks ? ' · new page per set' : ''}`;
  }
}

function renderFilterOptions(col) {
  const cards = UI.layout.cards;
  const sets = new Map();
  [...cards].sort(SORTS.release).forEach(c => { if (!sets.has(c.set_id)) sets.set(c.set_id, c); });
  const f = UI.filters;
  if (f.set !== 'all' && !sets.has(f.set)) f.set = 'all';
  $('#f-set').innerHTML = `<option value="all">All sets (${sets.size})</option>` +
    [...sets.values()].map(c => `<option value="${esc(c.set_id)}"${c.set_id === f.set ? ' selected' : ''}>${esc(c.set_name)}${c.release_date ? ' · ' + esc(c.release_date.slice(0,4)) : ''}</option>`).join('');
  const rar = [...new Set(cards.map(c => c.rarity || '—'))].sort();
  if (f.rarity !== 'all' && !rar.includes(f.rarity)) f.rarity = 'all';
  $('#f-rarity').innerHTML = `<option value="all">All rarities</option>` + rar.map(r => `<option${r === f.rarity ? ' selected' : ''}>${esc(r)}</option>`).join('');
  $('#f-status').value = f.status;
  if ($('#f-text').value !== f.text) $('#f-text').value = f.text;
}

/* ---------- prices ---------- */
const GBP = new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' });
const NATIVE = { EUR:new Intl.NumberFormat('en-GB', { style:'currency', currency:'EUR' }), USD:new Intl.NumberFormat('en-GB', { style:'currency', currency:'USD' }) };
function fxRate(cur) {
  const m = parseFloat(S.settings.fx?.[cur]); if (m > 0) return m;
  if (!S.fx) return null;
  return cur === 'EUR' ? S.fx.eur : S.fx.usd;
}
function fxLabel(cur) {
  if (parseFloat(S.settings.fx?.[cur]) > 0) return `your rate £${S.settings.fx[cur]} per ${cur === 'EUR' ? '€' : '$'}1`;
  return S.fx ? `£${(cur === 'EUR' ? S.fx.eur : S.fx.usd).toFixed(4)} per ${cur === 'EUR' ? '€' : '$'}1, ECB ${S.fx.date}` : 'no exchange rate yet';
}
/* → { gbp, native, cur, src, metric, date, url, fetched, stale, fallback } or null */
/* ---------- price figures, data quality and trend ----------
   Primary source: TCGdex, which republishes Cardmarket's official price guide every hour.
   The Pokémon TCG API's own prices stopped updating (last data 1 July 2026), so they're only used
   when TCGdex has nothing for a card — and then they're flagged stale.
     good     = your chosen figure, price date within CONFIG.priceStaleDays
     fallback = chosen figure missing, so another fresh figure (trend → 30-day → 7-day average) is used
     stale    = only old data exists — shown, but flagged red */
const PRICE_FIG = { trend:'trend', avg30:'30-day average', avg7:'7-day average', low:'lowest listing (any condition)' };
const FIG_FALLBACK = ['trend', 'avg30', 'avg7'];
const figPref = () => PRICE_FIG[S.settings.priceFig] ? S.settings.priceFig : 'trend';
const isFresh = d => !!d && (Date.now() - Date.parse(d)) / 864e5 <= CONFIG.priceStaleDays;
function cmFigures(c, variant) {
  const pr = c?.price || {}, cm = pr.cm, td = pr.td, rev = variant === 'reverse', out = [];
  const add = (fig, value, src, date) => { if (value > 0) out.push({ fig, value:+value, src, date:date || '', fresh:isFresh(date) }); };
  if (td) {
    const S_ = 'Cardmarket (via TCGdex, hourly)';
    // Cardmarket's "-holo" columns are the reverse-holo/foil version of the product
    if (rev) { add('trend', td.trendH, S_, td.updated); add('avg30', td.avg30H, S_, td.updated); add('avg7', td.avg7H, S_, td.updated); add('low', td.lowH, S_, td.updated); }
    else { add('trend', td.trend, S_, td.updated); add('avg30', td.avg30, S_, td.updated); add('avg7', td.avg7, S_, td.updated); add('low', td.low, S_, td.updated); }
  } else if (cm) {   // legacy: Pokémon TCG API prices (frozen since July 2026)
    const S_ = 'Cardmarket (via Pokémon TCG API, no longer updated)';
    if (rev) { add('trend', cm.rev, S_, cm.updated); add('avg30', cm.revAvg30, S_, cm.updated); add('avg7', cm.revAvg7, S_, cm.updated); add('low', cm.revLow, S_, cm.updated); }
    else { add('trend', cm.trend ?? (cm.metric === 'trend' ? cm.value : null), S_, cm.updated); add('avg30', cm.avg30, S_, cm.updated); add('avg7', cm.avg7, S_, cm.updated); add('low', cm.low, S_, cm.updated); }
  }
  return out;
}
/* 7-day vs 30-day average from the freshest source: ▲ / ▼ when they differ by more than 5%. */
function cmTrend(c, variant) {
  const pr = c?.price || {}, rev = variant === 'reverse', cands = [];
  if (pr.td) cands.push({ a7:rev ? pr.td.avg7H : pr.td.avg7, a30:rev ? pr.td.avg30H : pr.td.avg30, d:pr.td.updated });
  else if (pr.cm) cands.push({ a7:rev ? pr.cm.revAvg7 : pr.cm.avg7, a30:rev ? pr.cm.revAvg30 : pr.cm.avg30, d:pr.cm.updated });
  const t = cands.filter(x => x.a7 > 0 && x.a30 > 0).sort((x, y) => (y.d || '').localeCompare(x.d || ''))[0];
  if (!t) return null;
  const pct = Math.round((t.a7 - t.a30) / t.a30 * 100);
  return { pct, dir:pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat', fresh:isFresh(t.d) };
}
function pickCardmarket(c, variant) {
  const figs = cmFigures(c, variant); if (!figs.length) return null;
  const want = figPref();
  const best = list => list.sort((x, y) => (y.date || '').localeCompare(x.date || '') || (y.src.includes('TCGdex') - x.src.includes('TCGdex')))[0];   // newest; TCGdex wins ties
  let hit = best(figs.filter(f => f.fig === want && f.fresh)), status = 'good';
  if (!hit) { for (const fb of FIG_FALLBACK) { hit = best(figs.filter(f => f.fig === fb && f.fresh)); if (hit) break; } status = 'fallback'; }
  if (!hit) { hit = best(figs.filter(f => f.fig === want)) || FIG_FALLBACK.map(f => best(figs.filter(x => x.fig === f))).find(Boolean) || best(figs); status = 'stale'; }
  return { hit, status, want };
}
/* Price for a card, or for one printing of it (entries carry .variant; or pass one explicitly). */
function priceOf(c, variant = c?.variant) {
  const pr = c?.price; if (!pr) return null;
  const pref = S.settings.priceSource || CONFIG.priceSource;
  if (pref !== 'tcgplayer' && (pr.cm || pr.td)) {
    const p = pickCardmarket(c, variant && variant !== 'any' ? variant : null);
    if (p) { const rate = fxRate('EUR'), h = p.hit;
      return { gbp:rate ? h.value * rate : null, native:h.value, cur:'EUR', src:h.src, metric:PRICE_FIG[h.fig], fig:h.fig, want:p.want, date:h.date, url:cardmarketUrl(c),
        fetched:pr.td?.fetched && pr.td.fetched > (pr.fetched || '') ? pr.td.fetched : pr.fetched, status:p.status, stale:p.status === 'stale', fallback:p.status === 'fallback', trend:cmTrend(c, variant) }; }
  }
  const order = pref === 'tcgplayer' ? ['tcp','cm'] : ['cm','tcp'];
  for (const k of order) {
    const q = pr[k]; if (!q || !(q.value > 0)) continue;
    let value = q.value, metric = q.metric;
    if (variant && variant !== 'any') {
      if (k === 'tcp' && q.vars?.[variant] > 0) { value = q.vars[variant]; metric = `market, ${VARIANTS[variant].toLowerCase()}`; }
      else if (k === 'cm' && variant === 'reverse' && q.rev > 0) { value = q.rev; metric = 'reverse holo trend'; }
    }
    const cur = k === 'cm' ? 'EUR' : 'USD', rate = fxRate(cur);
    const age = q.updated ? (Date.now() - Date.parse(q.updated)) / 864e5 : Infinity;
    const st = age > CONFIG.priceStaleDays ? 'stale' : k !== order[0] ? 'fallback' : 'good';
    return { gbp:rate ? value * rate : null, native:value, cur, src:k === 'cm' ? 'Cardmarket' : 'TCGplayer', metric,
      date:q.updated, url:k === 'cm' ? cardmarketUrl(c) : tcgplayerUrl(c), fetched:pr.fetched, status:st, stale:st === 'stale', fallback:st === 'fallback', trend:null };
  }
  return null;
}
/* Value of every copy you hold (all printings × quantity), what you paid, and gain/loss on copies with a price paid. */
function ownedTotals(col, onlyIds) {
  let value = 0, paid = 0, plValue = 0, copies = 0, withPaid = 0, unpriced = 0;
  for (const id of (onlyIds || col.cardIds)) {
    const c = S.cards[id], rec = col.copies?.[id]; if (!c || !rec) continue;
    for (const [v, r] of Object.entries(rec)) {
      const q = r?.q || 0; if (!q) continue;
      copies += q;
      const g = priceOf(c, v === 'any' ? primaryVariant(c, col) : v)?.gbp;
      if (g != null) value += g * q; else unpriced += q;
      if (r.p > 0) { paid += r.p * q; withPaid += q; if (g != null) plValue += g * q; }
    }
  }
  return { value, paid, pl:plValue - paid, copies, withPaid, unpriced };
}
/* One value snapshot per collection per day, for the Overview chart. Uses the latest prices you've fetched. */
function recordSnapshot(col) {
  if (!col) return;
  const t = ownedTotals(col), need = sumValue(UI.layout && col.id === S.activeId ? UI.layout.cards.filter(e => !col.owned[e.id]) : []);
  if (!t.value && !need.gbp) return;
  col.history ||= [];
  const snap = { d:today(), v:Math.round(t.value * 100) / 100, n:Math.round(need.gbp * 100) / 100, p:Math.round(t.paid * 100) / 100 };
  const last = col.history[col.history.length - 1];
  if (last?.d === snap.d) col.history[col.history.length - 1] = snap; else col.history.push(snap);
  if (col.history.length > 730) col.history.splice(0, col.history.length - 730);
  save();
}
const fmtPrice = pi => !pi ? '—' : pi.gbp != null ? GBP.format(pi.gbp) : NATIVE[pi.cur].format(pi.native);
/* prices.pokemontcg.io redirect links no longer load, so link to each marketplace's own search instead. */
const cardmarketUrl = c => c?.name ? `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(c.name)}` : '';
const tcgplayerUrl = c => c?.name ? `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(`${c.name} ${c.set_name || ''}`.trim())}` : '';
const QUALITY = { good:'Good data', fallback:'Fallback figure', stale:'Stale price' };
function qualityText(pi) {
  if (!pi) return 'No price available';
  const base = `${pi.metric} · ${pi.src} · price date ${pi.date || 'unknown'}`;
  return pi.status === 'good' ? `Good data: ${base}` : pi.status === 'fallback' ? `Fallback: ${pi.want ? PRICE_FIG[pi.want] + ' not available or out of date, using ' : ''}${base}` : `Stale: ${base} — older than ${CONFIG.priceStaleDays} days`;
}
const priceDot = pi => pi ? `<span class="pdot ${pi.status}" role="img" aria-label="${esc(QUALITY[pi.status])}" title="${esc(qualityText(pi))}"></span>` : '';
const trendTag = pi => { const t = pi?.trend; if (!t || t.dir === 'flat') return ''; return `<span class="ptrend ${t.dir}" title="7-day average is ${Math.abs(t.pct)}% ${t.dir === 'up' ? 'above' : 'below'} the 30-day average" aria-label="trending ${t.dir} ${Math.abs(t.pct)}%">${t.dir === 'up' ? '▲' : '▼'}${Math.abs(t.pct)}%</span>`; };
const priceHtml = pi => pi ? `<span class="pwrap">${priceDot(pi)}${fmtPrice(pi)}${trendTag(pi)}</span>` : '—';
const priceTitle = pi => !pi ? 'No price in the API' : `${pi.src} ${pi.metric}: ${NATIVE[pi.cur].format(pi.native)} · price date ${pi.date || 'unknown'}${pi.stale ? ' (stale)' : ''} · ${fxLabel(pi.cur)}`;
function sumValue(cards) {
  let gbp = 0, priced = 0, unconverted = 0, minD = '', maxD = '';
  for (const c of cards) { const pi = priceOf(c); if (!pi) continue;
    if (pi.gbp == null) { unconverted++; continue; }
    gbp += pi.gbp; priced++;
    if (pi.date) { if (!minD || pi.date < minD) minD = pi.date; if (pi.date > maxD) maxD = pi.date; } }
  return { gbp, priced, unpriced:cards.length - priced - unconverted, unconverted, minD, maxD };
}
const dateRange = v => !v.minD ? '' : v.minD === v.maxD ? v.minD : `${v.minD} → ${v.maxD}`;

async function loadFx(force) {
  if (!force && S.fx && Date.now() - S.fx.fetchedAt < CONFIG.fxCacheHours * 36e5) return;
  try {
    const r = await fetch(CONFIG.fxUrl); if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!(j.rates?.GBP > 0 && j.rates?.USD > 0)) throw new Error('unexpected response');
    S.fx = { date:j.date, eur:j.rates.GBP, usd:j.rates.GBP / j.rates.USD, fetchedAt:Date.now() };
    save(); if (active()) { renderProgress(); if (UI.view !== 'binder') renderView(); }
    if (force) toast(`Exchange rate updated: €1 = £${S.fx.eur.toFixed(4)} (ECB ${S.fx.date})`, 'success');
  } catch (e) { if (force || !S.fx) toast(`Couldn't get an exchange rate (${e.message}). ${S.fx ? 'Using the last one saved.' : 'Prices show in EUR/USD until it works, or set a rate in Settings.'}`, 'warn'); }
}
async function refreshPrices() {
  const col = active(); if (!col) return;
  const ids = col.cardIds.filter(id => S.cards[id] && !S.cards[id].custom);
  if (!ids.length) { toast('No API cards to price', 'warn'); return; }
  const btns = $$('[data-act=refresh-prices]'); btns.forEach(b => b.disabled = true);
  let done = 0;
  try {
    // 1) Cardmarket's hourly price guide via TCGdex (force a re-check of every card)
    ids.forEach(id => { if (S.cards[id].price?.td) S.cards[id].price.td.fetched = ''; });
    const tdGot = await tcgdexPrices(ids, (n, t) => { done = n; $('#prog-value').textContent = `Refreshing Cardmarket prices… ${n} / ${t}`; });
    // 2) cards TCGdex can't match: try the Pokémon TCG API (old prices, flagged stale)
    const missing = ids.filter(id => !S.cards[id].price?.td);
    for (let i = 0; i < missing.length; i += CONFIG.priceBatch) {
      $('#prog-value').textContent = `Checking ${missing.length} card(s) TCGdex couldn't price…`;
      try { (await apiFetchAll('(' + missing.slice(i, i + CONFIG.priceBatch).map(id => `id:"${id.replace(/"/g, '')}"`).join(' OR ') + ')')).forEach(mergeCard); } catch { break; }
    }
    await loadFx(); save(); render(); recordSnapshot(col); if (UI.view === 'sets') renderView();
    toast(`Cardmarket prices refreshed for ${tdGot} of ${ids.length} cards${missing.length ? ` · ${missing.length} not found on TCGdex (shown with old prices, if any)` : ''}`, tdGot ? 'success' : 'warn');
  } catch (e) { render(); toast(`Price refresh stopped after ${done} cards: ${e.message}`, 'error'); }
  finally { btns.forEach(b => b.disabled = false); }
}

function renderProgress() {
  const col = active(); if (!col) return;
  const cards = UI.layout.cards, fa = filtersActive();
  const base = fa ? cards.filter(c => matches(c, col)) : cards;
  const own = base.filter(c => col.owned[c.id]).length, p = pct(own, base.length);
  $('#prog-text').textContent = `${own} / ${base.length}`;
  $('#st-ring').style.setProperty('--p', p); $('#st-ring').dataset.label = p + '%';
  $('#prog-bar').style.width = p + '%';
  const pages = UI.layout.pages.length, spares = col.cardIds.reduce((n, id) => n + (S.cards[id] ? spareCount(col, S.cards[id]) : 0), 0);
  $('#prog-filter').textContent = fa ? 'Filtered view' : `${pages} binder page${pages === 1 ? '' : 's'}${spares ? ` · ${spares} spare${spares === 1 ? '' : 's'}` : ''}`;
  // values
  const ids = fa ? [...new Set(base.map(e => e.cardId))] : null;
  const t = ownedTotals(col, ids), vn = sumValue(base.filter(c => !col.owned[c.id])), all = sumValue(base);
  const src = (S.settings.priceSource || CONFIG.priceSource) === 'tcgplayer' ? 'TCGplayer' : 'Cardmarket';
  const any = all.priced || t.value;
  $('#sv-own').textContent = any ? GBP.format(t.value) : '—';
  $('#sv-own-s').textContent = any ? `${t.copies} cop${t.copies === 1 ? 'y' : 'ies'}${t.unpriced ? ` · ${t.unpriced} unpriced` : ''}` : 'Tap Refresh prices';
  $('#sv-need').textContent = any ? GBP.format(vn.gbp) : '—';
  $('#sv-need-s').textContent = any ? `${base.length - own} needed${vn.unpriced ? ` · ${vn.unpriced} unpriced` : ''}` : '';
  const pl = $('#sv-pl');
  if (t.withPaid) { pl.textContent = (t.pl >= 0 ? '+' : '−') + GBP.format(Math.abs(t.pl)); pl.className = 'v ' + (t.pl >= 0 ? 'up' : 'down');
    $('#sv-pl-s').textContent = `on ${t.withPaid} cop${t.withPaid === 1 ? 'y' : 'ies'} · paid ${GBP.format(t.paid)}`; }
  else { pl.textContent = '—'; pl.className = 'v'; $('#sv-pl-s').textContent = 'Add what you paid in card details'; }
  const q = { good:0, fallback:0, stale:0 }; base.forEach(e => { const pi = priceOf(e); if (pi) q[pi.status]++; });
  $('#prog-value').innerHTML = all.priced ? `${esc(src)} · <span class="pwrap" title="Your chosen figure, under ${CONFIG.priceStaleDays} days old"><span class="pdot good"></span>${q.good} good</span> · <span class="pwrap" title="Fresh fallback figure"><span class="pdot fallback"></span>${q.fallback} fallback</span> · <span class="pwrap" title="Only old prices — refresh"><span class="pdot stale"></span>${q.stale} stale</span>` : (all.unconverted ? 'Prices loaded but no exchange rate yet — check Settings' : 'No prices yet');
}

function renderView() {
  const col = active(); const v = $('#view');
  if (!col) return;
  if (!UI.layout.cards.length) {
    v.innerHTML = `<div class="empty-msg">${ic('layers')}<p style="margin:0">This collection is empty.</p><div class="row" style="justify-content:center"><button class="btn primary" data-act="add-cards">${ic('search', 'sm')}Add cards</button><button class="btn" data-act="custom-card">${ic('plus', 'sm')}Custom card</button></div></div>`;
    return;
  }
  if (UI.view === 'list') v.innerHTML = listHtml(col);
  else if (UI.view === 'sets') v.innerHTML = overviewHtml(col);
  else if (UI.view === 'vendor') { renderVendor(); return; }
  else v.innerHTML = binderHtml(col);
  // image skeletons: stop the shimmer once each image has loaded (or failed)
  $$('.pocket img', v).forEach(img => { const done = () => img.closest('.pocket')?.classList.add('loaded'); if (img.complete) done(); else { img.addEventListener('load', done, { once:true }); img.addEventListener('error', done, { once:true }); } });
  $$('.pocket:not(:has(img))', v).forEach(p => p.classList.add('loaded'));
}

function pocketHtml(c, col, slot, dimmed) {
  if (!c) return `<div class="pocket empty" aria-hidden="true"></div>`;
  const own = !!col.owned[c.id], q = entryQty(col, c);
  const elsewhere = !own && ownedElsewhere(c.id, col.id).length;
  const img = safeUrl(c.img_s);
  return `<div class="pocket${own ? ' owned' : ''}${dimmed ? ' dim' : ''}" role="button" tabindex="0" data-id="${esc(c.id)}" data-act="toggle" aria-pressed="${own}" aria-label="${esc(dispName(c))} ${esc(c.number)}, ${own ? 'owned' : 'needed'}" title="${esc(dispName(c))} · ${esc(c.set_name)} ${esc(c.number)}">
    ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : `<span class="noimg">${esc(c.name)}<br>${esc(c.number)}</span>`}
    <span class="slotno">${slot}</span>${q > 1 ? `<span class="qty" title="${q} copies">×${q}</span>` : ''}<span class="tick">${ic('check')}</span>
    <span class="info" data-act="info" role="button" tabindex="0" aria-label="Details for ${esc(dispName(c))}">${ic('info')}</span>
    ${elsewhere ? `<span class="elsewhere" title="Owned in another collection"></span>` : ''}
    <span class="meta"><span class="nm">${c.variant && VSHORT[c.variant] ? `<span class="vtag">${VSHORT[c.variant]}</span>` : ''}${esc(c.name)}</span><span class="no">${esc(c.number)} · ${esc(c.set_id)}</span></span>
  </div>`;
}

function binderHtml(col) {
  const L = UI.layout, fa = filtersActive();
  const pageHtml = (p, pi) => {
    const pageNo = pi + 1, sp = spreadOf(pageNo, col.startRight);
    const n = p.filter(Boolean).length, o = p.filter(c => c && col.owned[c.id]).length;
    return `<article class="page" style="--cols:${L.cols}" aria-label="Binder page ${pageNo}">
      <header class="page-h"><b>Page ${pageNo}</b><span>Spread ${sp.spread} · ${sp.side}</span><span>${o}/${n}</span></header>
      <div class="pockets">${p.map((c, si) => pocketHtml(c, col, si + 1, fa && c && !matches(c, col))).join('')}</div></article>`;
  };
  if (fa) {   // filtered: only pages that contain a match, flat grid
    const out = L.pages.map((p, i) => p.some(c => c && matches(c, col)) ? pageHtml(p, i) : '').join('');
    return out ? `<div class="flat">${out}</div>` : `<div class="empty-msg">No cards match these filters.</div>`;
  }
  const items = L.pages.map(pageHtml);
  if (col.startRight) items.unshift(`<div class="page cover">Inside front cover</div>`);
  let html = '';
  for (let i = 0, s = 1; i < items.length; i += 2, s++) {
    html += `<section class="spread"><div class="spread-label">Spread ${s}</div>${items[i]}${items[i + 1] || '<div></div>'}</section>`;
  }
  return html;
}

function listHtml(col) {
  const L = UI.layout;
  const rows = L.cards.filter(c => matches(c, col));
  if (!rows.length) return `<div class="empty-msg">No cards match these filters.</div>`;
  if (UI.listSort === 'value') rows.sort((a, b) => (priceOf(b)?.gbp ?? priceOf(b)?.native ?? -1) - (priceOf(a)?.gbp ?? priceOf(a)?.native ?? -1));
  return `<div class="panel"><div class="bulk"><span class="small muted">${rows.length} card${rows.length === 1 ? '' : 's'} · tap a row to tick it off</span>
    <div class="row"><button class="btn sm" data-act="bulk-own">${ic('check', 'sm')}Mark shown as owned</button><button class="btn sm" data-act="bulk-need">Mark shown as needed</button></div></div>
    <div style="overflow-x:auto"><table class="tbl"><thead><tr><th><span class="sr">Owned</span></th><th>Card</th><th class="hide-m">No.</th><th class="hide-m">Set</th><th class="hide-m">Released</th><th class="hide-m">Rarity</th><th class="hide-m">Qty</th><th data-sort="value" data-act="sort-value" title="Sort by value" aria-sort="${UI.listSort === 'value' ? 'descending' : 'none'}">${UI.listSort === 'value' ? 'Value ↓' : 'Value'}</th><th>Binder</th><th><span class="sr">Details</span></th></tr></thead><tbody>
    ${rows.map(c => { const own = !!col.owned[c.id], p = L.pos.get(c.id), pi = priceOf(c), q = entryQty(col, c);
      return `<tr data-id="${esc(c.id)}" data-act="toggle" class="${own ? 'owned' : ''}"><td><span class="ck" role="checkbox" aria-checked="${own}" aria-label="${own ? 'Owned' : 'Needed'}">${ic('check')}</span></td>
        <td><span class="nm">${c.variant && VSHORT[c.variant] ? `<span class="vtag">${VSHORT[c.variant]}</span> ` : ''}${esc(c.name)}</span><span class="sub">${esc(c.number)} · ${esc(c.set_name)}${c.rarity ? ' · ' + esc(c.rarity) : ''}${q > 1 ? ` · ×${q}` : ''}</span></td>
        <td class="hide-m mono">${esc(c.number)}</td><td class="hide-m">${esc(c.set_name)}</td><td class="hide-m mono small">${esc(c.release_date || '—')}</td>
        <td class="hide-m small">${esc(c.rarity || '—')}</td><td class="hide-m small num">${q || '—'}</td>
        <td class="price small" title="${esc(qualityText(pi))}">${priceHtml(pi)}</td>
        <td class="mono small" title="${esc(posLabel(col, p))}">${p ? `p${p.page}·${p.slot}` : '—'}</td>
        <td><button class="btn sm ghost icon" data-act="info" aria-label="Details for ${esc(dispName(c))}">${ic('info')}</button></td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}

function overviewHtml(col) {
  const t = ownedTotals(col);
  return `<div class="ov">
    <section class="panel"><div class="row" style="justify-content:space-between"><div><h2>Collection value</h2>
      <p class="muted small" style="margin:0">Recorded once a day from the latest prices you've fetched${col.history?.length ? ` · since ${esc(col.history[0].d)}` : ''}.</p></div>
      <div class="legend"><span>Owned value</span>${t.withPaid ? '<span class="paid">Paid</span>' : ''}</div></div>
      ${chartSvg(col.history || [])}</section>
    <div class="row" style="justify-content:flex-end"><button class="btn sm" data-act="share-want"${UI.layout.cards.some(e => !col.owned[e.id]) ? '' : ' disabled'}>${ic('share', 'sm')}Share want list (${UI.layout.cards.filter(e => !col.owned[e.id]).length})</button></div>
    ${setsHtml(col)}</div>`;
}
function chartSvg(h) {
  if (h.length < 2) return `<div class="empty-msg" style="padding:28px 8px">${ic('chart')}<span class="small">The chart fills in as you use the app — refresh prices on another day to see a trend.${h.length ? ` Today: <b class="price">${GBP.format(h[0].v)}</b>` : ''}</span></div>`;
  const W = Math.max(300, Math.min(1280, ($('#view')?.clientWidth || 720) - 30)), H = W < 500 ? 200 : 240, L = 52, R = 12, T = 12, B = 26;
  const xs = h.map(r => Date.parse(r.d)), x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const ymax = Math.max(1, ...h.map(r => Math.max(r.v, r.p || 0))) * 1.08;
  const X = t => L + (W - L - R) * ((t - x0) / ((x1 - x0) || 1)), Y = v => T + (H - T - B) * (1 - v / ymax);
  const line = k => h.map((r, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(r[k] || 0).toFixed(1)}`).join('');
  const ticks = [0, .25, .5, .75, 1].map(f => ymax * f);
  const fmt0 = new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP', maximumFractionDigits:0 });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Owned value from ${esc(h[0].d)} (${GBP.format(h[0].v)}) to ${esc(h[h.length - 1].d)} (${GBP.format(h[h.length - 1].v)})">
    <defs><linearGradient id="g-own" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <g class="grid">${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${fmt0.format(v)}</text>`).join('')}</g>
    <text x="${L}" y="${H - 6}">${esc(h[0].d)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(h[h.length - 1].d)}</text>
    <path class="a-own" d="${line('v')}L${X(x1).toFixed(1)},${Y(0)}L${X(x0).toFixed(1)},${Y(0)}Z"/>
    <path class="l-own" d="${line('v')}"/>${h.some(r => r.p) ? `<path class="l-paid" d="${line('p')}"/>` : ''}
  </svg>`;
}
function setsHtml(col) {
  const groups = new Map();
  for (const c of [...UI.layout.cards].sort(SORTS.release)) {
    if (!groups.has(c.set_id)) groups.set(c.set_id, { c, n:0, o:0, need:[] });
    const g = groups.get(c.set_id); g.n++; if (col.owned[c.id]) g.o++; else g.need.push(c);
  }
  return `<div class="sets">${[...groups.entries()].map(([id, g]) => { const p = pct(g.o, g.n);
    return `<button class="setcard${g.o === g.n ? ' done' : ''}" data-act="goto-set" data-set="${esc(id)}">
      <span class="t">${esc(g.c.set_name)}</span><span class="small muted">${esc(g.c.series || '')}${g.c.series ? ' · ' : ''}${esc(g.c.release_date || 'no date')} · ${esc(id)}</span>
      <span class="row small" style="justify-content:space-between"><span><b>${g.o}</b> / ${g.n} owned</span><span>${p}%</span></span>
      <span class="bar"><i style="width:${p}%"></i></span>
      ${g.need.length ? (v => v.priced ? `<span class="small muted">To complete ≈ <b class="price">${GBP.format(v.gbp)}</b>${v.priced < g.need.length ? ` (${g.need.length - v.priced} unpriced)` : ''}</span>` : '')(sumValue(g.need)) : ''}</button>`; }).join('')}</div>`;
}

function renderWelcome() {
  $('#view').innerHTML = `<div class="welcome">
    <div class="badge-ic">${ic('binder')}</div>
    <h2>Build your first binder</h2>
    <p class="muted" style="margin:0">Create a collection, pull in cards by artist, set, Pokémon or the code printed on the card, then tick them off as you collect. PokéBinder works out exactly which page and pocket each card belongs in, and what it's worth.</p>
    <div class="row"><button class="btn primary" data-act="add-cards">${ic('search', 'sm')}Search &amp; create</button><button class="btn" data-act="new-col">${ic('plus', 'sm')}Empty collection</button><button class="btn" data-act="export">${ic('upload', 'sm')}Restore a backup</button></div>
  </div>`;
}

/* Fast path: update one card's DOM without a full re-render (keeps scroll position). */
function refreshCard(id) {
  const col = active(), own = !!col.owned[id];
  $$(`[data-id="${CSS.escape(id)}"]`, $('#view')).forEach(el => {
    el.classList.toggle('owned', own);
    if (el.matches('.pocket')) { el.setAttribute('aria-pressed', own); el.querySelector('.elsewhere')?.remove(); }
    const ck = el.querySelector('.ck'); if (ck) ck.setAttribute('aria-checked', own);
  });
  // page header counters in binder view
  if (UI.view === 'binder') $$('.page', $('#view')).forEach(pg => {
    const ps = $$('.pocket[data-id]', pg); const h = pg.querySelector('.page-h span:last-child');
    if (h && ps.some(p => p.dataset.id === id)) h.textContent = `${ps.filter(p => p.classList.contains('owned')).length}/${ps.length}`;
  });
}

/* ==========================================================================
   ACTIONS
   ========================================================================== */
/* Tick = "I have one of these". Untick = "I have none of this printing" (undo is offered on bulk). */
function setOwned(entryIds, val) {
  const col = active(); col.copies ||= {};
  for (const eid of entryIds) {
    const cid = cardIdOf(eid), v = variantOfEntry(eid), c = S.cards[cid]; if (!c) continue;
    const rec = col.copies[cid] ||= {};
    if (val) {
      const has = v ? entryQty(col, { cardId:cid, variant:v }) > 0 : totalQty(col, cid) > 0;
      if (!has) { const tv = v || primaryVariant(c, col); rec[tv] = { ...rec[tv], q:1 }; }
    } else if (v) {
      if (rec[v]) rec[v].q = 0;
      if (v === primaryVariant(c, col) && rec.any) rec.any.q = 0;
    } else Object.values(rec).forEach(r => { if (r) r.q = 0; });
    for (const k of Object.keys(rec)) if (!rec[k]?.q && !rec[k]?.p && !rec[k]?.c) delete rec[k];
    if (!Object.keys(rec).length) delete col.copies[cid];
  }
  syncOwned(col); col.updated = Date.now(); save();
}
function toggleOwned(id) {
  const col = active(); setOwned([id], !col.owned[id]);
  if (UI.view === 'binder' || UI.view === 'list') { refreshCard(id); renderProgress(); }
  else { renderProgress(); renderView(); }
}
function switchCollection(id) {
  if (!S.collections[id]) return;
  S.activeId = id; UI.filters = { text:'', set:'all', status:'all', rarity:'all' };
  save(); render(); window.scrollTo({ top:0 });
}

/* undo: snapshot collection data (cards are never deleted by undoable actions) */
function snapshot() { return JSON.stringify({ collections:S.collections, order:S.order, activeId:S.activeId, stock:S.stock, ledger:S.ledger, vendor:S.vendor }); }
function undoable(msg, snap) {
  toast(msg, 'info', { label:'Undo', fn:() => { Object.assign(S, JSON.parse(snap)); save(); render(); toast('Undone', 'success'); } });
}

/* ---------- collection dialog ---------- */
let colMode = 'new';
function openColDialog(mode) {
  colMode = mode; const col = active();
  const isEdit = mode === 'edit' && col;
  $('#col-title').textContent = isEdit ? 'Collection settings' : 'New collection';
  $('#col-ok').textContent = isEdit ? 'Save' : 'Create';
  $('#col-name').value = isEdit ? col.name : '';
  $('#col-layout').value = isEdit ? col.layout : CONFIG.defaultLayout;
  $('#col-sort').value = isEdit ? col.sort : 'release';
  $('#col-setbreaks').checked = isEdit ? col.setBreaks : false;
  $('#col-variants').checked = isEdit ? !!col.variantSlots : false;
  $('#col-startright').checked = isEdit ? col.startRight : true;
  $('#col-delete').classList.toggle('hidden', !isEdit);
  $('#col-dup').classList.toggle('hidden', !isEdit);
  $('#dlg-col').showModal();
}
$('#form-col').addEventListener('submit', e => {
  if (e.submitter?.value !== 'ok') return;
  const name = $('#col-name').value.trim(); if (!name) { e.preventDefault(); return; }
  const opts = { layout:$('#col-layout').value, sort:$('#col-sort').value, setBreaks:$('#col-setbreaks').checked, startRight:$('#col-startright').checked, variantSlots:$('#col-variants').checked };
  if (colMode === 'edit' && active()) {
    const was = active().variantSlots; Object.assign(active(), opts, { name, updated:Date.now() }); toast('Collection updated', 'success');
    const unknown = active().cardIds.filter(id => S.cards[id] && !S.cards[id].custom && !S.cards[id].variants).length;
    if (opts.variantSlots && !was && unknown) { toast(`Checking which printings exist for ${unknown} card${unknown === 1 ? '' : 's'}…`, 'info'); setTimeout(refreshPrices, 50); }
  }
  else { const c = newCollection(uniqueName(name), opts); S.collections[c.id] = c; S.order.push(c.id); S.activeId = c.id; toast(`Created "${c.name}"`, 'success'); }
  save(); render();
});
$('#col-dup').addEventListener('click', () => {
  const src = active(); const c = { ...structuredClone(src), id:'c_' + uid(), name:uniqueName(src.name + ' (copy)'), created:Date.now(), updated:Date.now() };
  S.collections[c.id] = c; S.order.splice(S.order.indexOf(src.id) + 1, 0, c.id); S.activeId = c.id;
  $('#dlg-col').close(); save(); render(); toast(`Duplicated as "${c.name}"`, 'success');
});
$('#col-delete').addEventListener('click', async () => {
  const col = active();
  if (!await confirmDlg('Delete collection?', `"${col.name}" and its ${col.cardIds.length} cards, quantities and prices paid will be removed. Cards stay cached for other collections.`, 'Delete')) return;
  const snap = snapshot();
  delete S.collections[col.id]; S.order = S.order.filter(id => id !== col.id); S.activeId = S.order[0] || null;
  $('#dlg-col').close(); save(); render(); undoable(`Deleted "${col.name}"`, snap);
});
function uniqueName(name) {
  const names = new Set(S.order.map(id => S.collections[id].name.toLowerCase()));
  if (!names.has(name.toLowerCase())) return name;
  let i = 2; while (names.has(`${name} ${i}`.toLowerCase())) i++; return `${name} ${i}`;
}

/* ---------- confirm dialog (promise) ---------- */
function confirmDlg(title, msg, yes = 'Confirm') {
  return new Promise(res => {
    const d = $('#dlg-confirm'); $('#cf-title').textContent = title; $('#cf-msg').textContent = msg; $('#cf-yes').textContent = yes;
    d.returnValue = ''; d.showModal(); d.addEventListener('close', () => res(d.returnValue === 'yes'), { once:true });
  });
}

/* ---------- info dialog: details, inventory (variants × qty × condition × price paid), price ---------- */
function openInfo(entryId) {
  const col = active(), id = cardIdOf(entryId), c = S.cards[id]; if (!c) return;
  UI.infoId = entryId;
  const entry = UI.layout.cards.find(e => e.id === entryId) || { ...c, cardId:id, variant:variantOfEntry(entryId) };
  const p = UI.layout.pos.get(entryId), els = ownedElsewhere(id, col.id);
  const others = S.order.filter(cid => cid !== col.id && !S.collections[cid].cardIds.includes(id));
  const img = safeUrl(c.img_l || c.img_s);
  const rec = col.copies?.[id] || {};
  const vlist = [...variantsOf(c, col), ...(rec.any ? ['any'] : [])];
  const addable = ['normal','holo','reverse','first'].filter(v => !vlist.includes(v));
  const t = ownedTotals(col, [id]), spares = sparesOf(col, c);
  $('#i-title').textContent = dispName(entry);
  $('#i-body').innerHTML = `<div class="info-grid">
    ${img ? `<img src="${esc(img)}" alt="${esc(c.name)}">` : `<div class="page cover">No image</div>`}
    <div><dl class="kv">
      <dt>Number</dt><dd class="mono">${esc(c.number || '—')}</dd>
      <dt>Set</dt><dd>${esc(c.set_name)} <span class="muted mono small">${esc(c.set_id)}</span></dd>
      <dt>Released</dt><dd>${esc(c.release_date || '—')}</dd>
      <dt>Rarity</dt><dd>${esc(c.rarity || '—')}</dd>
      <dt>Artist</dt><dd><input id="i-artist" class="inp" style="min-height:36px;font-size:14px" value="${esc(c.artist)}" maxlength="80" placeholder="Not credited — type to set" aria-label="Artist">${c.artist_assigned ? '<small>set by you</small>' : c.artist_tcgdex ? '<small>credit from TCGdex (blank in the Pokémon TCG API)</small>' : ''}</dd>
      ${c.dex ? `<dt>Pokédex</dt><dd>#${c.dex}</dd>` : ''}
      <dt>Binder</dt><dd>${esc(posLabel(col, p))}</dd>
      ${els.length ? `<dt>Also owned in</dt><dd>${els.map(esc).join(', ')}</dd>` : ''}
    </dl>
    ${priceBoxHtml(c, entry.variant)}
    </div></div>
    <section class="inv" aria-label="Your copies">
      <div class="row" style="justify-content:space-between"><b>Your copies</b><span class="small muted">${t.copies ? `${t.copies} held${spares.length ? ` · ${spares.reduce((n, s) => n + s.n, 0)} spare` : ''}${t.value ? ` · worth ${GBP.format(t.value)}` : ''}${t.withPaid ? ` · <span class="${t.pl >= 0 ? 'up' : 'down'}">${t.pl >= 0 ? '+' : '−'}${GBP.format(Math.abs(t.pl))}</span>` : ''}` : 'None yet'}</span></div>
      ${vlist.map(v => { const r = rec[v] || {}, pv = priceOf(c, v === 'any' ? primaryVariant(c, col) : v);
        return `<div class="inv-row" data-v="${v}">
          <div><span class="vn">${VARIANTS[v]}</span>${pv ? ` <span class="small muted">· ${priceHtml(pv)} each</span>` : ''}</div>
          <div class="stepper" role="group" aria-label="${VARIANTS[v]} quantity"><button type="button" data-q="-1" aria-label="One fewer">${ic('minus', 'sm')}</button><output>${r.q || 0}</output><button type="button" data-q="1" aria-label="One more">${ic('plus', 'sm')}</button></div>
          <div class="more">
            <select class="inp" data-f="c" aria-label="${VARIANTS[v]} condition"><option value="">Condition</option>${CONDITIONS.map(k => `<option${r.c === k ? ' selected' : ''}>${k}</option>`).join('')}</select>
            <input class="inp" data-f="p" inputmode="decimal" placeholder="Paid £ each" aria-label="${VARIANTS[v]} price paid per copy (£)" value="${r.p ? esc(r.p) : ''}">
            <input class="inp date" data-f="d" type="date" aria-label="${VARIANTS[v]} date paid" value="${esc(r.d || '')}">
          </div></div>`; }).join('')}
      ${addable.length ? `<div class="row"><select id="i-addv" class="inp" style="flex:1" aria-label="Add a printing">${addable.map(v => `<option value="${v}">${VARIANTS[v]}</option>`).join('')}</select><button class="btn sm" id="i-addv-go">${ic('plus', 'sm')}Add printing</button></div>` : ''}
    </section>
    ${others.length ? `<div class="row"><select id="i-copy-to" class="inp" style="flex:1" aria-label="Copy to collection">${others.map(cid => `<option value="${esc(cid)}">${esc(S.collections[cid].name)}</option>`).join('')}</select><button class="btn sm" id="i-copy">${ic('copy', 'sm')}Copy to</button></div>` : ''}
    ${c.custom ? '' : `<p class="small muted" style="margin:0">Card data: Pokémon TCG API · <span class="mono">${esc(c.id)}</span></p>`}`;
  $('#i-toggle').innerHTML = col.owned[entryId] ? 'Mark as needed' : `${ic('check', 'sm')}Mark as owned`;
  $('#i-artist').addEventListener('change', e => {
    const v = e.target.value.trim().slice(0, 80); c.artist = v; c.artist_assigned = !!v; delete c.artist_tcgdex; save();
    toast(v ? `Artist set to ${v}` : 'Artist cleared', 'success'); openInfo(entryId); if (UI.view === 'list') renderView();
  });
  const commit = () => { syncOwned(col); col.updated = Date.now(); save(); renderProgress(); renderView(); openInfo(entryId); };
  $$('.inv-row', $('#i-body')).forEach(row => {
    const v = row.dataset.v, get = () => ((col.copies ||= {})[id] ||= {})[v] ||= { q:0 };
    row.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { const r = get(); r.q = Math.max(0, Math.min(999, (r.q || 0) + Number(b.dataset.q))); commit(); }));
    row.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('change', () => {
      const r = get(), f = inp.dataset.f;
      if (f === 'p') { const n = parseFloat(inp.value.replace(/[£,\s]/g, '')); if (n > 0 && n < 1e6) r.p = Math.round(n * 100) / 100; else delete r.p; }
      else if (f === 'c') { if (CONDITIONS.includes(inp.value)) r.c = inp.value; else delete r.c; }
      else if (f === 'd') { if (/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) r.d = inp.value; else delete r.d; }
      commit();
    }));
  });
  $('#i-addv-go')?.addEventListener('click', () => { const v = $('#i-addv').value; ((col.copies ||= {})[id] ||= {})[v] ||= { q:0 }; commit(); });
  $('#i-copy')?.addEventListener('click', () => {
    const tc = S.collections[$('#i-copy-to').value]; tc.cardIds.push(id); tc.updated = Date.now(); save(); renderHeader(active());
    toast(`Copied to "${tc.name}"`, 'success'); openInfo(entryId);
  });
  if (!$('#dlg-info').open) $('#dlg-info').showModal();
}
$('#i-toggle').addEventListener('click', () => { toggleOwned(UI.infoId); openInfo(UI.infoId); });
$('#i-remove').addEventListener('click', () => {
  const col = active(), id = cardIdOf(UI.infoId), snap = snapshot();
  col.cardIds = col.cardIds.filter(x => x !== id); delete col.copies?.[id]; col.updated = Date.now();
  $('#dlg-info').close(); save(); render(); undoable(`Removed ${S.cards[id]?.name || 'card'}`, snap);
});

function priceBoxHtml(c, variant) {
  if (c.custom) return '';
  const pi = priceOf(c, variant), pr = c.price || {};
  if (!pi) return `<div class="pricebox"><span class="muted">No price in the API for this card.</span><button class="btn sm" data-act="refresh-one" style="justify-self:start">${ic('refresh', 'sm')}Check again</button></div>`;
  const r = fxRate('EUR'), eur = v => `${NATIVE.EUR.format(v)}${r ? `<span class="gbp">≈ ${GBP.format(v * r)}</span>` : ''}`;
  const short = d => { const t = Date.parse(d); return t ? new Date(t).toLocaleDateString('en-GB', { day:'numeric', month:'short', ...(new Date(t).getFullYear() !== new Date().getFullYear() ? { year:'2-digit' } : {}) }) : '?'; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const figs = cmFigures(c, variant), t = pi.trend;
  const rows = ['trend', 'avg30', 'avg7', 'low'].map(f => { const list = figs.filter(x => x.fig === f).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    if (!list.length) return ''; const x = list[0];
    return `<tr${pi.fig === f && pi.src === x.src ? ' class="pick"' : ''}><td>${esc(cap(PRICE_FIG[f]))}<span class="via">via ${x.src.includes('TCGdex') ? 'TCGdex (hourly)' : 'Pokémon TCG API (frozen)'}</span></td><td>${eur(x.value)}</td><td title="${esc(x.date)}"><span class="pdot ${x.fresh ? 'good' : 'stale'}" aria-label="${x.fresh ? 'fresh' : 'stale'}"></span>${esc(short(x.date))}</td></tr>`; }).join('');
  const tcp = pr.tcp ? `<div class="small muted">TCGplayer (US): ${NATIVE.USD.format(pr.tcp.value)} (${esc(pr.tcp.metric)}) · price date ${esc(pr.tcp.updated || '?')} · <a href="${esc(tcgplayerUrl(c))}" target="_blank" rel="noopener noreferrer">search TCGplayer</a></div>` : '';
  const cmUrl = cardmarketUrl(c);
  return `<div class="pricebox">
    <div class="row" style="justify-content:space-between;align-items:baseline"><span class="big">${priceDot(pi)}${fmtPrice(pi)}${trendTag(pi)}</span><span class="small muted">${esc(pi.metric)}</span></div>
    <div class="small qual ${pi.status}"><b>${QUALITY[pi.status]}.</b> ${pi.status === 'good' ? `Your chosen figure from Cardmarket's hourly price guide, dated ${esc(pi.date)}.` : pi.status === 'fallback' ? `${esc(cap(PRICE_FIG[pi.want] || 'your chosen figure'))} isn't available or is out of date, so this is the ${esc(pi.metric)} from ${esc(pi.date)}.` : (pi.src.includes('TCGdex') ? `Newest price is from ${esc(pi.date || 'an unknown date')} — older than ${CONFIG.priceStaleDays} days. Tap refresh; treat it with care.` : `TCGdex has no price for this card, so this is the old Pokémon TCG API figure from ${esc(pi.date || 'an unknown date')}. Treat it with care.`)}
      ${t ? ` Trend: 7-day average ${t.pct >= 0 ? '+' : ''}${t.pct}% vs 30-day.` : ''}</div>
    ${rows ? `<table class="ptable small"><thead><tr><th>Cardmarket</th><th>Price</th><th>Dated</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
    ${tcp}
    <div class="row"><button class="btn sm" data-act="refresh-one">${ic('refresh', 'sm')}Refresh this price</button>${cmUrl ? `<a class="small" href="${esc(cmUrl)}" target="_blank" rel="noopener noreferrer" title="Searches Cardmarket for “${esc(c.name)}” — pick ${esc(c.set_name || 'the set')} ${esc(c.number || '')}">Find on Cardmarket</a>` : ''}</div></div>`;
}

/* ---------- TCGdex hourly Cardmarket prices ---------- */
const PT_TO_TD = (() => { const m = {}; for (const [td, pt] of Object.entries(TCGDEX_SET_MAP)) (m[pt] ||= []).push(td); return m; })();
const normNo = n => String(n || '').toUpperCase().replace(/^([A-Z]*)0+(?=\d)/, '$1');
async function tdSetIndex(tdSet) {
  S.tdIndex ||= {};
  const hit = S.tdIndex[tdSet]; if (hit && Date.now() - hit.ts < 7 * 864e5) return hit.m;
  const j = await tcgdexJson(`/sets/${encodeURIComponent(tdSet)}`); if (!j?.cards) return null;
  const m = {}; for (const c of j.cards) if (c?.id && c.localId != null) m[normNo(c.localId)] = { id:String(c.id), name:String(c.name || '') };
  S.tdIndex[tdSet] = { ts:Date.now(), m }; return m;
}
async function tcgdexIdFor(c) {
  const sets = [...(PT_TO_TD[c.set_id] || []), ...Object.entries(S.tcgdexSetMap || {}).filter(([, pt]) => pt === c.set_id).map(([td]) => td)];
  for (const td of [...new Set(sets)]) {
    const m = await tdSetIndex(td).catch(() => null); const e = m?.[normNo(c.number)];
    if (e && normName(e.name) === normName(c.name)) return e.id;   // same card name on both sides, or no match
  }
  return null;
}
/* Fetch TCGdex prices for these cards (skips ones fetched in the last hour). Never throws; returns how many updated. */
async function tcgdexPrices(ids, onProgress, signal) {
  const todo = [...new Set(ids)].map(id => S.cards[id]).filter(c => c && !c.custom && !(c.price?.td?.fetched && Date.now() - Date.parse(c.price.td.fetched) < 36e5));
  let done = 0, got = 0;
  const work = async c => {
    try {
      if (signal?.aborted) return;
      c.tdId ||= await tcgdexIdFor(c);
      if (c.tdId) {
        const j = await tcgdexJson(`/cards/${encodeURIComponent(c.tdId)}`, signal), cm = j?.pricing?.cardmarket;
        if (cm) { const n = v => v > 0 ? +v : null;
          c.price ||= {}; c.price.td = { trend:n(cm.trend), avg1:n(cm.avg1), avg7:n(cm.avg7), avg30:n(cm.avg30), low:n(cm.low),
            trendH:n(cm['trend-holo']), avg7H:n(cm['avg7-holo']), avg30H:n(cm['avg30-holo']), lowH:n(cm['low-holo']),
            updated:String(cm.updated || '').slice(0, 10), fetched:new Date().toISOString() }; c.price.fetched = c.price.td.fetched; got++; }
      }
    } catch { /* offline or TCGdex down: keep what we have */ }
    onProgress?.(++done, todo.length);
  };
  for (let i = 0; i < todo.length && !signal?.aborted; i += 6) await Promise.all(todo.slice(i, i + 6).map(work));   // 6 at a time
  if (todo.length) save();
  return got;
}

/* ---------- API search ---------- */
function apiHeaders() { return S.settings.apiKey ? { 'X-Api-Key': S.settings.apiKey } : {}; }
/* Phone keyboards turn " into “ ”, capitalise the first word (Artist:) and can add a space after
   a colon. The API's field names are case-sensitive and it only understands straight quotes, so any
   of these gives HTTP 400. Fix them up before sending. */
const API_FIELDS = ['id','name','supertype','subtypes','hp','types','evolvesFrom','evolvesTo','rules','abilities.name','abilities.text','attacks.name',
  'attacks.text','attacks.damage','attacks.cost','convertedRetreatCost','weaknesses.type','resistances.type','number','artist','rarity','flavorText',
  'nationalPokedexNumbers','regulationMark','legalities.standard','legalities.expanded','legalities.unlimited',
  'set.id','set.name','set.series','set.releaseDate','set.ptcgoCode','set.legalities.standard','set.legalities.expanded','set.legalities.unlimited'];
const FIELD_MAP = Object.fromEntries(API_FIELDS.map(f => [f.toLowerCase(), f]));
function cleanAdvanced(q) {
  return q.replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[`\u00A0]/g, m => m === '`' ? '' : ' ')
    .replace(/([\w.]+)\s*:\s+/g, '$1:')                                          // "artist: Yuka" → "artist:Yuka"
    .replace(/(^|[\s(])([-!]?)([A-Za-z][\w.]*):/g, (m, pre, neg, f) => pre + neg + (FIELD_MAP[f.toLowerCase()] || f) + ':')
    .replace(/\s+/g, ' ').trim();
}
function buildQuery(mode, term) {
  const t = term.trim(), q = t.replace(/["\\]/g, '');
  if (mode === 'advanced') return cleanAdvanced(t);
  if (mode === 'code') return '';
  if (mode === 'artist') return `artist:"${q}"`;
  if (mode === 'set') {
    const hit = (S.setsCache?.data || []).find(s => s.name.toLowerCase() === q.toLowerCase() || s.id.toLowerCase() === q.toLowerCase());
    return hit ? `set.id:${hit.id}` : `set.name:"${q}"`;
  }
  // card name: single word → prefix wildcard (Pikachu → Pikachu V, Pikachu ex…); phrase → exact phrase
  return /\s/.test(q) ? `name:"${q}"` : `name:${q.replace(/[^\p{L}\p{N}'.\-é]/gu, '')}*`;
}
async function apiFetchAll(query, onProgress, signal, limit = Infinity) {
  const select = 'id,name,number,artist,rarity,supertype,nationalPokedexNumbers,set,images,tcgplayer,cardmarket';
  let page = 1, retries = 0, total = Infinity; const all = [];
  while (all.length < total) {
    const size = Math.min(CONFIG.pageSize, limit);
    const url = `${CONFIG.apiBase}/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=${size}&orderBy=set.releaseDate&select=${select}`;
    const res = await fetch(url, { headers:apiHeaders(), signal });
    if (res.status === 429 || res.status >= 500) {
      if (++retries > CONFIG.maxRetries) throw new Error(`API busy (HTTP ${res.status}). Try again shortly${S.settings.apiKey ? '' : ', or add an API key in Settings'}.`);
      onProgress?.(all.length, total, `API busy — retrying in ${2 ** retries}s…`);
      await sleep(1000 * 2 ** retries, signal); continue;
    }
    if (!res.ok) {
      let msg = ''; try { const j = await res.json(); msg = j?.error?.message || j?.message || ''; } catch {}
      const err = new Error(`HTTP ${res.status}${msg ? ': ' + msg : ''}`); err.status = res.status; err.query = query; throw err;
    }
    retries = 0;
    const j = await res.json(); const d = j.data || [];
    total = j.totalCount ?? d.length; all.push(...d);
    onProgress?.(all.length, total);
    if (!d.length || d.length < size || all.length >= limit) break;
    page++;
  }
  return all.map(normApi);
}
/* Merge fresh API data into the cache without losing an artist credit that came from you or TCGdex
   (the API returns an empty artist for those cards, which must not overwrite it). Once the API itself
   credits a card, its credit wins and the provenance flags are dropped. */
function mergeCard(c) {
  const old = S.cards[c.id], m = { ...old, ...c };
  const ours = c.artist_assigned || c.artist_tcgdex;
  if (!c.artist && old?.artist) { m.artist = old.artist; }
  else if (c.artist && !ours) { delete m.artist_assigned; delete m.artist_tcgdex; }
  if (!c.price && old?.price) m.price = old.price;
  else if (c.price && old?.price?.td) m.price = { ...c.price, td:old.price.td };
  if (old?.tdId && !m.tdId) m.tdId = old.tdId;
  S.cards[c.id] = m;
}
const artistSource = c => c.artist_assigned ? 'assigned by you' : c.artist_tcgdex ? 'TCGdex' : (c.artist ? 'API' : '');

/* ---------- TCGdex: fill in missing artist credits ---------- */
const normName = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isPocketSet = id => /^(?:[AB]\d+[a-z]?|P-[AB])$/.test(id);   // TCG Pocket (digital only) — never in a binder
function ruleSetId(id) { const m = id.match(/^([a-z]+)0*(\d+)(?:\.(5))?$/i); return m ? `${m[1].toLowerCase()}${m[2]}${m[3] ? 'pt5' : ''}` : id; }
async function tcgdexJson(path, signal) {
  const r = await fetch(`${CONFIG.tcgdexBase}${path}`, { signal });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`TCGdex HTTP ${r.status}`);
  return r.json();
}
async function mapTcgdexSet(id, signal) {
  if (TCGDEX_SET_MAP[id]) return TCGDEX_SET_MAP[id];
  S.tcgdexSetMap ||= {};
  if (id in S.tcgdexSetMap) return S.tcgdexSetMap[id];
  await loadSets();
  const ptSets = S.setsCache?.data || [];
  let hit = ptSets.find(s => s.id === ruleSetId(id))?.id || null;
  if (!hit) {   // new set: look up its name on TCGdex and match by name (+ release date if ambiguous)
    try {
      const td = await tcgdexJson(`/sets/${encodeURIComponent(id)}`, signal);
      if (td?.serie?.id === 'tcgp') hit = null;
      else if (td?.name) {
        const c = ptSets.filter(s => normName(s.name) === normName(td.name));
        const d = c.filter(s => (s.releaseDate || '').replace(/\//g, '-') === td.releaseDate);
        hit = (d.length === 1 ? d[0] : c.length === 1 ? c[0] : null)?.id || null;
      }
    } catch (e) { if (e.name === 'AbortError') throw e; return ruleSetId(id); }   // don't cache a guess
  }
  if (hit) { S.tcgdexSetMap[id] = hit; save(); }   // only remember confirmed matches; unknown sets are retried
  return hit;
}
/* Returns cards TCGdex credits to this artist that the API search didn't return, as full API cards
   (images, prices) with the artist filled in. Each match is verified: same card name on both sides. */
async function tcgdexEnrich(artist, apiResults, onProgress, signal) {
  const haveIds = new Set(apiResults.map(c => c.id));
  const key = artist.toLowerCase(); S.tcgdexCache ||= {};
  let list = S.tcgdexCache[key];
  if (!list || Date.now() - list.ts > CONFIG.tcgdexCacheDays * 864e5) {
    onProgress?.('Checking TCGdex for missing credits…');
    const j = await tcgdexJson(`/illustrators/${encodeURIComponent(artist)}`, signal);
    list = S.tcgdexCache[key] = { ts:Date.now(), cards:(j?.cards || []).map(c => ({ id:c.id, localId:String(c.localId), name:c.name })) };
    save();
  }
  const out = { added:[], disputed:[], unmatched:[], pocket:0, total:list.cards.length };
  const want = [];
  for (const t of list.cards) {
    const setId = t.id.slice(0, t.id.length - t.localId.length - 1);
    if (isPocketSet(setId)) { out.pocket++; continue; }
    const pt = await mapTcgdexSet(setId, signal);
    if (!pt) { out.unmatched.push(`${t.name} (${setId} ${t.localId})`); continue; }
    const ptId = `${pt}-${t.localId.replace(/^0+(?=\d)/, '')}`;
    if (!haveIds.has(ptId)) want.push({ ...t, ptId });
  }
  if (!want.length) return out;
  onProgress?.(`Fetching ${want.length} card(s) credited by TCGdex…`);
  const got = new Map();
  for (let i = 0; i < want.length; i += CONFIG.priceBatch) {
    const ids = want.slice(i, i + CONFIG.priceBatch).map(w => `id:"${w.ptId}"`).join(' OR ');
    (await apiFetchAll(`(${ids})`, null, signal)).forEach(c => got.set(c.id, c));
  }
  const proper = apiResults.map(c => c.artist).find(a => a && a.toLowerCase() === key) || artist;   // use the API's spelling/case
  for (const w of want) {
    const c = got.get(w.ptId);
    if (!c || normName(c.name) !== normName(w.name)) { out.unmatched.push(`${w.name} (${w.id})`); continue; }
    if (c.artist && c.artist.toLowerCase() !== key) { out.disputed.push({ ...c, tcgdexArtist:proper }); continue; }
    out.added.push({ ...c, artist:proper, artist_tcgdex:true });
  }
  return out;
}
function gapSets() {
  const s = (S.settings.uncreditedSets || '').split(/[\s,]+/).filter(Boolean);
  return s.length ? s : CONFIG.uncreditedSets;
}
/* All cards with an empty artist in the gap sets. Cached for a week; cards are kept in S.cards. */
async function fetchUncredited(onProgress, signal) {
  const sets = gapSets(), key = sets.join(',');
  const gc = S.gapCache;
  const fresh = gc && gc.key === key && (Date.now() - gc.ts) < CONFIG.uncreditedCacheDays * 864e5 && gc.ids.every(id => S.cards[id]);
  if (fresh) return gc.ids.map(id => S.cards[id]);
  const q = '(' + sets.map(id => `set.id:${id.replace(/[^\w.-]/g, '')}`).join(' OR ') + ')';
  const cards = (await apiFetchAll(q, onProgress, signal)).filter(c => !c.artist);
  cards.forEach(mergeCard);
  S.gapCache = { ts:Date.now(), key, ids:cards.map(c => c.id) }; save();
  return cards.map(c => S.cards[c.id]);
}
/* "PBL 42, MEW 001, SVI 107/198, SWSH050, sv3pt5 1" → candidate API ids. Ambiguous codes try every match. */
function parseCodes(text) {
  const out = [], bad = [];
  for (const raw of text.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean).slice(0, 200)) {
    const t = raw.replace(/\s+/g, ' ');
    let m = t.match(/^([A-Za-z]{2,5}|PR-[A-Za-z]{2,4})[\s-]*([A-Za-z]{0,4}\d{1,4}[a-z]?)(?:\s*\/\s*[A-Za-z]*\d+)?$/);
    let sets = [], num;
    if (m) {
      const code = m[1].toUpperCase(); num = m[2];
      sets = [...new Set([...(CODE_MAP[code] || []), ...(S.setsCache?.data || []).filter(x => (x.ptcgoCode || '').toUpperCase() === code).map(x => x.id)])];
      const asId = (S.setsCache?.data || []).find(x => x.id.toLowerCase() === m[1].toLowerCase());
      if (asId) sets.push(asId.id);
      if (!sets.length) { bad.push(`${raw} (unknown set code ${code})`); continue; }
      const n0 = num.replace(/^([A-Za-z]*)0+(?=\d)/, '$1');
      const nums = [...new Set([num, n0, num.toUpperCase(), n0.toUpperCase(), code + num, code + n0])];
      out.push({ raw, ids:sets.flatMap(st => nums.map(n => `${st}-${n}`)) });
    } else if ((m = t.match(/^([a-z0-9.]+)[\s-]+([A-Za-z]{0,4}\d{1,4}[a-z]?)$/i))) {
      const n0 = m[2].replace(/^([A-Za-z]*)0+(?=\d)/, '$1');
      out.push({ raw, ids:[...new Set([`${m[1].toLowerCase()}-${m[2]}`, `${m[1].toLowerCase()}-${n0}`])] });
    } else bad.push(`${raw} (not recognised)`);
  }
  return { items:out, bad };
}
async function codeSearch(text, onProgress, signal) {
  await loadSets();
  const { items, bad } = parseCodes(text);
  const ids = [...new Set(items.flatMap(i => i.ids))].filter(id => /^[A-Za-z0-9.-]{1,40}$/.test(id));
  const got = new Map();
  for (let i = 0; i < ids.length; i += CONFIG.priceBatch) {
    (await apiFetchAll('(' + ids.slice(i, i + CONFIG.priceBatch).map(id => `id:"${id}"`).join(' OR ') + ')', onProgress, signal)).forEach(c => got.set(c.id, c));
  }
  const results = [], missing = [...bad];
  for (const it of items) { const hit = it.ids.map(id => got.get(id)).find(Boolean); if (hit) { if (!results.includes(hit)) results.push(hit); } else missing.push(`${it.raw} (no such card)`); }
  return { results, missing };
}
function localSearch(mode, term) {
  const t = term.toLowerCase().trim();
  return Object.values(S.cards).filter(c =>
    mode === 'artist' ? c.artist.toLowerCase().includes(t) :
    mode === 'set' ? (c.set_name.toLowerCase().includes(t) || c.set_id.toLowerCase() === t) :
    mode === 'name' ? c.name.toLowerCase().includes(t) :
    `${c.name} ${c.artist} ${c.set_name}`.toLowerCase().includes(t)).sort(SORTS.release);
}
async function loadSets() {
  const fresh = S.setsCache && S.setsCache.v === 2 && (Date.now() - S.setsCache.ts) < CONFIG.setsCacheDays * 864e5;
  if (!fresh) {
    try {
      const r = await fetch(`${CONFIG.apiBase}/sets?orderBy=-releaseDate&pageSize=250&select=id,name,series,releaseDate,ptcgoCode`, { headers:apiHeaders() });
      if (r.ok) { S.setsCache = { v:2, ts:Date.now(), data:(await r.json()).data || [] }; save(); }
    } catch { /* offline — use stale cache */ }
  }
  $('#set-list').innerHTML = (S.setsCache?.data || []).map(s => `<option value="${esc(s.name)}">${esc(s.series)} · ${esc((s.releaseDate || '').slice(0,4))}</option>`).join('');
}

function openAdd() {
  const col = active();
  $('#s-target-name').textContent = col ? col.name : '—';
  $$('input[name=s-target]').forEach(r => { r.disabled = r.value === 'current' && !col; r.checked = col ? r.value === 'current' : r.value === 'new'; });
  $('#s-newname').classList.toggle('hidden', !!col);
  $('#s-unc-note').textContent = `(${gapSets().length} sets: ${gapSets().join(', ')})`;
  $('#s-unc-wrap').classList.toggle('hidden', $('#s-mode').value !== 'artist');
  renderResults();
  $('#dlg-add').showModal();
  if (!$('#s-term').value) $('#s-term').focus();
  loadSets();
}
$('#s-mode').addEventListener('change', e => {
  const ph = { artist:'e.g. Yuka Morii', set:'e.g. Scarlet & Violet—151', name:'e.g. Pikachu or Rare Candy', code:'e.g. PBL 42, MEW 1, SVI 107/198', advanced:'e.g. artist:"Mitsuhiro Arita" rarity:"Rare Holo"' };
  $('#s-code-help').classList.toggle('hidden', e.target.value !== 'code');
  $('#s-term').placeholder = ph[e.target.value];
  $('#s-term').setAttribute('list', e.target.value === 'set' ? 'set-list' : '');
  $('#s-unc-wrap').classList.toggle('hidden', e.target.value !== 'artist');
});
$('#form-search').addEventListener('submit', async e => {
  e.preventDefault();
  const mode = $('#s-mode').value, term = $('#s-term').value.trim(); if (!term) return;
  UI.search.abort?.abort(); const ac = UI.search.abort = new AbortController();
  const status = $('#s-status'), btn = $('#s-go');
  btn.disabled = true; status.textContent = 'Searching…';
  let results = [], extra = [], offline = false;
  const wantGaps = mode === 'artist' && $('#s-uncredited').checked;
  const prog = label => (n, total, note) => { status.textContent = note || `${label}: fetched ${n}${isFinite(total) ? ' of ' + total : ''} cards…`; };
  let td = null, tdError = '';
  UI.search.badges = new Map(); UI.search.noSel = new Set();
  try {
    if (mode === 'code') { const r = await codeSearch(term, prog('Looking up'), ac.signal); results = r.results; UI.search.missing = r.missing; }
    else { UI.search.missing = []; results = await apiFetchAll(buildQuery(mode, term), prog(mode === 'artist' ? 'Artist search' : 'Search'), ac.signal); }
    if (mode === 'artist' && S.settings.tcgdex !== false) {
      try { td = await tcgdexEnrich(term, results, note => { status.textContent = note; }, ac.signal); }
      catch (e) { if (e.name === 'AbortError') throw e; tdError = e.message; }
      if (td) {
        td.added.forEach(c => UI.search.badges.set(c.id, 'via TCGdex'));
        td.disputed.forEach(c => { UI.search.badges.set(c.id, `API: ${c.artist}`); UI.search.noSel.add(c.id); });
        results = [...results, ...td.added, ...td.disputed];
      }
    }
    if (wantGaps) extra = await fetchUncredited(prog('Uncredited cards'), ac.signal);
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (err.status >= 400 && err.status < 500 && err.status !== 429) {   // the API understood us and said no: not an offline problem
      status.innerHTML = `The API rejected the query (${esc(err.message)}).<br>Sent: <code class="mono">${esc(err.query)}</code>${mode === 'advanced' ? '<br>Field names are case-sensitive, e.g. <code>artist:</code>, <code>set.id:</code>, <code>nationalPokedexNumbers:</code>. Use straight quotes for phrases.' : ''}`;
      UI.search.results = []; UI.search.extra = []; renderResults(); return;
    }
    offline = true; results = results.length ? results : localSearch(mode, term);
    if (wantGaps && S.gapCache) extra = S.gapCache.ids.map(id => S.cards[id]).filter(Boolean);
    status.textContent = `Couldn't reach the API (${err.message}). Showing ${results.length} matching card(s) already saved on this device.`;
  } finally { btn.disabled = false; }
  if (mode === 'artist') {
    // cards you previously assigned to this artist join the main results; the rest stay "uncredited"
    const t = term.toLowerCase(), ids = new Set(results.map(c => c.id));
    const assigned = Object.values(S.cards).filter(c => (c.artist_assigned || c.artist_tcgdex) && c.artist.toLowerCase().includes(t) && !ids.has(c.id));
    assigned.forEach(c => UI.search.badges.set(c.id, c.artist_tcgdex ? 'via TCGdex' : 'set by you'));
    results = [...results, ...assigned].sort(SORTS.release);
    assigned.forEach(c => ids.add(c.id));
    extra = extra.filter(c => !ids.has(c.id) && !c.artist_assigned && !c.artist_tcgdex).sort(SORTS.release);
  }
  UI.search.results = results; UI.search.extra = extra; UI.search.artist = mode === 'artist' ? term : '';
  UI.search.extraFilter = ''; $('#s-extra-filter').value = '';
  const have = new Set(active()?.cardIds || []);
  UI.search.sel = new Set(results.filter(c => !have.has(c.id) && !UI.search.noSel.has(c.id)).map(c => c.id));
  UI.search.hideHave = false;
  if (!offline) {
    const nTd = [...UI.search.badges.values()].filter(v => v === 'via TCGdex').length, nDisp = td?.disputed.length || 0;
    const parts = [];
    if (mode === 'artist') parts.push(`${results.length - nTd - nDisp - [...UI.search.badges.values()].filter(v => v === 'set by you').length} credited by the Pokémon TCG API`);
    if (nTd) parts.push(`${nTd} credited via TCGdex`);
    if ([...UI.search.badges.values()].includes('set by you')) parts.push(`${[...UI.search.badges.values()].filter(v => v === 'set by you').length} set by you`);
    if (nDisp) parts.push(`${nDisp} where the two databases disagree (not selected)`);
    let msg = results.length ? (mode === 'artist' ? `Found ${results.length}: ${parts.join(' · ')}.` : `Found ${results.length} card${results.length === 1 ? '' : 's'}.`) + ' Tap to deselect any you don\'t want.' : 'No cards found. Check the spelling, or try Advanced query.';
    if (td?.unmatched.length) msg += ` ${td.unmatched.length} TCGdex card(s) couldn't be matched: ${td.unmatched.slice(0, 5).join(', ')}${td.unmatched.length > 5 ? '…' : ''}.`;
    if (tdError) msg += ` TCGdex unavailable (${tdError})${wantGaps ? '' : ' — tick "Also list every card with no artist credit" to find newer cards by eye'}.`;
    if (extra.length) msg += ` + ${extra.length} uncredited to check (below).`;
    if (UI.search.missing?.length) msg += ` Not found: ${UI.search.missing.slice(0, 8).join(', ')}${UI.search.missing.length > 8 ? '…' : ''}.`;
    status.textContent = msg;
  }
  if (!$('#s-newname').value || $('#s-newname').dataset.auto) { $('#s-newname').value = term; $('#s-newname').dataset.auto = '1'; }
  renderResults();
});
$('#s-newname').addEventListener('input', e => delete e.target.dataset.auto);
function renderResults() {
  const { results, extra, sel, hideHave } = UI.search;
  const target = $('input[name=s-target]:checked')?.value;
  const have = new Set(target === 'current' ? (active()?.cardIds || []) : []);
  const shown = hideHave ? results.filter(c => !have.has(c.id)) : results;
  $('#s-tools').classList.toggle('hidden', !results.length && !extra.length);
  const tile = c => `<button type="button" class="res${sel.has(c.id) ? ' sel' : ''}${have.has(c.id) ? ' have' : ''}" data-rid="${esc(c.id)}" aria-pressed="${sel.has(c.id)}" title="${esc(c.name)} · ${esc(c.set_name)} ${esc(c.number)}">
    ${c.img_s ? `<img src="${esc(c.img_s)}" alt="" loading="lazy">` : `<span class="noimg">${esc(c.name)}</span>`}
    ${have.has(c.id) ? '<span class="badge">In collection</span>' : UI.search.badges.has(c.id) ? `<span class="badge">${esc(UI.search.badges.get(c.id))}</span>` : ''}
    <span class="cap"><b>${esc(c.name)}</b>${esc(c.set_name)} · ${esc(c.number)}</span></button>`;
  $('#s-results').innerHTML = shown.map(tile).join('');
  $('#s-extra').classList.toggle('hidden', !extra.length);
  $('#s-jump').classList.toggle('hidden', !extra.length);
  if (extra.length) {
    const f = UI.search.extraFilter.toLowerCase().split(/\s+/).filter(Boolean);
    const ex = extra.filter(c => (!hideHave || !have.has(c.id)) && f.every(t => `${c.name} ${c.set_name} ${c.set_id} ${c.number}`.toLowerCase().includes(t)));
    const cap = 120;   // keep the DOM light; filter to narrow down
    $('#s-extra-artist').textContent = UI.search.artist;
    $('#s-extra-count').textContent = `${ex.length} of ${extra.length} uncredited cards${ex.length > cap ? ` — showing the first ${cap}, type a name to narrow down` : ''} · ${extra.filter(c => sel.has(c.id)).length} selected`;
    $('#s-extra-results').innerHTML = ex.slice(0, cap).map(tile).join('');
  }
  const n = [...sel].filter(id => !have.has(id)).length;
  $('#s-count').textContent = `${sel.size} selected`;
  $('#s-add').textContent = `Add ${n} card${n === 1 ? '' : 's'}`;
  $('#s-add').disabled = !n;
}
['#s-results','#s-extra-results'].forEach(sel => $(sel).addEventListener('click', e => {
  const b = e.target.closest('[data-rid]'); if (!b) return;
  const id = b.dataset.rid, s = UI.search.sel; s.has(id) ? s.delete(id) : s.add(id); renderResults();
}));
let exT;
$('#s-extra-filter').addEventListener('input', e => { clearTimeout(exT); exT = setTimeout(() => { UI.search.extraFilter = e.target.value.trim(); renderResults(); }, 150); });
$('#s-tools').addEventListener('click', e => {
  const k = e.target.closest('[data-sel]')?.dataset.sel; if (!k) return;
  const r = UI.search.results, have = new Set(active()?.cardIds || []);
  if (k === 'all') UI.search.sel = new Set(r.filter(c => !have.has(c.id) && !UI.search.noSel.has(c.id)).map(c => c.id));
  if (k === 'none') UI.search.sel = new Set();
  if (k === 'pokemon') UI.search.sel = new Set([...UI.search.sel].filter(id => [...r, ...UI.search.extra].find(c => c.id === id)?.supertype === 'Pokémon'));
  if (k === 'new') UI.search.hideHave = !UI.search.hideHave;
  if (k === 'jump') { $('#s-extra').scrollIntoView({ behavior:'smooth', block:'start' }); $('#s-extra-filter').focus({ preventScroll:true }); return; }
  renderResults();
});
$$('input[name=s-target]').forEach(r => r.addEventListener('change', () => { $('#s-newname').classList.toggle('hidden', r.value !== 'new' || !r.checked); renderResults(); }));
$('#s-add').addEventListener('click', () => {
  const extraIds = new Set(UI.search.extra.map(c => c.id));
  const picked = [...UI.search.results, ...UI.search.extra].filter(c => UI.search.sel.has(c.id));
  let col;
  if ($('input[name=s-target]:checked').value === 'new') {
    col = newCollection(uniqueName($('#s-newname').value.trim() || 'New collection'));
    S.collections[col.id] = col; S.order.push(col.id); S.activeId = col.id;
  } else col = active();
  const have = new Set(col.cardIds); let n = 0;
  let assigned = 0;
  for (const c of picked) {
    mergeCard(c);
    if (extraIds.has(c.id) && UI.search.artist && !S.cards[c.id].artist) { S.cards[c.id].artist = UI.search.artist; S.cards[c.id].artist_assigned = true; assigned++; }
    if (!have.has(c.id)) { col.cardIds.push(c.id); n++; }
  }
  col.updated = Date.now(); save();
  $('#dlg-add').close(); UI.filters = { text:'', set:'all', status:'all', rarity:'all' }; render();
  toast(`Added ${n} card${n === 1 ? '' : 's'} to "${col.name}"${assigned ? ` (${assigned} credited to ${UI.search.artist} by you)` : ''}`, 'success');
});
$('#dlg-add').addEventListener('close', () => UI.search.abort?.abort());

/* ---------- custom card ---------- */
function openCustom() {
  if (!active()) { toast('Create a collection first', 'warn'); return; }
  $('#form-custom').reset(); $('#dlg-custom').showModal();
}
$('#form-custom').addEventListener('submit', e => {
  if (e.submitter?.value !== 'ok') return;
  const v = id => $('#' + id).value.trim();
  if (!v('cc-name')) { e.preventDefault(); return; }
  const set = v('cc-set') || 'Custom';
  const c = { id:'custom-' + uid(), name:v('cc-name'), number:v('cc-number'), set_id:'custom-' + slug(set), set_name:set, series:'Custom',
    release_date:v('cc-date'), artist:v('cc-artist'), rarity:v('cc-rarity'), dex:null, supertype:'', img_s:v('cc-img'), img_l:v('cc-img'), custom:true };
  S.cards[c.id] = c; const col = active(); col.cardIds.push(c.id); col.updated = Date.now();
  save(); render(); toast(`Added custom card "${c.name}"`, 'success');
});

/* ==========================================================================
   EXPORT / IMPORT
   ========================================================================== */
function exportFilters() {
  return { set:$('#e-set').value, rarity:$('#e-rarity').value, status:$('#e-status').value, text:$('#e-text').checked ? UI.filters.text : '' };
}
function exportRows() {
  const f = exportFilters(), ids = $('#e-scope').value === 'all' ? S.order : [S.activeId], rows = [];
  for (const cid of ids) {
    const col = S.collections[cid]; if (cid !== S.activeId) syncOwned(col);
    const L = cid === S.activeId ? UI.layout : computeLayout(col);
    for (const c of L.cards) if (matches(c, col, f)) rows.push({ col, c, p:L.pos.get(c.id), own:!!col.owned[c.id], q:entryQty(col, c), sp:entrySpares(col, c) });
  }
  return rows;
}
function openExport() {
  const col = active();
  const cards = $('#e-scope').value === 'all' ? Object.values(S.cards) : (col ? UI.layout.cards : []);
  const sets = new Map(); [...cards].sort(SORTS.release).forEach(c => sets.set(c.set_id, c.set_name));
  $('#e-set').innerHTML = `<option value="all">All sets</option>` + [...sets].map(([id, n]) => `<option value="${esc(id)}">${esc(n)}</option>`).join('');
  $('#e-rarity').innerHTML = `<option value="all">All rarities</option>` + [...new Set(cards.map(c => c.rarity || '—'))].sort().map(r => `<option>${esc(r)}</option>`).join('');
  if (!$('#dlg-export').open) {   // first open: prefill from on-screen filters
    $('#e-set').value = sets.has(UI.filters.set) ? UI.filters.set : 'all';
    $('#e-rarity').value = UI.filters.rarity; if (!$('#e-rarity').value) $('#e-rarity').value = 'all';
    $('#e-status').value = UI.filters.status;
    $('#e-text').checked = !!UI.filters.text;
    $('#e-text-val').textContent = UI.filters.text;
    $('#e-text').closest('label').classList.toggle('hidden', !UI.filters.text);
    $('#e-scope').disabled = !col; $('#e-go').disabled = !col;
    $('#dlg-export').showModal();
  }
  updateExportCount();
}
function updateExportCount() {
  if (!active()) { $('#e-count').textContent = 'Nothing to export yet — you can still restore a backup below.'; return; }
  const rows = exportRows(), own = rows.filter(r => r.own).length;
  $('#e-count').textContent = `${rows.length} card${rows.length === 1 ? '' : 's'} selected (${own} owned, ${rows.length - own} needed).`;
  const fmt = $('input[name=e-fmt]:checked').value;
  $('#e-copy').classList.toggle('hidden', fmt !== 'txt' && fmt !== 'link');
  $('#e-prices-wrap').classList.toggle('hidden', fmt !== 'link');
  $('#e-go').innerHTML = fmt === 'link' ? `${ic('share', 'sm')}Share link` : `${ic('download', 'sm')}Download`;
  $('#e-go').disabled = !rows.length;
}
['e-set','e-rarity','e-status','e-text'].forEach(id => $('#' + id).addEventListener('change', updateExportCount));
$('#e-scope').addEventListener('change', openExport);
$$('input[name=e-fmt]').forEach(r => r.addEventListener('change', updateExportCount));

const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
function buildCsv(rows) {
  const head = ['collection','binder_page','binder_slot','spread','side','owned','quantity','spares','printings_held','condition','paid_gbp_each','paid_date','name','variant','number','set_name','set_id','series','release_date','rarity','artist','artist_source','pokedex','card_id','price_gbp','price_native','price_currency','price_source','price_metric','price_date','fx_gbp_per_unit','fx_source','price_fetched'];
  const lines = rows.map(({ col, c, p, own, q, sp }) => { const s = p ? spreadOf(p.page, col.startRight) : {};
    const rec = col.copies?.[c.cardId] || {}, rv = c.variant ? rec[c.variant] || {} : {};
    const held = Object.entries(rec).filter(([, r]) => r?.q).map(([v, r]) => `${VARIANTS[v]}×${r.q}`).join('; ');
    const conds = c.variant ? rv.c || '' : [...new Set(Object.values(rec).map(r => r?.c).filter(Boolean))].join('/');
    const paid = c.variant ? rv.p || '' : (Object.values(rec).find(r => r?.p)?.p || ''), pdate = c.variant ? rv.d || '' : (Object.values(rec).find(r => r?.d)?.d || '');
    return [col.name, p?.page, p?.slot, s.spread, s.side, own ? 'Y' : 'N', q, sp, held, conds, paid, pdate, c.name, c.variant ? VARIANTS[c.variant] : '', c.number, c.set_name, c.set_id, c.series, c.release_date, c.rarity, c.artist, artistSource(c), c.dex, c.cardId || c.id, ...priceCols(c)].map(csvCell).join(','); });
  return '\uFEFF' + [head.join(','), ...lines].join('\r\n');   // BOM so Excel reads é correctly
}
function priceCols(c) {
  const pi = priceOf(c); if (!pi) return ['', '', '', '', '', '', '', '', ''];
  const r = fxRate(pi.cur);
  return [pi.gbp != null ? pi.gbp.toFixed(2) : '', pi.native.toFixed(2), pi.cur, pi.src, pi.metric, pi.date, r ? r.toFixed(6) : '',
    parseFloat(S.settings.fx?.[pi.cur]) > 0 ? 'manual' : (S.fx ? `ECB ${S.fx.date}` : ''), (pi.fetched || '').slice(0, 10)];
}
function buildText(rows) {
  const f = exportFilters(), label = f.status === 'needed' ? 'Want list' : f.status === 'owned' ? 'Owned' : f.status === 'spare' ? 'Trade list' : 'Checklist';
  let out = '', curCol = null, curSet = null;
  for (const { col, c, own, sp } of rows) {
    if (col !== curCol) { const n = rows.filter(r => r.col === col).length; out += `${out ? '\n' : ''}${col.name} — ${label} (${n})\n${'='.repeat(Math.min(60, col.name.length + label.length + 10))}\n`; curCol = col; curSet = null; }
    if (c.set_id !== curSet) { out += `\n${c.set_name}${c.release_date ? ` (${c.release_date.slice(0,4)})` : ''}\n`; curSet = c.set_id; }
    const pi = priceOf(c);
    out += `  ${f.status === 'spare' ? `${sp}× ` : own ? '[x] ' : '[ ] '}${c.number ? c.number.padEnd(7) : ''} ${dispName(c)}${c.rarity ? ' · ' + c.rarity : ''}${pi ? ' · ' + fmtPrice(pi) : ''}\n`;
  }
  const v = sumValue(rows.map(r => r.c));
  if (v.priced) out += `\nTotal ≈ ${GBP.format(v.gbp)} for ${v.priced} priced card(s). ${(S.settings.priceSource || CONFIG.priceSource) === 'tcgplayer' ? 'TCGplayer' : 'Cardmarket'} prices, price dates ${dateRange(v)}; converted to GBP at ${S.fx ? 'ECB rate of ' + S.fx.date : 'your rate'}.\n`;
  return out + `\nExported ${today()} from PokéBinder Studio\n`;
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href:url, download:name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileSafe = s => String(s).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 60) || 'export';
function exportName(ext) {
  const f = exportFilters(), base = $('#e-scope').value === 'all' ? 'All_collections' : fileSafe(active().name);
  const parts = [base, f.status !== 'all' ? f.status : '', f.set !== 'all' ? fileSafe(f.set) : '', today()].filter(Boolean);
  return parts.join('_') + '.' + ext;
}
$('#e-go').addEventListener('click', () => {
  const rows = exportRows(); if (!rows.length) return;
  const fmt = $('input[name=e-fmt]:checked').value;
  if (fmt === 'link') { shareRows(rows); return; }
  if (fmt === 'csv') download(exportName('csv'), buildCsv(rows), 'text/csv;charset=utf-8');
  else if (fmt === 'txt') download(exportName('txt'), buildText(rows), 'text/plain;charset=utf-8');
  else download(exportName('json'), JSON.stringify(rows.map(({ col, c, p, own }) => ({ collection:col.name, binder_page:p?.page ?? null, binder_slot:p?.slot ?? null, owned:own, ...c })), null, 2), 'application/json');
  toast(`Exported ${rows.length} cards`, 'success');
});
$('#e-copy').addEventListener('click', async () => {
  try {
    const fmt = $('input[name=e-fmt]:checked').value;
    await navigator.clipboard.writeText(fmt === 'link' ? await buildShareUrl(exportRows(), $('#e-prices').checked) : buildText(exportRows()));
    toast(fmt === 'link' ? 'Link copied — paste it into a message' : 'Copied to clipboard', 'success');
  }
  catch { toast('Clipboard not available — use Download instead', 'error'); }
});
$('#e-backup').addEventListener('click', () => {
  const state = { ...S, settings:{ ...S.settings, apiKey:'' } };   // never put the API key in a file that might be shared
  download(`PokeBinder_backup_${today()}.json`, JSON.stringify({ app:'PokeBinderStudio', exported:new Date().toISOString(), state }), 'application/json');
  S.settings.lastBackup = Date.now(); save(); toast('Backup downloaded', 'success');
});
/* Backups and share links are untrusted input: rebuild them field by field with types, lengths and keys checked. */
const ID_RE = /^[A-Za-z0-9._-]{1,60}$/;
const str = (v, n = 200) => typeof v === 'string' ? v.slice(0, n) : '';
const numOr = (v, d = null) => Number.isFinite(v) ? v : d;
function sanitizeCard(k, c) {
  if (!c || typeof c !== 'object' || !ID_RE.test(k) || BAD_KEYS.has(k)) return null;
  const out = { id:k, name:str(c.name, 120) || '?', number:str(c.number, 20), set_id:str(c.set_id, 40) || 'unknown', set_name:str(c.set_name, 100) || 'Unknown set',
    series:str(c.series, 60), release_date:/^\d{4}-\d{2}-\d{2}$/.test(c.release_date) ? c.release_date : '', artist:str(c.artist, 80), rarity:str(c.rarity, 60),
    dex:numOr(c.dex), supertype:str(c.supertype, 20), img_s:safeUrl(c.img_s), img_l:safeUrl(c.img_l), custom:!!c.custom };
  if (c.artist_assigned) out.artist_assigned = true; if (c.artist_tcgdex) out.artist_tcgdex = true;
  if (typeof c.tdId === 'string' && /^[A-Za-z0-9.-]{1,40}$/.test(c.tdId)) out.tdId = c.tdId;
  if (Array.isArray(c.variants)) out.variants = c.variants.filter(v => ['normal','holo','reverse','first'].includes(v));
  const pr = c.price;
  if (pr && typeof pr === 'object') {
    const sp = q => q && typeof q === 'object' && q.value > 0 ? { value:+q.value, metric:str(q.metric, 60), low:numOr(q.low), avg30:numOr(q.avg30), rev:numOr(q.rev),
      updated:/^\d{4}-\d{2}-\d{2}$/.test(q.updated) ? q.updated : '', url:safeUrl(q.url),
      ...(q.vars && typeof q.vars === 'object' ? { vars:Object.fromEntries(Object.entries(q.vars).filter(([v, x]) => VARIANTS[v] && x > 0).map(([v, x]) => [v, +x])) } : {}) } : undefined;
    const cm = sp(pr.cm), tcp = sp(pr.tcp);
    if (cm && pr.cm) for (const k of ['avg7', 'avg1', 'trend', 'exLow', 'revLow', 'revAvg30', 'revAvg7']) cm[k] = numOr(pr.cm[k]) > 0 ? +pr.cm[k] : null;
    let td = null;
    if (pr.td && typeof pr.td === 'object') { td = {}; for (const k of ['trend', 'avg1', 'avg7', 'avg30', 'low', 'trendH', 'avg7H', 'avg30H', 'lowH']) td[k] = numOr(pr.td[k]) > 0 && pr.td[k] < 1e6 ? +pr.td[k] : null;
      td.updated = /^\d{4}-\d{2}-\d{2}$/.test(pr.td.updated) ? pr.td.updated : ''; td.fetched = str(pr.td.fetched, 30); }
    if (cm || tcp || td) out.price = { ...(cm ? { cm } : {}), ...(tcp ? { tcp } : {}), ...(td ? { td } : {}), fetched:str(pr.fetched, 30) || new Date().toISOString() };
  }
  return out;
}
function sanitizeState(st) {
  if (!st || typeof st !== 'object') return null;
  const cards = {}, collections = {}, order = [];
  for (const [k, c] of Object.entries(st.cards || {})) { const x = sanitizeCard(k, c); if (x) cards[k] = x; }
  for (const [id, c] of Object.entries(st.collections || {})) {
    if (!c || typeof c !== 'object' || !/^c_[a-z0-9]{1,30}$/.test(id) || c.id !== id) continue;
    const col = newCollection(str(c.name, 80) || 'Restored collection', { layout:LAYOUTS[c.layout] ? c.layout : undefined, sort:SORTS[c.sort] ? c.sort : undefined,
      setBreaks:!!c.setBreaks, startRight:c.startRight !== false, variantSlots:!!c.variantSlots });
    col.id = id; col.created = numOr(c.created, Date.now()); col.updated = numOr(c.updated, Date.now());
    col.cardIds = [...new Set((Array.isArray(c.cardIds) ? c.cardIds : []).filter(x => typeof x === 'string' && cards[x]))];
    const copies = c.copies && typeof c.copies === 'object' ? c.copies : Object.fromEntries(Object.keys(c.owned || {}).filter(x => cards[x]).map(x => [x, { any:{ q:1 } }]));   // pre-2.4 backups
    for (const [cid, rec] of Object.entries(copies)) {
      if (!cards[cid] || !rec || typeof rec !== 'object') continue;
      for (const [v, r] of Object.entries(rec)) {
        if (!VARIANTS[v] || !r || typeof r !== 'object') continue;
        const q = Math.max(0, Math.min(999, Math.floor(numOr(r.q, 0))));
        const e = { q }; if (CONDITIONS.includes(r.c)) e.c = r.c; if (r.p > 0 && r.p < 1e6) e.p = +r.p; if (/^\d{4}-\d{2}-\d{2}$/.test(r.d)) e.d = r.d;
        (col.copies[cid] ||= {})[v] = e;
      }
    }
    col.history = (Array.isArray(c.history) ? c.history : []).filter(h => h && /^\d{4}-\d{2}-\d{2}$/.test(h.d)).slice(-730).map(h => ({ d:h.d, v:numOr(h.v, 0), n:numOr(h.n, 0), p:numOr(h.p, 0) }));
    collections[id] = col;
  }
  for (const id of (Array.isArray(st.order) ? st.order : [])) if (collections[id] && !order.includes(id)) order.push(id);
  Object.keys(collections).forEach(id => { if (!order.includes(id)) order.push(id); });
  const labelPrices = {};
  for (const [k, v] of Object.entries(st.labelPrices || {})) if (/^[A-Za-z0-9._-]{1,60}\|[a-z]*$/.test(k) && v > 0 && v < 1e5) labelPrices[k] = Math.round(v * 100) / 100;
  return { cards, collections, order, labelPrices, ...sanitizeVendor(st, cards), activeId:collections[st.activeId] ? st.activeId : order[0] || null };
}
$('#e-restore-file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  let incoming;
  try {
    const j = JSON.parse(await file.text());
    incoming = j.app === 'PokeBinderStudio' ? sanitizeState(j.state) : null;
    if (!incoming || (!Object.keys(incoming.collections).length && !Object.keys(incoming.stock).length && !incoming.ledger.length)) throw new Error('not a PokéBinder backup');
  } catch (err) { toast('Restore failed: ' + err.message, 'error'); return; }
  const mode = $('#e-restore-mode').value, nCols = Object.keys(incoming.collections).length;
  if (mode === 'replace') {
    if (!await confirmDlg('Replace everything?', `All current collections will be replaced with the ${nCols} in this backup. Download a backup first if unsure.`, 'Replace')) return;
    S = { ...blankState(), ...incoming, settings:{ ...S.settings } };   // keep this device's settings (incl. API key)
  } else {
    Object.assign(S.cards, incoming.cards);
    // Same collection (same id, e.g. backup from your other device) → union of cards and owned ticks.
    // Different collection → added alongside, renamed if the name clashes.
    for (const id of (incoming.order || Object.keys(incoming.collections))) {
      const c = structuredClone(incoming.collections[id]); if (!c) continue;
      const mine = S.collections[c.id];
      if (mine) {
        const have = new Set(mine.cardIds); c.cardIds.forEach(x => { if (!have.has(x)) mine.cardIds.push(x); });
        mine.copies ||= {};
        for (const [cid, rec] of Object.entries(c.copies)) { const m = mine.copies[cid] ||= {};
          for (const [v, r] of Object.entries(rec)) m[v] = { ...r, ...m[v], q:Math.max(m[v]?.q || 0, r.q || 0) }; }   // union: keep the higher count
        mine.updated = Date.now();
      } else { c.name = uniqueName(c.name); S.collections[c.id] = c; S.order.push(c.id); }
    }
    S.activeId ||= S.order[0];
    S.labelPrices = { ...incoming.labelPrices, ...S.labelPrices };
    mergeVendor(incoming);
  }
  initVendorState();
  await flush(); $('#dlg-export').close(); render(); toast(`Restored ${nCols} collection${nCols === 1 ? '' : 's'}`, 'success');
});

/* ==========================================================================
   PRINT
   ========================================================================== */
function openPrint() {
  if (!active()?.cardIds.length) { toast('Nothing to print yet', 'warn'); return; }
  const fa = filtersActive();
  $('#p-filters').checked = fa; $('#p-filters').disabled = !fa;
  $('#p-filter-desc').textContent = fa ? `(${describeFilters()})` : '(none set)';
  syncPrintOptions(); $('#dlg-print').showModal();
}
function describeFilters() {
  const f = UI.filters, b = [];
  if (f.set !== 'all') b.push(S.cards[active().cardIds.find(id => S.cards[id]?.set_id === f.set)]?.set_name || f.set);
  if (f.status !== 'all') b.push(f.status); if (f.rarity !== 'all') b.push(f.rarity); if (f.text) b.push(`"${f.text}"`);
  return b.join(', ');
}
function syncPrintOptions() {
  const t = $('input[name=p-type]:checked').value;
  $('#p-needed-wrap').classList.toggle('hidden', t === 'guide' || t === 'labels');
  $('#p-filters').closest('label').classList.toggle('hidden', t === 'labels');
  $('#p-go').innerHTML = t === 'labels' ? `${ic('sticker', 'sm')}Set up stickers` : `${ic('printer', 'sm')}Print`;
  $('#p-img-wrap').classList.toggle('hidden', t !== 'placeholders');
  if (t === 'placeholders' && !$('#p-needed').dataset.touched) $('#p-needed').checked = true;
}
$$('input[name=p-type]').forEach(r => r.addEventListener('change', syncPrintOptions));
$('#p-needed').addEventListener('change', e => e.target.dataset.touched = '1');
$('#p-go').addEventListener('click', async () => {
  if ($('input[name=p-type]:checked').value === 'labels') { $('#dlg-print').close(); openLabels(); return; }
  const col = active(), L = UI.layout, type = $('input[name=p-type]:checked').value;
  const useF = $('#p-filters').checked, onlyNeeded = $('#p-needed').checked && type !== 'guide';
  const keep = c => (!useF || matches(c, col)) && (!onlyNeeded || !col.owned[c.id]);
  const root = $('#print-root');
  const own = L.cards.filter(c => col.owned[c.id]).length;
  const head = (title) => `<div class="p-head"><div><h1>${esc(col.name)}</h1><div>${esc(title)}${useF ? ' · filtered: ' + esc(describeFilters()) : ''}</div></div>
    <div class="m">${L.cols * L.rows}-pocket · ${L.pages.length} pages · ${own}/${L.cards.length} owned<br>Printed ${today()}</div></div>`;

  if (type === 'guide') {
    const pages = L.pages.map((p, i) => ({ p, no:i + 1 })).filter(({ p }) => !useF || p.some(c => c && keep(c)));
    root.innerHTML = head('Binder guide') + `<div class="g-pages">${pages.map(({ p, no }) => { const sp = spreadOf(no, col.startRight);
      return `<div class="g-page"><h2>Page ${no}<span>spread ${sp.spread} · ${sp.side} · ${p.filter(c => c && col.owned[c.id]).length}/${p.filter(Boolean).length}</span></h2>
      <div class="g-grid" style="--cols:${L.cols}">${p.map((c, si) => !c ? `<div class="g-cell empty"><span class="n">${si + 1}</span></div>` :
        `<div class="g-cell${col.owned[c.id] ? ' own' : ''}"><span class="s">${col.owned[c.id] ? '✓' : ''}</span><b>${esc(dispName(c))}</b>${esc(c.number)}<br>${esc(c.set_name)}<span class="n">${si + 1}</span></div>`).join('')}</div></div>`; }).join('')}</div>
      <div class="p-foot">Slots are numbered left→right, top→bottom. Shaded = owned.</div>`;
  } else if (type === 'placeholders') {
    const list = L.cards.filter(keep), img = $('#p-img').checked, sheets = [];
    for (let i = 0; i < list.length; i += 9) sheets.push(list.slice(i, i + 9));
    root.innerHTML = sheets.map(sh => `<div class="ph-sheet">${sh.map(c => { const p = L.pos.get(c.id);
      return `<div class="ph"><span class="need">${col.owned[c.id] ? 'OWNED' : 'NEEDED'}</span><div class="t">${esc(dispName(c))}</div>
        <div class="s">${esc(c.set_name)} · <b>${esc(c.number)}</b>${c.rarity ? '<br>' + esc(c.rarity) : ''}</div>
        ${img && safeUrl(c.img_s) ? `<div class="img"><img src="${esc(safeUrl(c.img_l) || safeUrl(c.img_s))}" alt=""></div>` : `<div class="img none">?</div>`}
        <div class="b"><span>${p ? `Page ${p.page} · slot ${p.slot}` : ''}</span><span>${esc(c.release_date || '')}</span></div></div>`; }).join('')}</div>`).join('');
    if (!list.length) root.innerHTML = '<p>No cards to print.</p>';
  } else {
    const list = L.cards.filter(keep), groups = new Map();
    [...list].sort(SORTS.release).forEach(c => { if (!groups.has(c.set_id)) groups.set(c.set_id, []); groups.get(c.set_id).push(c); });
    root.innerHTML = head(onlyNeeded ? 'Want list' : 'Checklist') + `<div class="c-cols">${[...groups.values()].map(g =>
      `<div class="c-set"><h2>${esc(g[0].set_name)}<span>${g.filter(c => col.owned[c.id]).length}/${g.length}</span></h2>${g.sort((a, b) => cmpNum(a.number, b.number)).map(c => { const p = L.pos.get(c.id);
        return `<div class="c-row"><span class="c-box">${col.owned[c.id] ? '✓' : ''}</span><span class="mono">${esc(c.number)}</span><span>${esc(dispName(c))} <span class="r">${esc(c.rarity || '')}</span></span><span class="r">${p ? `p${p.page}·${p.slot}` : ''}${priceOf(c) ? ' · ' + fmtPrice(priceOf(c)) : ''}</span></div>`; }).join('')}</div>`).join('')}</div>
      ${(v => v.priced ? `<div class="p-foot">Value of listed cards ≈ ${GBP.format(v.gbp)} (${v.priced} priced). Price dates ${esc(dateRange(v))}; GBP conversion ${S.fx ? 'ECB ' + esc(S.fx.date) : 'manual rate'}.</div>` : '')(sumValue(list))}`;
  }
  $('#dlg-print').close();
  // wait for images (max 8s) so placeholders don't print blank
  const imgs = $$('img', root);
  if (imgs.length) {
    toast(`Loading ${imgs.length} images for print…`, 'info');
    await Promise.race([Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))), sleep(8000)]);
  }
  window.print();
});
window.addEventListener('afterprint', () => { $('#print-root').innerHTML = ''; });

/* ==========================================================================
   SETTINGS
   ========================================================================== */
async function openSettings() {
  $('#st-psrc').value = S.settings.priceSource || CONFIG.priceSource;
  $('#st-pfig').value = figPref();
  $('#st-theme').value = S.settings.theme || 'system';
  $('#st-where').textContent = location.origin + location.pathname.replace(/index\.html$/, '');
  $('#st-sw').textContent = navigator.serviceWorker?.controller ? 'checking…' : 'none (not installed for offline yet)';
  navigator.serviceWorker?.controller?.postMessage('version');
  $('#st-fx-eur').value = S.settings.fx?.EUR || ''; $('#st-fx-usd').value = S.settings.fx?.USD || '';
  $('#st-fx-status').textContent = S.fx ? `Auto rate: €1 = £${S.fx.eur.toFixed(4)}, $1 = £${S.fx.usd.toFixed(4)} (ECB reference rate for ${S.fx.date}, checked ${new Date(S.fx.fetchedAt).toLocaleString('en-GB')}). An override, if set, wins.` : 'No exchange rate fetched yet.';
  $('#st-key').value = S.settings.apiKey || ''; $('#st-gaps').value = gapSets().join(', '); $('#st-tcgdex').checked = S.settings.tcgdex !== false; $('#st-ver').textContent = 'v' + CONFIG.version;
  $('#dlg-settings').showModal();
  const used = Object.keys(S.cards).length, inUse = new Set(S.order.flatMap(id => S.collections[id].cardIds));
  let est = '';
  try { const e = await navigator.storage?.estimate?.(); if (e) est = ` · ~${(e.usage / 1048576).toFixed(1)} MB used`; } catch {}
  let persisted = false; try { persisted = await navigator.storage?.persisted?.(); } catch {}
  const lb = S.settings.lastBackup ? new Date(S.settings.lastBackup).toLocaleDateString('en-GB') : 'never';
  $('#st-usage').innerHTML = `${S.order.length} collection(s) · ${used} cached card(s), ${used - [...inUse].filter(id => S.cards[id]).length} unused${est}<br>
    Storage: ${Store.db ? 'IndexedDB' : 'localStorage (fallback)'} · ${persisted ? 'protected from automatic clean-up' : 'may be cleared by the browser if space is low'} · last backup: ${lb}`;
}
$('#st-key').addEventListener('change', e => { S.settings.apiKey = e.target.value.trim(); S.setsCache = null; save(); toast('API key saved', 'success'); });
function applyTheme() { const t = S.settings.theme; if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
$('#st-theme').addEventListener('change', e => { S.settings.theme = e.target.value; save(); applyTheme(); });
$('#st-psrc').addEventListener('change', e => { S.settings.priceSource = e.target.value; save(); render(); });
$('#st-pfig').addEventListener('change', e => { if (PRICE_FIG[e.target.value]) { S.settings.priceFig = e.target.value; save(); render(); toast(`Prices now use the ${PRICE_FIG[e.target.value]}`, 'success'); } });
['EUR','USD'].forEach(cur => $('#st-fx-' + cur.toLowerCase()).addEventListener('change', e => {
  const v = parseFloat(e.target.value); S.settings.fx = { ...S.settings.fx, [cur]:v > 0 ? String(v) : '' }; save(); render();
  toast(v > 0 ? `Using your rate: £${v} per ${cur === 'EUR' ? '€' : '$'}1` : 'Back to the automatic ECB rate', 'success');
}));
$('#st-fx-refresh').addEventListener('click', async () => { await loadFx(true); openSettings(); });
$('#st-tcgdex').addEventListener('change', e => { S.settings.tcgdex = e.target.checked; save(); toast(`TCGdex artist credits ${e.target.checked ? 'on' : 'off'}`, 'success'); });
$('#st-gaps').addEventListener('change', e => { S.settings.uncreditedSets = e.target.value.trim(); S.gapCache = null; save(); $('#st-gaps').value = gapSets().join(', '); toast('Uncredited set list saved', 'success'); });
$('#st-key-show').addEventListener('click', e => { const i = $('#st-key'); i.type = i.type === 'password' ? 'text' : 'password'; e.target.textContent = i.type === 'password' ? 'Show' : 'Hide'; });
$('#st-persist').addEventListener('click', async () => {
  const ok = await navigator.storage?.persist?.().catch(() => false);
  toast(ok ? 'Browser will keep your data' : 'Browser declined — install the app or back up regularly', ok ? 'success' : 'warn'); openSettings();
});
$('#st-prune').addEventListener('click', () => {
  const inUse = new Set([...S.order.flatMap(id => S.collections[id].cardIds), ...vendorCardIds()]); let n = 0;
  for (const id of Object.keys(S.cards)) if (!inUse.has(id)) { delete S.cards[id]; n++; }
  save(); toast(`Removed ${n} unused card(s)`, 'success'); openSettings();
});
$('#st-update').addEventListener('click', () => checkForUpdate(true));
$('#st-force').addEventListener('click', forceRefresh);
$('#st-reset').addEventListener('click', async () => {
  if (!await confirmDlg('Reset everything?', 'Deletes all collections, owned ticks and cached cards on this device. This cannot be undone.', 'Delete all')) return;
  S = blankState(); await flush(); $('#dlg-settings').close(); render(); toast('All data cleared', 'info');
});


/* ==========================================================================
   SHARE LINKS — the list travels inside the URL fragment (#s=…), which browsers
   never send to a server. Nothing is uploaded; the receiver's page decodes it locally.
   ========================================================================== */
const SHARE_KIND = { needed:'want', spare:'trade' };
function rowsFor(col, status) {
  if (!col) return [];
  const f = { text:'', set:'all', rarity:'all', status };
  return UI.layout.cards.filter(c => matches(c, col, f)).map(c => ({ col, c, own:!!col.owned[c.id], q:entryQty(col, c), sp:entrySpares(col, c) }));
}
const b64u = bytes => { let b = ''; bytes.forEach(x => b += String.fromCharCode(x)); return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
async function pipeBytes(bytes, stream, maxOut = Infinity) {
  const rs = new Blob([bytes]).stream().pipeThrough(stream), reader = rs.getReader(), chunks = []; let n = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > maxOut) { reader.cancel(); throw new Error('share link too large'); } chunks.push(value); }
  const out = new Uint8Array(n); let o = 0; chunks.forEach(c => { out.set(c, o); o += c.length; }); return out;
}
async function buildShareUrl(rows, withPrices = true, kind) {
  const f = exportFilters?.() || {};
  kind ||= SHARE_KIND[f.status] || 'list';
  const cols = [...new Set(rows.map(r => r.col.name))];
  const payload = { v:1, k:kind, n:cols.length === 1 ? cols[0] : 'Several collections', d:today(),
    a:rows.slice(0, 1500).map(({ c, sp, price }) => { const g = !withPrices ? null : price != null ? price : priceOf(c)?.gbp;
      return [c.cardId || c.id, c.name, c.number, c.set_id, c.set_name, c.variant || '', kind === 'trade' || kind === 'sale' ? sp || 1 : 1, g != null ? Math.round(g * 100) / 100 : null, c.rarity || '', c.lang && c.lang !== 'en' ? c.lang : '']; }) };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  let token;
  if ('CompressionStream' in window) token = '1.' + b64u(await pipeBytes(json, new CompressionStream('deflate-raw')));
  else token = '0.' + b64u(json);
  return `${location.origin}${location.pathname}#s=${token}`;
}
async function shareRows(rows, forceKind) {
  if (!rows.length) { toast('Nothing to share with these filters', 'warn'); return; }
  const withPrices = $('#dlg-export').open ? $('#e-prices').checked : true;
  const f = $('#dlg-export').open ? exportFilters() : null;
  const kind = forceKind || (f ? (SHARE_KIND[f.status] || 'list') : (rows.every(r => !r.own) ? 'want' : 'trade'));
  const url = await buildShareUrl(rows, withPrices, kind);
  const title = `${rows[0].col.name} — ${kind === 'want' ? 'want list' : kind === 'trade' ? 'trade list' : kind === 'sale' ? 'cards for sale' : 'card list'} (${rows.length})`;
  if (url.length > 60000) toast('That list makes a very long link — some apps may cut it off. Filter it down if it fails.', 'warn');
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Share link copied — paste it into a message', 'success'); }
  catch { prompt('Copy this link:', url); }
}
async function decodeShare(token) {
  if (typeof token !== 'string' || token.length > 400000 || !/^[01]\.[A-Za-z0-9_-]+$/.test(token)) throw new Error('invalid link');
  let bytes = unb64u(token.slice(2));
  if (token[0] === '1') {
    if (!('DecompressionStream' in window)) throw new Error('this browser can\'t open compressed links — try Chrome, Edge or Safari 16.4+');
    bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'), 4e6);   // guard against decompression bombs
  }
  const j = JSON.parse(new TextDecoder().decode(bytes));
  if (!j || j.v !== 1 || !Array.isArray(j.a)) throw new Error('unrecognised link');
  const items = [];
  for (const r of j.a.slice(0, 1500)) {
    if (!Array.isArray(r) || !ID_RE.test(r[0]) || BAD_KEYS.has(r[0])) continue;
    items.push({ id:r[0], name:str(r[1], 120) || '?', number:str(r[2], 20), set_id:str(r[3], 40), set_name:str(r[4], 100), variant:VARIANTS[r[5]] ? r[5] : '',
      n:Math.max(1, Math.min(999, Math.floor(numOr(r[6], 1)))), gbp:numOr(r[7]) != null && r[7] >= 0 && r[7] < 1e6 ? r[7] : null, rarity:str(r[8], 60), lang:LANGS[r[9]] ? r[9] : '' });
  }
  return { kind:['want','trade','list','sale'].includes(j.k) ? j.k : 'list', name:str(j.n, 80) || 'A collection', date:/^\d{4}-\d{2}-\d{2}$/.test(j.d) ? j.d : '', items };
}
/* Image URLs are derived from the card ID pattern, never taken from the link. */
const imgForId = id => { const m = /^([a-z0-9.]+)-([A-Za-z0-9]+)$/.exec(id); return m && !id.startsWith('custom-') ? `https://images.pokemontcg.io/${m[1]}/${m[2]}.png` : ''; };
async function openShare(token) {
  let data;
  try { data = await decodeShare(token); }
  catch (e) { toast(`Couldn't open that share link (${e.message}).`, 'error'); history.replaceState(null, '', location.pathname); render(); return; }
  UI.share = data;
  document.body.classList.add('sharing');
  ['.appbar', '#main', '.bottom-nav'].forEach(sel => $(sel).classList.add('hidden'));
  const colSets = S.order.map(cid => [S.collections[cid], new Set(S.collections[cid].cardIds)]);
  const mine = id => { let have = 0, spare = 0, need = false;
    for (const [col, ids] of colSets) { const c = S.cards[id];
      if (!ids.has(id) || !c) continue;
      const q = totalQty(col, id); have += q; spare += spareCount(col, c); if (!q) need = true; }
    return { have, spare, need }; };
  const title = data.kind === 'want' ? 'Want list' : data.kind === 'trade' ? 'Trade list' : data.kind === 'sale' ? 'Cards for sale' : 'Card list';
  const total = data.items.reduce((n, i) => n + (i.gbp || 0) * i.n, 0), priced = data.items.some(i => i.gbp != null);
  const groups = new Map(); data.items.forEach(i => { if (!groups.has(i.set_id)) groups.set(i.set_id, []); groups.get(i.set_id).push(i); });
  const label = i => i.name + (i.variant && i.variant !== 'normal' ? ` (${VARIANTS[i.variant]})` : '') + (i.lang && i.lang !== 'en' ? ` · ${LANGS[i.lang]}` : '');
  UI.shareText = `${data.name} — ${title}${data.date ? ` (${data.date})` : ''}\n` + [...groups.values()].map(g => `\n${g[0].set_name}\n` + g.map(i => `  ${i.n > 1 ? i.n + '× ' : ''}${i.number.padEnd(7)} ${label(i)}${i.gbp != null ? ' · ' + GBP.format(i.gbp) : ''}`).join('\n')).join('\n') + '\n';
  $('#share-view').innerHTML = `
    <div class="share-head"><span class="small muted">${ic('link', 'sm')} Shared from PokéBinder Studio</span>
      <h2>${esc(data.name)} — ${title}</h2>
      <span class="muted">${data.items.length} card${data.items.length === 1 ? '' : 's'}${data.date ? ` · shared ${esc(data.date)}` : ''}${priced ? ` · approx. <b class="price">${GBP.format(total)}</b> at the sender's prices` : ''}</span>
      <div class="row" style="margin-top:8px"><button class="btn" data-act="copy-share">${ic('copy', 'sm')}Copy as text</button><button class="btn primary" data-act="close-share">${S.order.length ? 'Open my collection' : 'Start my own collection'}</button></div>
      ${S.order.length ? `<p class="small muted" style="margin:6px 0 0">Highlights compare this list with the collections saved in your browser.</p>` : ''}
    </div>
    ${[...groups.values()].map(g => `<section class="share-set"><h3>${esc(g[0].set_name)}</h3>${g.map(i => { const m = mine(i.id), img = imgForId(i.id);
      const note = data.kind === 'want' ? (m.spare ? `You have ${m.spare} spare` : m.have ? 'You own this' : '') : (m.need || (data.kind === 'sale' && !m.have && S.order.length) ? (m.need ? 'You need this' : '') : '');
      return `<div class="share-row">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="ph"></span>'}
        <div><b>${esc(label(i))}</b><div class="small muted">${esc(i.number)} · ${esc(i.set_name)}${i.rarity ? ' · ' + esc(i.rarity) : ''}</div>${note ? `<div class="mine">${ic('check', 'sm')} ${note}</div>` : ''}</div>
        <div style="text-align:right">${i.n > 1 ? `<div class="small">×${i.n}</div>` : ''}${i.gbp != null ? `<div class="price">${GBP.format(i.gbp)}</div>` : ''}</div></div>`; }).join('')}</section>`).join('')}
    <p class="small muted">Prices are what the sender's app showed on ${esc(data.date || 'the day they shared')} (Cardmarket/TCGplayer via the Pokémon TCG API, in GBP). Fan-made tool, not affiliated with The Pokémon Company.</p>`;
  $('#share-view').classList.remove('hidden');
  window.scrollTo({ top:0 });
}
function closeShare() {
  UI.share = null; history.replaceState(null, '', location.pathname);
  $('#share-view').classList.add('hidden'); $('#share-view').innerHTML = '';
  ['.appbar', '#main', '.bottom-nav'].forEach(sel => $(sel).classList.remove('hidden'));
  render();
}

/* ==========================================================================
   PRICE STICKERS — A4 label sheets (AirPrint) or images for Bluetooth label printers.
   iPhones can't talk to Bluetooth printers from a web app, so thermal output is images
   you share into the printer's own app.
   ========================================================================== */
const LBL_DEFAULTS = { src:'stock', copies:'copy', pct:100, round:0, min:0, stall:'', logo:'', fmt:'sheet', tpl:'L7160', start:1, dx:0, dy:0, size:'50x30', w:50, h:30 };
const L = () => { if (!S.settings.labels?.fmt) S.settings.labels = { ...LBL_DEFAULTS, ...S.settings.labels }; return S.settings.labels; };   // one stable object
UI.labels = { items:[], logoImg:null };
const lblKey = it => it.lotId ? `lot:${it.lotId}` : `${it.id}|${it.v || ''}`;
function labelSource(src) {
  const col = active(); if (!col && src !== 'stock' && src !== 'give') return [];
  const out = [];
  if (src === 'stock') Object.values(S.stock).forEach(l => out.push({ id:l.cardId, v:l.v, n:l.q, lotId:l.id, lang:langOf(l) }));
  else if (src === 'give') S.vendor.give.forEach(t => out.push({ id:t.id, v:t.v, n:t.q }));
  else if (src === 'filter') UI.layout.cards.filter(e => matches(e, col)).forEach(e => out.push({ id:e.cardId, v:e.variant || primaryVariant(S.cards[e.cardId] || e, col), n:1 }));
  else for (const id of col.cardIds) { const c = S.cards[id]; if (!c) continue; const by = {};
    for (const sp of sparesOf(col, c)) { const v = sp.v === 'any' ? primaryVariant(c, col) : sp.v; by[v] = (by[v] || 0) + sp.n; }
    Object.entries(by).forEach(([v, n]) => out.push({ id, v, n })); }
  return out.filter(it => S.cards[it.id]);
}
function rulePrice(it) {
  const o = L(), g = priceOf(S.cards[it.id], it.v)?.gbp;
  if (g == null) return null;
  const m = g * (typeof langFactor === 'function' ? langFactor(it.lang) : 1);
  let x = m * (+o.pct || 100) / 100;
  const step = +o.round;
  if (step === 99) x = Math.max(0.99, Math.ceil(x) - 0.01);
  else if (step > 0) x = Math.max(step, Math.round(x / step) * step);
  if (+o.min > 0) x = Math.max(x, +o.min);
  return Math.round(x * 100) / 100;
}
const labelPrice = it => { if (it.lotId && S.stock[it.lotId]) return lotAsk(S.stock[it.lotId]); const ov = S.labelPrices?.[lblKey(it)]; return ov > 0 ? ov : rulePrice(it); };
const itemOverride = it => it.lotId ? S.stock[it.lotId]?.price : S.labelPrices?.[lblKey(it)];
function openLabels(src) {
  const o = L(); if (src) o.src = src;
  if (!active() && o.src !== 'stock') o.src = 'stock';
  $('#lb-src').value = o.src; $('#lb-copies').value = o.copies; $('#lb-pct').value = o.pct == 100 ? '' : o.pct; $('#lb-round').value = String(o.round);
  $('#lb-min').value = o.min || ''; $('#lb-stall').value = o.stall; $('#lb-start').value = o.start > 1 ? o.start : ''; $('#lb-dx').value = o.dx || ''; $('#lb-dy').value = o.dy || '';
  $('#lb-tpl').innerHTML = Object.entries(CONFIG.labelSheets).map(([k, t]) => `<option value="${k}"${k === o.tpl ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  $('#lb-size').innerHTML = Object.entries(CONFIG.thermalSizes).map(([k, t]) => `<option value="${k}"${k === o.size ? ' selected' : ''}>${esc(t)}</option>`).join('');
  $$('input[name=lb-fmt]').forEach(x => x.checked = x.value === o.fmt);
  loadLogo().then(() => { buildLabelItems(); syncLabelForm(); });
  $('#dlg-labels').showModal();
}
function buildLabelItems() {
  const o = L(), prev = new Map(UI.labels.items.map(it => [lblKey(it), it.on]));
  UI.labels.items = labelSource(o.src).map(it => ({ ...it, n:o.copies === 'one' ? 1 : it.n, on:prev.get(lblKey(it)) ?? true }));
  renderLabelRows();
}
function renderLabelRows() {
  const items = UI.labels.items;
  $('#lb-rows').innerHTML = items.length ? items.map((it, i) => { const c = S.cards[it.id], rp = rulePrice(it), ov = S.labelPrices?.[lblKey(it)], m = priceOf(c, it.v)?.gbp;
    const ovv = itemOverride(it);
    return `<label class="lb-row"><input type="checkbox" data-i="${i}"${it.on ? ' checked' : ''} aria-label="Include ${esc(c.name)}">
      <span class="t"><b>${esc(c.name)}${it.n > 1 ? ` <span class="muted">×${it.n}</span>` : ''}</b><span>${VARIANTS[it.v] && it.v !== 'normal' ? esc(VARIANTS[it.v]) + ' · ' : ''}${it.lang && it.lang !== 'en' ? esc(LANGS[it.lang]) + ' · ' : ''}${esc(c.set_name)} ${esc(c.number)}</span></span>
      <span class="small muted num" title="Market price">${m != null ? GBP.format(m) : 'no price'}</span>
      <input class="inp mono" data-p="${i}" inputmode="decimal" aria-label="Sticker price for ${esc(c.name)}" placeholder="${rp != null ? rp.toFixed(2) : 'set £'}" value="${ovv > 0 ? ovv.toFixed(2) : ''}"></label>`; }).join('')
    : `<p class="small muted" style="margin:8px">${L().src === 'stock' ? 'Your stock is empty. Add cards in Vendor → Stock, or move spares in from a collection.' : L().src === 'spare' ? 'No spares yet. Set quantities above 1 in a card’s details (the ⓘ on a pocket), or choose another source above.' : L().src === 'give' ? 'The trade calculator’s "You give" list is empty.' : 'No cards match the current filters.'}</p>`;
  updateLabelCount();
}
function selectedStickers() {
  const out = [];
  for (const it of UI.labels.items) { if (!it.on) continue; const p = labelPrice(it); for (let k = 0; k < it.n; k++) out.push({ ...it, price:p }); }
  return out;
}
function updateLabelCount() {
  const st = selectedStickers(), unpriced = st.filter(x => x.price == null).length;
  $('#lb-count').textContent = `${st.length} sticker${st.length === 1 ? '' : 's'}${unpriced ? ` · ${unpriced} without a price (type one in)` : ''}`;
  $('#lb-go').disabled = !st.length;
  clearTimeout(UI.labels.pt); UI.labels.pt = setTimeout(renderLabelPreview, 120);
}
function labelDims() {
  const o = L();
  if (o.fmt === 'sheet') { const t = CONFIG.labelSheets[o.tpl] || CONFIG.labelSheets.L7160; return { w:t.w, h:t.h }; }
  if (o.size !== 'custom') { const [w, h] = o.size.split('x').map(Number); return { w, h }; }
  return { w:Math.min(150, Math.max(15, +o.w || 50)), h:Math.min(150, Math.max(10, +o.h || 30)) };
}
function syncLabelForm() {
  const o = L(), sheet = o.fmt === 'sheet';
  $('#lb-sheet-opts').classList.toggle('hidden', !sheet); $('#lb-thermal-opts').classList.toggle('hidden', sheet);
  $('#lb-w').closest('.row').classList.toggle('hidden', o.size !== 'custom');
  $('#lb-w').value = o.w; $('#lb-h').value = o.h;
  $('#lb-logo-img').classList.toggle('hidden', !o.logo); $('#lb-logo-rm').classList.toggle('hidden', !o.logo); if (o.logo) $('#lb-logo-img').src = o.logo;
  const t = CONFIG.labelSheets[o.tpl];
  $('#lb-tip').textContent = sheet ? `${t.cols * t.rows} stickers per A4 sheet. In the print dialog choose A4 and 100% scale (not "fit"). Do a test on plain paper first and hold it against a sheet — use the nudge boxes to line it up.`
    : 'Tap Share images and choose "Save Images" to put them in Photos, then open your printer’s app (e.g. NIIMBOT or Phomemo), choose the image option and print. Match the label size in both apps.';
  $('#lb-go').innerHTML = sheet ? `${ic('printer', 'sm')}Print` : `${ic('share', 'sm')}Share images`;
  $('#lb-dl').classList.toggle('hidden', sheet);
  updateLabelCount();
}
async function loadLogo() {
  const src = L().logo; UI.labels.logoImg = null; if (!src) return;
  const img = new Image(); img.src = src; try { await img.decode(); UI.labels.logoImg = img; } catch {}
}
/* Draw one sticker. Black on white only, so it prints cleanly on thermal and laser alike. */
function drawLabel(it, wmm, hmm, ppm) {
  const W = Math.round(wmm * ppm), H = Math.round(hmm * ppm), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), c = S.cards[it.id], o = L(), F = 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
  const pad = Math.max(2, Math.round(Math.min(W, H) * 0.075)), inner = W - pad * 2;
  const fit = (text, weight, size, maxW, minSize) => { let fs = size; g.font = `${weight} ${fs}px ${F}`; while (g.measureText(text).width > maxW && fs > minSize) { fs -= Math.max(1, fs * 0.05); g.font = `${weight} ${fs}px ${F}`; }
    let t = text; while (g.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -2) + '…'; return { t, fs }; };
  let y = pad;
  // header: logo + stall name
  const logo = UI.labels.logoImg, hasHead = logo || o.stall, headH = H * 0.19;
  if (hasHead) {
    let x = pad;
    if (logo) { const sc = Math.min(headH / logo.naturalHeight, (W * 0.4) / logo.naturalWidth); const lw = logo.naturalWidth * sc, lh = logo.naturalHeight * sc;
      g.drawImage(logo, x, y + (headH - lh) / 2, lw, lh); x += lw + pad * 0.6; }
    if (o.stall) { const f = fit(o.stall, 650, headH * 0.7, W - x - pad, headH * 0.4); g.fillText(f.t, x, y + headH * 0.5 + f.fs * 0.36); }
    y += headH + pad * 0.5;
    g.fillRect(pad, y - pad * 0.3, inner, Math.max(1, H * 0.008));
  }
  // card name
  const nameMax = hasHead ? H * 0.17 : H * 0.22;
  const nm = fit(c.name, 800, nameMax, inner, H * 0.1);
  y += nm.fs * 0.95; g.fillText(nm.t, pad, y);
  // printing tag + set / number
  const subFs = H * (hasHead ? 0.1 : 0.115); y += subFs * 1.35; let x = pad;
  if (it.v && it.v !== 'normal' && VARIANTS[it.v]) {
    g.font = `800 ${subFs * 0.85}px ${F}`; const tag = VARIANTS[it.v].toUpperCase(), tw = g.measureText(tag).width + subFs * 0.7;
    g.fillRect(x, y - subFs * 0.92, tw, subFs * 1.18); g.fillStyle = '#fff'; g.fillText(tag, x + subFs * 0.35, y - subFs * 0.06); g.fillStyle = '#000'; x += tw + subFs * 0.4;
  }
  if (it.lang && it.lang !== 'en' && LSHORT[it.lang]) {
    g.font = `800 ${subFs * 0.85}px ${F}`; const tag = LSHORT[it.lang], tw = g.measureText(tag).width + subFs * 0.7;
    g.lineWidth = Math.max(1, subFs * 0.12); g.strokeRect(x, y - subFs * 0.92, tw, subFs * 1.18); g.fillText(tag, x + subFs * 0.35, y - subFs * 0.06); x += tw + subFs * 0.4;
  }
  const code = (S.setsCache?.data || []).find(st => st.id === c.set_id)?.ptcgoCode;
  const setTxt = `${code || c.set_name} · ${c.number}${c.rarity && !code ? '' : ''}`;
  const sf = fit(setTxt, 500, subFs, W - x - pad, subFs * 0.7); g.fillText(sf.t, x, y);
  // price — big, bottom right
  const priceTxt = it.price != null ? GBP.format(it.price) : '£';
  const pf = fit(priceTxt, 850, Math.min(H - y - pad, H * 0.34), inner, H * 0.14);
  g.textAlign = 'right'; g.fillText(pf.t, W - pad, H - pad); g.textAlign = 'left';
  if (o.stall || logo) {} // header already drawn
  return cv;
}
function renderLabelPreview() {
  const st = selectedStickers(), box = $('#lb-preview'); if (!box) return;
  const { w, h } = labelDims(), seen = new Set(), pick = [];
  for (const s of st) { const k = lblKey(s); if (!seen.has(k)) { seen.add(k); pick.push(s); } if (pick.length === 3) break; }
  box.innerHTML = '';
  pick.forEach(s => { const cv = drawLabel(s, w, h, 8); const img = new Image(); img.src = cv.toDataURL('image/png'); img.style.width = Math.min(260, w * 4) + 'px'; img.alt = 'Sticker preview'; box.append(img); });
  if (!pick.length) box.innerHTML = '<span class="small muted">Tick some cards to see a preview.</span>';
  box.insertAdjacentHTML('beforeend', `<span class="small muted">${w} × ${h} mm</span>`);
}
async function printLabelSheet() {
  const o = L(), t = CONFIG.labelSheets[o.tpl], per = t.cols * t.rows, st = selectedStickers();
  if (!st.length) return;
  const ppm = 300 / 25.4, cache = new Map(), start = Math.max(1, Math.min(per, Math.floor(+o.start || 1))) - 1;
  const url = s => { const k = lblKey(s) + '|' + s.price; if (!cache.has(k)) cache.set(k, drawLabel(s, t.w, t.h, ppm).toDataURL('image/png')); return cache.get(k); };
  let html = '', slot = start, page = '';
  for (const s of st) {
    if (slot === per) { html += `<div class="lbl-page">${page}</div>`; page = ''; slot = 0; }
    const col = slot % t.cols, row = Math.floor(slot / t.cols);
    page += `<img src="${url(s)}" alt="" style="left:${(t.left + col * t.px + (+o.dx || 0)).toFixed(2)}mm;top:${(t.top + row * t.py + (+o.dy || 0)).toFixed(2)}mm;width:${t.w}mm;height:${t.h}mm">`;
    slot++;
  }
  html += `<div class="lbl-page">${page}</div>`;
  $('#print-root').innerHTML = html;
  const ps = document.createElement('style'); ps.id = 'lbl-page-style'; ps.textContent = '@page{size:A4;margin:0}'; document.head.append(ps);
  $('#dlg-labels').close();
  await Promise.all($$('#print-root img').map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  const sheets = Math.ceil((start + st.length) / per);
  toast(`Printing ${st.length} sticker${st.length === 1 ? '' : 's'} on ${sheets} sheet${sheets === 1 ? '' : 's'} — choose A4, 100% scale`, 'info');
  window.print();
  const next = (start + st.length) % per; o.start = next + 1; save();   // continue on the part-used sheet next time
}
async function thermalFiles() {
  const st = selectedStickers(), { w, h } = labelDims(), ppm = CONFIG.thermalDpi / 25.4, files = [], cache = new Map();
  let i = 0;
  for (const s of st) {
    const k = lblKey(s) + '|' + s.price;
    if (!cache.has(k)) cache.set(k, await new Promise(res => drawLabel(s, w, h, ppm).toBlob(res, 'image/png')));
    const c = S.cards[s.id], name = `${String(++i).padStart(3, '0')}_${fileSafe(c.name)}_${fileSafe(c.number)}${s.v && s.v !== 'normal' ? '_' + s.v : ''}.png`;
    files.push(new File([cache.get(k)], name, { type:'image/png' }));
  }
  return files;
}
async function shareThermal(downloadOnly) {
  const files = await thermalFiles(); if (!files.length) return;
  if (!downloadOnly && navigator.canShare?.({ files })) {
    try { await navigator.share({ files, title:'Price stickers' }); toast(`Shared ${files.length} sticker image${files.length === 1 ? '' : 's'}`, 'success'); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  for (const f of files) { download(f.name, f, 'image/png'); await sleep(250); }
  toast(`Downloaded ${files.length} sticker image${files.length === 1 ? '' : 's'}`, 'success');
}
// ---- wiring ----
const lblSet = (k, v) => { L()[k] = v; save(); };
$('#lb-src').addEventListener('change', e => { lblSet('src', e.target.value); buildLabelItems(); });
$('#lb-copies').addEventListener('change', e => { lblSet('copies', e.target.value); buildLabelItems(); });
$('#lb-pct').addEventListener('change', e => { const v = parseFloat(e.target.value); lblSet('pct', v > 0 && v <= 1000 ? v : 100); renderLabelRows(); });
$('#lb-round').addEventListener('change', e => { lblSet('round', +e.target.value || 0); renderLabelRows(); });
$('#lb-min').addEventListener('change', e => { const v = parseFloat(e.target.value.replace(/[£\s]/g, '')); lblSet('min', v > 0 && v < 1e5 ? v : 0); renderLabelRows(); });
$('#lb-stall').addEventListener('input', e => { lblSet('stall', e.target.value.slice(0, 40)); updateLabelCount(); });
['start','dx','dy'].forEach(k => $('#lb-' + k).addEventListener('change', e => { const v = parseFloat(e.target.value); lblSet(k, Number.isFinite(v) ? Math.max(-20, Math.min(k === 'start' ? 65 : 20, v)) : (k === 'start' ? 1 : 0)); }));
$('#lb-tpl').addEventListener('change', e => { if (CONFIG.labelSheets[e.target.value]) { lblSet('tpl', e.target.value); lblSet('start', 1); $('#lb-start').value = ''; syncLabelForm(); } });
$('#lb-size').addEventListener('change', e => { if (CONFIG.thermalSizes[e.target.value]) { lblSet('size', e.target.value); syncLabelForm(); } });
['w','h'].forEach(k => $('#lb-' + k).addEventListener('change', e => { const v = parseFloat(e.target.value); if (v > 0) { lblSet(k, v); updateLabelCount(); } }));
$$('input[name=lb-fmt]').forEach(x => x.addEventListener('change', () => { lblSet('fmt', x.value); syncLabelForm(); }));
$('#lb-rows').addEventListener('change', e => {
  const i = e.target.dataset.i, p = e.target.dataset.p;
  if (i != null) { UI.labels.items[+i].on = e.target.checked; updateLabelCount(); }
  if (p != null) { const it = UI.labels.items[+p], v = parseFloat(e.target.value.replace(/[£,\s]/g, '')); S.labelPrices ||= {};
    const val = v > 0 && v < 1e5 ? Math.round(v * 100) / 100 : null;
    if (it.lotId && S.stock[it.lotId]) S.stock[it.lotId].price = val;   // stock: the sticker price IS the asking price
    else if (val) S.labelPrices[lblKey(it)] = val; else delete S.labelPrices[lblKey(it)];
    save(); renderLabelRows(); }
});
$('#lb-all').addEventListener('click', () => { UI.labels.items.forEach(it => it.on = true); renderLabelRows(); });
$('#lb-none').addEventListener('click', () => { UI.labels.items.forEach(it => it.on = false); renderLabelRows(); });
$('#lb-reset').addEventListener('click', () => { const n = Object.keys(S.labelPrices || {}).length; S.labelPrices = {}; save(); renderLabelRows(); toast(n ? `Cleared ${n} price override${n === 1 ? '' : 's'}` : 'No overrides to clear', 'success'); });
$('#lb-logo').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 8e6) { toast('Choose a PNG, JPEG or WebP image under 8 MB', 'error'); return; }
  try {   // re-encode through a canvas: strips metadata and anything that isn't pixels, and keeps it small
    const bmp = await createImageBitmap(f), sc = Math.min(1, 480 / bmp.width, 200 / bmp.height);
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * sc)); cv.height = Math.max(1, Math.round(bmp.height * sc));
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height);
    // black & white with a contrast boost, done once here so every printer gets the same crisp logo
    const px = g.getImageData(0, 0, cv.width, cv.height), d = px.data;
    for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; const v = Math.max(0, Math.min(255, (l - 128) * 1.4 + 128)); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(px, 0, 0);
    lblSet('logo', cv.toDataURL('image/png')); await loadLogo(); syncLabelForm(); toast('Logo saved', 'success');
  } catch { toast('Couldn’t read that image', 'error'); }
});
$('#lb-logo-rm').addEventListener('click', async () => { lblSet('logo', ''); await loadLogo(); syncLabelForm(); });
$('#lb-go').addEventListener('click', () => L().fmt === 'sheet' ? printLabelSheet() : shareThermal(false));
$('#lb-dl').addEventListener('click', () => shareThermal(true));
window.addEventListener('afterprint', () => document.getElementById('lbl-page-style')?.remove());

/* ==========================================================================
   TOASTS
   ========================================================================== */
function toast(msg, type = 'info', action) {
  const el = document.createElement('div'); el.className = `toast ${type}`; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = action.label; b.onclick = () => { action.fn(); el.remove(); }; el.append(b); }
  $('#toasts').append(el);
  setTimeout(() => el.remove(), action ? CONFIG.undoMs : 3500);
}

/* ==========================================================================
   GLOBAL EVENT WIRING (delegated — no inline handlers, no IDs in JS strings)
   ========================================================================== */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-view],[data-close],[data-vact]'); if (!t) return;
  if (t.hasAttribute('data-close')) { t.closest('dialog').close(); return; }
  if (t.dataset.view) { UI.view = S.settings.view = t.dataset.view; save(); render(); window.scrollTo({ top:0 }); return; }
  if (t.dataset.vact) { vendorAction(t, e); return; }
  const id = t.closest('[data-id]')?.dataset.id;
  switch (t.dataset.act) {
    case 'toggle': toggleOwned(id); break;
    case 'info': e.stopPropagation(); openInfo(id); break;
    case 'new-col': openColDialog('new'); break;
    case 'edit-col': openColDialog('edit'); break;
    case 'add-cards': openAdd(); break;
    case 'custom-card': openCustom(); break;
    case 'export': openExport(); break;
    case 'print': openPrint(); break;
    case 'settings': openSettings(); break;
    case 'clear-filters': UI.filters = { text:'', set:'all', status:'all', rarity:'all' }; render(); break;
    case 'goto-set': UI.filters.set = t.dataset.set; UI.view = 'list'; render(); break;
    case 'refresh-prices': refreshPrices(); break;
    case 'sort-value': e.stopPropagation(); UI.listSort = UI.listSort === 'value' ? 'binder' : 'value'; renderView(); break;
    case 'refresh-one': (async () => { const eid = UI.infoId, id = cardIdOf(eid);
      try { if (S.cards[id]?.price?.td) S.cards[id].price.td.fetched = ''; await tcgdexPrices([id]); if (!S.cards[id]?.price?.td) { const [c] = await apiFetchAll(`id:"${id}"`).catch(() => []); if (c) mergeCard(c); } save(); await loadFx(); openInfo(eid); renderProgress(); toast(S.cards[id]?.price ? 'Price updated' : 'Still no price for this card', S.cards[id]?.price ? 'success' : 'warn'); }
      catch (err) { toast('Refresh failed: ' + err.message, 'error'); } })(); break;
    case 'share-want': shareRows(rowsFor(active(), 'needed')); break;
    case 'labels': openLabels(); break;
    case 'share-trade': shareStock(); break;
    case 'close-share': closeShare(); break;
    case 'copy-share': navigator.clipboard?.writeText(UI.shareText || '').then(() => toast('Copied to clipboard', 'success'), () => toast('Clipboard not available', 'error')); break;
    case 'bulk-own': case 'bulk-need': {
      const col = active(), ids = UI.layout.cards.filter(c => matches(c, col)).map(c => c.id), snap = snapshot();
      setOwned(ids, t.dataset.act === 'bulk-own'); render(); undoable(`Marked ${ids.length} as ${t.dataset.act === 'bulk-own' ? 'owned' : 'needed'}`, snap); break;
    }
  }
});
// keyboard toggle for role=button pockets
$('#view').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pocket .info')) { e.preventDefault(); openInfo(e.target.closest('[data-id]').dataset.id); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pocket[data-id]')) { e.preventDefault(); toggleOwned(e.target.dataset.id); }
  if (e.key === 'i' && e.target.matches('[data-id]')) openInfo(e.target.dataset.id);
});
$('#col-select').addEventListener('change', e => switchCollection(e.target.value));
let textT;
$('#f-text').addEventListener('input', e => { clearTimeout(textT); textT = setTimeout(() => { UI.filters.text = e.target.value.trim(); renderProgress(); renderView(); }, 180); });
['set','status','rarity'].forEach(k => $('#f-' + k).addEventListener('change', e => { UI.filters[k] = e.target.value; renderProgress(); renderView(); }));
// light-dismiss dialogs on backdrop click
$$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d && d.id !== 'dlg-confirm') d.close(); }));

document.addEventListener('error', e => { if (e.target?.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);
/* ---------- PWA ---------- */
let installEvt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#install-btn').classList.remove('hidden'); });
$('#install-btn').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#install-btn').classList.add('hidden'); });
/* ---------- updates: check on every launch / return to the app, and say so when a new version lands ---------- */
let swReg = null, reloading = false;
const startedControlled = !!navigator.serviceWorker?.controller;   // first-ever install is not an "update"
let announced = false;
function announceUpdate() {
  if (reloading || announced) return; announced = true;
  toast('A new version of PokéBinder is ready', 'success', { label:'Reload', fn:() => { reloading = true; location.reload(); } });
}
async function checkForUpdate(manual) {
  try {
    if (!swReg) { if (manual) toast('Offline updates aren\u2019t available here (needs https)', 'warn'); return; }
    await swReg.update();
    if (swReg.waiting || swReg.installing) announceUpdate();
    else if (manual) {
      const r = await fetch('app.js', { cache:'no-store' }); const live = (await r.text()).match(/version:\s*'([\d.]+)'/)?.[1];
      if (live && live !== CONFIG.version) { toast(`Version ${live} is published — reloading…`, 'info'); reloading = true; setTimeout(() => location.reload(), 600); }
      else toast(`You're on the latest version (${CONFIG.version})`, 'success');
    }
  } catch (e) { if (manual) toast(`Couldn't check for updates (${e.message})`, 'warn'); }
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js', { updateViaCache:'none' }).then(reg => {
    swReg = reg;
    reg.addEventListener('updatefound', () => { const nw = reg.installing; nw?.addEventListener('statechange', () => { if (nw.state === 'activated' && startedControlled) announceUpdate(); }); });
  }).catch(err => console.warn('SW registration failed', err));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (startedControlled) announceUpdate(); });
  navigator.serviceWorker.addEventListener('message', e => { if (e.data?.swVersion) { const el = $('#st-sw'); if (el) el.textContent = e.data.swVersion; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(false); });
}
/* Escape hatch: throw away the offline copy of the app (NOT your collection, which is in IndexedDB) and reload. */
async function forceRefresh() {
  if (!await confirmDlg('Reload the app from the internet?', 'Clears the offline copy of the app files and reloads the latest version. Your collections, quantities and settings are kept.', 'Reload app')) return;
  await flush();
  try { for (const k of await caches.keys()) if (k.startsWith('pb-v')) await caches.delete(k); } catch {}
  try { for (const r of await navigator.serviceWorker?.getRegistrations?.() || []) await r.unregister(); } catch {}
  reloading = true; location.replace(location.pathname + '?r=' + Date.now());
}

/* ---------- boot (after every script file has loaded) ---------- */
async function boot() {
  await Store.open();
  S = await Store.get(CONFIG.storageKey);
  if (!S) {
    S = migrateV1();
    if (S) { await flush(); setTimeout(() => toast(`Imported ${S.order.length} collection(s) from the previous version`, 'success'), 300); }
    else S = blankState();
  }
  S = { ...blankState(), ...S, settings:{ ...blankState().settings, ...S.settings } };
  // v2.4 migration: ownership ticks → copies (quantity 1, printing unspecified)
  for (const id of S.order) { const col = S.collections[id];
    if (!col.copies) { col.copies = {}; for (const cid of Object.keys(col.owned || {})) if (!cid.includes('|')) col.copies[cid] = { any:{ q:1 } }; }
    col.history ||= []; syncOwned(col); }
  initVendorState(); delete S.trade;   // v2.6: the old trade lists move into the vendor area
  if (!S.collections[S.activeId]) S.activeId = S.order[0] || null;
  UI.view = S.settings.view === 'trade' ? 'vendor' : (S.settings.view || 'binder');
  applyTheme();
  if (location.search.includes('r=')) history.replaceState(null, '', location.pathname + location.hash);
  if (location.hash.startsWith('#s=')) await openShare(location.hash.slice(3));
  else render();
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#s=')) openShare(location.hash.slice(3)); });
  loadFx().then(() => { const col = active(); if (col && !UI.share) { recordSnapshot(col); } });   // non-blocking; prices render in EUR/USD until a rate is available
  // gentle backup nudge: >50 owned ticks and no backup in 30 days
  const ticks = S.order.reduce((n, id) => n + Object.keys(S.collections[id].owned).length, 0);
  if (ticks > 50 && (!S.settings.lastBackup || Date.now() - S.settings.lastBackup > 30 * 864e5))
    setTimeout(() => toast('Your collection only lives in this browser — download a backup', 'warn', { label:'Back up', fn:openExport }), 1500);
}
document.addEventListener('DOMContentLoaded', boot);
