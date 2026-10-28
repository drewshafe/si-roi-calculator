"""Turn the Merchant Portal's pricing-template list (copied from
merchants.shipinsure.io/pricing-templates) into si-roi-calculator/portal-templates.js.

Each template becomes a rule the calculators' getTieredPremium() understands:
  "USE_PERCENTAGE_<pct>_MIN_<min>"  or  [{min, max, pct|premium}, ...] tiers.
Names that describe SKU price points / rounding are approximated by their % + min
(flagged approx), since the portal's exact SKU ladder isn't in the list view.
"""
import json, re, sys

src, out, synced = sys.argv[1], sys.argv[2], sys.argv[3]
BIG = 1_000_000

def money(s):
    s = s.replace(',', '').strip().lower().lstrip('$').strip()
    mult = 1000 if s.endswith('k') else 1
    return float(s.rstrip('k')) * mult

def pct_of(s):
    m = re.search(r'(\d+(?:\.\d+)?)\s*%', s)
    return float(m.group(1)) if m else None

# Templates whose structure the old hand-built list already modelled exactly.
KNOWN = {
    '121': [{'min': 0, 'max': 310, 'pct': 0.065}, {'min': 310, 'max': 670, 'premium': 19.99}, {'min': 670, 'max': 10000, 'pct': 0.03}],
    '116': [{'min': 1, 'max': 50, 'premium': 2.25}, {'min': 50, 'max': 100, 'premium': 2.75}, {'min': 100, 'max': 150, 'premium': 3.25}, {'min': 150, 'max': 200, 'premium': 3.75}, {'min': 200, 'max': 300, 'premium': 4.95}, {'min': 300, 'max': 500, 'premium': 5.95}, {'min': 500, 'max': 10000, 'premium': 6.95}],
    '48': [{'min': 0, 'max': 48.75, 'premium': 1.95}, {'min': 48.75, 'max': 100, 'pct': 0.04}, {'min': 100, 'max': 52000, 'pct': 0.03}],
    '53': [{'min': 0, 'max': 65, 'premium': 1.95}, {'min': 65, 'max': 1000, 'pct': 0.03}, {'min': 1000, 'max': 4900, 'pct': 0.02}],
    '72': [{'min': 0, 'max': 39.2, 'premium': 0.98}, {'min': 39.2, 'max': 1000, 'pct': 0.025}, {'min': 1000, 'max': 4600, 'pct': 0.03}],
    '84': [{'min': 0, 'max': 150, 'premium': 1.75}, {'min': 150, 'max': 250, 'premium': 1.95}, {'min': 250, 'max': 9900, 'pct': 0.025}],
    '81': [{'min': 0, 'max': 300, 'pct': 0.02}, {'min': 300, 'max': 5000, 'pct': 0.025}],
    '161': [{'min': 0, 'max': 32.67, 'premium': 0.98}, {'min': 32.67, 'max': 500, 'pct': 0.03}, {'min': 500, 'max': 1000, 'premium': 15.0}, {'min': 1000, 'max': 10000, 'pct': 0.015}],
}

def ladder(name):
    """'Tiered Min $1.50 < $65 > $1.95 < $100 > $3.00' → premium steps."""
    body = re.sub(r'^(Custom )?Tiered\s*\|?\s*(Min)?\s*', '', name.split('| Max')[0]).strip()
    toks = re.findall(r'[<>]|\$\s*[\d.,]+k?', body)
    prems, bounds, side = [], [], None
    for t in toks:
        if t in '<>': side = t; continue
        v = money(t.replace(' ', ''))
        if side == '<': bounds.append(v)
        else: prems.append(v)
    if len(prems) != len(bounds) + 1 or not bounds: return None
    tiers, lo = [], 0
    for p, b in zip(prems, bounds):
        tiers.append({'min': lo, 'max': b, 'premium': p}); lo = b
    tiers.append({'min': lo, 'max': BIG, 'premium': prems[-1]})
    return tiers

rows = []
for line in open(src, encoding='utf8'):
    if not line.strip(): continue
    tid, name, base, merchants = line.rstrip('\n').split('\t')
    low = name.lower()
    if 'delete' in low or 'do not use' in low: continue
    r = {'id': int(tid), 'name': name, 'base': base, 'merchants': int(merchants)}
    mx = re.search(r'Max\s*\$?\s*([\d.,]+k?)', name, re.I)
    if mx:
        r['max'] = money(mx.group(1))
        if r['max'] < 50: r['max'] *= 1000   # portal typo, e.g. "Max $3.4" for $3.4k
    cur = re.search(r'\b(CAD|GBP|AUD|MX)\b|\| CA$', name)
    if cur: r['currency'] = {'MX': 'MXN', 'CA': 'CAD'}.get(cur.group(1) or 'CA', cur.group(1))
    mn = re.search(r'Min\s*\$\s*([\d.]+)\s*<\s*\$\s*([\d.,]+k?)', name)
    if tid in KNOWN:
        r['kind'], r['rule'] = 'tiered', KNOWN[tid]
    elif tid == '47':   # MXN template: its name's "35%" is peso-denominated; the portal base is 2%
        r['kind'], r['rule'], r['approx'] = 'custom', 'USE_PERCENTAGE_2_MIN_0.00', True
    elif low.startswith('flat'):
        r['kind'], r['rule'] = 'flat', [{'min': 0, 'max': BIG, 'premium': money(re.search(r'\$([\d.]+)', name).group(1))}]
    elif low.startswith('tiered') or low.startswith('custom tiered'):
        t = ladder(name)
        if t: r['kind'], r['rule'] = 'tiered', t
        else:
            p = pct_of(base) or 1; m = float(mn.group(1)) if mn else 0
            r['kind'], r['rule'], r['approx'] = 'pct', 'USE_PERCENTAGE_%g_MIN_%.2f' % (p, m), True
    else:
        p = pct_of(name.split('|')[0]) if not low.startswith('custom |') else None
        if low.startswith('default - old'): p = pct_of(base)
        m = float(mn.group(1)) if mn else 0.0
        if p is None and mn: p = round(m / money(mn.group(2)) * 100, 2)   # "Custom | Min $0.98 < $34" → 2.88%
        if p is None: p = pct_of(base) or 0
        if low.startswith('2% flat'): m = 0.98
        r['kind'] = 'custom' if low.startswith('custom') else 'pct'
        r['rule'] = 'USE_PERCENTAGE_%g_MIN_%.2f' % (p, m)
        if low.startswith('custom') or 'sku' in low and 'rounded' in low: r['approx'] = True
    rows.append(r)

rows.sort(key=lambda r: (-r['merchants'], -r['id']))
js = '''/* ShipInsure Merchant Portal pricing templates — synced copy for the ROI calculators.
 * Source: merchants.shipinsure.io › Pricing Templates (copied by Claude, %s; %d templates,
 * "DELETE / Do Not Use" ones skipped). Re-sync = re-copy that page and regenerate this file.
 * Each template: {id, name, base, merchants, kind, rule, max?, currency?, approx?}
 *   rule = "USE_PERCENTAGE_<pct>_MIN_<min>" or tiers [{min,max,pct|premium}] (getTieredPremium format)
 *   approx = SKU price-point / rounded templates priced by their %% + min (close, not exact)
 * Pages call SI_PORTAL.install(selectEl, pricingTemplates, limitInputId?) right after defining
 * their pricingTemplates table: adds a "Merchant Portal" optgroup (values pt_<id>) and registers
 * the rules; picking one also fills the Limit $ field from the template's Max.
 */
(function () {
    const SYNCED = %s;
    const TEMPLATES = %s;
    const fmtMax = v => v >= 1000 ? '$' + (v / 1000).toFixed(v %% 1000 ? 1 : 0).replace(/\\.0$/, '') + 'k' : '$' + v;
    function install(sel, table, limitId) {
        if (!sel || !table || sel.querySelector('optgroup[data-portal]')) return;
        const g = document.createElement('optgroup');
        g.label = 'Merchant Portal · synced ' + SYNCED;
        g.setAttribute('data-portal', '1');
        TEMPLATES.forEach(t => {
            table['pt_' + t.id] = t.rule;
            const o = document.createElement('option');
            o.value = 'pt_' + t.id;
            o.textContent = '#' + t.id + ' · ' + t.name.replace(/\\s+/g, ' ').trim() + (t.approx ? ' (≈)' : '') + (t.merchants ? ' — ' + t.merchants + ' merchant' + (t.merchants === 1 ? '' : 's') : '');
            if (t.max) o.dataset.max = t.max;
            g.appendChild(o);
        });
        // Right after the %%-Based / $-Based basics.
        const anchor = sel.querySelector('optgroup');
        anchor ? sel.insertBefore(g, anchor) : sel.appendChild(g);
        if (limitId) sel.addEventListener('change', () => {
            const o = sel.selectedOptions[0], lim = document.getElementById(limitId);
            if (o && o.dataset.max && lim) { lim.value = Math.round(+o.dataset.max).toLocaleString('en-US'); lim.dispatchEvent(new Event('input', { bubbles: true })); }
        });
    }
    window.SI_PORTAL = { SYNCED: SYNCED, TEMPLATES: TEMPLATES, install: install, byId: id => TEMPLATES.find(t => t.id === +id), fmtMax: fmtMax };
})();
''' % (synced, len(rows), json.dumps(synced), json.dumps(rows, separators=(',', ':')))
open(out, 'w', encoding='utf8').write(js)
kinds = {}
for r in rows: kinds[r['kind']] = kinds.get(r['kind'], 0) + 1
print(len(rows), kinds, 'approx:', sum(1 for r in rows if r.get('approx')))
