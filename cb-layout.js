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
    { k: 'metrics',   label: 'Output Strip' },
    { k: 'hero',      label: 'Premiums You Keep' },
    { k: 'upfront',   label: 'Upfront Rev Share Payment' },
    { k: 'cards',     label: 'Extra Revenue card' },
    { k: 'cost',      label: 'Current Cost card' },
    { k: 'returns',   label: 'Returns Savings' },
    { k: 'cashback',  label: 'Cashback' },
    { k: 'guarantee', label: 'Guarantee' },
    { k: 'breakdown', label: 'Calculation Breakdown' },
    { k: 'copylink',  label: 'Copy Link button' },
  ];
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
        guarantee: byId('guaranteeResultBlock'),
        breakdown: byId('p-calcBreakdown'),
      },
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
      paint: {},
      compactBox: '#compactOutputs, #compactOpt',
      costHiddenRow: '#cardsRow.cost-hidden',
      bleed: { metrics: 1, breakdown: 1 },   // full-bleed strips: reach the column edges when full width
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
  function fg(inputId) { const i = document.getElementById(inputId); return i ? i.closest('.field-group') : null; }
  function page() {
    if (document.querySelector('.proposal-layout')) return PAGES.proposal;
    if (document.querySelector('.container .calc-body')) return PAGES.calc;
    return null;
  }

  // ── Config normalisation (old builds → today's shape, nothing lost) ──────────────────────
  function normLayout(layout, blocks) {
    let L = (Array.isArray(layout) ? layout : []).map(it => (typeof it === 'string') ? { k: it, v: true } : Object.assign({}, it));
    L = L.filter(it => it && it.k);
    const has = k => L.some(it => it.k === k);
    const idx = k => L.findIndex(it => it.k === k);
    if (!L.length) L = BLOCKS.filter(b => b.k !== 'cost').map(b => ({ k: b.k, v: true }));
    BLOCKS.forEach(b => {
      if (b.k === 'cost' || b.k === 'upfront' || has(b.k)) return;
      if (b.k === 'breakdown' || b.k === 'copylink') { L.push({ k: b.k, v: true }); return; }
      const bi = idx('breakdown');
      if (bi >= 0) L.splice(bi, 0, { k: b.k, v: true }); else L.push({ k: b.k, v: true });
    });
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
    // Text blocks
    css += '.cb-block{box-sizing:border-box;}';
    css += '.theme-midnight .cb-block{color:#e8e8ee;}';
    // Hidden blocks/fields: gone in the live page, ghosted while editing.
    css += 'body:not(.cbx-edit) [data-cbx-hide]{display:none !important;}';
    css += 'body.cbx-edit [data-cbx-hide]{opacity:.38;filter:grayscale(.6);}';
    // ── On-canvas editor chrome ──
    css += 'body.cbx-edit [data-cbk],body.cbx-edit [data-cbf],body.cbx-edit [data-cbp]{outline:1.5px dashed rgba(102,117,255,.55);outline-offset:3px;cursor:pointer;}';
    css += 'body.cbx-edit [data-cbk]:not(.lgc-host),body.cbx-edit [data-cbf]{position:relative;}';
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
    if (!cfg) { st.textContent = ''; afterLayout(); return; }
    const b = cfg.branding || {};
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
    const hi = layout.findIndex(x => x.k === 'hero'), ui = layout.findIndex(x => x.k === 'upfront');
    const keepRow = hi >= 0 && ui >= 0 && Math.abs(hi - ui) === 1 && layout[hi].v !== false && layout[ui].v !== false &&
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
        if (!el) {
          const blk = blocks.find(b => b.id === it.k);
          if (blk) el = textBlock(grid, blk);
        }
        if (!el) return;
        el.setAttribute('data-cbk', it.k);
        ordOf[it.k] = (i + 1) * 10;
        css += '[data-cbk="' + it.k + '"]{order:' + ordOf[it.k] + ';}';
        if (!isVis(it)) el.setAttribute('data-cbx-hide', '1');
        else { if (firstVis == null) firstVis = el; lastVis = el; }
        const w = it.w && SPAN[it.w] ? it.w : ((it.k === 'cards' || it.k === 'cost') ? 'half' : 'full');
        if ((it.k === 'hero' || it.k === 'upfront') && keepRow) { /* inside the page's own row */ }
        else if (it.k === 'hero' || it.k === 'upfront') css += pairCss(P, N, layout, it, w);
        else css += N + ' [data-cbk="' + it.k + '"]' + BOOST2 + '{grid-column:span ' + SPAN[w] + ';}';
        if (it.k === 'cards') css += N + ' ' + P.costHiddenRow + '>[data-cbk="cards"]' + BOOST2 + '{grid-column:1/-1;justify-self:center;width:' + (w === 'full' ? '100%' : PCT[w === 'half' ? 'half' : w]) + ';}';
        if (P.bleed && P.bleed[it.k] && w === 'full') el.setAttribute('data-cbx-bleed', '1');
        const textBlk = blocks.find(b => b.id === it.k);
        if (!textBlk) css += styleCss('[data-cbk="' + it.k + '"]', it.style, { paint: P.paint[it.k], P });
      });
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
    st.textContent = css;
    LAST = cfg;
    afterLayout();
    if (EDIT) renderBars();
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
      if (lbl) { b.textContent = lbl; b.setAttribute('data-cbx-label', lbl); }
    });
    css += styleCss(S, it.style, { P });
    return css;
  }

  // Premiums You Keep + Upfront Rev Share Payment. Upfront only exists while a tier is picked (the
  // page toggles its inline display), so "Auto" widths follow it live: side by side when it shows
  // and they're next to each other in the order, Premiums alone otherwise (full on the merchant
  // view, natural width centred on the rep calc — the look before blocks existed).
  function pairCss(P, N, layout, it, w) {
    const S = '[data-cbk="' + it.k + '"]' + BOOST2;
    const other = it.k === 'hero' ? 'upfront' : 'hero';
    const i = layout.findIndex(x => x.k === it.k), j = layout.findIndex(x => x.k === other);
    const paired = j >= 0 && Math.abs(i - j) === 1 && layout[j].v !== false && it.v !== false;
    const first = paired && i < j;
    const otherIt = j >= 0 ? layout[j] : null;
    const explicit = !!(it.w && SPAN[it.w]);
    const otherSpan = otherIt && otherIt.w && SPAN[otherIt.w] ? SPAN[otherIt.w] : null;
    // Upfront visible = shown by the page and not hidden by the build
    const upOn = P.gridOn + ':has([data-cbk="upfront"]:not([style*="none"]):not([data-cbx-hide]))';
    let css = '';
    if (explicit) return N + ' ' + S + '{grid-column:span ' + SPAN[w] + ';}';
    css += N + ' ' + S + '{grid-column:span 6;' + (P.centerAuto ? 'justify-self:center;' : '') + '}';
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
    if (blk.heading) html += '<div class="cb-block-h" style="font-weight:800;margin-bottom:4px;">' + esc(blk.heading) + '</div>';
    if (blk.body) html += '<div class="cb-block-b" style="white-space:pre-wrap;line-height:1.5;">' + esc(blk.body) + '</div>';
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
    document.querySelectorAll('[data-cbk],[data-cbf],[data-cbp],[data-cbx-hide],[data-cbx-bleed],[data-cbx-first],[data-cbx-last],[data-cbx-o]').forEach(el => {
      ['data-cbk', 'data-cbf', 'data-cbp', 'data-cbx-hide', 'data-cbx-bleed', 'data-cbx-first', 'data-cbx-last', 'data-cbx-o'].forEach(a => el.removeAttribute(a));
    });
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
    // Legacy markers from the pre-SICB applyCustomBuild
    document.querySelectorAll('[data-cb-hidden]').forEach(el => el.removeAttribute('data-cb-hidden'));
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
    if (g === 'f') { const f = normInputs(CFG.inputs).fields.find(x => x.k === k); return !!(f && f.v === false); }
    const it = normLayout(CFG.layout, CFG.blocks).find(x => x.k === k); return !!(it && it.v === false);
  }
  function barHtml(g, k) {
    const w = curW(g, k);
    const ws = [['full', 'Full width', '1'], ['twothirds', 'Two-thirds width', '⅔'], ['half', 'Half width', '½'], ['third', 'One-third width', '⅓']]
      .map(([v, t, s]) => '<button type="button" data-cbx="w" data-v="' + v + '" title="' + t + '"' + (w === v ? ' class="on"' : '') + '>' + s + '</button>').join('');
    let place = '';
    if (g === 'b' && k === 'copylink') {
      const it = CFG ? normLayout(CFG.layout, CFG.blocks).find(x => x.k === 'copylink') : null;
      const out = !!(it && it.place === 'results');
      place = '<button type="button" data-cbx="place" title="' + (out ? 'Move back to the inputs column' : 'Move into the results') + '">' + (out ? '⇤ Inputs' : 'Results ⇥') + '</button><span class="cbx-sep"></span>';
    }
    return '<span class="cbx-grip" title="Drag to move">⣿</span><span class="cbx-name">' + esc(labelOf(g, k)) + '</span>' + place + ws +
      '<span class="cbx-sep"></span><button type="button" data-cbx="style" title="Style this block">🎨</button>' +
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
  }
  function setEdit(on, sel) {
    EDIT = !!on; SEL = sel || null;
    document.body.classList.toggle('cbx-edit', EDIT);
    renderBars();
    if (EDIT && !_mo) {
      // Results re-render (calculate) can replace block contents; put the toolbars back.
      _mo = new MutationObserver(() => {
        if (!EDIT) return;
        const missing = [...document.querySelectorAll('[data-cbk],[data-cbf]')].some(el => !el.querySelector(':scope > .cbx-bar'));
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
    const a = g === 'f' ? 'data-cbf' : g === 'p' ? 'data-cbp' : 'data-cbk';
    return document.querySelector('[' + a + '="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]');
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
      else if (kind === 'pos') post({ op: 'pos', pos: v });
      else if (kind === 'pw') post({ op: 'pwidth', width: v });
      return;
    }
    if (e.target.closest && e.target.closest('.cbx-bar')) { e.preventDefault(); e.stopPropagation(); return; }
    const host = e.target.closest && (e.target.closest('[data-cbf]') || e.target.closest('[data-cbk]') || e.target.closest('[data-cbp]'));
    if (!host) return;
    const g = host.hasAttribute('data-cbf') ? 'f' : host.hasAttribute('data-cbk') ? 'b' : 'p';
    const k = host.getAttribute(g === 'f' ? 'data-cbf' : g === 'b' ? 'data-cbk' : 'data-cbp');
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

  window.SICB = { apply, setEdit, FIELDS, BLOCKS, normLayout, normInputs, get cfg() { return CFG; } };
})();
