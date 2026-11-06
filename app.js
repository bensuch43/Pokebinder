'use strict';
/* ==========================================================================
   CONFIG — change here, nothing else is environment-specific
   ========================================================================== */
const CONFIG = {
  version: '2.4.0',
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
  priceStaleDays: 14,              // flag prices whose source date is older than this
  priceBatch: 60,                  // card IDs per API call when refreshing prices
  fxUrl: 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP,USD',   // ECB rates, no key
  fxCacheHours: 12
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
    if (hit) out.cm = { value:hit[1], metric:hit[0], low:P.lowPrice ?? null, avg30:P.avg30 ?? null, updated:d(cm.updatedAt), url:safeUrl(cm.url),
      rev:[P.reverseHoloTrend, P.reverseHoloAvg30, P.reverseHoloSell].find(v => v > 0) ?? null };
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
  $('#toolbar').classList.toggle('hidden', !col);
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
/* Price for a card, or for one printing of it (entries carry .variant; or pass one explicitly). */
function priceOf(c, variant = c?.variant) {
  const pr = c?.price; if (!pr) return null;
  const pref = S.settings.priceSource || CONFIG.priceSource;
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
    return { gbp:rate ? value * rate : null, native:value, cur, src:k === 'cm' ? 'Cardmarket' : 'TCGplayer', metric,
      date:q.updated, url:q.url, fetched:pr.fetched, stale:age > CONFIG.priceStaleDays, fallback:k !== order[0] };
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
  let done = 0, got = 0;
  try {
    for (let i = 0; i < ids.length; i += CONFIG.priceBatch) {
      const batch = ids.slice(i, i + CONFIG.priceBatch);
      $('#prog-value').textContent = `Refreshing prices… ${done} / ${ids.length}`;
      const cards = await apiFetchAll('(' + batch.map(id => `id:"${id.replace(/"/g, '')}"`).join(' OR ') + ')');
      cards.forEach(c => { mergeCard(c); if (c.price) got++; });
      done += batch.length;
    }
    await loadFx(); save(); render(); recordSnapshot(col); if (UI.view === 'sets') renderView();
    toast(`Prices refreshed for ${got} of ${ids.length} cards`, 'success');
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
  $('#prog-value').textContent = all.priced ? `${src} prices · price dates ${dateRange(all)}` : (all.unconverted ? 'Prices loaded but no exchange rate yet — check Settings' : 'No prices yet');
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
  else if (UI.view === 'trade') v.innerHTML = tradeHtml(col);
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
        <td class="price small${pi?.stale ? ' stale' : ''}" title="${esc(priceTitle(pi))}">${fmtPrice(pi)}</td>
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
function snapshot() { return JSON.stringify({ collections:S.collections, order:S.order, activeId:S.activeId }); }
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
          <div><span class="vn">${VARIANTS[v]}</span>${pv ? ` <span class="small muted">· ${fmtPrice(pv)} each</span>` : ''}</div>
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
  const pi = priceOf(c, variant), pr = c.price;
  if (!pi) return `<div class="pricebox"><span class="muted">No price in the API for this card.</span><button class="btn sm" data-act="refresh-one" style="justify-self:start">${ic('refresh', 'sm')}Check again</button></div>`;
  const line = (k, label, cur) => { const q = pr[k]; if (!q) return ''; const r = fxRate(cur), u = safeUrl(q.url);
    return `<div class="small">${label}: <span class="price">${NATIVE[cur].format(q.value)}</span>${r ? ` ≈ <span class="price">${GBP.format(q.value * r)}</span>` : ''} <span class="muted">(${esc(q.metric)}${q.low ? `, low ${NATIVE[cur].format(q.low)}` : ''})</span> · price date <b>${esc(q.updated || '?')}</b>${u ? ` · <a href="${esc(u)}" target="_blank" rel="noopener noreferrer">view</a>` : ''}</div>`; };
  return `<div class="pricebox"><div><span class="big">${fmtPrice(pi)}</span> <span class="small muted">${pi.src} ${esc(pi.metric)}${pi.fallback ? ' (preferred source has no price)' : ''}</span></div>
    <div class="small${pi.stale ? ' stale' : ''}">Price date ${esc(pi.date || 'unknown')}${pi.stale ? ` — older than ${CONFIG.priceStaleDays} days, tap refresh` : ''} · fetched ${new Date(pi.fetched).toLocaleDateString('en-GB')} · ${esc(fxLabel(pi.cur))}</div>
    ${line('cm', 'Cardmarket (EU)', 'EUR')}${line('tcp', 'TCGplayer (US)', 'USD')}
    <button class="btn sm" data-act="refresh-one" style="justify-self:start">${ic('refresh', 'sm')}Refresh this price</button></div>`;
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
  if (Array.isArray(c.variants)) out.variants = c.variants.filter(v => ['normal','holo','reverse','first'].includes(v));
  const pr = c.price;
  if (pr && typeof pr === 'object') {
    const sp = q => q && typeof q === 'object' && q.value > 0 ? { value:+q.value, metric:str(q.metric, 60), low:numOr(q.low), avg30:numOr(q.avg30), rev:numOr(q.rev),
      updated:/^\d{4}-\d{2}-\d{2}$/.test(q.updated) ? q.updated : '', url:safeUrl(q.url),
      ...(q.vars && typeof q.vars === 'object' ? { vars:Object.fromEntries(Object.entries(q.vars).filter(([v, x]) => VARIANTS[v] && x > 0).map(([v, x]) => [v, +x])) } : {}) } : undefined;
    const cm = sp(pr.cm), tcp = sp(pr.tcp);
    if (cm || tcp) out.price = { ...(cm ? { cm } : {}), ...(tcp ? { tcp } : {}), fetched:str(pr.fetched, 30) || new Date().toISOString() };
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
  return { cards, collections, order, activeId:collections[st.activeId] ? st.activeId : order[0] || null };
}
$('#e-restore-file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  let incoming;
  try {
    const j = JSON.parse(await file.text());
    incoming = j.app === 'PokeBinderStudio' ? sanitizeState(j.state) : null;
    if (!incoming || !Object.keys(incoming.collections).length) throw new Error('not a PokéBinder backup');
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
  }
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
  $('#p-needed-wrap').classList.toggle('hidden', t === 'guide');
  $('#p-img-wrap').classList.toggle('hidden', t !== 'placeholders');
  if (t === 'placeholders' && !$('#p-needed').dataset.touched) $('#p-needed').checked = true;
}
$$('input[name=p-type]').forEach(r => r.addEventListener('change', syncPrintOptions));
$('#p-needed').addEventListener('change', e => e.target.dataset.touched = '1');
$('#p-go').addEventListener('click', async () => {
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
  $('#st-theme').value = S.settings.theme || 'system';
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
  const inUse = new Set(S.order.flatMap(id => S.collections[id].cardIds)); let n = 0;
  for (const id of Object.keys(S.cards)) if (!inUse.has(id)) { delete S.cards[id]; n++; }
  save(); toast(`Removed ${n} unused card(s)`, 'success'); openSettings();
});
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
    a:rows.slice(0, 1500).map(({ c, sp }) => { const pi = withPrices ? priceOf(c) : null;
      return [c.cardId || c.id, c.name, c.number, c.set_id, c.set_name, c.variant || '', kind === 'trade' ? sp || 1 : 1, pi?.gbp != null ? Math.round(pi.gbp * 100) / 100 : null, c.rarity || '']; }) };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  let token;
  if ('CompressionStream' in window) token = '1.' + b64u(await pipeBytes(json, new CompressionStream('deflate-raw')));
  else token = '0.' + b64u(json);
  return `${location.origin}${location.pathname}#s=${token}`;
}
async function shareRows(rows) {
  if (!rows.length) { toast('Nothing to share with these filters', 'warn'); return; }
  const withPrices = $('#dlg-export').open ? $('#e-prices').checked : true;
  const f = $('#dlg-export').open ? exportFilters() : null;
  const kind = f ? (SHARE_KIND[f.status] || 'list') : (rows.every(r => !r.own) ? 'want' : 'trade');
  const url = await buildShareUrl(rows, withPrices, kind);
  const title = `${rows[0].col.name} — ${kind === 'want' ? 'want list' : kind === 'trade' ? 'trade list' : 'card list'} (${rows.length})`;
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
      n:Math.max(1, Math.min(999, Math.floor(numOr(r[6], 1)))), gbp:numOr(r[7]) != null && r[7] >= 0 && r[7] < 1e6 ? r[7] : null, rarity:str(r[8], 60) });
  }
  return { kind:['want','trade','list'].includes(j.k) ? j.k : 'list', name:str(j.n, 80) || 'A collection', date:/^\d{4}-\d{2}-\d{2}$/.test(j.d) ? j.d : '', items };
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
  const title = data.kind === 'want' ? 'Want list' : data.kind === 'trade' ? 'Trade list' : 'Card list';
  const total = data.items.reduce((n, i) => n + (i.gbp || 0) * i.n, 0), priced = data.items.some(i => i.gbp != null);
  const groups = new Map(); data.items.forEach(i => { if (!groups.has(i.set_id)) groups.set(i.set_id, []); groups.get(i.set_id).push(i); });
  const label = i => i.name + (i.variant && i.variant !== 'normal' ? ` (${VARIANTS[i.variant]})` : '');
  UI.shareText = `${data.name} — ${title}${data.date ? ` (${data.date})` : ''}\n` + [...groups.values()].map(g => `\n${g[0].set_name}\n` + g.map(i => `  ${i.n > 1 ? i.n + '× ' : ''}${i.number.padEnd(7)} ${label(i)}${i.gbp != null ? ' · ' + GBP.format(i.gbp) : ''}`).join('\n')).join('\n') + '\n';
  $('#share-view').innerHTML = `
    <div class="share-head"><span class="small muted">${ic('link', 'sm')} Shared from PokéBinder Studio</span>
      <h2>${esc(data.name)} — ${title}</h2>
      <span class="muted">${data.items.length} card${data.items.length === 1 ? '' : 's'}${data.date ? ` · shared ${esc(data.date)}` : ''}${priced ? ` · approx. <b class="price">${GBP.format(total)}</b> at the sender's prices` : ''}</span>
      <div class="row" style="margin-top:8px"><button class="btn" data-act="copy-share">${ic('copy', 'sm')}Copy as text</button><button class="btn primary" data-act="close-share">${S.order.length ? 'Open my collection' : 'Start my own collection'}</button></div>
      ${S.order.length ? `<p class="small muted" style="margin:6px 0 0">Highlights compare this list with the collections saved in your browser.</p>` : ''}
    </div>
    ${[...groups.values()].map(g => `<section class="share-set"><h3>${esc(g[0].set_name)}</h3>${g.map(i => { const m = mine(i.id), img = imgForId(i.id);
      const note = data.kind === 'want' ? (m.spare ? `You have ${m.spare} spare` : m.have ? 'You own this' : '') : (m.need ? 'You need this' : '');
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
   TRADES — spares list + a two-sided trade calculator at current GBP prices
   ========================================================================== */
UI.tradeResults = [];
function tradeItemValue(it) { const c = S.cards[it.id]; const g = c ? priceOf(c, it.v)?.gbp : null; return g != null ? g * it.q : null; }
function tradeSide(side) {
  const items = S.trade[side];
  const total = items.reduce((n, it) => n + (tradeItemValue(it) || 0), 0), unpriced = items.filter(it => tradeItemValue(it) == null).length;
  return { total, unpriced, html: items.length ? items.map((it, i) => { const c = S.cards[it.id]; if (!c) return ''; const img = safeUrl(c.img_s), v = tradeItemValue(it);
    const vs = variantsOf(c, active() || {});
    return `<div class="titem">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="ph"></span>'}
      <div class="t"><b>${esc(c.name)}</b><span>${esc(c.number)} · ${esc(c.set_name)}</span>
        <select class="inp t-v" data-side="${side}" data-i="${i}" style="min-height:32px;font-size:13px;margin-top:4px;padding:0 30px 0 8px" aria-label="Printing">${vs.map(x => `<option value="${x}"${x === it.v ? ' selected' : ''}>${VARIANTS[x]}</option>`).join('')}</select></div>
      <div class="stepper"><button type="button" data-act="trade-q" data-side="${side}" data-i="${i}" data-d="-1" aria-label="One fewer">${ic('minus', 'sm')}</button><output>${it.q}</output><button type="button" data-act="trade-q" data-side="${side}" data-i="${i}" data-d="1" aria-label="One more">${ic('plus', 'sm')}</button></div>
      <div style="display:grid;justify-items:end;gap:2px"><span class="price">${v != null ? GBP.format(v) : '—'}</span><button class="btn sm ghost icon" data-act="trade-rm" data-side="${side}" data-i="${i}" aria-label="Remove">${ic('x', 'sm')}</button></div></div>`; }).join('')
    : `<p class="small muted" style="margin:6px 0">${side === 'give' ? 'Tap <b>Give</b> on a spare, or search below.' : 'Search for the cards you’re getting.'}</p>` };
}
function tradeHtml(col) {
  const spares = [];
  for (const id of col.cardIds) { const c = S.cards[id]; if (!c) continue; const by = {};
    for (const s of sparesOf(col, c)) { const v = s.v === 'any' ? primaryVariant(c, col) : s.v; by[v] = (by[v] || 0) + s.n; }
    for (const [v, n] of Object.entries(by)) spares.push({ c, v, n }); }
  spares.sort((a, b) => (priceOf(b.c, b.v)?.gbp || 0) - (priceOf(a.c, a.v)?.gbp || 0));
  const spareVal = spares.reduce((n, s) => n + (priceOf(s.c, s.v)?.gbp || 0) * s.n, 0);
  const need = UI.layout.cards.filter(e => !col.owned[e.id]).length;
  const G = tradeSide('give'), R = tradeSide('get'), diff = R.total - G.total;
  return `<div class="ov">
    <section class="panel">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2>Your spares</h2>
        <p class="muted small" style="margin:0">${spares.length ? `${spares.reduce((n, s) => n + s.n, 0)} spare copies worth about <b class="price">${GBP.format(spareVal)}</b>. Log extra copies in each card's details.` : 'No spares yet. Set quantities above 1 in a card’s details (tap the ⓘ on a pocket) and they appear here.'}</p></div>
        <div class="row"><button class="btn sm" data-act="share-trade"${spares.length ? '' : ' disabled'}>${ic('share', 'sm')}Share trade list</button><button class="btn sm" data-act="share-want"${need ? '' : ' disabled'}>${ic('share', 'sm')}Share want list (${need})</button></div></div>
      ${spares.length ? `<div class="tlist">${spares.slice(0, 200).map(s => { const img = safeUrl(s.c.img_s), pi = priceOf(s.c, s.v);
        return `<div class="titem">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="ph"></span>'}
          <div class="t"><b>${esc(s.c.name)}</b><span>${esc(s.c.number)} · ${esc(s.c.set_name)} · ${VARIANTS[s.v]}</span></div>
          <span class="small num">×${s.n}${pi ? ` · ${fmtPrice(pi)}` : ''}</span>
          <button class="btn sm" data-act="give" data-card="${esc(s.c.id)}" data-v="${s.v}">${ic('plus', 'sm')}Give</button></div>`; }).join('')}</div>` : ''}
    </section>
    <section class="panel"><h2>Trade calculator</h2><p class="muted">Compares both sides at current ${(S.settings.priceSource || CONFIG.priceSource) === 'tcgplayer' ? 'TCGplayer' : 'Cardmarket'} prices in GBP.</p>
      <div class="trade">
        <div><b>You give</b><div class="tlist">${G.html}</div><div class="ttotal"><span>Total</span><span class="price">${GBP.format(G.total)}${G.unpriced ? ` <small class="muted">+${G.unpriced} unpriced</small>` : ''}</span></div></div>
        <div><b>You get</b><div class="tlist">${R.html}</div>
          <form id="t-form" class="row" style="margin-top:8px;flex-wrap:nowrap"><div class="search" style="flex:1"><svg class="i"><use href="#i-search"/></svg><input id="t-term" class="inp" placeholder="Card name or code, e.g. PBL 42" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Find a card"></div><button class="btn">Find</button></form>
          <div class="picker" id="t-results">${UI.tradeResults.map(c => `<button class="titem" style="text-align:left" data-act="trade-pick" data-card="${esc(c.id)}">${safeUrl(c.img_s) ? `<img src="${esc(safeUrl(c.img_s))}" alt="" loading="lazy">` : '<span class="ph"></span>'}<span class="t"><b>${esc(c.name)}</b><span>${esc(c.number)} · ${esc(c.set_name)}</span></span><span class="price small">${fmtPrice(priceOf(c))}</span>${ic('plus')}</button>`).join('')}</div>
          <div class="ttotal"><span>Total</span><span class="price">${GBP.format(R.total)}${R.unpriced ? ` <small class="muted">+${R.unpriced} unpriced</small>` : ''}</span></div></div>
      </div>
      ${S.trade.give.length || S.trade.get.length ? `<div class="verdict ${Math.abs(diff) < 0.5 ? '' : diff > 0 ? 'up' : 'down'}" style="margin-top:14px">${Math.abs(diff) < 0.5 ? 'About even' : diff > 0 ? `You come out ${GBP.format(diff)} ahead` : `You give ${GBP.format(-diff)} more than you get`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-act="trade-clear">Clear</button><button class="btn primary" data-act="trade-apply">${ic('check', 'sm')}Apply to “${esc(col.name)}”</button></div>` : ''}
    </section></div>`;
}
function tradeAdd(side, cardId, v) {
  const c = S.cards[cardId]; if (!c) return;
  v = VARIANTS[v] && v !== 'any' ? v : primaryVariant(c, active() || {});
  const hit = S.trade[side].find(x => x.id === cardId && x.v === v);
  if (hit) hit.q = Math.min(99, hit.q + 1); else S.trade[side].push({ id:cardId, v, q:1 });
  if (side === 'get') UI.tradeResults = [];
  save(); renderView();
}
async function applyTrade() {
  const col = active(); if (!col) return;
  if (!await confirmDlg('Apply this trade?', `Removes the cards you give from "${col.name}" and adds the cards you get (as owned copies). You can undo straight after.`, 'Apply trade')) return;
  const snap = snapshot(); col.copies ||= {};
  for (const it of S.trade.give) {
    const rec = col.copies[it.id]; if (!rec) continue; let left = it.q;
    for (const v of [it.v, 'any', ...Object.keys(rec)]) { if (!left) break; const r = rec[v]; if (!r?.q) continue; const take = Math.min(r.q, left); r.q -= take; left -= take; }
  }
  for (const it of S.trade.get) {
    if (!S.cards[it.id]) continue;
    if (!col.cardIds.includes(it.id)) col.cardIds.push(it.id);
    const r = ((col.copies[it.id] ||= {})[it.v] ||= { q:0 }); r.q = Math.min(999, (r.q || 0) + it.q);
  }
  S.trade = { give:[], get:[] }; syncOwned(col); col.updated = Date.now(); save(); render();
  undoable('Trade applied', snap);
}
document.addEventListener('submit', async e => {
  if (e.target.id !== 't-form') return;
  e.preventDefault();
  const term = $('#t-term').value.trim(); if (!term) return;
  const btn = e.target.querySelector('button'); btn.disabled = true;
  try {
    let res;
    if (/^([A-Za-z]{2,5}|PR-[A-Za-z]{2,4})[\s-]*[A-Za-z]{0,4}\d{1,4}/.test(term) && /\d/.test(term)) res = (await codeSearch(term)).results;
    else res = await apiFetchAll(buildQuery('name', term), null, null, 40);
    res.forEach(mergeCard); save();
    UI.tradeResults = res.map(c => S.cards[c.id]).slice(0, 40);
    if (!res.length) toast('No cards found', 'warn');
  } catch (err) {
    const t = term.toLowerCase(); UI.tradeResults = Object.values(S.cards).filter(c => c.name.toLowerCase().includes(t)).slice(0, 40);
    toast(`Search offline — showing ${UI.tradeResults.length} saved card(s)`, 'warn');
  } finally { btn.disabled = false; }
  renderView(); $('#t-term')?.focus();
});
document.addEventListener('change', e => {
  if (!e.target.matches('.t-v')) return;
  const it = S.trade[e.target.dataset.side]?.[+e.target.dataset.i]; if (!it || !VARIANTS[e.target.value]) return;
  it.v = e.target.value; save(); renderView();
});

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
  const t = e.target.closest('[data-act],[data-view],[data-close]'); if (!t) return;
  if (t.hasAttribute('data-close')) { t.closest('dialog').close(); return; }
  if (t.dataset.view) { UI.view = S.settings.view = t.dataset.view; save(); renderHeader(active()); renderView(); return; }
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
      try { const [c] = await apiFetchAll(`id:"${id}"`); if (c) { mergeCard(c); save(); } await loadFx(); openInfo(eid); renderProgress(); toast(c?.price ? 'Price updated' : 'Still no price for this card', c?.price ? 'success' : 'warn'); }
      catch (err) { toast('Refresh failed: ' + err.message, 'error'); } })(); break;
    case 'share-want': shareRows(rowsFor(active(), 'needed')); break;
    case 'share-trade': shareRows(rowsFor(active(), 'spare')); break;
    case 'give': tradeAdd('give', t.dataset.card, t.dataset.v); break;
    case 'trade-rm': { const side = t.dataset.side; S.trade[side].splice(+t.dataset.i, 1); save(); renderView(); break; }
    case 'trade-q': { const r = S.trade[t.dataset.side][+t.dataset.i]; r.q = Math.max(1, Math.min(99, r.q + Number(t.dataset.d))); save(); renderView(); break; }
    case 'trade-clear': S.trade = { give:[], get:[] }; save(); renderView(); break;
    case 'trade-apply': applyTrade(); break;
    case 'trade-pick': tradeAdd('get', t.dataset.card, t.dataset.v); break;
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

/* ---------- PWA ---------- */
let installEvt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#install-btn').classList.remove('hidden'); });
$('#install-btn').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#install-btn').classList.add('hidden'); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));

/* ---------- boot ---------- */
(async function boot() {
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
  S.trade ||= { give:[], get:[] };
  if (!S.collections[S.activeId]) S.activeId = S.order[0] || null;
  UI.view = S.settings.view || 'binder';
  applyTheme();
  if (location.hash.startsWith('#s=')) await openShare(location.hash.slice(3));
  else render();
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#s=')) openShare(location.hash.slice(3)); });
  loadFx().then(() => { const col = active(); if (col && !UI.share) { recordSnapshot(col); } });   // non-blocking; prices render in EUR/USD until a rate is available
  // gentle backup nudge: >50 owned ticks and no backup in 30 days
  const ticks = S.order.reduce((n, id) => n + Object.keys(S.collections[id].owned).length, 0);
  if (ticks > 50 && (!S.settings.lastBackup || Date.now() - S.settings.lastBackup > 30 * 864e5))
    setTimeout(() => toast('Your collection only lives in this browser — download a backup', 'warn', { label:'Back up', fn:openExport }), 1500);
})();
