/* ROI Builder · Mobile — phone layout for the rep calculator (index.html).
 *
 * A full-screen layer over the desktop calc that DRIVES the real inputs (same ids) and
 * reads the real results (_bd + the result cards), so every number matches desktop.
 * Shown automatically on a phone-width standalone page (not when embedded in the Rep
 * Hub); ?mobile=1 forces it on, ?mobile=0 off. "Advanced" opens the full calculator
 * with a floating "Mobile view" pill to come back. Midnight theme follows body.theme-midnight.
 */
(function () {
    const Q = new URLSearchParams(location.search);
    const embedded = window.top !== window;
    const mq = window.matchMedia('(max-width: 600px)');
    const $ = id => document.getElementById(id);
    let full = false; // rep opened the full calculator from "Advanced"
    const wanted = () => Q.get('mobile') === '1' || (Q.get('mobile') !== '0' && !embedded && mq.matches);

    const css = `
    #mv { position:fixed; inset:0; z-index:9000; display:none; flex-direction:column; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased;
        --bg:#f5f6fb; --card:#fff; --text:#1b1f3b; --sub:#5f6670; --border:#e3e6f3; --field:#f5f6fb; --primary:#4a5fc1; --primaryText:#fff;
        --heroBg:#4a5fc1; --heroBorder:#4a5fc1; --heroText:#fff; --heroSub:#e1e5ff; --chipBg:rgba(255,255,255,.14); --chipVal:#fff; --accent:#4a5fc1;
        --good:#1f7a4d; --cost:#b4441f; --costBg:#fdf1ec; --addBg:#eef0fb; --addBorder:#c5caeb; background:var(--bg); color:var(--text); }
    #mv.dark { --bg:#12131a; --card:#1b1c26; --text:#efe7cf; --sub:#a9a493; --border:#2c2e3d; --field:#14151d; --primary:#e9c46a; --primaryText:#14151d;
        --heroBg:#14151d; --heroBorder:#e9c46a; --heroText:#efe7cf; --heroSub:#cfc8b0; --chipBg:#1f202b; --chipVal:#2ee6a0; --accent:#e9c46a;
        --good:#2ee6a0; --cost:#f0a07a; --costBg:#241c1c; --addBg:#1f202b; --addBorder:#4a4636; }
    body.mv-on #mv { display:flex; }
    body.mv-on { overflow:hidden; }
    #mv * { box-sizing:border-box; }
    #mv .num { font-variant-numeric:tabular-nums; }
    #mv button { font:inherit; cursor:pointer; }
    #mv input:focus { outline:2px solid #6675ff; outline-offset:1px; }
    #mv button:focus-visible { outline:2px solid #6675ff; outline-offset:2px; }
    #mv .mv-top { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:calc(16px + env(safe-area-inset-top)) 16px 12px; }
    #mv .mv-brand { display:flex; align-items:center; gap:10px; min-width:0; }
    #mv .mv-lock { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--primary); color:var(--primaryText); flex-shrink:0; }
    #mv .mv-title { font-size:17px; font-weight:700; letter-spacing:-.01em; }
    #mv .mv-subt { font-size:12px; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #mv .mv-seg { display:flex; padding:3px; border-radius:12px; background:var(--field); border:1px solid var(--border); }
    #mv .mv-seg button { min-width:48px; min-height:36px; border:0; border-radius:9px; font-size:14px; font-weight:700; background:transparent; color:var(--sub); padding:0 8px; }
    #mv .mv-seg button[aria-pressed="true"] { background:var(--primary); color:var(--primaryText); }
    #mv .mv-hero { margin:0 16px; padding:16px 16px 14px; border-radius:20px; background:var(--heroBg); border:1px solid var(--heroBorder); color:var(--heroText); }
    #mv .mv-hero-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    #mv .mv-hero-lbl { font-size:13px; font-weight:600; color:var(--heroSub); }
    #mv .mv-keep { font-size:12px; font-weight:700; padding:4px 8px; border-radius:999px; background:var(--chipBg); color:var(--chipVal); }
    #mv .mv-hero-val { display:flex; align-items:baseline; gap:8px; margin-top:4px; }
    #mv .mv-big { font-size:42px; font-weight:800; letter-spacing:-.03em; line-height:1.05; }
    #mv .mv-unit { font-size:15px; font-weight:600; color:var(--heroSub); }
    #mv .mv-hero-sub { font-size:12px; margin-top:2px; color:var(--heroSub); }
    #mv .mv-chips { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:12px; }
    #mv .mv-chip { padding:9px 10px; border-radius:12px; background:var(--chipBg); display:flex; flex-direction:column; gap:2px; min-width:0; }
    #mv .mv-chip b { font-size:16px; font-weight:700; color:var(--chipVal); }
    #mv .mv-chip span { font-size:11px; line-height:1.25; color:var(--heroSub); }
    #mv .mv-scroll { flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:16px 16px 24px; display:flex; flex-direction:column; gap:16px; scrollbar-width:none; }
    #mv .mv-scroll::-webkit-scrollbar { display:none; }
    #mv .mv-scroll > * { flex-shrink:0; }
    #mv .mv-card { border-radius:18px; background:var(--card); border:1px solid var(--border); padding:6px 14px; }
    #mv .mv-sec-h { display:flex; align-items:center; justify-content:space-between; padding:10px 0 4px; }
    #mv .mv-sec-t { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--accent); }
    #mv .mv-sec-t img { height:17px; width:auto; display:block; }
    #mv .mv-hint { font-size:12px; color:var(--sub); }
    #mv .mv-row { display:flex; align-items:center; gap:10px; min-height:60px; padding:8px 0; border-top:1px solid var(--border); }
    #mv .mv-row.first { border-top:0; }
    #mv .mv-row label { flex:1 1 auto; min-width:0; font-size:15px; font-weight:500; line-height:1.25; }
    #mv .mv-ctl { display:flex; align-items:center; gap:6px; flex-shrink:0; }
    #mv .mv-step { width:44px; height:44px; flex-shrink:0; border-radius:12px; border:1px solid var(--border); background:var(--field); color:var(--text); display:flex; align-items:center; justify-content:center; padding:0; }
    #mv .mv-box { width:92px; height:44px; display:flex; align-items:center; gap:2px; padding:0 10px; border-radius:12px; border:1px solid var(--border); background:var(--card); }
    #mv .mv-box span { font-size:14px; color:var(--sub); }
    #mv .mv-box input { flex:1 1 auto; min-width:0; width:100%; border:0; background:transparent; color:var(--text); font:inherit; font-size:16px; font-weight:700; text-align:right; padding:0; }
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
    #mv .mv-math { border-radius:18px; background:var(--card); border:1px solid var(--border); overflow:hidden; }
    #mv .mv-math-btn { width:100%; min-height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; background:transparent; border:0; color:var(--text); font-size:15px; font-weight:600; }
    #mv .mv-math-btn svg { transition:transform .2s; }
    #mv .mv-math.open .mv-math-btn svg { transform:rotate(180deg); }
    #mv .mv-math-body { display:none; padding:0 14px 12px; }
    #mv .mv-math.open .mv-math-body { display:block; }
    #mv .mv-mrow { padding:12px 0; border-top:1px solid var(--border); }
    #mv .mv-mrow:first-child { border-top:0; }
    #mv .mv-mrow.total { border-top:2px solid var(--text); }
    #mv .mv-mrow-top { display:flex; justify-content:space-between; gap:12px; align-items:baseline; }
    #mv .mv-mrow-top div:first-child { font-size:14px; font-weight:600; }
    #mv .mv-mrow-top div:last-child { font-size:15px; font-weight:700; }
    #mv .mv-eq { font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:12px; margin-top:3px; color:var(--sub); }
    #mv .mv-cost { margin-top:8px; padding:12px; border-radius:12px; background:var(--costBg); }
    #mv .mv-cost i { font-weight:400; color:var(--sub); }
    #mv .mv-adv { min-height:48px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 14px; border-radius:14px; background:transparent; border:1px dashed var(--border); color:var(--sub); font-size:14px; text-align:left; }
    #mv .mv-adv svg { flex-shrink:0; }
    #mv .mv-bar { display:flex; gap:10px; padding:12px 16px calc(16px + env(safe-area-inset-bottom)); background:var(--bg); border-top:1px solid var(--border); }
    #mv .mv-bar button { min-height:50px; border-radius:14px; font-size:15px; display:flex; align-items:center; justify-content:center; gap:8px; }
    #mv .mv-copy { flex:1 1 0; border:1px solid var(--border); background:var(--card); color:var(--text); font-weight:600; }
    #mv .mv-send { flex:1.4 1 0; border:0; background:var(--primary); color:var(--primaryText); font-weight:700; }
    #mvBack { position:fixed; right:14px; bottom:calc(16px + env(safe-area-inset-bottom)); z-index:9001; display:none; border:0; border-radius:999px; padding:12px 16px; font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#4a5fc1; color:#fff; box-shadow:0 8px 24px rgba(0,0,0,.25); cursor:pointer; }
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
    };

    // Each mobile field drives one real calc input. [key, input id, step, max]
    const FIELDS = {
        orders: ['annualOrders', 500, 1e9], aov: ['avgOrderValue', 5, 1e6], claims: ['claimsRate', 0.5, 100],
        cogs: ['cogsPercent', 1, 1e5], ship: ['avgShipping', 1, 1e4], cs: ['csCostPerClaim', 1, 1e3],
        prem: ['protectionPremium', 0.25, 1e3], attach: ['attachRate', 1, 100], minPrem: ['minPremium', 0.25, 100], rs: ['revenueShare', 5, 100],
    };
    const num = v => { const n = parseFloat(String(v || '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
    const curSym = () => { try { return formatCurrency(0).replace(/[\d.,\s]/g, '') || '$'; } catch (e) { return '$'; } };
    const active = id => { const b = $(id); return !!(b && b.classList.contains('active')); };
    const fieldRow = (key, first) => '<div class="mv-row' + (first ? ' first' : '') + '" data-k="' + key + '"><label for="mv-' + key + '"></label><div class="mv-ctl">' +
        '<button type="button" class="mv-step" data-dec aria-label="Decrease">' + icon.minus + '</button>' +
        '<div class="mv-box"><span data-pre></span><input id="mv-' + key + '" type="text" inputmode="decimal" class="num"><span data-suf></span></div>' +
        '<button type="button" class="mv-step" data-inc aria-label="Increase">' + icon.plus + '</button></div></div>';

    function build() {
        const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        const el = document.createElement('div'); el.id = 'mv';
        el.innerHTML =
            '<div class="mv-top"><div class="mv-brand"><div class="mv-lock">' + icon.lock + '</div><div style="display:flex;flex-direction:column;min-width:0">' +
                '<div class="mv-title">ROI Builder</div><div class="mv-subt" id="mvSub"></div></div></div>' +
                '<div class="mv-seg" role="group" aria-label="View"><button type="button" data-period="monthly">Mo</button><button type="button" data-period="annual">Yr</button></div></div>' +
            '<div class="mv-hero"><div class="mv-hero-top"><div class="mv-hero-lbl" id="mvHeroLbl">Extra Revenue With ShipInsure</div><div class="mv-keep num" id="mvKeep"></div></div>' +
                '<div class="mv-hero-val"><div class="mv-big num" id="mvBig"></div><div class="mv-unit" id="mvUnit"></div></div>' +
                '<div class="mv-hero-sub">Claims Funded + Revenue Share</div>' +
                '<div class="mv-chips"><div class="mv-chip"><b class="num" id="mvC1"></b><span>Protected orders</span></div><div class="mv-chip"><b class="num" id="mvC2"></b><span id="mvC2l">Claims funded</span></div><div class="mv-chip"><b class="num" id="mvC3"></b><span>Revenue share</span></div></div></div>' +
            '<div class="mv-scroll">' +
                '<div class="mv-card"><div class="mv-sec-h"><div class="mv-sec-t"><span>Your metrics</span></div><div class="mv-hint" id="mvPer"></div></div>' +
                    fieldRow('orders', true) + fieldRow('aov') + fieldRow('claims') +
                    '<div class="mv-add" id="mvAdd"><button type="button" class="mv-add-btn" aria-expanded="false" aria-controls="mvAddBody">' + icon.right + '<span class="grow">Additional Inputs</span><span class="mv-add-sum num" id="mvAddSum"></span></button>' +
                        '<div class="mv-add-body" id="mvAddBody">' + fieldRow('cogs') + fieldRow('ship') + fieldRow('cs') + '</div></div></div>' +
                '<div class="mv-card"><div class="mv-sec-h"><div class="mv-sec-t"><span>Your</span><img id="mvLogo" alt="ShipInsure"><span>Inputs</span></div><div class="mv-hint" id="mvTpl"></div></div>' +
                    fieldRow('prem', true) + fieldRow('attach') + fieldRow('minPrem') + fieldRow('rs') +
                    '<div class="mv-tog"><div>Rev share basis</div><div class="mv-seg" role="group" aria-label="Rev share basis"><button type="button" data-basis="net">Net (after claims)</button><button type="button" data-basis="gross">Gross</button></div></div>' +
                    '<div class="mv-tog"><div>Claim resolution</div><div class="mv-seg" role="group" aria-label="Claim resolution"><button type="button" data-res="2ndsale">Reship = 2nd Sale</button><button type="button" data-res="cogs">Reship @ COGS</button></div></div></div>' +
                '<div class="mv-math open" id="mvMath"><button type="button" class="mv-math-btn" aria-expanded="true"><span>Show the math</span>' + icon.down + '</button><div class="mv-math-body"><div id="mvRows"></div>' +
                    '<div class="mv-cost"><div class="mv-mrow-top"><div>Current Cost of Claims <i>(without ShipInsure)</i></div><div class="num" style="color:var(--cost)" id="mvCost"></div></div><div class="mv-eq num" id="mvCostEq"></div></div></div></div>' +
                '<button type="button" class="mv-adv" id="mvAdv"><span>Advanced · Pricing model, min premium, returns, cashback, guarantee</span>' + icon.right16 + '</button>' +
            '</div>' +
            '<div class="mv-bar"><button type="button" class="mv-copy" id="mvCopy">' + icon.link + '<span>Copy link</span></button><button type="button" class="mv-send" id="mvSend">' + icon.send + '<span>Send proposal</span></button></div>';
        document.body.appendChild(el);
        const back = document.createElement('button'); back.id = 'mvBack'; back.type = 'button'; back.textContent = '📱 Mobile view';
        document.body.appendChild(back);
        wire(el, back);
    }

    // Push a value into the real input the way typing would (its listeners recalc).
    function push(key, value) {
        const inp = $(FIELDS[key][0]); if (!inp) return;
        inp.value = value;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof calculate === 'function') calculate();
    }

    function wire(el, back) {
        el.addEventListener('input', e => { const r = e.target.closest('.mv-row'); if (r && e.target.tagName === 'INPUT') push(r.dataset.k, e.target.value); });
        el.addEventListener('click', e => {
            const r = e.target.closest('.mv-row'), step = e.target.closest('[data-inc],[data-dec]');
            if (r && step) {
                const [id, by, max] = FIELDS[r.dataset.k], cur = num($(id).value);
                let v = Math.min(max, Math.max(0, cur + (step.hasAttribute('data-inc') ? by : -by)));
                v = +v.toFixed(2);
                push(r.dataset.k, r.dataset.k === 'orders' ? Math.round(v).toLocaleString('en-US') : String(v));
                return;
            }
            const per = e.target.closest('[data-period]');
            if (per) { const tf = $('timeframe'); if (tf.value !== per.dataset.period) { tf.value = per.dataset.period; tf.dispatchEvent(new Event('change')); } return; }
            const basis = e.target.closest('[data-basis]');
            if (basis) { if ((basis.dataset.basis === 'gross') !== !!_grossRevShare) toggleGrossRevShare(); return; }
            const res = e.target.closest('[data-res]');
            if (res) { const s = $('claimResolution'); s.value = res.dataset.res; s.dispatchEvent(new Event('change')); calculate(); return; }
            if (e.target.closest('.mv-add-btn')) { const a = $('mvAdd'), o = a.classList.toggle('open'); a.querySelector('.mv-add-btn').setAttribute('aria-expanded', o); return; }
            if (e.target.closest('.mv-math-btn')) { const m = $('mvMath'), o = m.classList.toggle('open'); m.querySelector('.mv-math-btn').setAttribute('aria-expanded', o); return; }
        });
        $('mvAdv').addEventListener('click', () => { full = true; apply(); window.scrollTo(0, 0); });
        back.addEventListener('click', () => { full = false; apply(); });
        $('mvCopy').addEventListener('click', ev => {
            generateProposalLink({ currentTarget: $('mvCopy') });
        });
        $('mvSend').addEventListener('click', async () => {
            const url = buildMerchantLink(), name = ($('merchantName') || {}).value || '';
            if (navigator.share) { try { await navigator.share({ title: 'ShipInsure proposal' + (name ? ' for ' + name : ''), url: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
            generateProposalLink({ currentTarget: $('mvSend') });
        });
        mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
    }

    function setRow(key, label, pre, suf) {
        const r = document.querySelector('#mv .mv-row[data-k="' + key + '"]'); if (!r) return;
        r.querySelector('label').textContent = label;
        r.querySelector('[data-pre]').textContent = pre || '';
        r.querySelector('[data-suf]').textContent = suf || '';
        r.querySelector('[data-dec]').setAttribute('aria-label', 'Decrease ' + label);
        r.querySelector('[data-inc]').setAttribute('aria-label', 'Increase ' + label);
        const inp = r.querySelector('input'), src = $(FIELDS[key][0]);
        if (src && document.activeElement !== inp) inp.value = src.value;
    }

    function refresh() {
        if (!document.body.classList.contains('mv-on') || typeof _bd === 'undefined' || !_bd.ready) return;
        const d = _bd, cur = curSym(), annual = $('timeframe').value === 'annual';
        const fc = v => formatCurrency(v), fcc = v => formatCurrencyWithCents(v);
        const count = v => Math.round(v || 0).toLocaleString('en-US');
        const short = v => { const a = Math.abs(v || 0), s = (v < 0 ? '-' : '') + cur; return a >= 1e6 ? s + (a / 1e6).toFixed(1) + 'M' : a >= 1e4 ? s + (a / 1e3).toFixed(1) + 'k' : fc(v || 0); };
        const dark = document.body.classList.contains('theme-midnight');
        $('mv').classList.toggle('dark', dark);
        $('mvLogo').src = dark ? 'mobile-si-logo-light.png' : 'mobile-si-logo-dark.png';
        // Header
        const merchant = (($('merchantName') || {}).value || '').trim();
        $('mvSub').textContent = (merchant || 'No merchant name') + ' · ' + (($('calcType') || {}).value === 'comp' ? 'Competitor' : 'Core');
        document.querySelectorAll('#mv [data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === (annual ? 'annual' : 'monthly'))));
        // Hero — the same headline the desktop Extra Revenue card shows.
        $('mvBig').textContent = ($('extraRevenue') || {}).textContent || fc(d.extraRevenue);
        $('mvUnit').textContent = annual ? '/ yr' : '/ mo';
        $('mvKeep').textContent = (($('percentOfPremiums') || {}).textContent || '0%') + ' kept';
        $('mvC1').textContent = count(d.protectedOrders);
        const funded = (d.siFundedReships || 0) + (d.returnsEnabled ? (d.totalReturnsOffset || 0) : 0);
        $('mvC2').textContent = short(funded); $('mvC2l').textContent = d.returnsEnabled ? 'Total funded' : 'Claims funded';
        $('mvC3').textContent = short(d.revenueShareAmount);
        // Inputs (labels / units follow the desktop's % ↔ $ ↔ # switches).
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
        // Show the math — equations only for the plain protection case (returns / coverage
        // models / $ premiums use more terms; their values still match desktop).
        const simple = !d.returnsEnabled && d.coverageType !== 'full' && d.coverageType !== 'hybrid' && !dollarPrem;
        const premPct = num($('protectionPremium').value), rsPct = num($('revenueShare').value), minP = num($('minPremium').value);
        const post = d.postClaimBalance || 0;
        const rows = [
            ['Avg premium', fcc(d.avgPremium), '', simple && (tpl.value === 'percentage' || /^p_/.test(tpl.value)) ? 'max(' + fc(d.aov) + ' × ' + premPct + '%, ' + fcc(minP) + ')' : ''],
            ['Premiums', fc(d.premiumPool), '', simple ? count(d.protectedOrders) + ' protected orders × ' + fcc(d.avgPremium) : ''],
            [d.returnsEnabled ? 'Total Funded' : 'Claims Funded', fc(funded), 'good', simple ? count(d.protectedClaims) + ' claims × ' + fcc(d.siClaimValue) + (resV === 'cogs' ? ' reship' : ' (2nd sale)') : ''],
            ['Post-Claim Balance', fc(post), '', simple ? fc(d.premiumPool) + ' − ' + fc(d.siFundedReships) : ''],
            ['Revenue Share', fc(d.revenueShareAmount), 'good', simple ? (d.grossRevShare ? fc(d.premiumPool) + ' gross' : fc(Math.max(0, post)) + ' net') + ' × ' + rsPct + '%' : ''],
            ['Extra Revenue', $('mvBig').textContent, 'good', 'Claims Funded + Revenue Share · ' + $('mvKeep').textContent.replace(' kept', '') + ' of premiums', 'total'],
        ];
        $('mvRows').innerHTML = rows.map(r => '<div class="mv-mrow' + (r[4] ? ' total' : '') + '"><div class="mv-mrow-top"><div>' + r[0] + '</div><div class="num" style="color:' + (r[2] ? 'var(--good)' : 'var(--text)') + '">' + r[1] + '</div></div>' +
            (r[3] ? '<div class="mv-eq num">' + r[3] + '</div>' : '') + '</div>').join('');
        $('mvCost').textContent = ($('lostRevenue') || {}).textContent || ('-' + fc(d.totalLost));
        $('mvCostEq').textContent = simple ? count(d.totalClaims) + ' claims × ' + fcc(d.costPerReship) + ' (COGS + ship + CS)' : '';
    }

    function apply() {
        const on = wanted() && !full;
        document.body.classList.toggle('mv-on', on);
        document.body.classList.toggle('mv-full', wanted() && full);
        if (on) refresh();
    }

    window.mvRefresh = refresh;
    if (embedded && Q.get('mobile') !== '1') return; // the Rep Hub has its own sidebar UI
    const start = () => { build(); apply(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
