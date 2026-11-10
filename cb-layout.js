/* cb-layout.js — Custom Build blocks, shared by proposal.html (merchant view) and index.html (rep calc).
 *
 * Reads the Custom Build `bld` config and applies, idempotently (call SICB.apply(cfg) again to update,
 * SICB.apply(null) to clear):
 *   • merchant input section style (branding.input*) and per-field order / width / style / hide (cfg.inputs)
 *   • inputs column position (left / right / top) and width (narrow / normal / wide)
 *   • results blocks order / width / style / hide (cfg.layout) and custom text blocks (cfg.blocks)
 *   • header background (branding.accent2) and header text colour / font / weight / size (branding.hdr*)
 * Colours (backgrounds, text colours, borders) apply in the default theme only; Project Midnight keeps
 * its own look and gets layout (order, width, position, hide) and typography (font, size, weight).
 * Compact density keeps its fixed optimized arrangement: styles and hide apply there, order and width don't
 * (compact inputs are grouped into sections; compact results are the 4-box strip).
 *
 * SICB.setEdit(on, sel) turns on the on-canvas editor (used by custom-build.html's preview): every block
 * gets an outline and a toolbar (drag grip, width, style, show/hide). Edits are posted to the parent
 * window as {siCBx:'op', ...}; the Custom Build editor owns the config and re-applies it.
 */
(function () {
  'use strict';

  // ── Vocabulary (shared with custom-build.html) ─────────────────────────────────────────────
  const FIELDS = [
    { k: 'orders',  label: 'Monthly Orders' },
    { k: 'aov',     label: 'AOV' },
    { k: 'claims',  label: 'Claims Rate' },
    { k: 'premium', label: 'SI Premium' },
    { k: 'attach',  label: 'Attach Rate' },
    { k: 'share',   label: 'Rev Share' },
  ];
  const BLOCKS = [
    { k: 'banner',    label: 'Banner image' },
    { k: 'metrics',   label: 'Output Strip' },
    { k: 'hero',      label: 'Premiums You Keep' },
    { k: 'upfront',   label: 'Upfront Rev Share Payment' },
    { k: 'cards',     label: 'Extra Revenue card' },
    { k: 'cost',      label: 'Current Cost card' },
    { k: 'returns',   label: 'Returns Savings' },
    { k: 'cashback',  label: 'Cashback' },
    { k: 'breakdown', label: 'Calculation Breakdown' },
    { k: 'billing',   label: 'Billing Explained' },
    { k: 'copylink',  label: 'Copy Link button' },
  ];
  // Output strip pills (comfort) — the compact strip's boxes with the same meaning follow them.
  const PILLS = [
    { k: 'volume',     label: 'Volume (Monthly / Annual)' },
    { k: 'avgPremium', label: 'Avg / SI Premium' },
    { k: 'orders',     label: 'Protected / Opt-in Orders' },
    { k: 'premiums',   label: 'Premiums' },
    { k: 'protected',  label: 'Protected / Covered' },
    { k: 'claims',     label: 'Protected Claims' },
    { k: 'siFunded',   label: 'SI Funded' },
    { k: 'postClaim',  label: 'Post-Claim Balance' },
    { k: 'returns',    label: 'Total Returns' },
    { k: 'cashback',   label: 'Cashback / Order' },
  ];
  // Parts inside a block (selectors cover the merchant view, the rep calc and the compact twin).
  const PARTS = {
    hero:    { label: '.impact-label,.hero-label,.co2-lbl', value: '.impact-value,.hero-value,.co2-val', chips: '.impact-pct-line,.co2-pills > *', sub: '#revenueImpactSub,.impact-returns-note,.hero-sub' },
    upfront: { label: '.impact-label,.hero-label,.co2-up-lbl', value: '.impact-value,.hero-value,.co2-up-val', sub: '.upfront-mo,.hero-sub,.co2-up-mo' },
    cost:    { label: '.card-header h3,.rc-label,.co2-rb-lbl', value: '.card-total,.rc-total,.co2-rb-val', chips: '.metric-item,.rc-metric', sub: '.metric-item h4,.sub-section-label,.co2-rb-rows' },
    pill:    { label: '.om-label,.kmp-label,.co2-lbl', value: '.om-value,.om-pair-v,.kmp-value,.kmp-pv,.co2-val', sub: '.om-pair-k,.om-badge,.kmp-pk,.kmp-sub,.kmp-badge,.co2-sub' },
  };
  const LABEL_TEXT = {                                   // the element whose words a "Label text" replaces
    hero: '#impactLabel,#heroLabel,#coKeepLbl',
    upfront: '#upfrontBubble .impact-label,#p-upfrontHero .hero-label,#coUpfront2 .co2-up-lbl',
    cost: '#lostRevenueLabel,#costCard .rc-label,#coRbLbl',
  };
  const ZOOM = { s: 0.88, l: 1.15, xl: 1.32 };
  // Block themes (Custom Build): 'frosted' = light glass tinted with the merchant colour,
  // 'liquid' = dark slowly-drifting background with glass cards. Absent = Classic (the page's look).
  const THEMES = ['', 'frosted', 'liquid'];
  // Inner tiles that become glass cards inside a themed block
  const TILES = '.output-metric,.key-metric-pill,.co2-box,.impact-pct-line,.co2-pills > *,.metric-item,.rc-metric,.feature-result-item,.bd-col,.bd-shared-section';
  // Blocks drawn white-on-colour: Frosted (a light surface) switches their text to ink
  const INVERSE = { hero: 1, upfront: 1, copylink: 1 };
  // Compact versions that follow a block's theme
  const THEME_TWINS = { metrics: '#compactOpt .co2-strip', cards: '#compactOpt .co2-green' };
  // Compact density's versions of comfort blocks (same markup on both pages)
  const TWINS = { hero: '#compactOpt .co2-box.co2-keep', upfront: '#coUpfront2', cost: '#coRedBox' };
  const SPAN = { full: 6, twothirds: 4, half: 3, third: 2 };
  const PCT = { full: '100%', twothirds: 'calc(66.666% - 2.67px)', half: 'calc(50% - 4px)', third: 'calc(33.333% - 5.34px)' };
  const SIZE = { s: '90%', m: '', l: '112%', xl: '125%' };
  const HDR_SIZE = { s: '0.7em', m: '', l: '1em', xl: '1.3em' };
  const GOOGLE_FONTS = { 'Poppins': 1, 'Montserrat': 1, 'Inter': 1, 'Lora': 1, 'Roboto Slab': 1, 'Playfair Display': 1, 'DM Sans': 1, 'Oswald': 1 };

  // ── Page adapters ─────────────────────────────────────────────────────────────────────────
  const byId = id => () => document.getElementById(id);
  const q = sel => () => document.querySelector(sel);
  const PAGES = {
    proposal: {
      root: '.proposal-layout',
      wrap: '.proposal-layout', panel: '.left-panel', results: '.right-panel',
      panelW: { narrow: 300, normal: 370, wide: 460 }, stackBelow: 740,
      grid: '#resultsSection', gridOn: '#resultsSection.visible.cbx-grid',
      contents: ['#resultsSection > .hero-row', '#resultCardsRow'],
      upAuto: 2,                                                     // Upfront beside Premiums You Keep: 4 + 2 columns
      heroRow: '#resultsSection > .hero-row',
      copyIn: '#p-save-link-btn', copyOut: '#p-save-link-btn',      // one button, moved into the results when placed there
      blocks: {
        metrics: q('#resultsSection > .key-metrics'),
        hero: q('#resultsSection > .hero-row > .result-hero:not(.upfront-hero)'),
        upfront: byId('p-upfrontHero'),
        cards: q('#resultCardsRow > .result-card-positive'),
        cost: byId('costCard'),
        returns: byId('returnsResultBlock'),
        cashback: byId('cashbackResultBlock'),
        breakdown: byId('p-calcBreakdown'),
      },
      pills: {
        volume: ['#p-volumePill'], avgPremium: ['#avgPremiumPill'], orders: ['#p-ordersPill'],
        premiums: [() => up('p-premiumsLabel')], protected: ['#r-protectedClaimsPill'], siFunded: ['#p-siFundedPill'],
        postClaim: [() => up('r-balanceLabel')],
      },
      billing: { toggle: '#p-calcBreakdown .flow-toggle', body: '#p-billingBody', after: '#p-calcBreakdown' },
      paint: {},                                                     // where a block's background goes (default: the block)
      compactBox: '#compactOpt',                                     // compact density's stand-in for metrics/hero/cards/cost
      costHiddenRow: '#resultCardsRow.cost-hidden',
      fieldBox: '#primaryInputsGrid', fieldGrid: true,
      fields: {
        orders: () => fg('p-orders'), aov: () => fg('p-aov'), claims: byId('p-claims-group'),
        premium: byId('p-premium-wrap'), attach: byId('p-attach-group'), share: byId('p-share-group'),
      },
      inSurface: ['#inputsSection', '.left-panel'],
      inBox: null,
      inLabel: '#inputsSection .field-group label',
      inField: '#inputsSection .field-group input, #inputsSection .field-group select',
      inBorderDef: 1.5,
      header: '.proposal-header',
      hdrText: ['.proposal-header .merchant-subtitle', '.proposal-header .header-view-selector label'],
      hdrMain: '.proposal-header .merchant-subtitle',
    },
    calc: {
      root: '.container',
      wrap: '.calc-body', panel: '.calc-left', results: '.calc-right',
      panelW: { narrow: 280, normal: 320, wide: 400 }, stackBelow: 900, notStacked: ':not(.force-stacked)',
      grid: '.calc-right', gridOn: '.calc-right.cbx-grid',
      contents: ['#widgetMiddleWrapper', '.calc-right .middle-section', '.calc-right .revenue-impact-row', '#cardsRow'],
      upAuto: 3, centerAuto: true,                                   // impact boxes keep their natural width, centred
      heroRow: '.calc-right .revenue-impact-row',
      copyIn: '#generateProposalLink', copyOut: '#generateProposalLinkStacked', copyHide: '#linkDisplay',
      blocks: {
        metrics: q('.calc-right > .outputs-strip'),
        hero: q('.calc-right .revenue-impact-row > .revenue-impact-box:not(.upfront-box)'),
        upfront: byId('upfrontBubble'),
        cards: q('#cardsRow > .result-card.positive'),
        cost: byId('currentCostCard'),
        breakdown: q('.calc-right > .calc-breakdown'),
      },
      pills: {
        volume: ['#volumeMetric'], avgPremium: ['#avgPremiumMetric'], orders: ['#protectedOrdersSingleMetric', '#roOptinOrdersMetric'],
        premiums: ['#premiumsMetric'], protected: ['#protectedOrdersMetric', '#roCoveredMetric'], claims: ['#protectedClaimsSingleMetric'],
        siFunded: ['#siFundedStripMetric'], postClaim: ['#postClaimMetric'], returns: ['#totalReturnsMetric'], cashback: ['#cashbackMetric'],
      },
      billing: { toggle: '.calc-right > .calc-breakdown > .flow-toggle', body: '#billingBody', after: '.calc-right > .calc-breakdown' },
      paint: {},
      compactBox: '#compactOutputs, #compactOpt',
      costHiddenRow: '#cardsRow.cost-hidden',
      bleed: { metrics: 1, breakdown: 1, billing: 1 },   // full-bleed strips: reach the column edges when full width
      fieldBox: '.inputs-strip', fieldRows: ['#coreInputsRow', '#secondaryInputsRow'],
      fields: {
        orders: byId('ordersGroup'), aov: byId('aovGroup'), claims: byId('claimsRateGroup'),
        premium: byId('protectionPremiumGroup'), attach: byId('attachRateGroup'), share: byId('revShareGroup'),
      },
      inSurface: [],
      inBox: '.inputs-strip .input-group:not(.returns):not(.cashback)',
      inBoxCompact: '.container.density-compact .inputs-strip .input-group.si-input:not(.cashback)',
      inLabel: '.inputs-strip .input-group:not(.returns):not(.cashback) label',
      inField: '.inputs-strip .input-group:not(.returns):not(.cashback) input, .inputs-strip .input-group:not(.returns):not(.cashback) select',
      inBorderDef: 1.5,
      header: '.top-strip',
      hdrText: ['.top-strip .view-selector label'],
      hdrMain: '.top-strip .view-selector label',
    },
  };
  // Compact strip boxes that mirror comfort pills
  const PILL_TWINS = { avgPremium: () => up('coAvgPremLbl'), premiums: () => up('coPremLbl'), postClaim: () => up('coPostLbl') };
  function up(id) { const e = document.getElementById(id); return e ? e.parentElement : null; }
  function fg(inputId) { const i = document.getElementById(inputId); return i ? i.closest('.field-group') : null; }
  function page() {
    if (document.querySelector('.proposal-layout')) return PAGES.proposal;
    if (document.querySelector('.container .calc-body')) return PAGES.calc;
    return null;
  }

  // ── Config normalisation (old builds → today's shape, nothing lost) ──────────────────────
  function normLayout(layout, blocks) {
    let L = (Array.isArray(layout) ? layout : []).map(it => (typeof it === 'string') ? { k: it, v: true } : Object.assign({}, it));
    L = L.filter(it => it && it.k && it.k !== 'guarantee');
    const has = k => L.some(it => it.k === k);
    const idx = k => L.findIndex(it => it.k === k);
    if (!L.length) L = BLOCKS.filter(b => b.k !== 'cost' && b.k !== 'banner').map(b => ({ k: b.k, v: true }));
    BLOCKS.forEach(b => {
      if (b.k === 'cost' || b.k === 'upfront' || b.k === 'billing' || b.k === 'banner' || has(b.k)) return;
      if (b.k === 'breakdown' || b.k === 'copylink') { L.push({ k: b.k, v: true }); return; }
      const bi = idx('breakdown');
      if (bi >= 0) L.splice(bi, 0, { k: b.k, v: true }); else L.push({ k: b.k, v: true });
    });
    if (!has('billing')) {                                // Billing Explained: right after the breakdown (where it lives today)
      const bi = idx('breakdown');
      L.splice(bi >= 0 ? bi + 1 : L.length, 0, { k: 'billing', v: true });
    }
    if (!has('upfront')) {                                // older builds: Upfront lived inside the hero row
      const hi = idx('hero');
      L.splice(hi + 1, 0, { k: 'upfront', v: L[hi].v !== false });
    }
    if (!has('cost')) {                                   // older builds: 'cards' was the whole row
      const ci = idx('cards');
      const cost = { k: 'cost', v: L[ci].v !== false };
      // Its border / background styled both cards, so both cards keep it.
      const st = L[ci].style;
      if (st) { const c = {}; ['bg', 'bc', 'bw', 'radius'].forEach(k => { if (st[k] != null && st[k] !== '') c[k] = st[k]; }); if (Object.keys(c).length) cost.style = c; }
      L.splice(ci + 1, 0, cost);
    }
    if (!has('banner')) L.unshift({ k: 'banner', v: true });   // the banner sat at the top of the results
    (blocks || []).forEach(b => { if (b && b.id && !has(b.id)) L.push({ k: b.id, v: true }); });
    return L;
  }
  function normInputs(inp) {
    const o = Object.assign({ pos: 'left', width: 'normal', ordered: false }, inp || {});
    const F = Array.isArray(o.fields) ? o.fields.filter(f => f && FIELDS.some(x => x.k === f.k)).map(f => Object.assign({}, f)) : [];
    FIELDS.forEach(f => { if (!F.some(x => x.k === f.k)) F.push({ k: f.k, v: true }); });
    o.fields = F;
    return o;
  }

  // ── CSS helpers ───────────────────────────────────────────────────────────────────────────
  const BOOST = ':not(#cbx-none)';                      // +1 id specificity, beats the pages' own rules
  const BOOST2 = ':not(#cbx-none):not(#cbx-n2)';        // per-block / per-field rules beat the section defaults
  const LIGHT = 'body:not(.theme-midnight) ';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const okColor = c => typeof c === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|linear-gradient\(.*\))$/i.test(c.trim());
  const fontStack = f => "'" + String(f).replace(/['";{}]/g, '') + "', system-ui, sans-serif";
  function loadFont(f) {
    if (!f || !GOOGLE_FONTS[f]) return;
    const id = 'cbx-font-' + f.replace(/\W/g, '');
    if (document.getElementById(id)) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.id = id;
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }
  const list = (sels, suffix) => sels.split(',').map(s => s.trim() + (suffix || '')).join(',');
  const BOOST3 = BOOST2 + ':not(#cbx-n3)';             // parts inside a block beat the block's own text colour
  const under = (host, sels) => sels.split(',').map(p => host + ' ' + p.trim()).join(',');
  const zoomOf = v => ZOOM[v] || null;

  // ── Text overrides (labels, button text) ── kept in place when the page re-renders its text.
  let OV = [];
  // ── Monthly / Annual words ── Custom text follows the calc's View the way the page's own labels
  // do: Monthly / month / mo (/mo, mo.) ↔ Annual(ly) / year / yr (/yr, yr.). Written either way.
  let PERIOD = true;                                     // branding.periodText === 0 turns it off
  function isAnnualView() {
    if (document.querySelector('.proposal-layout')) return (window._urlView || 'monthly') === 'annual';
    const t = document.getElementById('timeframe');
    return !!(t && t.value === 'annual');
  }
  const caseLike = (src, w) => (src.length > 1 && src === src.toUpperCase()) ? w.toUpperCase()
    : (src[0] === src[0].toUpperCase() ? w[0].toUpperCase() + w.slice(1) : w);
  function periodize(text, annual) {
    if (!text || !PERIOD) return text;
    const t = String(text);
    if (annual) return t
      .replace(/\bmonthly\b(?=\s+[A-Za-z$(#%])/gi, m => caseLike(m, 'annual'))      // Monthly Orders → Annual Orders
      .replace(/\bmonthly\b/gi, m => caseLike(m, 'annually'))                        // billed monthly → billed annually
      .replace(/\bmonth\b/gi, m => caseLike(m, 'year'))
      .replace(/\bmo\b/gi, m => caseLike(m, 'yr'));                                   // /mo, mo., per mo
    return t
      .replace(/\b(annually|annual|yearly)\b/gi, m => caseLike(m, 'monthly'))
      .replace(/\byear\b/gi, m => caseLike(m, 'month'))
      .replace(/\byr\b/gi, m => caseLike(m, 'mo'));
  }
  const viewText = text => periodize(text, isAnnualView());
  function lastText(el) {
    let t = null;
    el.childNodes.forEach(n => { if (n.nodeType === 3 && n.data.trim()) t = n; });
    return t;
  }
  function overrideText(el, text) {
    if (!el || !text) return;
    const mixed = () => [...el.children].some(c => !c.classList.contains('cbx-bar'));
    const read = () => mixed() ? ((lastText(el) || {}).data || '') : el.textContent;
    const rec = { el, orig: read(), mixed: mixed() };
    const put = () => {
      const tx = viewText(text);
      if (rec.mixed) { const t = lastText(el); const want = ' ' + tx; if (t && t.data !== want) t.data = want; }
      else if (el.textContent !== tx) el.textContent = tx;
    };
    rec.put = put;
    put();
    rec.mo = new MutationObserver(put);
    rec.mo.observe(el, { childList: true, characterData: true, subtree: true });
    OV.push(rec);
  }
  function clearOverrides() {
    OV.forEach(r => {
      r.mo.disconnect();
      if (r.mixed) { const t = lastText(r.el); if (t) t.data = r.orig; } else r.el.textContent = r.orig;
    });
    OV = [];
  }

  // Parts of a block (label / value / detail / chips). host = a selector for the block element(s).
  function partCss(host, parts, st) {
    if (!st || !parts) return '';
    let css = '';
    const H = h => h + BOOST3;
    const L = (sels, decl) => sels ? under(LIGHT + H(host), sels) + '{' + decl + '}' : '';
    if (okColor(st.labelColor)) css += L(parts.label, 'color:' + st.labelColor + ' !important;text-shadow:none !important;');
    if (okColor(st.valueColor)) css += L(parts.value, 'color:' + st.valueColor + ' !important;');
    if (okColor(st.subColor)) css += L(parts.sub, 'color:' + st.subColor + ' !important;') + L(parts.sub ? parts.sub.split(',').map(x => x + ' *').join(',') : '', 'color:' + st.subColor + ' !important;');
    if (parts.chips) {
      if (okColor(st.chipBg)) css += L(parts.chips, 'background:' + st.chipBg + ' !important;box-shadow:none !important;');
      if (okColor(st.chipColor)) css += L(parts.chips, 'color:' + st.chipColor + ' !important;') + L(parts.chips.split(',').map(x => x + ' *').join(','), 'color:' + st.chipColor + ' !important;');
      if (st.hideChips) css += under(H(host), parts.chips) + '{display:none !important;}';
    }
    if (zoomOf(st.labelSize)) css += under(H(host), parts.label) + '{zoom:' + zoomOf(st.labelSize) + ';}';
    if (zoomOf(st.valueSize)) css += under(H(host), parts.value) + '{zoom:' + zoomOf(st.valueSize) + ';}';
    return css;
  }

  // Theme CSS, tinted with the merchant accent. Default theme only (Midnight keeps its own look).
  function rgbOf(hex) {
    const h = String(hex || '').replace('#', '');
    const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    if (!/^[0-9a-f]{6}$/i.test(f)) return '102,117,255';
    const n = parseInt(f, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(',');
  }
  function themeCss(accent) {
    const A = rgbOf(accent);
    const F = LIGHT + '[data-cbx-theme="frosted"]' + BOOST;
    const Q = LIGHT + '[data-cbx-theme="liquid"]' + BOOST;
    const tiles = (host) => under(host, TILES);
    const NOT_UI = ':not(input):not(select):not(option):not(.cbx-bar):not(.cbx-bar *)';
    let css = '';
    // Frosted glass
    css += F + '{background:linear-gradient(135deg,rgba(' + A + ',.22) 0%,rgba(255,255,255,.66) 52%,rgba(' + A + ',.12) 100%) !important;' +
      'border:1px solid rgba(255,255,255,.85) !important;border-radius:18px !important;' +
      '-webkit-backdrop-filter:blur(18px) saturate(1.7);backdrop-filter:blur(18px) saturate(1.7);' +
      'box-shadow:0 12px 30px rgba(' + A + ',.18),inset 0 1px 0 rgba(255,255,255,.95),inset 0 0 0 1px rgba(255,255,255,.45) !important;}';
    css += tiles(F) + '{background:rgba(255,255,255,.58) !important;border:1px solid rgba(255,255,255,.9) !important;border-radius:12px !important;box-shadow:0 2px 10px rgba(' + A + ',.08) !important;}';
    css += F + '[data-cbx-inv],' + F + '[data-cbx-inv] *' + NOT_UI + '{color:#1f2430 !important;text-shadow:none !important;}';
    css += under(F + '[data-cbx-inv]', '.impact-value,.hero-value,.co2-val,.co2-up-val') + '{color:rgb(' + A + ') !important;filter:brightness(.8);}';
    css += under(F, '.co2-rb-val') + '{color:#c0392b !important;}';
    // Liquid glass: dark, slowly drifting background
    css += Q + '{background:' +
      'radial-gradient(55% 75% at 18% 22%,rgba(' + A + ',.62) 0%,rgba(' + A + ',0) 62%),' +
      'radial-gradient(48% 68% at 84% 28%,rgba(139,92,246,.5) 0%,rgba(139,92,246,0) 62%),' +
      'radial-gradient(60% 80% at 50% 105%,rgba(20,184,166,.4) 0%,rgba(20,184,166,0) 62%),' +
      'linear-gradient(160deg,#0d1020 0%,#080a16 100%) !important;' +
      'background-size:190% 190%,210% 210%,230% 230%,100% 100% !important;' +
      'background-position:var(--cbx-x1) var(--cbx-y1),var(--cbx-x2) var(--cbx-y2),var(--cbx-x3) var(--cbx-y3),0 0 !important;' +
      'animation:cbxDrift 28s ease-in-out infinite alternate !important;' +
      'border:1px solid rgba(255,255,255,.14) !important;border-radius:20px !important;' +
      'box-shadow:0 18px 42px rgba(8,10,24,.34),inset 0 1px 0 rgba(255,255,255,.14) !important;color:#eef0fa !important;}';
    css += Q + ',' + Q + ' *' + NOT_UI + '{color:#eef0fa !important;text-shadow:none !important;}';
    css += under(Q, '.om-value,.kmp-value,.impact-value,.hero-value,.co2-val,.co2-up-val,.er-value,.co2-green-val') + '{color:#ffffff !important;}';
    css += under(Q, '.card-total.positive,.rc-total.positive,.co2-green-val,.er-revshare .er-v,.positive .value,.flow-val:not(.neg)') + '{color:#6ee7b7 !important;}';
    css += under(Q, '.card-total.negative,.rc-total.negative,.co2-rb-val,.negative .value,.flow-val.neg') + '{color:#ff9b8f !important;}';
    css += tiles(Q) + '{background:rgba(255,255,255,.09) !important;border:1px solid rgba(255,255,255,.22) !important;border-radius:14px !important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 18px rgba(0,0,0,.28) !important;-webkit-backdrop-filter:blur(8px) saturate(1.5);backdrop-filter:blur(8px) saturate(1.5);}';
    css += Q + '>.lgc-plate{display:none !important;}' + Q + '.lgc-on{-webkit-backdrop-filter:none !important;backdrop-filter:none !important;}';
    css += under(Q, 'input') + '{background:rgba(255,255,255,.14) !important;color:#fff !important;border-color:rgba(255,255,255,.28) !important;}';
    return css;
  }

  // ── Static CSS (grid machinery + editor chrome) ───────────────────────────────────────────
  function baseCss(P) {
    const N = P.root + ':not(.density-compact)';
    const C = P.root + '.density-compact';
    let css = '';
    // Results grid: 6 columns; every child spans the row unless a block says otherwise.
    css += P.gridOn + '{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-content:start;}';
    css += P.gridOn + '>*{grid-column:1/-1;min-width:0;}';
    css += P.contents.map(s => N + ' ' + s + '.cbx-contents').join(',') + '{display:contents;}';
    css += C + ' [data-cbk]:not(#cbx-none):not(#cbx-n2){grid-column:1/-1 !important;}';
    if (P === PAGES.proposal) {
      css += P.gridOn + '{column-gap:10px;}';
      css += N + ' #resultCardsRow.cbx-contents>[data-cbk]{margin-bottom:10px;}';
      css += N + ' #resultsSection>.hero-row.cbx-contents>[data-cbk]:not(#cbx-none){margin-bottom:10px;}';
      css += P.gridOn + '>.cb-block{margin-bottom:10px;}';
    } else {
      css += N + ' ' + P.gridOn + '{column-gap:12px;row-gap:12px;padding:14px 16px;}';
      css += C + ' ' + P.gridOn + '{row-gap:0;}';
      // Output strip: a full-bleed band when full width (as before); a plain row of boxes otherwise.
      css += N + ' ' + P.gridOn + '>.outputs-strip:not([data-cbx-bleed]){padding:0;border-bottom:none;background:transparent;}';
      css += N + ' ' + P.gridOn + '>[data-cbx-bleed]{margin-left:-16px;margin-right:-16px;}';
      css += N + ' ' + P.gridOn + '>.outputs-strip[data-cbx-bleed]{margin-bottom:2px;}';
      css += N + ' ' + P.gridOn + '>[data-cbx-first][data-cbx-bleed]{margin-top:-14px;}';
      css += N + ' ' + P.gridOn + '>[data-cbx-last][data-cbx-bleed]{margin-bottom:-14px;}';
      css += N + ' ' + P.gridOn + ' .revenue-impact-row{margin:0;}';
    }
    // Block themes: drift animation + glass backplates
    // The drift animates registered custom properties: an !important background (needed to beat the
    // pages' own !important gradients) would otherwise freeze an animated background-position.
    ['x1', 'y1', 'x2', 'y2', 'x3', 'y3'].forEach(v => { css += '@property --cbx-' + v + '{syntax:"<percentage>";inherits:false;initial-value:0%;}'; });
    css += '@keyframes cbxDrift{0%{--cbx-x1:0%;--cbx-y1:0%;--cbx-x2:100%;--cbx-y2:0%;--cbx-x3:50%;--cbx-y3:100%}' +
      '50%{--cbx-x1:100%;--cbx-y1:60%;--cbx-x2:0%;--cbx-y2:100%;--cbx-x3:0%;--cbx-y3:20%}' +
      '100%{--cbx-x1:35%;--cbx-y1:100%;--cbx-x2:70%;--cbx-y2:15%;--cbx-x3:100%;--cbx-y3:60%}}';
    css += '@media (prefers-reduced-motion: reduce){[data-cbx-theme="liquid"]{animation:none !important;}}';
    css += '.cbx-glass{isolation:isolate;}.cbx-glass.cbx-rel{position:relative;}';
    // Once the library plate is mounted it does the frosting; the CSS frost would make the box a
    // backdrop root (the plate would then only see the box's own tint, not the page behind it).
    css += '.cbx-glass.cbx-on{-webkit-backdrop-filter:none !important;backdrop-filter:none !important;}';
    css += '.cbx-plate{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;}';
    css += '.theme-midnight .cbx-plate{display:none;}';
    // Compact versions placed in the comfort results (Upfront bar / Current Cost badge)
    css += '[data-cbx-off]{display:none !important;}';
    css += P.gridOn + ' #coRedBox[data-cbk]' + BOOST + '{position:relative;top:auto;right:auto;max-width:none;align-self:start;margin:0' + (P === PAGES.proposal ? ' 0 10px' : '') + ';}';
    css += P.gridOn + ' #coUpfront2[data-cbk]' + BOOST + '{margin:0' + (P === PAGES.proposal ? ' 0 10px' : '') + ';align-self:start;}';
    // Billing Explained as its own block
    css += '#cbx-billing{min-width:0;}';
    if (P === PAGES.proposal) css += '#cbx-billing{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);margin-bottom:10px;overflow:hidden;}.theme-midnight #cbx-billing{background:#0e0e16;}';
    // Hidden compact strip boxes: the strip closes the gap
    css += 'body:not(.cbx-edit) .co2-strip:has(> [data-cbx-hide]){display:flex !important;gap:8px;}body:not(.cbx-edit) .co2-strip:has(> [data-cbx-hide]) > *{flex:1 1 0;}';
    // Text blocks
    css += '.cb-block{box-sizing:border-box;}';
    css += '.theme-midnight .cb-block{color:#e8e8ee;}';
    // Hidden blocks/fields: gone in the live page, ghosted while editing.
    css += 'body:not(.cbx-edit) [data-cbx-hide]{display:none !important;}';
    css += 'body.cbx-edit [data-cbx-hide]{opacity:.38;filter:grayscale(.6);}';
    // ── On-canvas editor chrome ──
    css += 'body.cbx-edit [data-cbk],body.cbx-edit [data-cbf],body.cbx-edit [data-cbp]{outline:1.5px dashed rgba(102,117,255,.55);outline-offset:3px;cursor:pointer;}';
    css += 'body.cbx-edit [data-cbx-pill],body.cbx-edit [data-cbx-twin]{outline:1.5px dotted rgba(102,117,255,.6);outline-offset:1px;cursor:pointer;}';
    css += 'body.cbx-edit [data-cbx-pill]:hover,body.cbx-edit [data-cbx-twin]:hover{outline:2px solid rgba(102,117,255,.8);}';
    css += 'body.cbx-edit [data-cbk]:not(.lgc-host),body.cbx-edit [data-cbf],body.cbx-edit [data-cbx-pill]:not(.lgc-host),body.cbx-edit [data-cbx-twin]:not(.lgc-host):not(#coRedBox){position:relative;}';
    css += 'body.cbx-edit [data-cbx-pill]>.cbx-bar,body.cbx-edit [data-cbx-twin]>.cbx-bar{opacity:0;transition:opacity .12s;top:-10px;left:50%;transform:translateX(-50%);padding:2px 3px;font-size:10px;}';
    css += 'body.cbx-edit [data-cbx-pill]:hover>.cbx-bar,body.cbx-edit [data-cbx-twin]:hover>.cbx-bar,body.cbx-edit .cbx-sel>.cbx-bar{opacity:1;}';
    css += 'body.cbx-edit [data-cbp]{outline-offset:-3px;}';
    css += 'body.cbx-edit [data-cbk]:hover,body.cbx-edit [data-cbf]:hover{outline:2px solid rgba(102,117,255,.75);}';
    css += 'body.cbx-edit .cbx-sel{outline:2.5px solid #6675ff !important;box-shadow:0 0 0 6px rgba(102,117,255,.16);}';
    css += 'body.cbx-edit .cbx-dragging{opacity:.4;}';
    css += '.cbx-bar{display:none;position:absolute;z-index:80;align-items:center;gap:3px;padding:3px 4px;background:#1f2430;color:#fff;border-radius:8px;box-shadow:0 6px 18px rgba(20,24,48,.28);font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;white-space:nowrap;cursor:default;user-select:none;-webkit-user-select:none;}';
    css += 'body.cbx-edit .cbx-bar{display:flex;}';
    css += 'body.cbx-edit [data-cbk]>.cbx-bar,body.cbx-edit [data-cbf]>.cbx-bar{opacity:0;transition:opacity .12s;}';
    css += 'body.cbx-edit [data-cbk]:hover>.cbx-bar,body.cbx-edit [data-cbf]:hover>.cbx-bar,body.cbx-edit .cbx-sel>.cbx-bar,body.cbx-edit [data-cbp]>.cbx-bar{opacity:1;}';
    css += '[data-cbk]>.cbx-bar{top:-13px;right:10px;}';
    css += '.cbx-bar.cbx-tight .cbx-name{display:none;}';
    css += '[data-cbf]>.cbx-bar{top:-10px;left:50%;transform:translateX(-50%);gap:1px;padding:2px 3px;font-size:10px;}';
    css += '[data-cbf]>.cbx-bar button{padding:3px 4px;}';
    css += '[data-cbf]>.cbx-bar .cbx-grip{padding:2px 3px;}';
    css += '.cbx-bar .cbx-grip{cursor:grab;padding:3px 5px;border-radius:5px;color:#aeb6ff;font-size:13px;touch-action:none;}';
    css += '.cbx-bar .cbx-grip:active{cursor:grabbing;}';
    css += '.cbx-bar .cbx-name{padding:0 5px 0 1px;color:#e7e9ff;max-width:150px;overflow:hidden;text-overflow:ellipsis;}';
    css += '[data-cbf]>.cbx-bar .cbx-name{display:none;}';
    css += '.cbx-bar button{font:inherit;color:#d7dbf5;background:rgba(255,255,255,.08);border:none;border-radius:5px;padding:3px 6px;cursor:pointer;line-height:1;}';
    css += '.cbx-bar button:hover{background:rgba(255,255,255,.2);color:#fff;}';
    css += '.cbx-bar button.on{background:#6675ff;color:#fff;}';
    css += '.cbx-bar .cbx-sep{width:1px;height:14px;background:rgba(255,255,255,.18);margin:0 2px;}';
    css += '.cbx-drop{position:fixed;z-index:2147483646;background:#6675ff;border-radius:3px;box-shadow:0 0 0 3px rgba(102,117,255,.25);pointer-events:none;}';
    css += '.cbx-chip{position:fixed;z-index:2147483647;pointer-events:none;background:#1f2430;color:#fff;font:800 12px/1 Inter,system-ui,sans-serif;padding:7px 10px;border-radius:8px;box-shadow:0 10px 24px rgba(20,24,48,.3);transform:translate(12px,10px);}';
    return css;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────────────────────
  let CFG = null, LAST = null;
  function apply(cfg) {
    const P = page(); if (!P) return;
    CFG = cfg || null;
    let base = document.getElementById('cbx-base-css');
    if (!base) { base = document.createElement('style'); base.id = 'cbx-base-css'; base.textContent = baseCss(P); document.head.appendChild(base); }
    let st = document.getElementById('cbx-css');
    if (!st) { st = document.createElement('style'); st.id = 'cbx-css'; }
    document.head.appendChild(st);                       // keep it last so it wins ties with later branding styles
    clear(P);
    watchDensity(P);
    if (!cfg) { st.textContent = ''; afterLayout(); syncPlates(); return; }
    const b = cfg.branding || {};
    PERIOD = b.periodText !== 0;
    watchView();
    const N = P.root + ':not(.density-compact)';
    let css = '';

    // ── Header (Accent 2 background + header text) ──
    if (b.accent2 && okColor(b.accent2)) css += LIGHT + P.header + BOOST + '{background:' + b.accent2 + ' !important;}';
    if (b.hdrColor && okColor(b.hdrColor)) css += P.hdrText.map(s => LIGHT + s + BOOST).join(',') + '{color:' + b.hdrColor + ' !important;}';
    if (b.hdrFont) { loadFont(b.hdrFont); css += P.hdrText.map(s => s + BOOST).join(',') + '{font-family:' + fontStack(b.hdrFont) + ' !important;}'; }
    if (b.hdrWeight) css += P.hdrMain + BOOST + '{font-weight:' + (parseInt(b.hdrWeight, 10) || 500) + ' !important;}';
    if (b.hdrSize && HDR_SIZE[b.hdrSize]) css += P.hdrMain + BOOST + '{font-size:' + HDR_SIZE[b.hdrSize] + ' !important;line-height:1.2;}';

    // ── Merchant input section (defaults for every field) ──
    if (b.inputBg && okColor(b.inputBg)) {
      if (P.inSurface.length) css += P.inSurface.map(s => LIGHT + s + BOOST).join(',') + '{background:' + b.inputBg + ' !important;}';
      if (P.inBox) {
        css += LIGHT + '.container:not(.density-compact) ' + list(P.inBox, BOOST) + '{background:' + b.inputBg + ' !important;}';
        css += LIGHT + list(P.inBoxCompact, BOOST) + '{background:' + b.inputBg + ' !important;}';
      }
    }
    if (b.inputLabelColor && okColor(b.inputLabelColor)) css += LIGHT + list(P.inLabel, BOOST) + '{color:' + b.inputLabelColor + ' !important;text-shadow:none !important;}';
    if (b.inputInputColor && okColor(b.inputInputColor)) css += LIGHT + list(P.inField, BOOST) + '{color:' + b.inputInputColor + ' !important;}';
    if (b.inputBorderW != null && b.inputBorderW !== '') {
      const w = parseInt(b.inputBorderW, 10) || 0;
      css += LIGHT + list(P.inField, BOOST) + '{border:' + w + 'px solid ' + (okColor(b.inputBorderColor) ? b.inputBorderColor : '#d0d4e8') + ' !important;}';
    } else if (b.inputBorderColor && okColor(b.inputBorderColor)) {
      css += LIGHT + list(P.inField, BOOST) + '{border:' + P.inBorderDef + 'px solid ' + b.inputBorderColor + ' !important;}';
    }

    // Label + input typography (both themes)
    const inFields = P.inField.split(',').map(x => x.trim()).filter(x => !/select$/.test(x)).join(',');
    if (b.inputLabelFont) { loadFont(b.inputLabelFont); css += list(P.inLabel, BOOST) + '{font-family:' + fontStack(b.inputLabelFont) + ' !important;}'; }
    if (zoomOf(b.inputLabelSize)) css += list(P.inLabel, BOOST) + '{zoom:' + zoomOf(b.inputLabelSize) + ';}';
    if (b.inputFont) { loadFont(b.inputFont); css += list(P.inField, BOOST) + '{font-family:' + fontStack(b.inputFont) + ' !important;}'; }
    if (zoomOf(b.inputSize)) css += list(inFields, BOOST) + '{zoom:' + zoomOf(b.inputSize) + ';}';

    // ── Inputs column: position + width ──
    const inp = normInputs(cfg.inputs);
    const mq = '@media (min-width:' + (P.stackBelow + 1) + 'px){';
    const W = P.panelW[inp.width] || P.panelW.normal;
    const wrapSel = P.root === P.wrap ? P.root : P.root + (P.notStacked || '') + ' ' + P.wrap;
    const panelSel = P.root === P.wrap ? P.root + ' ' + P.panel : P.root + (P.notStacked || '') + ' ' + P.panel;
    if (inp.pos === 'right') {
      css += mq + wrapSel + BOOST + '{flex-direction:row-reverse !important;}' +
        panelSel + BOOST + '{width:' + W + 'px !important;border-right:none !important;border-left:2px solid #dde0f2;}}';
    } else if (inp.pos === 'top') {
      css += mq + wrapSel + BOOST + '{flex-direction:column !important;}' +
        panelSel + BOOST + '{width:100% !important;border-right:none !important;border-bottom:2px solid #dde0f2;overflow:visible;}' +
        (P === PAGES.proposal ? '.right-panel' + BOOST + '{min-height:0;}' : '') + '}';
    } else if (inp.width !== 'normal') {
      css += mq + panelSel + BOOST + '{width:' + W + 'px !important;}}';
    }
    const panel = document.querySelector(P.panel);
    if (panel) panel.setAttribute('data-cbp', 'inputs');

    // ── Merchant input fields: order / width / style / hide ──
    const anyW = inp.fields.some(f => f.w && SPAN[f.w]);
    const box = document.querySelector(P.fieldBox);
    // "Auto" fields keep the page's own column count (measured from its auto-fit grid).
    let autoSpan = 3;
    if (P.fieldGrid && box && anyW) {
      const n = (getComputedStyle(box).gridTemplateColumns || '').split(' ').filter(Boolean).length || 2;
      autoSpan = n >= 6 ? 1 : n >= 3 ? 2 : n === 2 ? 3 : 6;
    }
    inp.fields.forEach((f, i) => {
      const el = P.fields[f.k] && P.fields[f.k]();
      if (!el) return;
      el.setAttribute('data-cbf', f.k);
      if (f.v === false) el.setAttribute('data-cbx-hide', '1');
      if (typeof f.label === 'string' && f.label.trim()) el.querySelectorAll('label').forEach(l => overrideText(l, f.label.trim()));
      const S = '[data-cbf="' + f.k + '"]';
      if (inp.ordered) css += N + ' ' + S + '{order:' + (10 + i) + ';}';
      if (f.w && SPAN[f.w]) {
        css += P.fieldGrid ? N + ' ' + S + BOOST2 + '{grid-column:span ' + SPAN[f.w] + ';}'
                           : N + ' ' + S + BOOST2 + '{flex:0 0 ' + PCT[f.w] + ' !important;max-width:' + PCT[f.w] + ' !important;min-width:0 !important;}';
      } else if (P.fieldGrid && anyW) {
        css += N + ' ' + S + BOOST2 + '{grid-column:span ' + autoSpan + ';}';
      }
      css += styleCss(S, f.style, { field: true, P });
    });
    if (box) {
      if (P.fieldGrid) {
        if (anyW) { box.classList.add('cbx-fgrid'); css += N + ' ' + P.fieldBox + '.cbx-fgrid' + BOOST + '{grid-template-columns:repeat(6,minmax(0,1fr)) !important;}'; }
      } else if (inp.ordered || anyW) {
        // Rep calc: let the core + ShipInsure rows flow as one wrap so fields can move across them.
        box.classList.add('cbx-fmode');
        (P.fieldRows || []).forEach(s => { const r = document.querySelector(s); if (r) r.classList.add('cbx-contents'); });
        css += N + ' ' + P.fieldBox + '.cbx-fmode' + BOOST + '{display:flex !important;flex-direction:row !important;flex-wrap:wrap;gap:8px;align-content:flex-start;align-items:flex-start;}';
        css += N + ' ' + P.fieldBox + '.cbx-fmode>*{flex:0 0 100%;max-width:100%;}';
        css += (P.fieldRows || []).map(s => N + ' ' + P.fieldBox + '.cbx-fmode>' + s + '.cbx-contents').join(',') + '{display:contents;}';
        // Unmanaged children keep their DOM sequence around the managed fields.
        let seenField = false, n = 0;
        const kids = [];
        [...box.children].forEach(c => {
          if ((P.fieldRows || []).some(s => c.matches(s))) { [...c.children].forEach(cc => kids.push(cc)); } else kids.push(c);
        });
        // (CSS scoped to comfortable density — compact orders its inputs into its own sections.)
        kids.forEach(c => {
          if (c.hasAttribute('data-cbf')) { seenField = true; return; }
          const o = seenField ? 100 + (n++) : 0;
          c.setAttribute('data-cbx-o', String(o));
          css += N + ' ' + P.fieldBox + '.cbx-fmode [data-cbx-o="' + o + '"]{order:' + o + ';}';
        });
      }
    }

    // ── Results blocks: order / width / style / hide + text blocks ──
    const layout = normLayout(cfg.layout, cfg.blocks);
    const grid = document.querySelector(P.grid);
    // Premiums You Keep + Upfront both on Auto and next to each other: keep the page's own row
    // (exactly today's look); unwrap it once either one is moved apart, resized or hidden.
    const rootEl = document.querySelector(P.root);
    const compactNow = !!(rootEl && rootEl.classList.contains('density-compact'));
    // "Use the compact version" (comfort only): the compact twin becomes the block.
    const swap = {};
    ['upfront', 'cost'].forEach(k => { const it = layout.find(x => x.k === k); swap[k] = !!(it && it.useCompact && !compactNow && document.querySelector(TWINS[k])); });
    const hi = layout.findIndex(x => x.k === 'hero'), ui = layout.findIndex(x => x.k === 'upfront');
    const keepRow = !swap.upfront && hi >= 0 && ui >= 0 && Math.abs(hi - ui) === 1 && layout[hi].v !== false && layout[ui].v !== false &&
      !(layout[hi].w && SPAN[layout[hi].w]) && !(layout[ui].w && SPAN[layout[ui].w]);
    if (grid) {
      grid.classList.add('cbx-grid');
      P.contents.forEach(s => { if (keepRow && s === P.heroRow) return; const e = document.querySelector(s); if (e) e.classList.add('cbx-contents'); });
      const blocks = Array.isArray(cfg.blocks) ? cfg.blocks : [];
      // Drop text blocks that are gone
      grid.querySelectorAll('.cb-block').forEach(el => { if (!blocks.some(b => 'cb-blk-' + b.id === el.id)) el.remove(); });
      const ordOf = {};
      const isVis = it => it.v !== false;
      let firstVis = null, lastVis = null;
      layout.forEach((it, i) => {
        if (it.k === 'copylink') { css += copyCss(P, N, grid, it, i, ordOf); return; }
        let el = P.blocks[it.k] ? P.blocks[it.k]() : null;
        if (swap[it.k]) {                                  // compact twin stands in for the comfort block
          const tw = document.querySelector(TWINS[it.k]);
          if (el) el.setAttribute('data-cbx-off', '1');
          if (tw.parentElement !== grid) { const ph = document.createElement('span'); ph.hidden = true; ph.id = 'cbx-home-' + it.k; tw.parentElement.insertBefore(ph, tw); grid.appendChild(tw); }
          el = tw;
        }
        if (it.k === 'billing') { el = billingEl(P, grid, layout, it); if (!el) return; }
        if (it.k === 'banner') { el = bannerEl(P, grid, it, b); if (!el) return; css += bannerCss(P, it); }
        if (!el) {
          const blk = blocks.find(b => b.id === it.k);
          if (blk) el = textBlock(grid, blk);
        }
        if (!el) return;
        el.setAttribute('data-cbk', it.k);
        tagTheme(el, it.theme, INVERSE[it.k] || swap[it.k]);
        ordOf[it.k] = (i + 1) * 10;
        css += '[data-cbk="' + it.k + '"]{order:' + ordOf[it.k] + ';}';
        if (!isVis(it)) el.setAttribute('data-cbx-hide', '1');
        else { if (firstVis == null) firstVis = el; lastVis = el; }
        const w = it.w && SPAN[it.w] ? it.w : ((it.k === 'cards' || it.k === 'cost') ? 'half' : 'full');
        if ((it.k === 'hero' || it.k === 'upfront') && keepRow) { /* inside the page's own row */ }
        else if (it.k === 'hero' || it.k === 'upfront') css += pairCss(P, N, layout, it, w, swap.upfront);
        else css += N + ' [data-cbk="' + it.k + '"]' + BOOST2 + '{grid-column:span ' + SPAN[w] + ';}';
        if (it.k === 'cards') css += N + ' ' + P.costHiddenRow + '>[data-cbk="cards"]' + BOOST2 + '{grid-column:1/-1;justify-self:center;width:' + (w === 'full' ? '100%' : PCT[w === 'half' ? 'half' : w]) + ';}';
        if (P.bleed && P.bleed[it.k] && w === 'full') el.setAttribute('data-cbx-bleed', '1');
        const textBlk = blocks.find(b => b.id === it.k);
        if (!textBlk) css += styleCss('[data-cbk="' + it.k + '"]', it.k === 'banner' ? bannerStyle(it.style) : it.style, { paint: P.paint[it.k], P });
      });
      css += detailCss(P, layout, swap);
      if (firstVis) firstVis.setAttribute('data-cbx-first', '1');
      if (lastVis) lastVis.setAttribute('data-cbx-last', '1');
      // Unmanaged grid children keep their DOM position relative to the managed blocks.
      const kids = [];
      [...grid.children].forEach(c => { if (c.classList.contains('cbx-contents')) collect(c, kids, P); else kids.push(c); });
      let pending = [];
      kids.forEach(c => {
        if (c.hasAttribute('data-cbk')) { pending.forEach(p => { p.style.order = String(ordOf[c.getAttribute('data-cbk')] - 1); }); pending = []; return; }
        c.setAttribute('data-cbx-ord', '1'); pending.push(c);
      });
      pending.forEach(p => { p.style.order = '9999'; });
      if (keepRow) {
        const row = document.querySelector(P.heroRow);
        if (row) { row.setAttribute('data-cbx-ord', '1'); row.style.order = String(Math.min(ordOf.hero, ordOf.upfront)); }
        css += P.heroRow + BOOST + '{grid-column:1/-1;min-width:0;}';
      }
      // Compact density's summary box stands in for the output strip / hero / cards: it takes
      // the earliest of their positions so text blocks around them stay where the rep put them.
      const o = ['metrics', 'hero', 'upfront', 'cards', 'cost'].map(k => ordOf[k]).filter(n => n != null);
      if (P.compactBox && o.length) document.querySelectorAll(P.compactBox).forEach(cb => {
        if (cb.parentElement !== grid) return;
        cb.setAttribute('data-cbx-ord', '1'); cb.style.order = String(Math.min.apply(null, o) - 1);
      });
    }
    if (document.querySelector('[data-cbx-theme]')) css += themeCss((cfg.branding || {}).accent);
    st.textContent = css;
    LAST = cfg;
    afterLayout();
    syncPlates();
    if (EDIT) renderBars();
  }
  function tagTheme(el, theme, inverse) {
    if (!el || !theme || THEMES.indexOf(theme) < 1) return;
    el.setAttribute('data-cbx-theme', theme);
    if (inverse) el.setAttribute('data-cbx-inv', '1');
  }

  // ── Glass backplates (samasante/liquid-glass) for themed blocks ──
  // Frosted blocks get one on the block (rim + sheen); in Liquid blocks every inner tile gets one,
  // so it bends the drifting background in Chrome / Edge (Safari / Firefox: frost + rim only).
  // The rep calc already mounts plates on its own boxes (.lgc-host) — those are reused, not doubled.
  // Loaded on demand from esm.sh, only when a themed block exists.
  const RIM = { curvature: 0, depth: 0.35, bend: 0.5, bendWidth: 0.12, dispersion: 0.3, frost: 14, saturate: 1.7, sheen: 0.45, sheenWidth: 3 };
  const DOME = { curvature: 0.25, bend: 0.45, bendWidth: 0.22, dispersion: 0.35, frost: 10, saturate: 1.7, sheen: 0.4 };
  let _glass = null;
  const PLATES = new Map();
  function glassLib() {
    if (!_glass) _glass = Promise.all([
      import('https://esm.sh/react@19.2.0'),
      import('https://esm.sh/react-dom@19.2.0/client?deps=react@19.2.0'),
      import('https://esm.sh/@samasante/liquid-glass@0.1.1?deps=react@19.2.0,react-dom@19.2.0'),
    ]).then(([R, RD, G]) => ({ h: R.createElement, createRoot: RD.createRoot, Glass: G.Glass }))
      .catch(e => { console.warn('[SICB] liquid-glass unavailable, CSS glass only:', e && e.message); return null; });
    return _glass;
  }
  function fitZoom(plate) {
    let z = 1;
    for (let n = plate.parentElement; n; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1;
    plate.style.zoom = Math.abs(z - 1) < 1e-3 ? '' : String(1 / z);
  }
  function wantedPlates() {
    const out = new Map();
    const ok = el => el && !el.classList.contains('lgc-host') && !/^(BUTTON|INPUT|SELECT)$/.test(el.tagName) && !el.closest('.theme-midnight') && el.getClientRects().length > 0;
    document.querySelectorAll('[data-cbx-theme="frosted"]').forEach(el => { if (ok(el)) out.set(el, RIM); });
    document.querySelectorAll('[data-cbx-theme="liquid"]').forEach(blk => blk.querySelectorAll(TILES).forEach(t => { if (ok(t)) out.set(t, t.getBoundingClientRect().width > 260 ? RIM : DOME); }));
    return out;
  }
  let _plT = null;
  function syncPlates() {
    clearTimeout(_plT);
    _plT = setTimeout(async () => {
      const want = wantedPlates();
      PLATES.forEach((rec, host) => {
        if (want.has(host) && rec.plate.isConnected && rec.plate.parentElement === host) return;
        try { rec.root.unmount(); } catch (e) {}
        rec.plate.remove(); host.classList.remove('cbx-glass', 'cbx-rel', 'cbx-on'); PLATES.delete(host);
      });
      const todo = [...want.keys()].filter(h => !PLATES.has(h));
      if (!todo.length) return;
      const lib = await glassLib(); if (!lib) return;
      todo.forEach(host => {
        if (!host.isConnected || PLATES.has(host)) return;
        const cs = getComputedStyle(host);
        host.classList.add('cbx-glass'); if (cs.position === 'static') host.classList.add('cbx-rel');
        const plate = document.createElement('div'); plate.className = 'cbx-plate';
        host.appendChild(plate); fitZoom(plate);
        const root = lib.createRoot(plate);
        root.render(lib.h(lib.Glass, { optics: want.get(host), radius: parseFloat(cs.borderTopLeftRadius) || 16,
          style: { position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'transparent' } }, ''));
        host.classList.add('cbx-on');
        PLATES.set(host, { plate, root });
      });
    }, 120);
  }

  // Billing Explained. On Auto, unstyled and right after a visible breakdown it stays where the page
  // puts it (inside / under the breakdown); otherwise it moves into its own block.
  function billingEl(P, grid, layout, it) {
    if (!P.billing) return null;
    const tog = document.querySelector(P.billing.toggle), body = document.querySelector(P.billing.body);
    if (!tog || !body) return null;
    const bi = layout.indexOf(it), di = layout.findIndex(x => x.k === 'breakdown');
    const styled = !!(it.theme || (it.style && Object.keys(it.style).some(k => it.style[k] !== '' && it.style[k] != null)));
    const keep = !(it.w && SPAN[it.w]) && !styled && di >= 0 && bi === di + 1 && layout[di].v !== false;
    if (typeof it.label === 'string' && it.label.trim()) overrideText(tog, it.label.trim());
    if (keep) {
      tog.setAttribute('data-cbx-twin', 'billing');
      if (it.v === false) { tog.setAttribute('data-cbx-hide', '1'); body.setAttribute('data-cbx-hide', '1'); }
      return null;
    }
    let wrap = document.getElementById('cbx-billing');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'cbx-billing'; wrap.className = P === PAGES.calc ? 'calc-breakdown' : ''; }
    const ph = document.createElement('span'); ph.hidden = true; ph.id = 'cbx-billing-home';
    tog.parentElement.insertBefore(ph, tog);
    wrap.appendChild(tog); wrap.appendChild(body);
    grid.appendChild(wrap);
    return wrap;
  }

  // Deeper styling: Premiums You Keep / Upfront / Current Cost parts + their compact twins, the
  // output strip's pills (+ the compact strip boxes that mirror them), and label text overrides.
  function detailCss(P, layout, swap) {
    let css = '';
    ['hero', 'upfront', 'cost'].forEach(k => {
      const it = layout.find(x => x.k === k); if (!it) return;
      const tw = document.querySelector(TWINS[k]);
      if (tw && !swap[k]) {
        tw.setAttribute('data-cbx-twin', k);
        tagTheme(tw, it.theme, true);
        if (it.v === false) tw.setAttribute('data-cbx-hide', '1');
        css += styleCss('[data-cbx-twin="' + k + '"]', it.style, { P });
      }
      css += partCss('[data-cbk="' + k + '"]', PARTS[k], it.style) + partCss('[data-cbx-twin="' + k + '"]', PARTS[k], it.style);
      if (typeof it.label === 'string' && it.label.trim()) document.querySelectorAll(LABEL_TEXT[k]).forEach(e => overrideText(e, it.label.trim()));
    });
    // Compact strip / green card follow the Output Strip / Extra Revenue themes
    Object.keys(THEME_TWINS).forEach(k => { const it = layout.find(x => x.k === k); const e = document.querySelector(THEME_TWINS[k]); if (it && e) tagTheme(e, it.theme, false); });
    // Billing Explained's toggle paints its own background; let the block's colour show through.
    const bl = layout.find(x => x.k === 'billing');
    if (bl && bl.style && okColor(bl.style.bg)) css += LIGHT + '#cbx-billing' + BOOST2 + ' > .calc-toggle{background:transparent !important;}';
    const m = layout.find(x => x.k === 'metrics');
    const cfgPills = m && Array.isArray(m.pills) ? m.pills : [];
    PILLS.map(x => cfgPills.find(c => c && c.k === x.k) || { k: x.k, v: true }).forEach(pl => {
      const els = pillEls(P, pl.k); if (!els.length) return;
      els.forEach(e => {
        e.setAttribute('data-cbx-pill', pl.k);
        if (pl.v === false) e.setAttribute('data-cbx-hide', '1');
        if (typeof pl.label === 'string' && pl.label.trim()) { const lb = e.querySelector(PARTS.pill.label); if (lb) overrideText(lb, pl.label.trim()); }
      });
      const S = '[data-cbx-pill="' + pl.k + '"]';
      css += styleCss(S, pl.style, { P }) + partCss(S, PARTS.pill, pl.style);
    });
    return css;
  }
  function pillEls(P, k) {
    const out = [];
    ((P.pills || {})[k] || []).forEach(x => { const e = typeof x === 'function' ? x() : document.querySelector(x); if (e) out.push(e); });
    const tw = PILL_TWINS[k] && PILL_TWINS[k](); if (tw) out.push(tw);
    return out;
  }

  // Copy Link button. place 'inputs' (default): stays in the inputs column, optional width.
  // place 'results': becomes a results block (order / width like any other). Own label + style.
  // Midnight draws it as a marble image with the text baked in, so label + colours are default-theme only.
  function copyCss(P, N, grid, it, i, ordOf) {
    let css = '';
    const btnIn = document.querySelector(P.copyIn), btnOut = document.querySelector(P.copyOut);
    if (!btnIn) return '';
    const out = it.place === 'results';
    [btnIn, btnOut].forEach(b => { if (b) b.setAttribute('data-cbx-copy', '1'); });
    // Merchant view: one button, moved into the results grid (a placeholder marks its home).
    if (out && btnIn === btnOut && btnIn.parentElement !== grid) {
      let ph = document.getElementById('cbx-copy-home');
      if (!ph) { ph = document.createElement('span'); ph.id = 'cbx-copy-home'; ph.hidden = true; btnIn.parentElement.insertBefore(ph, btnIn); }
      grid.appendChild(btnIn);
    }
    const el = out ? btnOut : btnIn;
    if (!el) return '';
    el.setAttribute('data-cbk', 'copylink');
    [btnIn, btnOut].forEach(b => { if (b) tagTheme(b, it.theme, true); });
    if (it.v === false) [btnIn, btnOut].forEach(b => { if (b) b.setAttribute('data-cbx-hide', '1'); });
    const S = '[data-cbx-copy]';
    if (out) {
      ordOf.copylink = (i + 1) * 10;
      css += '[data-cbk="copylink"]{order:' + ordOf.copylink + ';}';
      const w = it.w && SPAN[it.w] ? it.w : 'full';
      css += N + ' [data-cbk="copylink"]' + BOOST2 + '{grid-column:span ' + SPAN[w] + ';}';
      css += P.gridOn + ' [data-cbk="copylink"]' + BOOST2 + '{display:block;width:100% !important;margin:0' + (P === PAGES.proposal ? ' 0 10px' : '') + ' !important;align-self:start;}';
      if (btnIn !== btnOut) {                              // rep calc: show the results-side twin, hide the inputs one
        css += P.copyIn + BOOST2 + (P.copyHide ? ',' + P.copyHide + BOOST2 : '') + '{display:none !important;}';
        css += 'body:not(.cbx-edit) ' + P.copyOut + BOOST2 + ':not([data-cbx-hide]),body.cbx-edit ' + P.copyOut + BOOST2 + '{display:block !important;}';
      }
    } else if (it.w && SPAN[it.w] && it.w !== 'full') {
      const W = PCT[it.w];
      css += P.copyIn + BOOST2 + '{width:' + W + ' !important;max-width:' + W + ' !important;flex:0 0 auto !important;align-self:center;display:block;margin-left:auto !important;margin-right:auto !important;}';
    }
    // Label: default theme only (Midnight's button is an image).
    const lbl = typeof it.label === 'string' ? it.label.trim() : '';
    [btnIn, btnOut].forEach(b => {
      if (!b) return;
      if (!b.hasAttribute('data-cbx-orig')) b.setAttribute('data-cbx-orig', b.innerHTML);
      if (lbl) { b.textContent = viewText(lbl); b.setAttribute('data-cbx-label', viewText(lbl)); }
    });
    css += styleCss(S, it.style, { P });
    return css;
  }

  // Premiums You Keep + Upfront Rev Share Payment. Upfront only exists while a tier is picked (the
  // page toggles its inline display), so "Auto" widths follow it live: side by side when it shows
  // and they're next to each other in the order, Premiums alone otherwise (full on the merchant
  // view, natural width centred on the rep calc — the look before blocks existed).
  function pairCss(P, N, layout, it, w, noPair) {
    const S = '[data-cbk="' + it.k + '"]' + BOOST2;
    const other = it.k === 'hero' ? 'upfront' : 'hero';
    const i = layout.findIndex(x => x.k === it.k), j = layout.findIndex(x => x.k === other);
    const paired = !noPair && j >= 0 && Math.abs(i - j) === 1 && layout[j].v !== false && it.v !== false;
    const first = paired && i < j;
    const otherIt = j >= 0 ? layout[j] : null;
    const explicit = !!(it.w && SPAN[it.w]);
    const otherSpan = otherIt && otherIt.w && SPAN[otherIt.w] ? SPAN[otherIt.w] : null;
    // Upfront visible = shown by the page and not hidden by the build
    const upOn = P.gridOn + ':has([data-cbk="upfront"]:not([style*="none"]):not([data-cbx-hide]))';
    let css = '';
    if (explicit) return N + ' ' + S + '{grid-column:span ' + SPAN[w] + ';}';
    // (the compact upfront bar standing in for the bubble is a full-width strip, not a centred box)
    css += N + ' ' + S + '{grid-column:span 6;' + (P.centerAuto && !(noPair && it.k === 'upfront') ? 'justify-self:center;' : '') + '}';
    if (!paired) return css;
    // Paired auto width: share the row with the other one
    let span;
    if (it.k === 'upfront') span = otherSpan && otherSpan < 6 ? 6 - otherSpan : P.upAuto;
    else span = otherSpan ? (otherSpan < 6 ? 6 - otherSpan : 6) : 6 - P.upAuto;
    const rule = 'grid-column:span ' + span + ';' + (P.centerAuto && span < 6 ? 'justify-self:' + (first ? 'end' : 'start') + ';' : '');
    if (it.k === 'upfront') css += N + ' ' + S + '{' + rule + '}';
    else css += N + ' ' + upOn + ' ' + S + '{' + rule + '}';
    return css;
  }
  function collect(node, out, P) {
    [...node.children].forEach(c => { if (c.classList.contains('cbx-contents')) collect(c, out, P); else out.push(c); });
  }

  // Per-block / per-field style → CSS. Colours (bg, text, border) only in the default theme.
  function styleCss(S, st, o) {
    if (!st) return '';
    let css = '';
    const P = o.P;
    const tgt = S + (o.paint || '');
    if (o.field) {
      if (okColor(st.bg)) css += LIGHT + S + BOOST2 + '{background:' + st.bg + ' !important;border-radius:10px;' + (P === PAGES.proposal ? 'padding:7px 9px;' : '') + '}';
      if (okColor(st.label)) css += LIGHT + S + BOOST2 + ' label{color:' + st.label + ' !important;text-shadow:none !important;}';
      if (okColor(st.color)) css += LIGHT + S + BOOST2 + ' input,' + LIGHT + S + BOOST2 + ' select{color:' + st.color + ' !important;}';
      if (st.bw != null && st.bw !== '') css += LIGHT + S + BOOST2 + ' input,' + LIGHT + S + BOOST2 + ' select{border:' + (parseInt(st.bw, 10) || 0) + 'px solid ' + (okColor(st.bc) ? st.bc : '#d0d4e8') + ' !important;}';
      else if (okColor(st.bc)) css += LIGHT + S + BOOST2 + ' input,' + LIGHT + S + BOOST2 + ' select{border:' + P.inBorderDef + 'px solid ' + st.bc + ' !important;}';
      if (st.labelFont) { loadFont(st.labelFont); css += S + BOOST2 + ' label{font-family:' + fontStack(st.labelFont) + ' !important;}'; }
      if (zoomOf(st.labelSize)) css += S + BOOST2 + ' label{zoom:' + zoomOf(st.labelSize) + ';}';
      if (st.inputFont) { loadFont(st.inputFont); css += S + BOOST2 + ' input,' + S + BOOST2 + ' select,' + S + BOOST2 + ' .itype-btn{font-family:' + fontStack(st.inputFont) + ' !important;}'; }
      if (zoomOf(st.inputSize)) css += S + BOOST2 + ' input:not(.input-with-type input),' + S + BOOST2 + ' .input-with-type,' + S + BOOST2 + ' select{zoom:' + zoomOf(st.inputSize) + ';}';
    } else {
      if (okColor(st.bg)) css += LIGHT + tgt + BOOST2 + '{background:' + st.bg + ' !important;}';
      if (okColor(st.color)) css += LIGHT + S + BOOST2 + ',' + LIGHT + S + BOOST2 + ' *:not(svg):not(path):not(.cbx-bar):not(.cbx-bar *){color:' + st.color + ' !important;}';
      if (st.bw != null && st.bw !== '') css += LIGHT + tgt + BOOST2 + '{border:' + (parseInt(st.bw, 10) || 0) + 'px solid ' + (okColor(st.bc) ? st.bc : '#e3e6f0') + ' !important;}';
      else if (okColor(st.bc)) css += LIGHT + tgt + BOOST2 + '{border-color:' + st.bc + ' !important;}';
      if (st.radius != null && st.radius !== '') css += tgt + BOOST2 + '{border-radius:' + (parseInt(st.radius, 10) || 0) + 'px !important;}';
    }
    if (st.font) { loadFont(st.font); css += S + BOOST2 + ',' + S + BOOST2 + ' input,' + S + BOOST2 + ' select,' + S + BOOST2 + ' button:not(.cbx-bar button){font-family:' + fontStack(st.font) + ' !important;}'; }
    if (st.size && SIZE[st.size]) css += S + BOOST2 + '{font-size:' + SIZE[st.size] + ';}';
    return css;
  }

  // ── Banner image (branding.bannerUrl) ── A block of its own. place: 'results' (default — the top
  // of the results, where it always sat; moves / sizes like any block), 'top' (full width under the
  // header) or 'inputs' (top of the inputs column). style: h (px; empty = up to 150px, as before),
  // fit cover|contain, focus top|center|bottom, pad, bg, bw, bc, radius (10px default) + theme.
  const okImg = u => typeof u === 'string' && /^(https?:\/\/|data:image\/)/i.test(u.trim());
  function bannerEl(P, grid, it, br) {
    let el = document.getElementById('cbx-banner');
    const url = br && okImg(br.bannerUrl) ? br.bannerUrl.trim() : '';
    if (!url) { if (el) el.remove(); return null; }
    if (!el) { el = document.createElement('div'); el.id = 'cbx-banner'; el.innerHTML = '<img alt="Merchant banner">'; }
    const img = el.querySelector('img');
    if (img.getAttribute('src') !== url) {
      el.removeAttribute('data-cbx-broken');
      img.onerror = () => el.setAttribute('data-cbx-broken', '1');
      img.onload = () => { el.removeAttribute('data-cbx-broken'); afterLayout(); };
      img.src = url;
    }
    let host = grid, before = null;
    if (it.place === 'top') { const w = document.querySelector(P.wrap); if (w && w.parentElement) { host = w.parentElement; before = w; } }
    else if (it.place === 'inputs') {
      const p = document.querySelector(P.panel);
      if (p) {
        // Under the merchant header when it lives in the inputs column (merchant view), else first.
        let hd = document.querySelector(P.header);
        while (hd && hd.parentElement !== p) hd = hd.parentElement;
        let first = hd ? hd.nextSibling : p.firstChild;
        if (first === el) first = el.nextSibling;
        host = p; before = first;
      }
    }
    if (el.parentElement !== host || (before ? el.nextSibling !== before : false)) host.insertBefore(el, before);
    el.setAttribute('data-cbx-place', it.place === 'top' || it.place === 'inputs' ? it.place : 'results');
    return el;
  }
  // Colours / border / radius go through styleCss (default theme only); the padding default
  // gives a themed banner a visible glass frame.
  function bannerStyle(st) {
    if (!st) return st;
    const o = {}; ['bg', 'bw', 'bc', 'radius'].forEach(k => { if (st[k] != null && st[k] !== '') o[k] = st[k]; });
    return o;
  }
  function bannerCss(P, it) {
    const st = it.style || {}, S = '#cbx-banner' + BOOST;
    const themed = THEMES.indexOf(it.theme) > 0;
    const pad = st.pad != null && st.pad !== '' ? Math.max(0, parseInt(st.pad, 10) || 0) : (themed ? 10 : 0);
    const r = st.radius != null && st.radius !== '' ? (parseInt(st.radius, 10) || 0) : (it.theme === 'liquid' ? 20 : themed ? 18 : 10);
    const h = parseInt(st.h, 10);
    const pos = { top: 'center top', bottom: 'center bottom' }[st.focus] || 'center center';
    const place = it.place === 'top' || it.place === 'inputs' ? it.place : 'results';
    const w = it.w && SPAN[it.w] ? it.w : 'full';
    let css = S + '{display:block;box-sizing:border-box;min-width:0;overflow:hidden;border-radius:' + r + 'px;padding:' + pad + 'px;';
    if (place === 'results') css += 'margin:0' + (P === PAGES.proposal ? ' 0 12px' : '') + ';';
    else css += 'width:' + (w === 'full' ? 'auto' : PCT[w]) + ';margin:' + (place === 'top' ? '12px 16px 4px' : '0 0 12px') + ';' + (w === 'full' ? '' : 'margin-left:auto;margin-right:auto;');
    css += '}';
    if (place === 'top' && w !== 'full') css += S + '{margin-top:12px;margin-bottom:4px;}';
    css += S + ' img{display:block;width:100%;' + (h > 0 ? 'height:' + Math.min(h, 900) + 'px;' : 'height:auto;max-height:150px;') +
      'object-fit:' + (st.fit === 'contain' ? 'contain' : 'cover') + ';object-position:' + pos + ';border-radius:' + Math.max(0, r - pad) + 'px;}';
    css += 'body:not(.cbx-edit) #cbx-banner[data-cbx-broken]{display:none !important;}';
    css += 'body.cbx-edit #cbx-banner[data-cbx-broken]{min-height:60px;background:repeating-linear-gradient(45deg,#f1f2f8 0 10px,#e7e9f3 10px 20px);}';
    return css;
  }

  function textBlock(grid, blk) {
    let d = document.getElementById('cb-blk-' + blk.id);
    if (!d) { d = document.createElement('div'); d.className = 'cb-block'; d.id = 'cb-blk-' + blk.id; grid.appendChild(d); }
    const st = blk.style || {}, s = d.style;
    s.cssText = '';
    s.textAlign = st.align || 'left';
    s.fontSize = ({ s: '0.85em', m: '1em', l: '1.25em' }[st.size] || '1em');
    if (st.weight) s.fontWeight = st.weight;
    if (st.font) { loadFont(st.font); s.fontFamily = fontStack(st.font); }
    if (st.radius != null) s.borderRadius = (+st.radius) + 'px';
    s.padding = (st.pad != null ? +st.pad : 0) + 'px';
    s.marginTop = s.marginBottom = '';
    if (st.margin) { s.marginTop = (+st.margin) + 'px'; s.marginBottom = (+st.margin + 10) + 'px'; }
    // Colours: default theme only (Midnight keeps its own look)
    const bw = (st.bw != null ? +st.bw : 0);
    d.setAttribute('data-cbx-light', JSON.stringify({ color: st.color || '', bg: st.bg || '', border: bw > 0 ? (bw + 'px solid ' + (st.bc || '#e3e6f0')) : '' }));
    let html = '';
    if (blk.heading) html += '<div class="cb-block-h" style="font-weight:800;margin-bottom:4px;">' + esc(viewText(blk.heading)) + '</div>';
    if (blk.body) html += '<div class="cb-block-b" style="white-space:pre-wrap;line-height:1.5;">' + esc(viewText(blk.body)) + '</div>';
    const bar = d.querySelector(':scope > .cbx-bar');
    d.innerHTML = html;
    if (bar) d.appendChild(bar);
    paintTextBlock(d);
    return d;
  }
  function paintTextBlock(d) {
    let o = {}; try { o = JSON.parse(d.getAttribute('data-cbx-light') || '{}'); } catch (e) {}
    const light = !document.body.classList.contains('theme-midnight');
    d.style.color = light ? (o.color || '') : '';
    d.style.background = light ? (o.bg || '') : '';
    d.style.border = o.border ? (light ? o.border : o.border.replace(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/i, 'rgba(212,175,55,.3)')) : 'none';
  }

  function clear(P) {
    clearOverrides();
    // Compact twins back into the compact box; Billing Explained back under the breakdown
    ['upfront', 'cost'].forEach(k => { const ph = document.getElementById('cbx-home-' + k), tw = document.querySelector(TWINS[k]); if (ph && tw) ph.parentElement.insertBefore(tw, ph); if (ph) ph.remove(); });
    const bh = document.getElementById('cbx-billing-home'), bw = document.getElementById('cbx-billing');
    if (bh && bw) { [...bw.childNodes].forEach(n => bh.parentElement.insertBefore(n, bh)); }
    if (bh) bh.remove(); if (bw) bw.remove();
    const A = ['data-cbk', 'data-cbf', 'data-cbp', 'data-cbx-hide', 'data-cbx-bleed', 'data-cbx-first', 'data-cbx-last', 'data-cbx-o', 'data-cbx-pill', 'data-cbx-twin', 'data-cbx-off', 'data-cbx-theme', 'data-cbx-inv'];
    document.querySelectorAll(A.map(a => '[' + a + ']').join(',')).forEach(el => A.forEach(a => el.removeAttribute(a)));
    document.querySelectorAll('[data-cbx-ord]').forEach(el => { el.style.order = ''; el.removeAttribute('data-cbx-ord'); });
    // Copy Link: back to its home in the inputs column, original label
    const home = document.getElementById('cbx-copy-home');
    if (home && P.copyIn) { const b = document.querySelector(P.copyIn); if (b && b.previousSibling !== home) home.parentElement.insertBefore(b, home.nextSibling); }
    document.querySelectorAll('[data-cbx-copy]').forEach(b => {
      if (b.hasAttribute('data-cbx-label') && b.hasAttribute('data-cbx-orig')) b.innerHTML = b.getAttribute('data-cbx-orig');
      b.removeAttribute('data-cbx-label'); b.removeAttribute('data-cbx-copy');
    });
    document.querySelectorAll('.cbx-grid,.cbx-contents,.cbx-fgrid,.cbx-fmode').forEach(el => el.classList.remove('cbx-grid', 'cbx-contents', 'cbx-fgrid', 'cbx-fmode'));
    document.querySelectorAll('.cbx-bar').forEach(el => el.remove());
    if (!LAST || !CFG) document.querySelectorAll('.cb-block').forEach(el => { if (!CFG) el.remove(); });
    if (!CFG) { const bn = document.getElementById('cbx-banner'); if (bn) bn.remove(); }
    // Legacy markers from the pre-SICB applyCustomBuild
    document.querySelectorAll('[data-cb-hidden]').forEach(el => el.removeAttribute('data-cb-hidden'));
  }

  // Density can change live (rep calc Display menu): re-apply so compact twins / swaps follow.
  let _densMo = null, _dens = null;
  function watchDensity(P) {
    if (_densMo) return;
    const r = document.querySelector(P.root); if (!r) return;
    _dens = r.classList.contains('density-compact');
    _densMo = new MutationObserver(() => {
      const d = r.classList.contains('density-compact');
      if (d !== _dens) { _dens = d; if (CFG) apply(CFG); }
    });
    _densMo.observe(r, { attributes: true, attributeFilter: ['class'] });
  }

  // The View (Monthly / Annual) flips live: custom text follows it.
  let _viewOn = false;
  function watchView() {
    if (_viewOn) return; _viewOn = true;
    document.addEventListener('change', e => {
      const t = e.target; if (!t || (t.id !== 'timeframe' && t.id !== 'p-view')) return;
      setTimeout(() => { if (CFG) apply(CFG); }, 30);
    }, true);
  }

  let _fitT = null;
  function afterLayout() {
    // Liquid Glass backplates (rep calc) re-measure after blocks move / resize.
    clearTimeout(_fitT);
    requestAnimationFrame(() => { try { window.dispatchEvent(new Event('lgc-refit')); } catch (e) {} });
    _fitT = setTimeout(() => { try { window.dispatchEvent(new Event('lgc-refit')); } catch (e) {} }, 350);
    if (typeof window.pFitLabels === 'function') { try { window.pFitLabels(); } catch (e) {} }
  }

  // Real viewport width changes only: the Liquid Glass refit fires synthetic resize events.
  let _rzT = null, _rzW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (!CFG || window.innerWidth === _rzW) return;
    _rzW = window.innerWidth; clearTimeout(_rzT); _rzT = setTimeout(() => apply(CFG), 200);
  });

  // Midnight toggles live: repaint text blocks' default-theme colours.
  function watchTheme() {
    try {
      new MutationObserver(() => document.querySelectorAll('.cb-block').forEach(paintTextBlock))
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }
  if (document.body) watchTheme(); else document.addEventListener('DOMContentLoaded', watchTheme);

  // ── On-canvas edit mode ──────────────────────────────────────────────────────────────────
  let EDIT = false, SEL = null, _mo = null;
  const post = msg => { try { if (window.parent && window.parent !== window) window.parent.postMessage(Object.assign({ siCBx: 'op' }, msg), '*'); } catch (e) {} };
  const labelOf = (g, k) => {
    if (g === 'f') { const f = FIELDS.find(x => x.k === k); return f ? f.label : k; }
    if (g === 'm') { const pl = PILLS.find(x => x.k === k); return pl ? pl.label : k; }
    const b = BLOCKS.find(x => x.k === k); if (b) return b.label;
    const blk = ((CFG && CFG.blocks) || []).find(x => x.id === k);
    return blk ? ('Text · ' + (blk.heading || blk.body || 'block').slice(0, 20)) : k;
  };
  function curW(g, k) {
    if (!CFG) return '';
    if (g === 'f') { const f = normInputs(CFG.inputs).fields.find(x => x.k === k); return (f && f.w) || ''; }
    const it = normLayout(CFG.layout, CFG.blocks).find(x => x.k === k);
    return (it && it.w) || ((k === 'cards' || k === 'cost') ? 'half' : 'full');
  }
  function isHidden(g, k) {
    if (!CFG) return false;
    if (g === 'm') { const m = normLayout(CFG.layout, CFG.blocks).find(x => x.k === 'metrics'); const pl = m && (m.pills || []).find(x => x.k === k); return !!(pl && pl.v === false); }
    if (g === 'f') { const f = normInputs(CFG.inputs).fields.find(x => x.k === k); return !!(f && f.v === false); }
    const it = normLayout(CFG.layout, CFG.blocks).find(x => x.k === k); return !!(it && it.v === false);
  }
  function themeName(g, k) {
    const it = CFG ? normLayout(CFG.layout, CFG.blocks).find(x => x.k === k) : null;
    return ({ frosted: 'Frosted', liquid: 'Liquid' })[it && it.theme] || 'Classic';
  }
  function barHtml(g, k) {
    const w = curW(g, k);
    const ws = [['full', 'Full width', '1'], ['twothirds', 'Two-thirds width', '⅔'], ['half', 'Half width', '½'], ['third', 'One-third width', '⅓']]
      .map(([v, t, s]) => '<button type="button" data-cbx="w" data-v="' + v + '" title="' + t + '"' + (w === v ? ' class="on"' : '') + '>' + s + '</button>').join('');
    let place = '';
    if (g === 'b' && k === 'banner') {
      const it = CFG ? normLayout(CFG.layout, CFG.blocks).find(x => x.k === 'banner') : null;
      const pl = (it && it.place) || 'results';
      const nm = { results: 'Results', top: 'Top of page', inputs: 'Inputs column' };
      const nx = { results: 'top', top: 'inputs', inputs: 'results' }[pl] || 'top';
      place = '<button type="button" data-cbx="place" title="Sits in: ' + nm[pl] + ' — click to move it to ' + nm[nx] + '">⇅ ' + nm[pl] + '</button><span class="cbx-sep"></span>';
    }
    if (g === 'b' && k === 'copylink') {
      const it = CFG ? normLayout(CFG.layout, CFG.blocks).find(x => x.k === 'copylink') : null;
      const out = !!(it && it.place === 'results');
      place = '<button type="button" data-cbx="place" title="' + (out ? 'Move back to the inputs column' : 'Move into the results') + '">' + (out ? '⇤ Inputs' : 'Results ⇥') + '</button><span class="cbx-sep"></span>';
    }
    return '<span class="cbx-grip" title="Drag to move">⣿</span><span class="cbx-name">' + esc(labelOf(g, k)) + '</span>' + place + ws +
      '<span class="cbx-sep"></span>' + (g === 'b' ? '<button type="button" data-cbx="theme" title="Theme: ' + themeName(g, k) + ' — click for the next (Classic → Frosted glass → Liquid glass)">✦ ' + themeName(g, k) + '</button>' : '') +
      '<button type="button" data-cbx="style" title="Style this block">🎨</button>' +
      '<button type="button" data-cbx="eye" title="' + (isHidden(g, k) ? 'Show' : 'Hide') + '">' + (isHidden(g, k) ? '🚫' : '👁') + '</button>';
  }
  function renderBars() {
    document.querySelectorAll('.cbx-bar').forEach(el => el.remove());
    document.querySelectorAll('.cbx-sel').forEach(el => el.classList.remove('cbx-sel'));
    if (!EDIT) return;
    // The inputs column itself is outlined + selectable; its position / width controls live in
    // the Custom Build preview toolbar (a bar here would float over the results on narrow layouts).
    document.querySelectorAll('[data-cbp]').forEach(el => { if (SEL && SEL.g === 'p') el.classList.add('cbx-sel'); });
    document.querySelectorAll('[data-cbk],[data-cbf]').forEach(el => {
      const g = el.hasAttribute('data-cbf') ? 'f' : 'b';
      const k = el.getAttribute(g === 'f' ? 'data-cbf' : 'data-cbk');
      const bar = document.createElement('div');
      bar.className = 'cbx-bar'; bar.setAttribute('data-g', g); bar.setAttribute('data-k', k);
      bar.innerHTML = barHtml(g, k);
      if (g === 'b' && el.getBoundingClientRect().width < 330) bar.classList.add('cbx-tight');
      el.appendChild(bar);
      if (SEL && SEL.g === g && SEL.k === k) el.classList.add('cbx-sel');
    });
    // Output-strip pills + compact twins: style / hide only (they move with their block)
    document.querySelectorAll('[data-cbx-pill],[data-cbx-twin]').forEach(el => {
      const pill = el.hasAttribute('data-cbx-pill');
      const g = pill ? 'm' : 'b', k = el.getAttribute(pill ? 'data-cbx-pill' : 'data-cbx-twin');
      const bar = document.createElement('div');
      bar.className = 'cbx-bar'; bar.setAttribute('data-g', g); bar.setAttribute('data-k', k);
      const hid = isHidden(g, k);
      bar.innerHTML = '<button type="button" data-cbx="style" title="Style ' + esc(labelOf(g, k)) + '">🎨</button><button type="button" data-cbx="eye" title="' + (hid ? 'Show' : 'Hide') + '">' + (hid ? '🚫' : '👁') + '</button>';
      el.appendChild(bar);
      if (SEL && SEL.g === g && SEL.k === k) el.classList.add('cbx-sel');
    });
  }
  function setEdit(on, sel) {
    EDIT = !!on; SEL = sel || null;
    document.body.classList.toggle('cbx-edit', EDIT);
    renderBars();
    if (EDIT && !_mo) {
      // Results re-render (calculate) can replace block contents; put the toolbars back.
      _mo = new MutationObserver(() => {
        if (!EDIT) return;
        const missing = [...document.querySelectorAll('[data-cbk],[data-cbf],[data-cbx-pill],[data-cbx-twin]')].some(el => !el.querySelector(':scope > .cbx-bar'));
        if (missing) { clearTimeout(_mo._t); _mo._t = setTimeout(renderBars, 60); }
      });
      _mo.observe(document.body, { childList: true, subtree: true });
    }
    if (EDIT && SEL) {
      const el = findEl(SEL.g, SEL.k);
      if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
    }
  }
  function findEl(g, k) {
    const v = '"' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"';
    if (g === 'm') return document.querySelector('[data-cbx-pill=' + v + ']');
    if (g === 'b') { const el = document.querySelector('[data-cbk=' + v + ']'); if (el && el.getClientRects().length) return el; return document.querySelector('[data-cbx-twin=' + v + ']') || el; }
    const a = g === 'f' ? 'data-cbf' : 'data-cbp';
    return document.querySelector('[' + a + '=' + v + ']');
  }

  // Toolbar clicks + click-to-select
  document.addEventListener('click', e => {
    if (!EDIT) return;
    const btn = e.target.closest && e.target.closest('.cbx-bar [data-cbx]');
    if (btn) {
      e.preventDefault(); e.stopPropagation();
      const bar = btn.closest('.cbx-bar'), g = bar.getAttribute('data-g'), k = bar.getAttribute('data-k');
      const kind = btn.getAttribute('data-cbx'), v = btn.getAttribute('data-v');
      if (kind === 'w') post({ op: 'width', g, k, w: v });
      else if (kind === 'eye') post({ op: 'toggle', g, k });
      else if (kind === 'style') post({ op: 'select', g, k, style: true });
      else if (kind === 'place') post({ op: 'place', g, k });
      else if (kind === 'theme') post({ op: 'theme', g, k });
      else if (kind === 'pos') post({ op: 'pos', pos: v });
      else if (kind === 'pw') post({ op: 'pwidth', width: v });
      return;
    }
    if (e.target.closest && e.target.closest('.cbx-bar')) { e.preventDefault(); e.stopPropagation(); return; }
    const host = e.target.closest && (e.target.closest('[data-cbf]') || e.target.closest('[data-cbx-pill]') || e.target.closest('[data-cbx-twin]') || e.target.closest('[data-cbk]') || e.target.closest('[data-cbp]'));
    if (!host) return;
    const g = host.hasAttribute('data-cbf') ? 'f' : host.hasAttribute('data-cbx-pill') ? 'm' : (host.hasAttribute('data-cbx-twin') || host.hasAttribute('data-cbk')) ? 'b' : 'p';
    const k = g === 'f' ? host.getAttribute('data-cbf') : g === 'm' ? host.getAttribute('data-cbx-pill') : g === 'p' ? host.getAttribute('data-cbp') : (host.getAttribute('data-cbx-twin') || host.getAttribute('data-cbk'));
    // Buttons inside a block (breakdown toggles, %/# switches) keep working; selection rides along.
    SEL = { g, k };
    document.querySelectorAll('.cbx-sel').forEach(el => el.classList.remove('cbx-sel'));
    host.classList.add('cbx-sel');
    post({ op: 'select', g, k });
  }, true);

  // Drag to move (pointer events, works inside the editor's iframe)
  let D = null;
  document.addEventListener('pointerdown', e => {
    if (!EDIT) return;
    const grip = e.target.closest && e.target.closest('.cbx-grip');
    if (!grip) return;
    const bar = grip.closest('.cbx-bar'), g = bar.getAttribute('data-g'), k = bar.getAttribute('data-k');
    const el = bar.parentElement;
    e.preventDefault(); e.stopPropagation();
    try { grip.setPointerCapture(e.pointerId); } catch (err) {}
    const drop = document.createElement('div'); drop.className = 'cbx-drop'; drop.style.display = 'none';
    const chip = document.createElement('div'); chip.className = 'cbx-chip'; chip.textContent = '⣿ ' + labelOf(g, k);
    document.body.appendChild(drop); document.body.appendChild(chip);
    el.classList.add('cbx-dragging');
    D = { g, k, el, grip, drop, chip, target: null, after: false, pid: e.pointerId };
    moveChip(e);
  }, true);
  function moveChip(e) { if (D) { D.chip.style.left = e.clientX + 'px'; D.chip.style.top = e.clientY + 'px'; } }
  document.addEventListener('pointermove', e => {
    if (!D) return;
    moveChip(e);
    const a = D.g === 'f' ? 'data-cbf' : 'data-cbk';
    const peers = [...document.querySelectorAll('[' + a + ']')].filter(p => p !== D.el && p.getClientRects().length);
    let best = null, bd = Infinity;
    peers.forEach(p => {
      const r = p.getBoundingClientRect();
      const dx = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
      const dy = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = p; }
    });
    if (!best) { D.target = null; D.drop.style.display = 'none'; return; }
    const r = best.getBoundingClientRect();
    const host = best.parentElement && best.parentElement.getBoundingClientRect();
    const sideways = host && r.width < host.width * 0.8;
    let after;
    if (sideways) after = e.clientX > r.left + r.width / 2; else after = e.clientY > r.top + r.height / 2;
    D.target = best.getAttribute(a); D.after = after;
    const ds = D.drop.style; ds.display = '';
    if (sideways) { ds.left = ((after ? r.right : r.left) - 2) + 'px'; ds.top = r.top + 'px'; ds.width = '4px'; ds.height = r.height + 'px'; }
    else { ds.left = r.left + 'px'; ds.top = ((after ? r.bottom : r.top) - 2) + 'px'; ds.width = r.width + 'px'; ds.height = '4px'; }
  }, true);
  function endDrag(commit) {
    if (!D) return;
    const d = D; D = null;
    d.el.classList.remove('cbx-dragging'); d.drop.remove(); d.chip.remove();
    if (commit && d.target && d.target !== d.k) post({ op: 'move', g: d.g, k: d.k, target: d.target, after: d.after });
  }
  document.addEventListener('pointerup', () => endDrag(true), true);
  document.addEventListener('pointercancel', () => endDrag(false), true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') endDrag(false); }, true);

  window.SICB = { apply, setEdit, FIELDS, BLOCKS, PILLS, normLayout, normInputs, get cfg() { return CFG; } };
})();
