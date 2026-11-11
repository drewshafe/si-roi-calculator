/* ROI Builder · Mobile — the third display option (Comfort · Compact · Mobile) for every calculator.
 *
 * One phone layout (from the "ROI Builder · Mobile" design) that runs on top of BOTH calculators:
 *   • index.html    (rep ROI Builder)  — host "rep"
 *   • proposal.html (merchant view, incl. every Custom Build link) — host "merchant"
 *
 * It never re-does the math. It DRIVES the page's real inputs (same ids, same listeners) and
 * MIRRORS the page's real output (the _bd / _p_bd results, the Extra Revenue card lines, the
 * output-strip pills and the page's own Calculation Breakdown rows). So every pricing template,
 * coverage model (Standard / Full / Hybrid), returns / cashback / guarantee, currency and every
 * Custom Build edit (renamed labels, hidden fields / pills / blocks, field order, accent, logo,
 * font, locked inputs, Midnight theme) shows up here exactly as on desktop.
 *
 * When it shows:
 *   • ?disp=mobile  (or ?mobile=1)         → always, on any screen, also inside a preview iframe
 *   • rep picked Display → Density → Mobile → always (rep calc, not when embedded in the Rep Hub)
 *   • a phone-width screen (≤600px)        → automatically, unless ?mobile=0
 * On a wide screen it renders as a centred phone column. "Full view" opens the regular layout
 * with a floating "Mobile view" pill to come back.
 */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const HOST = $('p-orders') ? 'merchant' : ($('annualOrders') ? 'rep' : null);
    if (!HOST) return;
    const Q = new URLSearchParams(location.search);
    const embedded = window.top !== window;
    const mq = window.matchMedia('(max-width: 600px)');
    const forced = () => Q.get('mobile') === '1' || (Q.get('disp') || '').toLowerCase() === 'mobile' || (Q.get('disp') || '').toLowerCase() === 'm';
    let full = false;   // the viewer opened the regular layout from "Full view"
    const wanted = () => {
        if (Q.get('mobile') === '0') return false;
        if (forced()) return true;
        if (embedded) return false;                       // Rep Hub / Custom Build preview: only when asked
        return document.body.classList.contains('disp-mobile') || mq.matches;
    };

    // ── Styles (values from the design: Main.dc.html) ───────────────────────────────────────
    const css = `
    #mv { position:fixed; inset:0; z-index:9000; display:none; justify-content:center; overflow:hidden; font-family:var(--mvFont,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif); -webkit-font-smoothing:antialiased;
        --bg:#f5f6fb; --card:#fff; --text:#1b1f3b; --sub:#5f6670; --border:#e3e6f3; --field:#f5f6fb; --primary:#4a5fc1; --primaryText:#fff;
        --heroBg:#4a5fc1; --heroBorder:#4a5fc1; --heroText:#fff; --heroSub:#e1e5ff; --chipBg:rgba(255,255,255,.14); --chipVal:#fff; --accent:#4a5fc1;
        --good:#1f7a4d; --cost:#b4441f; --costBg:#fdf1ec; --addBg:#eef0fb; --addBorder:#c5caeb; --backdrop:#e4e7f2; background:var(--backdrop); color:var(--text); }
    #mv.dark { --bg:#12131a; --card:#1b1c26; --text:#efe7cf; --sub:#a9a493; --border:#2c2e3d; --field:#14151d; --primary:#e9c46a; --primaryText:#14151d;
        --heroBg:#14151d; --heroBorder:#e9c46a; --heroText:#efe7cf; --heroSub:#cfc8b0; --chipBg:#1f202b; --chipVal:#2ee6a0; --accent:#e9c46a;
        --good:#2ee6a0; --cost:#f0a07a; --costBg:#241c1c; --addBg:#1f202b; --addBorder:#4a4636; --backdrop:#08080d; }
    body.mv-on #mv { display:flex; }
    body.mv-on { overflow:hidden !important; }
    #mv * { box-sizing:border-box; }
    #mv .mv-app { position:relative; width:100%; max-width:440px; height:100%; display:flex; flex-direction:column; overflow:hidden; background:var(--bg); }
    @media (min-width:601px) { #mv .mv-app { height:calc(100% - 32px); max-height:932px; margin:auto 0; border-radius:28px; border:1px solid var(--border); box-shadow:0 24px 60px rgba(20,24,48,.18); } }
    #mv .num { font-variant-numeric:tabular-nums; }
    #mv button { font:inherit; cursor:pointer; }
    #mv input:focus { outline:2px solid #6675ff; outline-offset:1px; }
    #mv button:focus-visible { outline:2px solid #6675ff; outline-offset:2px; }
    #mv .mv-top { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:calc(16px + env(safe-area-inset-top)) 16px 12px; }
    #mv .mv-brand { display:flex; align-items:center; gap:10px; min-width:0; }
    #mv .mv-lock { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--primary); color:var(--primaryText); flex-shrink:0; overflow:hidden; }
    #mv .mv-lock.has-logo { background:var(--card); border:1px solid var(--border); width:auto; min-width:36px; max-width:96px; padding:3px 6px; }
    #mv .mv-lock img { max-height:28px; max-width:84px; width:auto; height:auto; display:block; object-fit:contain; }
    #mv .mv-title { font-size:17px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #mv .mv-subt { font-size:12px; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #mv .mv-seg { display:flex; padding:3px; border-radius:12px; background:var(--field); border:1px solid var(--border); }
    #mv .mv-seg button { min-width:48px; min-height:36px; border:0; border-radius:9px; font-size:14px; font-weight:700; background:transparent; color:var(--sub); padding:0 8px; }
    #mv .mv-seg button[aria-pressed="true"] { background:var(--primary); color:var(--primaryText); }
    #mv .mv-opts { display:flex; gap:6px; overflow-x:auto; padding:0 16px 10px; scrollbar-width:none; }
    #mv .mv-opts::-webkit-scrollbar { display:none; }
    #mv .mv-opts a { flex-shrink:0; min-height:36px; display:flex; align-items:center; padding:0 12px; border-radius:999px; border:1px solid var(--border); background:var(--card); color:var(--text); font-size:13px; font-weight:700; text-decoration:none; }
    #mv .mv-opts a.active { background:var(--primary); border-color:var(--primary); color:var(--primaryText); }
    #mv .mv-hero { margin:0 16px; padding:16px 16px 14px; border-radius:20px; background:var(--heroBg); border:1px solid var(--heroBorder); color:var(--heroText); }
    #mv .mv-hero-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    #mv .mv-hero-lbl { font-size:13px; font-weight:600; color:var(--heroSub); }
    #mv .mv-keep { font-size:12px; font-weight:700; padding:4px 8px; border-radius:999px; background:var(--chipBg); color:var(--chipVal); white-space:nowrap; }
    #mv .mv-keep:empty { display:none; }
    #mv .mv-hero-val { display:flex; align-items:baseline; gap:8px; margin-top:4px; flex-wrap:wrap; }
    #mv .mv-big { font-size:42px; font-weight:800; letter-spacing:-.03em; line-height:1.05; }
    #mv .mv-unit { font-size:15px; font-weight:600; color:var(--heroSub); }
    #mv .mv-hero-sub { font-size:12px; margin-top:2px; color:var(--heroSub); }
    #mv .mv-hero-sub:empty { display:none; }
    #mv .mv-chips { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:12px; }
    #mv .mv-chips:empty { display:none; }
    #mv .mv-chip { padding:9px 10px; border-radius:12px; background:var(--chipBg); display:flex; flex-direction:column; gap:2px; min-width:0; }
    #mv .mv-chip b { font-size:16px; font-weight:700; color:var(--chipVal); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #mv .mv-chip span { font-size:11px; line-height:1.25; color:var(--heroSub); }
    #mv .mv-scroll { flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:16px 16px 24px; display:flex; flex-direction:column; gap:16px; scrollbar-width:none; }
    #mv .mv-scroll::-webkit-scrollbar { display:none; }
    #mv .mv-scroll > * { flex-shrink:0; }
    #mv .mv-card { border-radius:18px; background:var(--card); border:1px solid var(--border); padding:6px 14px; }
    #mv .mv-sec-h { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 0 4px; }
    #mv .mv-sec-t { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--accent); min-width:0; }
    #mv .mv-sec-t img { height:17px; width:auto; display:block; }
    #mv .mv-hint { font-size:12px; color:var(--sub); text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
    #mv .mv-row { display:flex; align-items:center; gap:10px; min-height:60px; padding:8px 0; border-top:1px solid var(--border); }
    #mv .mv-row.first { border-top:0; }
    #mv .mv-row label { flex:1 1 auto; min-width:0; font-size:15px; font-weight:500; line-height:1.25; }
    #mv .mv-ctl { display:flex; align-items:center; gap:6px; flex-shrink:0; }
    #mv .mv-step { width:44px; height:44px; flex-shrink:0; border-radius:12px; border:1px solid var(--border); background:var(--field); color:var(--text); display:flex; align-items:center; justify-content:center; padding:0; }
    #mv .mv-box { width:92px; height:44px; display:flex; align-items:center; gap:2px; padding:0 10px; border-radius:12px; border:1px solid var(--border); background:var(--card); }
    #mv .mv-box span, #mv .mv-box .mv-unitbtn { font-size:14px; color:var(--sub); }
    #mv .mv-box .mv-unitbtn { border:0; background:var(--field); border-radius:6px; padding:2px 5px; font-weight:700; color:var(--accent); min-width:22px; }
    #mv .mv-box input { flex:1 1 auto; min-width:0; width:100%; border:0; background:transparent; color:var(--text); font:inherit; font-size:16px; font-weight:700; text-align:right; padding:0; }
    #mv .mv-box input, #mv .mv-box input:hover { background:transparent !important; background-image:none !important; border:0 !important; box-shadow:none !important; color:var(--text) !important; -webkit-text-fill-color:var(--text); height:auto !important; margin:0 !important; border-radius:0 !important; }
    #mv .mv-row.locked .mv-step { display:none; }
    #mv .mv-row.locked .mv-box { width:auto; min-width:92px; border-style:dashed; }
    #mv .mv-add { padding:4px 0 10px; border-top:1px solid var(--border); }
    #mv .mv-add-btn { width:100%; min-height:44px; margin-top:8px; display:flex; align-items:center; gap:8px; padding:0 12px; border-radius:10px; background:var(--addBg); border:1px dashed var(--addBorder); color:var(--accent); font-size:14px; font-weight:700; text-align:left; }
    #mv .mv-add-btn svg { flex-shrink:0; transition:transform .2s; }
    #mv .mv-add.open .mv-add-btn svg { transform:rotate(90deg); }
    #mv .mv-add-btn .grow { flex:1 1 auto; }
    #mv .mv-add-sum { font-size:12px; font-weight:600; color:var(--sub); }
    #mv .mv-add.open .mv-add-sum { display:none; }
    #mv .mv-add-body { display:none; }
    #mv .mv-add.open .mv-add-body { display:block; }
    #mv .mv-tog { display:flex; flex-direction:column; gap:8px; padding:12px 0; border-top:1px solid var(--border); }
    #mv .mv-tog > div:first-child { font-size:15px; font-weight:500; }
    #mv .mv-tog .mv-seg { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; }
    #mv .mv-tog .mv-seg button { min-height:40px; }
    #mv .mv-tiles { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:6px 0 12px; }
    #mv .mv-tile { padding:10px 12px; border-radius:12px; background:var(--field); border:1px solid var(--border); min-width:0; }
    #mv .mv-tile span { display:block; font-size:11px; font-weight:600; color:var(--sub); line-height:1.25; }
    #mv .mv-tile b { display:block; font-size:17px; font-weight:800; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #mv .mv-tile i { display:block; font-style:normal; font-size:11px; color:var(--sub); margin-top:1px; }
    #mv .mv-line { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:11px 0; border-top:1px solid var(--border); font-size:14px; }
    #mv .mv-line.first { border-top:0; }
    #mv .mv-line > span:first-child { font-weight:500; min-width:0; }
    #mv .mv-line > span:last-child { font-weight:700; white-space:nowrap; }
    #mv .mv-line.big > span:last-child { font-size:20px; font-weight:800; color:var(--good); }
    #mv .mv-line.head { font-size:12px; font-weight:700; color:var(--sub); text-transform:uppercase; letter-spacing:.04em; padding-bottom:4px; }
    #mv .mv-line.note { display:block; font-size:12px; color:var(--sub); font-weight:600; padding:8px 0 2px; }
    #mv .mv-cost { margin:4px 0 12px; padding:12px; border-radius:12px; background:var(--costBg); }
    #mv .mv-cost i { font-weight:400; color:var(--sub); }
    #mv .mv-math { border-radius:18px; background:var(--card); border:1px solid var(--border); overflow:hidden; }
    #mv .mv-math-btn { width:100%; min-height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; background:transparent; border:0; color:var(--text); font-size:15px; font-weight:600; }
    #mv .mv-math-btn svg { transition:transform .2s; }
    #mv .mv-math.open .mv-math-btn svg { transform:rotate(180deg); }
    #mv .mv-math-body { display:none; padding:0 14px 12px; }
    #mv .mv-math.open .mv-math-body { display:block; }
    #mv .mv-mgrp { font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--accent); padding:12px 0 2px; }
    #mv .mv-mrow { padding:12px 0; border-top:1px solid var(--border); }
    #mv .mv-mrow:first-child, #mv .mv-mgrp + .mv-mrow { border-top:0; }
    #mv .mv-mrow.total { border-top:2px solid var(--text); }
    #mv .mv-mrow-top { display:flex; justify-content:space-between; gap:12px; align-items:baseline; }
    #mv .mv-mrow-top div:first-child { font-size:14px; font-weight:600; }
    #mv .mv-mrow-top div:last-child { font-size:15px; font-weight:700; white-space:nowrap; }
    #mv .mv-eq { font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:12px; margin-top:3px; color:var(--sub); overflow-wrap:anywhere; }
    #mv .mv-adv { min-height:48px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 14px; border-radius:14px; background:transparent; border:1px dashed var(--border); color:var(--sub); font-size:14px; text-align:left; }
    #mv .mv-adv svg { flex-shrink:0; }
    #mv .mv-bar { display:flex; gap:10px; padding:12px 16px calc(16px + env(safe-area-inset-bottom)); background:var(--bg); border-top:1px solid var(--border); }
    #mv .mv-bar:empty { display:none; }
    #mv .mv-bar button { min-height:50px; border-radius:14px; font-size:15px; display:flex; align-items:center; justify-content:center; gap:8px; }
    #mv .mv-copy { flex:1 1 0; border:1px solid var(--border); background:var(--card); color:var(--text); font-weight:600; }
    #mv .mv-send { flex:1.4 1 0; border:0; background:var(--primary); color:var(--primaryText); font-weight:700; }
    #mv [hidden] { display:none !important; }
    #mvBack { position:fixed; right:14px; bottom:calc(16px + env(safe-area-inset-bottom)); z-index:9001; display:none; border:0; border-radius:999px; padding:12px 16px; font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--mvPrimary,#4a5fc1); color:#fff; box-shadow:0 8px 24px rgba(0,0,0,.25); cursor:pointer; }
    body.theme-midnight #mvBack { background:#e9c46a; color:#14151d; }
    body.mv-full #mvBack { display:block; }`;

    const icon = {
        lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
        minus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"></path></svg>',
        plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
        right: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>',
        right16: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>',
        down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>',
        link: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"></path></svg>',
        send: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>',
        share: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><path d="M16 6l-4-4-4 4"></path><path d="M12 2v13"></path></svg>',
    };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
    const txt = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
    // Shown on the page underneath (Custom Build hides with [data-cbx-hide] / [data-cbx-off] / display:none).
    const shown = el => !!el && !el.closest('[data-cbx-hide],[data-cbx-off]') &&
        (el.getClientRects().length > 0 || (getComputedStyle(el).display === 'contents' && [...el.children].some(c => c.getClientRects().length > 0)));
    const byPosition = (a, b) => { const r = a.getBoundingClientRect(), s = b.getBoundingClientRect(); return (Math.round(r.top) - Math.round(s.top)) || (r.left - s.left); };
    const active = id => { const b = $(id); return !!(b && b.classList.contains('active')); };
    const curSym = () => {
        try { if (typeof formatCurrency === 'function') return formatCurrency(0).replace(/[\d.,\s]/g, '') || '$'; } catch (e) {}
        try { if (typeof window.curSym === 'function') return window.curSym(); } catch (e) {}
        return '$';
    };
    const fieldRow = (key, first) => '<div class="mv-row' + (first ? ' first' : '') + '" data-k="' + esc(key) + '"><label for="mv-' + esc(key) + '"></label><div class="mv-ctl">' +
        '<button type="button" class="mv-step" data-dec aria-label="Decrease">' + icon.minus + '</button>' +
        '<div class="mv-box"><span data-pre></span><input id="mv-' + esc(key) + '" type="text" inputmode="decimal" class="num"><span data-suf></span></div>' +
        '<button type="button" class="mv-step" data-inc aria-label="Increase">' + icon.plus + '</button></div></div>';
    const mathRows = rows => rows.map(r => '<div class="mv-mrow' + (r.total ? ' total' : '') + '"><div class="mv-mrow-top"><div>' + esc(r.label) + '</div><div class="num" style="color:' + (r.good ? 'var(--good)' : r.bad ? 'var(--cost)' : 'var(--text)') + '">' + esc(r.val) + '</div></div>' +
        (r.eq ? '<div class="mv-eq num">' + esc(r.eq) + '</div>' : '') + '</div>').join('');
    // The page's own Calculation Breakdown rows (.bd-row: label · equation · value), any mode.
    const bdRows = id => [...(($(id) || {}).querySelectorAll ? $(id).querySelectorAll('.bd-row') : [])].map(r => ({
        label: txt(r.querySelector('.bd-lbl')), eq: txt(r.querySelector('.bd-eq')), val: txt(r.querySelector('.bd-val')),
        total: r.classList.contains('sep'), good: r.classList.contains('positive'), bad: r.classList.contains('negative'),
    })).filter(r => r.label || r.val);

    // ════════════════════════════════════════════════════════════════════════════════════════
    //  REP host (index.html): fixed field set → real calc inputs.
    // ════════════════════════════════════════════════════════════════════════════════════════
    const REP_FIELDS = {   // key: [input id, step, max]
        orders: ['annualOrders', 500, 1e9], aov: ['avgOrderValue', 5, 1e6], claims: ['claimsRate', 0.5, 100],
        cogs: ['cogsPercent', 1, 1e5], ship: ['avgShipping', 1, 1e4], cs: ['csCostPerClaim', 1, 1e3],
        prem: ['protectionPremium', 0.25, 1e3], attach: ['attachRate', 1, 100], minPrem: ['minPremium', 0.25, 100], rs: ['revenueShare', 5, 100],
    };

    // ════════════════════════════════════════════════════════════════════════════════════════
    //  MERCHANT host (proposal.html): fields are discovered from the page, so Custom Build's
    //  labels / hidden fields / order / locked inputs carry over. key = the real input id.
    // ════════════════════════════════════════════════════════════════════════════════════════
    const M_STEP = { 'p-orders': 500, 'p-aov': 5, 'p-claims': 0.5, 'p-premium': 0.25, 'p-attach': 1, 'p-share': 5,
        'p-rr': 1, 'p-arc': 1, 'p-rpc': 25, 'p-cb': 1, 'p-mincb': 1, 'p-cbrr': 1, 'p-gcr': 0.5, 'p-cogs': 1, 'p-aship': 1, 'p-cs': 1 };
    const M_SI = ['p-premium', 'p-attach', 'p-share'];
    const M_GROUPED = ['p-orders', 'p-claims', 'p-rr', 'p-rpc'];   // whole numbers with thousands separators when large

    function mFieldLabel(fg, inp) {
        const lbls = [...fg.querySelectorAll('label')].filter(l => !l.classList.contains('lbl-cmp'));
        let t = txt(lbls[0]) || inp.getAttribute('aria-label') || inp.id;
        return t.replace(/\s*\((\$|%)\)/g, '').replace(/\s(%|\$)(?=\s|$)/g, '').replace(/\s+/g, ' ').trim();
    }
    function mUnits(fg, inp) {
        const btns = [...fg.querySelectorAll('.itype-btn')];
        const on = btns.find(b => b.classList.contains('active'));
        const unit = on ? txt(on) : '';
        const raw = txt(fg.querySelector('label:not(.lbl-cmp)'));
        const cur = curSym();
        let pre = '', suf = '';
        if (unit === '$' || unit === cur) pre = cur;
        else if (unit === '%' || unit === '#') suf = unit;
        else if (/%/.test(raw)) suf = '%';
        else if (/\(\$|\$\)|\$\/|\bcost\b|\bshipping\b|\baov\b|\bamount\b/i.test(raw)) pre = cur;
        if (inp.id === 'p-premium' && typeof p_premiumType !== 'undefined') { pre = p_premiumType === 'pct' ? '' : cur; suf = p_premiumType === 'pct' ? '%' : ''; }
        return { pre, suf, alt: btns.length > 1 ? btns : null };
    }
    // Group the page's visible merchant fields into the mobile cards, in on-page order.
    function mSections() {
        const sec = $('inputsSection'); if (!sec) return [];
        const visibleFields = scope => [...scope.querySelectorAll('.field-group')].filter(fg => {
            const inp = fg.querySelector('input[type="text"]');
            return inp && inp.id && M_STEP[inp.id] != null && (shown(fg) || (fg.closest('details') && !fg.closest('details').open && !fg.closest('[data-cbx-hide],[data-cbx-off]')));
        }).sort(byPosition);
        const out = [];
        const primary = visibleFields($('primaryInputsGrid') || sec);
        const add = $('additionalInputsInner') ? visibleFields($('additionalInputsInner')) : [];
        const metrics = primary.filter(fg => !M_SI.includes(fg.querySelector('input').id));
        const si = primary.filter(fg => M_SI.includes(fg.querySelector('input').id));
        if (metrics.length || add.length) out.push({ k: 'metrics', title: 'Your metrics', fields: metrics, add });
        if (si.length) out.push({ k: 'si', logo: true, fields: si, add: [] });
        [['returnsFeatureSection', 'Returns'], ['cashbackFeatureSection', 'Customer Cashback'], ['guaranteeFeatureSection', 'Guarantee']].forEach(([id, def]) => {
            const s = $(id); if (!s || !shown(s)) return;
            const f = visibleFields(s); if (f.length) out.push({ k: id, title: txt(s.querySelector('.feature-section-title')) || def, fields: f, add: [] });
        });
        return out;
    }

    // ── Build the shell once ────────────────────────────────────────────────────────────────
    function build() {
        const st = document.createElement('style'); st.id = 'mv-style'; st.textContent = css; document.head.appendChild(st);
        const el = document.createElement('div'); el.id = 'mv';
        el.innerHTML = '<div class="mv-app" role="main" aria-label="Mobile calculator">' +
            '<div class="mv-top"><div class="mv-brand"><div class="mv-lock" id="mvLock">' + icon.lock + '</div><div style="display:flex;flex-direction:column;min-width:0">' +
                '<div class="mv-title" id="mvTitle">ROI Builder</div><div class="mv-subt" id="mvSub"></div></div></div>' +
                '<div class="mv-seg" role="group" aria-label="View"><button type="button" data-period="monthly">Mo</button><button type="button" data-period="annual">Yr</button></div></div>' +
            '<div class="mv-opts" id="mvOpts" hidden></div>' +
            '<div class="mv-hero"><div class="mv-hero-top"><div class="mv-hero-lbl" id="mvHeroLbl">Extra Revenue With ShipInsure</div><div class="mv-keep num" id="mvKeep"></div></div>' +
                '<div class="mv-hero-val"><div class="mv-big num" id="mvBig"></div><div class="mv-unit" id="mvUnit"></div></div>' +
                '<div class="mv-hero-sub" id="mvHeroSub"></div>' +
                '<div class="mv-chips" id="mvChips"></div></div>' +
            '<div class="mv-scroll" id="mvScroll"><div id="mvInputs" style="display:flex;flex-direction:column;gap:16px"></div>' +
                '<div class="mv-card" id="mvResults" hidden></div>' +
                '<div class="mv-math open" id="mvMath"><button type="button" class="mv-math-btn" aria-expanded="true" aria-controls="mvMathBody"><span>Show the math</span>' + icon.down + '</button><div class="mv-math-body" id="mvMathBody"><div id="mvRows"></div>' +
                    '<div class="mv-cost" id="mvCostBox"><div class="mv-mrow-top"><div id="mvCostLbl">Current Cost of Claims <i>(without ShipInsure)</i></div><div class="num" style="color:var(--cost)" id="mvCost"></div></div><div class="mv-eq num" id="mvCostEq"></div></div></div></div>' +
                '<button type="button" class="mv-adv" id="mvAdv"><span id="mvAdvTxt"></span>' + icon.right16 + '</button>' +
            '</div>' +
            '<div class="mv-bar" id="mvBar"></div></div>';
        document.body.appendChild(el);
        const back = document.createElement('button'); back.id = 'mvBack'; back.type = 'button'; back.textContent = '📱 Mobile view';
        document.body.appendChild(back);
        if (HOST === 'rep') buildRepInputs(); else { $('mvMath').classList.remove('open'); $('mvMath').querySelector('.mv-math-btn').setAttribute('aria-expanded', 'false'); }
        $('mvAdvTxt').textContent = HOST === 'rep' ? 'Advanced · Pricing model, min premium, returns, cashback, guarantee' : 'Full view · every detail, billing explained';
        $('mvBar').innerHTML = HOST === 'rep'
            ? '<button type="button" class="mv-copy" id="mvCopy">' + icon.link + '<span>Copy link</span></button><button type="button" class="mv-send" id="mvSend">' + icon.send + '<span>Send proposal</span></button>'
            : '<button type="button" class="mv-copy" id="mvCopy">' + icon.link + '<span>Copy link</span></button><button type="button" class="mv-send" id="mvSend">' + icon.share + '<span>Share</span></button>';
        wire(el, back);
    }

    function buildRepInputs() {
        $('mvInputs').innerHTML =
            '<div class="mv-card"><div class="mv-sec-h"><div class="mv-sec-t"><span>Your metrics</span></div><div class="mv-hint" id="mvPer"></div></div>' +
                fieldRow('orders', true) + fieldRow('aov') + fieldRow('claims') +
                '<div class="mv-add" id="mvAdd"><button type="button" class="mv-add-btn" aria-expanded="false" aria-controls="mvAddBody">' + icon.right + '<span class="grow">Additional Inputs</span><span class="mv-add-sum num" id="mvAddSum"></span></button>' +
                    '<div class="mv-add-body" id="mvAddBody">' + fieldRow('cogs') + fieldRow('ship') + fieldRow('cs') + '</div></div></div>' +
            '<div class="mv-card"><div class="mv-sec-h"><div class="mv-sec-t"><span>Your</span><img class="mv-si-logo" alt="ShipInsure"><span>Inputs</span></div><div class="mv-hint" id="mvTpl"></div></div>' +
                fieldRow('prem', true) + fieldRow('attach') + fieldRow('minPrem') + fieldRow('rs') +
                '<div class="mv-tog"><div>Rev share basis</div><div class="mv-seg" role="group" aria-label="Rev share basis"><button type="button" data-basis="net">Net (after claims)</button><button type="button" data-basis="gross">Gross</button></div></div>' +
                '<div class="mv-tog"><div>Claim resolution</div><div class="mv-seg" role="group" aria-label="Claim resolution"><button type="button" data-res="2ndsale">Reship = 2nd Sale</button><button type="button" data-res="cogs">Reship @ COGS</button></div></div></div>';
    }

    // Merchant inputs are rebuilt only when the set of visible fields changes (keeps focus/caret).
    let mSig = '';
    function buildMerchantInputs() {
        const secs = mSections();
        const sig = secs.map(s => s.k + ':' + s.fields.map(f => f.querySelector('input').id).join(',') + '|' + s.add.map(f => f.querySelector('input').id).join(',') + '|' + (s.title || '')).join(';');
        if (sig === mSig) return secs;
        mSig = sig;
        const addOpen = $('mvAdd') && $('mvAdd').classList.contains('open');
        $('mvInputs').innerHTML = secs.map(s => {
            const head = '<div class="mv-sec-h"><div class="mv-sec-t">' + (s.logo ? '<span>Your</span><img class="mv-si-logo" alt="ShipInsure"><span>Inputs</span>' : '<span>' + esc(s.title) + '</span>') + '</div><div class="mv-hint" data-hint="' + s.k + '"></div></div>';
            const rows = s.fields.map((f, i) => fieldRow(f.querySelector('input').id, i === 0)).join('');
            const add = s.add.length ? '<div class="mv-add' + (addOpen ? ' open' : '') + '" id="mvAdd"><button type="button" class="mv-add-btn" aria-expanded="' + !!addOpen + '" aria-controls="mvAddBody">' + icon.right + '<span class="grow" id="mvAddTitle">Additional Inputs</span><span class="mv-add-sum num" id="mvAddSum"></span></button>' +
                '<div class="mv-add-body" id="mvAddBody">' + s.add.map(f => fieldRow(f.querySelector('input').id)).join('') + '</div></div>' : '';
            return '<div class="mv-card" data-sec="' + s.k + '">' + head + rows + add + '</div>';
        }).join('');
        return secs;
    }

    // ── Push a value into the real input the way typing would (its listeners recalc) ─────────
    function push(key, value) {
        const id = HOST === 'rep' ? REP_FIELDS[key][0] : key;
        const inp = $(id); if (!inp) return;
        inp.value = value;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        if (HOST === 'rep' && typeof calculate === 'function') calculate();
        if (HOST === 'merchant' && typeof calculateProposal === 'function' && !$('inputsSection').contains(inp)) calculateProposal();
    }
    const fmtStep = (key, v) => (HOST === 'rep' ? key === 'orders' : M_GROUPED.includes(key) && Math.abs(v) >= 1000) ? Math.round(v).toLocaleString('en-US') : String(+v.toFixed(2));

    function wire(el, back) {
        el.addEventListener('input', e => { const r = e.target.closest('.mv-row'); if (r && e.target.tagName === 'INPUT' && !r.classList.contains('locked')) push(r.dataset.k, e.target.value); });
        el.addEventListener('click', e => {
            const r = e.target.closest('.mv-row'), step = e.target.closest('[data-inc],[data-dec]');
            if (r && step) {
                const id = HOST === 'rep' ? REP_FIELDS[r.dataset.k][0] : r.dataset.k;
                let by = HOST === 'rep' ? REP_FIELDS[r.dataset.k][1] : (M_STEP[id] || 1);
                const max = HOST === 'rep' ? REP_FIELDS[r.dataset.k][2] : 1e9;
                const cur = num(($(id) || {}).value);
                if (HOST === 'merchant' && cur >= 20000 && by < cur / 40) by = Math.pow(10, Math.floor(Math.log10(cur / 20)));   // big counts: sensible steps
                const v = Math.min(max, Math.max(0, cur + (step.hasAttribute('data-inc') ? by : -by)));
                push(r.dataset.k, fmtStep(r.dataset.k, v));
                return;
            }
            const unit = e.target.closest('.mv-unitbtn');
            if (unit && r) {   // cycle %/# or %/$ on the real field
                const fg = $(r.dataset.k).closest('.field-group'), btns = [...fg.querySelectorAll('.itype-btn')];
                const i = btns.findIndex(b => b.classList.contains('active')), nx = btns[(i + 1) % btns.length];
                if (nx) { nx.click(); if (typeof calculateProposal === 'function') calculateProposal(); }
                return;
            }
            const per = e.target.closest('[data-period]');
            if (per) { setPeriod(per.dataset.period); return; }
            const basis = e.target.closest('[data-basis]');
            if (basis) { if ((basis.dataset.basis === 'gross') !== !!_grossRevShare) toggleGrossRevShare(); return; }
            const res = e.target.closest('[data-res]');
            if (res) { const s = $('claimResolution'); s.value = res.dataset.res; s.dispatchEvent(new Event('change')); calculate(); return; }
            if (e.target.closest('.mv-add-btn')) { const a = $('mvAdd'), o = a.classList.toggle('open'); a.querySelector('.mv-add-btn').setAttribute('aria-expanded', o); return; }
            if (e.target.closest('.mv-math-btn')) { const m = $('mvMath'), o = m.classList.toggle('open'); m.querySelector('.mv-math-btn').setAttribute('aria-expanded', o); if (o) refresh(); return; }
        });
        $('mvAdv').addEventListener('click', () => { full = true; apply(); window.scrollTo(0, 0); });
        back.addEventListener('click', () => { full = false; apply(); });
        if (HOST === 'rep') {
            $('mvCopy').addEventListener('click', () => generateProposalLink({ currentTarget: $('mvCopy') }));
            $('mvSend').addEventListener('click', async () => {
                const url = buildMerchantLink(), name = ($('merchantName') || {}).value || '';
                if (navigator.share) { try { await navigator.share({ title: 'ShipInsure proposal' + (name ? ' for ' + name : ''), url: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
                generateProposalLink({ currentTarget: $('mvSend') });
            });
        } else {
            const link = () => { try { return location.origin + location.pathname + '?' + siCollectProposalParams().toString() + (location.hash || ''); } catch (e) { return location.href; } };
            const flash = (btn, t) => { const s = btn.querySelector('span'), o = s.textContent; s.textContent = t; setTimeout(() => { s.textContent = o; }, 2000); };
            const copy = btn => navigator.clipboard.writeText(link()).then(() => flash(btn, 'Copied')).catch(() => prompt('Copy this link:', link()));
            $('mvCopy').addEventListener('click', () => copy($('mvCopy')));
            $('mvSend').addEventListener('click', async () => {
                const name = (Q.get('mname') || '').trim();
                if (navigator.share) { try { await navigator.share({ title: 'ShipInsure ROI' + (name ? ' for ' + name : ''), url: link() }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
                copy($('mvSend'));
            });
        }
        mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
    }

    function setPeriod(p) {
        if (HOST === 'rep') { const tf = $('timeframe'); if (tf.value !== p) { tf.value = p; tf.dispatchEvent(new Event('change')); } return; }
        const v = $('p-view'); if (v && v.value !== p) { v.value = p; if (typeof pSetView === 'function') pSetView(p); }
    }
    const isAnnual = () => HOST === 'rep' ? ($('timeframe') || {}).value === 'annual' : (($('p-view') || {}).value || window._urlView) === 'annual';

    function setRow(key, label, pre, suf, opts) {
        const r = document.querySelector('#mv .mv-row[data-k="' + key + '"]'); if (!r) return;
        opts = opts || {};
        r.querySelector('label').textContent = label;
        const preEl = r.querySelector('[data-pre]'), sufEl = r.querySelector('[data-suf]');
        preEl.textContent = pre || '';
        // A field with a %/#/$ switch gets a tappable unit (cycles the real switch).
        if (opts.alt && !opts.locked) sufEl.innerHTML = '<button type="button" class="mv-unitbtn" aria-label="Switch unit for ' + esc(label) + '">' + esc(suf || pre || '%') + '</button>';
        else sufEl.textContent = suf || '';
        if (opts.alt && !opts.locked && !suf) preEl.textContent = '';
        r.querySelector('[data-dec]').setAttribute('aria-label', 'Decrease ' + label);
        r.querySelector('[data-inc]').setAttribute('aria-label', 'Increase ' + label);
        r.classList.toggle('locked', !!opts.locked);
        const inp = r.querySelector('input'), src = $(HOST === 'rep' ? REP_FIELDS[key][0] : key);
        inp.readOnly = !!opts.locked;
        if (src && document.activeElement !== inp) inp.value = src.value;
    }

    // ── Theme + branding ───────────────────────────────────────────────────────────────────
    let bld = null;
    try { const raw = Q.get('bld'); if (raw) bld = JSON.parse(raw); } catch (e) {}
    function theme() {
        const mv = $('mv'), dark = document.body.classList.contains('theme-midnight');
        mv.classList.toggle('dark', dark);
        document.querySelectorAll('#mv .mv-si-logo').forEach(i => { i.src = dark ? 'mobile-si-logo-light.png' : 'mobile-si-logo-dark.png'; });
        const b = (bld && bld.branding) || {};
        // Custom Build accent → the design's primary colour (default theme only, like cb-layout.js).
        const a = !dark && /^#[0-9a-f]{3,8}$/i.test(b.accent || '') ? b.accent : '';
        ['--primary', '--heroBg', '--heroBorder', '--accent'].forEach(v => { if (a) mv.style.setProperty(v, a); else mv.style.removeProperty(v); });
        document.body.style.setProperty('--mvPrimary', a || '#4a5fc1');
        if (b.font || document.body.style.fontFamily) mv.style.setProperty('--mvFont', document.body.style.fontFamily || ("'" + b.font + "', system-ui, sans-serif"));
    }

    // ════════════════════════════════════════════════════════════════════════════════════════
    //  Refresh — rep
    // ════════════════════════════════════════════════════════════════════════════════════════
    function refreshRep() {
        if (typeof _bd === 'undefined' || !_bd.ready) return;
        const d = _bd, cur = curSym(), annual = isAnnual();
        const fc = v => formatCurrency(v), fcc = v => formatCurrencyWithCents(v);
        const count = v => Math.round(v || 0).toLocaleString('en-US');
        const short = v => { const a = Math.abs(v || 0), s = (v < 0 ? '-' : '') + cur; return a >= 1e6 ? s + (a / 1e6).toFixed(1) + 'M' : a >= 1e4 ? s + (a / 1e3).toFixed(1) + 'k' : fc(v || 0); };
        const merchant = (($('merchantName') || {}).value || '').trim();
        $('mvTitle').textContent = 'ROI Builder';
        $('mvSub').textContent = (merchant || 'No merchant name') + ' · ' + (($('calcType') || {}).value === 'comp' ? 'Competitor' : 'Core');
        $('mvBig').textContent = ($('extraRevenue') || {}).textContent || fc(d.extraRevenue);
        $('mvUnit').textContent = annual ? '/ yr' : '/ mo';
        $('mvKeep').textContent = (($('percentOfPremiums') || {}).textContent || '0%') + ' kept';
        $('mvHeroSub').textContent = 'Claims Funded + Revenue Share';
        const funded = (d.siFundedReships || 0) + (d.returnsEnabled ? (d.totalReturnsOffset || 0) : 0);
        $('mvChips').innerHTML = [[count(d.protectedOrders), 'Protected orders'], [short(funded), d.returnsEnabled ? 'Total funded' : 'Claims funded'], [short(d.revenueShareAmount), 'Revenue share']]
            .map(c => '<div class="mv-chip"><b class="num">' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>').join('');
        $('mvPer').textContent = annual ? 'annual' : 'monthly';
        setRow('orders', annual ? 'Annual orders' : 'Monthly orders');
        setRow('aov', 'AOV', cur);
        setRow('claims', active('claimsCountBtn') ? 'Claims' : 'Claims rate', '', active('claimsCountBtn') ? '#' : '%');
        setRow('cogs', 'Product cost', active('cogsFlatBtn') ? cur : '', active('cogsFlatBtn') ? '' : '%');
        setRow('ship', 'Avg shipping', cur);
        setRow('cs', 'Avg ticket cost', cur);
        const dollarPrem = active('premiumDollarBtn');
        setRow('prem', 'SI premium', dollarPrem ? cur : '', dollarPrem ? '' : '%');
        setRow('attach', 'Attach rate', '', '%');
        setRow('minPrem', 'Min premium', cur);
        setRow('rs', d.grossRevShare ? 'Rev share (gross)' : 'Rev share', '', '%');
        $('mvAddSum').textContent = num($('cogsPercent').value) + (active('cogsFlatBtn') ? '' : '%') + ' · ' + cur + num($('avgShipping').value) + ' · ' + cur + num($('csCostPerClaim').value);
        const tpl = $('pricingTemplate'); $('mvTpl').textContent = tpl && tpl.selectedOptions[0] ? tpl.selectedOptions[0].textContent.replace(/\s+/g, ' ').trim() : '';
        document.querySelectorAll('#mv [data-basis]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.basis === 'gross') === !!d.grossRevShare)));
        const resV = ($('claimResolution') || {}).value || '2ndsale';
        document.querySelectorAll('#mv [data-res]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.res === resV)));
        // Show the math — the design's equation rows for the plain protection case; every other
        // mode (returns, Full / Hybrid coverage, $ premiums) mirrors the calc's own breakdown rows.
        const simple = !d.returnsEnabled && d.coverageType !== 'full' && d.coverageType !== 'hybrid' && !dollarPrem;
        if (!simple && $('mvMath').classList.contains('open') && typeof renderBreakdown === 'function') { try { renderBreakdown(); } catch (e) {} }
        const premPct = num($('protectionPremium').value), rsPct = num($('revenueShare').value), minP = num($('minPremium').value);
        const post = d.postClaimBalance || 0;
        $('mvRows').innerHTML = simple ? mathRows([
            { label: 'Avg premium', val: fcc(d.avgPremium), eq: (tpl.value === 'percentage' || /^p_/.test(tpl.value)) ? 'max(' + fc(d.aov) + ' × ' + premPct + '%, ' + fcc(minP) + ')' : '' },
            { label: 'Premiums', val: fc(d.premiumPool), eq: count(d.protectedOrders) + ' protected orders × ' + fcc(d.avgPremium) },
            { label: 'Claims Funded', val: fc(funded), good: true, eq: count(d.protectedClaims) + ' claims × ' + fcc(d.siClaimValue) + (resV === 'cogs' ? ' reship' : ' (2nd sale)') },
            { label: 'Post-Claim Balance', val: fc(post), eq: fc(d.premiumPool) + ' − ' + fc(d.siFundedReships) },
            { label: 'Revenue Share', val: fc(d.revenueShareAmount), good: true, eq: (d.grossRevShare ? fc(d.premiumPool) + ' gross' : fc(Math.max(0, post)) + ' net') + ' × ' + rsPct + '%' },
            { label: 'Extra Revenue', val: $('mvBig').textContent, good: true, total: true, eq: 'Claims Funded + Revenue Share · ' + $('mvKeep').textContent.replace(' kept', '') + ' of premiums' },
        ]) : mathRows(bdRows('bd-revenue'));
        $('mvCost').textContent = ($('lostRevenue') || {}).textContent || ('-' + fc(d.totalLost));
        $('mvCostEq').textContent = simple ? count(d.totalClaims) + ' claims × ' + fcc(d.costPerReship) + ' (COGS + ship + CS)' : '';
    }

    // ════════════════════════════════════════════════════════════════════════════════════════
    //  Refresh — merchant (mirrors whatever the merchant view currently shows)
    // ════════════════════════════════════════════════════════════════════════════════════════
    function refreshMerchant() {
        const ready = typeof _p_bd !== 'undefined' && _p_bd && _p_bd.ready;
        const d = ready ? _p_bd : {};
        const cur = curSym(), annual = isAnnual();
        const fc = v => (typeof fmtDollar === 'function' ? fmtDollar(v) : cur + Math.round(v).toLocaleString('en-US'));
        const short = v => { const a = Math.abs(v || 0), s = (v < 0 ? '-' : '') + cur; return a >= 1e6 ? s + (a / 1e6).toFixed(1) + 'M' : a >= 1e4 ? s + (a / 1e3).toFixed(1) + 'k' : fc(v || 0); };
        const count = v => Math.round(v || 0).toLocaleString('en-US');
        const locked = typeof p_locked !== 'undefined' && p_locked;

        // Header: merchant logo + name (Custom Build branding / cloud logo), else the ShipInsure lock.
        const lg = document.querySelector('.header-logo-new'), lock = $('mvLock');
        const custom = lg && lg.style.display !== 'none' && lg.src && !/proposalview_logo|roi-logo\.png/.test(lg.src);
        if (custom) { if (!lock.querySelector('img') || lock.querySelector('img').src !== lg.src) lock.innerHTML = '<img alt="" src="' + esc(lg.src) + '">'; lock.classList.add('has-logo'); }
        else if (lock.classList.contains('has-logo') || !lock.querySelector('svg')) { lock.innerHTML = icon.lock; lock.classList.remove('has-logo'); }
        const hideName = !!(bld && bld.branding && bld.branding.hideName);
        const mname = (Q.get('mname') || '').trim();
        $('mvTitle').textContent = (!hideName && mname) ? mname : 'ROI Impact';
        $('mvSub').textContent = 'with ShipInsure · ' + (annual ? 'Annual' : 'Monthly');

        // Coverage options (?ids= compare links) → a pill row.
        const tabs = [...document.querySelectorAll('#siOptionsBar .si-opt-tab')];
        $('mvOpts').hidden = tabs.length < 2;
        if (tabs.length > 1) {
            const keep = (href) => { try { const u = new URL(href, location.href); if (forced()) u.searchParams.set('disp', 'mobile'); return u.pathname + u.search + u.hash; } catch (e) { return href; } };
            $('mvOpts').innerHTML = tabs.map(t => '<a class="' + (t.classList.contains('active') ? 'active' : '') + '" href="' + esc(keep(t.getAttribute('href'))) + '">' + esc(txt(t)) + '</a>').join('');
        }

        // Inputs (rebuilt only when the visible set changes)
        const secs = buildMerchantInputs();
        theme();
        secs.forEach(s => {
            [...s.fields, ...s.add].forEach(fg => {
                const inp = fg.querySelector('input'), u = mUnits(fg, inp);
                setRow(inp.id, mFieldLabel(fg, inp), u.pre, u.suf, { alt: u.alt, locked });
            });
            const h = document.querySelector('#mv [data-hint="' + s.k + '"]');
            if (h) h.textContent = s.k === 'metrics' ? (annual ? 'annual' : 'monthly') : s.k === 'si' ? (() => { const t = $('p-template'); return t && t.selectedOptions[0] ? txt(t.selectedOptions[0]) : ''; })() : '';
            if (s.add.length && $('mvAddSum')) {
                $('mvAddSum').textContent = s.add.map(fg => { const inp = fg.querySelector('input'), u = mUnits(fg, inp); return (u.pre || '') + num(inp.value) + (u.suf || ''); }).join(' · ');
                const sum = document.querySelector('#additionalInputsDetails > summary'); if (sum && $('mvAddTitle')) $('mvAddTitle').textContent = txt(sum) || 'Additional Inputs';
            }
        });
        document.querySelectorAll('#mv [data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === (annual ? 'annual' : 'monthly'))));

        if (!ready) {   // nothing entered yet
            $('mvHeroLbl').textContent = 'Extra Revenue With ShipInsure';
            $('mvBig').textContent = '—'; $('mvUnit').textContent = ''; $('mvKeep').textContent = ''; $('mvChips').innerHTML = '';
            $('mvHeroSub').textContent = 'Enter your orders, AOV and claims rate to see your numbers';
            $('mvResults').hidden = true; $('mvMath').hidden = true;
            return;
        }
        $('mvMath').hidden = false;
        const cov = d.coverageType || 'standard';

        // Hero — the Extra Revenue card's headline (mode-aware: hours for Full, net for Hybrid).
        $('mvHeroLbl').textContent = txt($('p-erLabel')) || 'Extra Revenue With ShipInsure';
        let big = cov === 'standard' ? fc(d.extraRevenue || 0) : txt($('r-extraRevenue'));
        if (cov === 'hybrid' && !big) big = fc(d.hybridNetValue || 0);
        $('mvBig').textContent = big || fc(d.extraRevenue || 0);
        $('mvUnit').textContent = cov === 'full' ? '' : (annual ? '/ yr' : '/ mo');
        const sub = txt(document.querySelector('#p-erBody .er-value-sub'));
        $('mvHeroSub').textContent = sub.replace(/^\(|\)$/g, '') || (cov === 'standard' ? 'Claims Funded + Revenue Share' : '');
        const heroV = txt($('heroValue')), heroL = txt($('heroLabel'));
        $('mvKeep').textContent = /%/.test(heroV) && /keep/i.test(heroL) ? heroV.match(/[\d.,]+%/)[0] + ' kept' : '';
        const chips = cov === 'full'
            ? [[count(d.deflectedTickets), 'Tickets deflected'], [short(d.coveredClaimLossAvoided), 'Claim costs covered'], [short(d.csLaborSaved), 'CS labor saved']]
            : cov === 'hybrid'
                ? [[count(d.optInOrders), 'Opt-in orders'], [short(d.hybOptInClaimsFunded), 'Claims funded'], [short(d.revShareEarnedOptIn), 'Rev share']]
                : [[count(d.protectedOrders), 'Protected orders'], [short((d.extraRevenue || 0) - (d.revenueShareAmount || 0)), d.returnsEnabled || d.cashbackEnabled ? 'Total funded' : 'Claims funded'], [short(d.revenueShareAmount), 'Revenue share']];
        $('mvChips').innerHTML = chips.map(c => '<div class="mv-chip"><b class="num">' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>').join('');

        // Results card — the page's output-strip pills (Custom Build pill hide / order / labels
        // carry over), then the Extra Revenue card's lines and the Current Cost card.
        const pills = [...document.querySelectorAll('.key-metrics .key-metric-pill')].filter(shown).sort(byPosition).map(p => {
            const lbl = txt(p.querySelector('.kmp-label'));
            // Pair pills (Volume, SI Funded) carry key · value pairs; the rest a single value + sub line.
            const pairs = [...p.querySelectorAll('.kmp-pair')].filter(shown).map(pr => [txt(pr.querySelector('.kmp-pk')).replace(/\s*[→›»:]+\s*$/, ''), txt(pr.querySelector('.kmp-pv'))]);
            if (pairs.length && !(p.querySelector('.kmp-value') && shown(p.querySelector('.kmp-value'))))
                return lbl ? '<div class="mv-tile"><span>' + esc(lbl + (pairs[0][0] ? ' · ' + pairs[0][0] : '')) + '</span><b class="num">' + esc(pairs[0][1]) + '</b>' + pairs.slice(1).map(x => '<i>' + esc(x[0] + ' ' + x[1]) + '</i>').join('') + '</div>' : '';
            const vEl = [...p.querySelectorAll('.kmp-value')].find(shown);
            const subEl = [...p.querySelectorAll('.kmp-sub')].find(shown);
            return vEl && lbl ? '<div class="mv-tile"><span>' + esc(lbl) + '</span><b class="num">' + esc(txt(vEl)) + '</b>' + (subEl ? '<i>' + esc(txt(subEl)) + '</i>' : '') + '</div>' : '';
        }).join('');
        const lines = [];
        const erBody = $('p-erBody');
        if (erBody && shown(erBody)) {
            erBody.querySelectorAll('.er-line, .er-revshare, .er-funded-head, :scope > div[style]').forEach(n => {
                if (n.classList.contains('er-funded-head')) { lines.push('<div class="mv-line head"><span>' + esc(txt(n.querySelector('.er-fh-lbl'))) + '</span><span class="num">' + esc(txt(n.querySelector('.er-fh-total')).replace(/^TOTAL\s*=\s*/i, '')) + '</span></div>'); return; }
                if (!n.classList.contains('er-line') && !n.classList.contains('er-revshare')) { lines.push('<div class="mv-line note">' + esc(txt(n)) + '</div>'); return; }
                const k = n.querySelector('.er-k'), v = n.querySelector('.er-v');
                const kt = k ? txt(k.cloneNode(true).childNodes[0] || k) : '';
                lines.push('<div class="mv-line"><span>' + esc(kt || txt(k)) + '</span><span class="num"' + (v && v.style.color ? ' style="color:' + esc(v.style.color) + '"' : '') + '>' + esc(txt(v)) + '</span></div>');
            });
        }
        const upf = $('p-upfrontHero');
        const upfront = upf && shown(upf) ? '<div class="mv-line big first"><span>' + esc(txt(upf.querySelector('.hero-label'))) + '</span><span class="num">' + esc(txt($('p-upfrontValue'))) + '</span></div>' + (txt($('p-upfrontSub')) ? '<div class="mv-line note" style="padding-top:0">' + esc(txt($('p-upfrontSub'))) + '</div>' : '') : '';
        const costCard = $('costCard');
        const cost = costCard && shown(costCard) ? '<div class="mv-cost"><div class="mv-mrow-top"><div>' + esc(txt(costCard.querySelector('.rc-label')) || 'Current Cost of Claims') + '</div><div class="num" style="color:var(--cost)">' + esc(txt($('r-lostRevenue'))) + '</div></div></div>' : '';
        if (lines.length) lines[0] = lines[0].replace('class="mv-line', 'class="mv-line first');
        $('mvResults').innerHTML = (pills ? '<div class="mv-sec-h"><div class="mv-sec-t"><span>Your results</span></div><div class="mv-hint">' + (annual ? 'annual' : 'monthly') + '</div></div><div class="mv-tiles">' + pills + '</div>' : '') +
            (upfront ? '<div class="mv-sec-h"><div class="mv-sec-t"><span>Upfront payment</span></div></div>' + upfront : '') +
            (lines.length ? '<div class="mv-sec-h"><div class="mv-sec-t"><span>' + esc(txt($('p-erLabel')) || 'With ShipInsure') + '</span></div></div>' + lines.join('') : '') + cost;
        $('mvResults').hidden = !(pills || lines.length || cost || upfront);

        // Show the math — the merchant view's own Calculation Breakdown (hidden there → hidden here).
        const bd = $('p-calcBreakdown');
        $('mvMath').hidden = !!(bd && bd.closest('[data-cbx-hide],[data-cbx-off]'));
        if ($('mvMath').classList.contains('open') && typeof renderPBreakdown === 'function') { try { renderPBreakdown(); } catch (e) {} }
        const rev = bdRows('p-bd-revenue');
        $('mvRows').innerHTML = rev.length ? '<div class="mv-mgrp">With ShipInsure</div>' + mathRows(rev) : '';
        const costRows = bdRows('p-bd-cost');
        $('mvCostBox').hidden = !costRows.length;
        if (costRows.length) {
            const last = costRows[costRows.length - 1];
            $('mvCostLbl').innerHTML = esc(last.label || 'Current Cost of Claims') + ' <i>(without ShipInsure)</i>';
            $('mvCost').textContent = last.val;
            $('mvCostEq').textContent = costRows.slice(0, -1).map(r => r.label + ' ' + r.val).join(' · ');
        }
        // Copy Link hidden in Custom Build → no share bar here either.
        const cl = $('p-save-link-btn');
        $('mvBar').hidden = !!(cl && cl.closest('[data-cbx-hide],[data-cbx-off]'));
    }

    const observers = [];
    function refresh() {
        if (!$('mv') || !document.body.classList.contains('mv-on')) return;
        theme();
        try { if (HOST === 'rep') refreshRep(); else refreshMerchant(); }
        finally { observers.forEach(o => o.takeRecords()); }   // ignore changes we just caused (breakdown re-render)
    }

    let raf = 0;
    const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; refresh(); }); };

    function apply() {
        if (!$('mv')) return;
        const want = wanted();
        const on = want && !full;
        document.body.classList.toggle('mv-on', on);
        document.body.classList.toggle('mv-full', want && full);
        if (on) { mSig = ''; refresh(); }
    }

    window.mvRefresh = schedule;
    window.mvApply = apply;

    const start = () => {
        build();
        // Re-mirror whenever the page underneath changes: recalcs, view switches, Custom Build
        // live edits (SICB.apply rewrites styles in <head>), theme changes.
        const root = document.querySelector(HOST === 'rep' ? '.container' : '.proposal-layout') || document.body;
        const watch = (node, opts) => { const o = new MutationObserver(schedule); o.observe(node, opts); observers.push(o); };
        watch(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'data-cbx-hide', 'data-cbx-off'] });
        watch(document.head, { childList: true, subtree: true, characterData: true });
        watch(document.body, { attributes: true, attributeFilter: ['class'] });
        apply();
        setTimeout(apply, 400);   // after the page's own async load (cloud ?id= links, fonts)
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
