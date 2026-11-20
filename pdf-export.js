/* Merchant-view image (proposal.html) — exactly what the merchant sees, minus buttons and rep-only UI,
 * saved as one PNG cropped to the content ("{Merchant} – ShipInsure ROI.png").
 *
 * The page renders itself through the browser (html-to-image draws the live DOM into an SVG, so every
 * Custom Build style, font, theme and logo comes out as shown). The library loads from cdnjs only when
 * an image is asked for. (A PNG rather than a PDF: the page is a picture either way, and a PNG drops
 * straight into Aligned / Deal rooms, email, Slack and decks.)
 *
 * Triggered by the ⬇ Download button on the merchant link, or by the rep tools:
 *   window.parent → {siCBx:'pdf', name?}     (Custom Build preview, the Rep Hub's Custom canvas,
 *                                              the rep calc's hidden merchant frame)
 *   replies         {siCBx:'pdfDone', ok, error?, name}
 *   or SIPDF.download({name}) from the page itself.
 */
(function () {
  'use strict';
  const LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js',
  ];
  let _libs = null;
  function loadLibs() {
    if (_libs) return _libs;
    _libs = LIBS.reduce((p, src) => p.then(() => new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous';
      s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src.split('/').slice(-2).join('/')));
      document.head.appendChild(s);
    })), Promise.resolve());
    _libs.catch(() => { _libs = null; });
    return _libs;
  }

  // Rep-only / interactive UI that never goes in the image.
  const HIDE = [
    'button:not(.itype-btn)', '.itype-btn:not(.active)', '.cbx-bar', '.cbx-drop', '.cbx-chip', '#mvBack', '#mv',
    '.calc-btn-wrap', '#mnAnimBtn', '.si-opt-tab', '.si-opt-tabs', '#mnBg', '.mn-scrim', '.cbx-plate', '.lgc-plate',
    '[data-cbx-hide]', '[data-cbx-off]', '.flow-toggle', '.calc-toggle', '#__snapframe', '.om-ex',
  ].join(',');
  const CSS = `
    body.pdf-capture { overflow: visible !important; }
    body.pdf-capture [data-cbx-theme], body.pdf-capture .lgc-host, body.pdf-capture .cbx-glass {
      -webkit-backdrop-filter: none !important; backdrop-filter: none !important; animation: none !important; }
    body.pdf-capture [data-cbx-theme="frosted"] { background-color: rgba(255,255,255,.78) !important; }
    body.pdf-capture *, body.pdf-capture *::before, body.pdf-capture *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
    body.pdf-capture .itype-btn.active { cursor: default !important; box-shadow: none !important; }
    /* Short tags sized exactly to their text: the capture measures text a hair wider, so keep them on one line. */
    body.pdf-capture .co2-up-mo, body.pdf-capture .impact-pct-line, body.pdf-capture .co2-pills > * { white-space: nowrap !important; flex-shrink: 0 !important; }
    body.pdf-capture input, body.pdf-capture select { pointer-events: none !important; }
    body.pdf-capture select { -webkit-appearance: none !important; appearance: none !important; background-image: none !important; }
    body.pdf-capture.cbx-edit [data-cbk], body.pdf-capture.cbx-edit [data-cbf], body.pdf-capture.cbx-edit [data-cbp],
    body.pdf-capture.cbx-edit [data-cbx-pill], body.pdf-capture.cbx-edit [data-cbx-twin], body.pdf-capture.cbx-edit [data-cbx-ex] { outline: none !important; box-shadow: none !important; }
  `;
  function merchantName(o) {
    if (o && o.name) return o.name;
    const q = new URLSearchParams(location.search).get('mname');
    const sub = document.getElementById('merchantSubtitle');
    return (q || (sub && sub.textContent) || 'Merchant').trim();
  }
  const fileName = n => (n.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Merchant') + ' – ShipInsure ROI.png';

  // Wait until the page has stopped changing (results drawn, Custom Build applied, glass mounted):
  // no DOM changes for 700ms, at most 8s.
  function settle() {
    return new Promise(res => {
      let t = null;
      const done = () => { mo.disconnect(); clearTimeout(cap); res(); };
      const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, 700); });
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      t = setTimeout(done, 700);
      const cap = setTimeout(done, 8000);
    });
  }
  let busy = false;
  async function download(o) {
    if (busy) throw new Error('An image is already being made');
    busy = true;
    const name = merchantName(o);
    const body = document.body;
    const wasEdit = body.classList.contains('cbx-edit');
    const mvOn = body.classList.contains('mv-on');
    const st = document.createElement('style'); st.id = 'pdf-capture-css'; st.textContent = CSS;
    const posters = [];
    try {
      await loadLibs();
      if (document.readyState !== 'complete') await new Promise(r => window.addEventListener('load', r, { once: true }));
      await settle();
      // Turn off canvas editing and the phone overlay for the shot (the desktop layout goes in the image).
      if (wasEdit && window.SICB) window.SICB.setEdit(false);
      if (mvOn) body.classList.remove('mv-on');
      document.head.appendChild(st);
      body.classList.add('pdf-capture');
      // Images swapped by CSS content:url() (the Midnight logos): the capture draws the src, so point
      // the src at what's showing for the shot.
      const swapped = [];
      document.querySelectorAll('img').forEach(im => {
        const m = (getComputedStyle(im).content || '').match(/^url\("?(.*?)"?\)$/);
        if (m && m[1] && m[1] !== im.currentSrc) { swapped.push([im, im.getAttribute('src')]); im.src = m[1]; posters.push({ remove() {}, pre: im }); }
      });
      posters.push({ remove() { swapped.forEach(([im, src]) => { if (src == null) im.removeAttribute('src'); else im.src = src; }); } });
      // A video (the Midnight background) shows its poster: stand an image of it in the same spot.
      document.querySelectorAll('video[poster]').forEach(v => {
        if (!v.getClientRects().length) return;
        const vc = getComputedStyle(v), dv = document.createElement('div');
        dv.className = 'pdf-poster'; dv.setAttribute('aria-hidden', 'true');
        ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'opacity', 'z-index', 'filter', 'border-radius', 'pointer-events']
          .forEach(p => dv.style.setProperty(p, vc.getPropertyValue(p)));
        const fit = vc.objectFit === 'contain' ? 'contain' : 'cover';
        dv.style.background = 'url("' + v.poster + '") ' + (vc.objectPosition || 'center') + ' / ' + fit + ' no-repeat';
        v.parentNode.insertBefore(dv, v); posters.push(dv);
        const pre = new Image(); pre.src = v.poster; posters.push({ remove() {}, pre });
      });
      await Promise.all(posters.filter(p => p.pre).map(p => p.pre.complete ? 0 : new Promise(r => { p.pre.onload = p.pre.onerror = r; setTimeout(r, 3000); })));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(r => setTimeout(r, 150));          // let the capture styles apply (rAF stalls in background tabs)
      const root = document.documentElement;
      const w = Math.ceil(Math.max(root.scrollWidth, body.scrollWidth, root.clientWidth));
      const hide = new Set(document.querySelectorAll(HIDE));
      // A card that is only its (hidden) toggle — a collapsed breakdown / Billing Explained — goes too.
      document.querySelectorAll('[data-cbk], #p-calcBreakdown, #cbx-billing, .calc-breakdown').forEach(el => {
        if (hide.has(el)) return;
        const shown = [...el.children].filter(c => !hide.has(c) && c.getBoundingClientRect().height > 1 && !c.classList.contains('cbx-bar'));
        if (!shown.length) hide.add(el);
      });
      // Crop to the content: the panels stretch to the window height, so measure the lowest thing that
      // shows (skipping full-height wrappers and anything hidden) and stop a little below it.
      const docH = Math.ceil(Math.max(root.scrollHeight, body.scrollHeight));
      const hidden = el => { for (let e = el; e && e !== body; e = e.parentElement) if (hide.has(e)) return true; return false; };
      let bottom = 0;
      body.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height < 1 || r.width < 1 || r.height > docH * 0.8) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed' || +cs.opacity === 0) return;
        const b = r.bottom + window.scrollY;
        if (b > bottom && !hidden(el)) bottom = b;
      });
      const h = Math.max(200, Math.min(docH, Math.ceil(bottom + 28)));
      const scale = Math.min(2, Math.max(1, Math.floor(14000 / Math.max(w, h) * 10) / 10));   // keep the canvas under browser limits
      const bg = getComputedStyle(body).backgroundColor;
      const png = await window.htmlToImage.toPng(body, {
        width: w, height: h, pixelRatio: scale, cacheBust: true,
        backgroundColor: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff',
        style: { margin: '0', width: w + 'px', minHeight: h + 'px' },
        filter: n => !(n.nodeType === 1 && hide.has(n)),
      });
      if (o && o.dryRun) return { ok: true, png, w, h, name: fileName(name) };   // for checks: the page image, nothing saved
      if (o && o.returnPng) return { ok: true, png, name: fileName(name) };   // a parent frame saves it
      save(png, fileName(name));
      return { ok: true, name: fileName(name) };
    } finally {
      body.classList.remove('pdf-capture'); st.remove(); posters.forEach(im => im.remove());
      if (mvOn) body.classList.add('mv-on');
      if (wasEdit && window.SICB) window.SICB.setEdit(true, null);
      busy = false;
    }
  }

  function save(dataUrl, file) {
    const a = document.createElement('a'); a.href = dataUrl; a.download = file; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
  }
  // The ⬇ Download button on the merchant link itself.
  async function button(btn) {
    const old = btn.innerHTML;
    btn.disabled = true; btn.textContent = '⏳ Making image…';
    try { await download({}); btn.textContent = '✓ Saved'; }
    catch (e) { btn.innerHTML = old; alert('Download failed: ' + (e && e.message ? e.message : e)); }
    finally { btn.disabled = false; setTimeout(() => { btn.innerHTML = old; }, 1800); }
  }

  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.siCBx !== 'pdf' || e.source !== window.parent || window.parent === window) return;
    download(Object.assign({}, d, { returnPng: !d.dryRun })).then(
      r => window.parent.postMessage(Object.assign({ siCBx: 'pdfDone', ok: true, name: r.name, png: r.png }, d.dryRun ? { w: r.w, h: r.h } : {}), '*'),
      err => window.parent.postMessage({ siCBx: 'pdfDone', ok: false, error: String(err && err.message || err) }, '*'));
  });
  // From a rep tool: open the merchant link in a hidden desktop-width frame (1280px, the width most
  // merchants open it at), let it settle, and have it make its own image (this page saves the file).
  function fromUrl(url, o) {
    o = o || {};
    return new Promise((res, rej) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + (o.width || 1280) + 'px;height:900px;border:0;pointer-events:none';
      let t = null;
      const done = (ok, v) => { window.removeEventListener('message', on); clearTimeout(t); setTimeout(() => f.remove(), 1500); if (ok) res(v); else rej(v); };
      const on = e => {
        if (e.source !== f.contentWindow || !e.data || e.data.siCBx !== 'pdfDone') return;
        if (e.data.ok) { if (e.data.png && !o.dryRun) save(e.data.png, e.data.name); done(true, e.data); }
        else done(false, new Error(e.data.error || 'Download failed'));
      };
      window.addEventListener('message', on);
      t = setTimeout(() => done(false, new Error('Timed out making the image')), 90000);
      f.onload = () => setTimeout(() => { try { f.contentWindow.postMessage({ siCBx: 'pdf', name: o.name, dryRun: !!o.dryRun }, '*'); } catch (x) { done(false, x); } }, o.wait || 2000);
      f.src = url;
      document.body.appendChild(f);
    });
  }
  window.SIPDF = { download, fromUrl, button };
})();
