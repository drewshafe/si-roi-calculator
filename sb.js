// sb.js — ShipInsure calculators shared Supabase client (Tier 2: saved links / folders)
// The publishable key is PUBLIC by design (client-side), fenced by row-level security.
// This is NOT a service/secret key. See supabase-schema.sql for the security model.
(function () {
  const SB_URL = 'https://oiljklutlmtztascnkpm.supabase.co';
  const SB_KEY = 'sb_publishable_DTbJR5CxMe6wFYKKhogEtQ_XJyp4nMs';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  let _client = null, _loading = null;
  async function client() {
    if (_client) return _client;
    if (!_loading) {
      _loading = new Promise((resolve, reject) => {
        if (window.supabase && window.supabase.createClient) return resolve();
        const s = document.createElement('script');
        s.src = CDN; s.onload = resolve;
        s.onerror = () => reject(new Error('supabase-js failed to load'));
        document.head.appendChild(s);
      }).then(() => {
        _client = window.supabase.createClient(SB_URL, SB_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
      });
    }
    await _loading;
    return _client;
  }

  // ── Auth (rep magic-link) ──────────────────────────────────────────────
  async function currentUser() { const c = await client(); const { data } = await c.auth.getUser(); return data ? data.user : null; }
  async function signInMagic(email) {
    const c = await client();
    // Public signups are disabled — only already-invited reps can sign in, so don't
    // attempt to create a user (that would be rejected). Existing users get a link.
    return c.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: location.href.split('#')[0] } });
  }
  async function signOut() { const c = await client(); return c.auth.signOut(); }

  // ── Storage (logo images) ──────────────────────────────────────────────
  // Upload a data: URL to the logos bucket; return its public URL.
  async function uploadLogo(dataUrl) {
    if (!dataUrl || dataUrl.indexOf('data:') !== 0) return dataUrl || null;
    const c = await client();
    const blob = await (await fetch(dataUrl)).blob();
    const ext = ((blob.type.split('/')[1]) || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const path = 'l/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await c.storage.from('logos').upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    return c.storage.from('logos').getPublicUrl(path).data.publicUrl;
  }

  // ── Configs (saved calculator links) ───────────────────────────────────
  // save({id?, merchant, kind, title, data, logoUrl?}) → { id, edit_token }
  async function saveConfig(cfg) {
    const c = await client();
    const row = {
      merchant: cfg.merchant || '', kind: cfg.kind || 'proposal',
      title: cfg.title || '', data: cfg.data || {},
      updated_by: 'rep', updated_at: new Date().toISOString()
    };
    if (cfg.logoUrl != null) row.logo_path = cfg.logoUrl;
    if (cfg.merchant_ref != null) row.merchant_ref = cfg.merchant_ref;
    const q = c.from('configs');
    const res = cfg.id
      ? await q.update(row).eq('id', cfg.id).select('id, edit_token').single()
      : await q.insert(row).select('id, edit_token').single();
    if (res.error) throw res.error;
    return res.data;
  }
  async function loadConfig(id) {
    const c = await client();
    const { data, error } = await c.from('configs')
      .select('id, merchant, merchant_ref, kind, title, data, logo_path, updated_by, updated_at').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  async function listConfigs() {
    const c = await client();
    const { data, error } = await c.from('configs')
      .select('id, merchant, merchant_ref, kind, title, logo_path, updated_by, updated_at')
      .order('merchant', { ascending: true }).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ── Merchants (folder-level branding; single source for all scenarios) ──
  // bld = cfg() output (for rendering), cb = cbSnapshot() (for editing), logo in storage.
  async function saveMerchant(m) {
    const c = await client();
    const row = { name: m.name || '', bld: m.bld || {}, cb: m.cb || {}, updated_at: new Date().toISOString() };
    if (m.logoUrl != null) row.logo_path = m.logoUrl;
    let id = m.id;
    if (!id && m.name) { const ex = await getMerchantByName(m.name); if (ex) id = ex.id; }
    const q = c.from('merchants');
    const res = id ? await q.update(row).eq('id', id).select('id').single()
                   : await q.insert(row).select('id').single();
    if (res.error) throw res.error;
    return res.data;
  }
  async function getMerchant(id) {
    const c = await client();
    const { data, error } = await c.from('merchants').select('id, name, bld, cb, logo_path, updated_at').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  async function getMerchantByName(name) {
    const c = await client();
    const { data, error } = await c.from('merchants').select('id, name, bld, cb, logo_path').ilike('name', name).limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }
  async function listMerchants() {
    const c = await client();
    const { data, error } = await c.from('merchants').select('id, name, logo_path, updated_at').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  // Merchant save-back — token-gated, no login required.
  async function updateByToken(id, token, data) {
    const c = await client();
    const { error } = await c.rpc('update_config_by_token', { p_id: id, p_token: token, p_data: data });
    if (error) throw error;
    return true;
  }
  async function deleteConfig(id) { const c = await client(); const { error } = await c.from('configs').delete().eq('id', id); if (error) throw error; return true; }

  // ── Merchant folders (Rep Hub) — needs merchant-folders-schema.sql ─────
  // A folder = a merchants row. Every tool's saves live in merchant_assets
  // (kind: checkout | email | claim | proposal | msa | mnda), team-wide.
  const ASSET_KINDS = ['checkout', 'email', 'claim', 'proposal', 'msa', 'mnda'];
  // source / file_path: set on uploaded or linked docs (data.source = 'upload' | 'link').
  const ASSET_COLS = 'id, merchant_ref, kind, title, doc_url, rep_email, updated_by_email, created_at, updated_at, source:data->>source, file_path:data->file->>path';

  async function listFolders(opts) {
    const c = await client();
    let q = c.from('merchants').select('id, name, logo_path, domain, archived, updated_at').order('name', { ascending: true });
    if (!(opts && opts.includeArchived)) q = q.eq('archived', false);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  // Create a folder, or return the existing one with that name (names are unique, case-insensitive).
  async function createFolder(f) {
    const name = String((f && f.name) || '').trim();
    if (!name) throw new Error('Folder needs a merchant name');
    const ex = await getMerchantByName(name);
    if (ex) {
      const back = await updateFolder(ex.id, { archived: false });   // re-creating an archived folder brings it back
      return Object.assign(back, { existed: true });
    }
    const c = await client();
    const row = { name: name, bld: {}, cb: {}, updated_at: new Date().toISOString() };
    if (f.logoUrl) row.logo_path = f.logoUrl;
    if (f.domain) row.domain = f.domain;
    const { data, error } = await c.from('merchants').insert(row).select('id, name, logo_path, domain, archived, updated_at').single();
    if (error) throw error;
    return data;
  }
  // Rename / re-logo / set domain / archive — never touches the folder's branding (bld/cb).
  async function updateFolder(id, patch) {
    const c = await client();
    const row = { updated_at: new Date().toISOString() };
    if (patch.name != null) row.name = String(patch.name).trim();
    if (patch.logoUrl !== undefined) row.logo_path = patch.logoUrl;
    if (patch.domain !== undefined) row.domain = patch.domain;
    if (patch.archived != null) row.archived = !!patch.archived;
    const { data, error } = await c.from('merchants').update(row).eq('id', id).select('id, name, logo_path, domain, archived, updated_at').single();
    if (error) throw error;
    return data;
  }

  // List saves (no payloads) — for one folder, optionally one kind; newest first.
  async function listAssets(merchantRef, kind) {
    const c = await client();
    let q = c.from('merchant_assets').select(ASSET_COLS).order('updated_at', { ascending: false });
    if (merchantRef) q = q.eq('merchant_ref', merchantRef);
    if (kind) q = q.eq('kind', kind);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  async function recentAssets(limit) {
    const c = await client();
    const { data, error } = await c.from('merchant_assets').select(ASSET_COLS).order('updated_at', { ascending: false }).limit(limit || 20);
    if (error) throw error;
    return data || [];
  }
  // One save with its payload. Works signed in or not (asset_get = exact id only).
  async function getAsset(id) {
    const c = await client();
    const { data, error } = await c.rpc('asset_get', { p_id: id });
    if (error) throw error;
    if (!data) throw new Error('Save not found');
    return data;
  }
  // save({id?, merchant_ref, kind, title, data, doc_url?}) → { id, updated_at }. No id = new version.
  async function saveAsset(a) {
    if (!a || !a.merchant_ref) throw new Error('Pick a merchant folder first');
    if (ASSET_KINDS.indexOf(a.kind) < 0) throw new Error('Unknown save type: ' + a.kind);
    const c = await client();
    const row = { merchant_ref: a.merchant_ref, kind: a.kind, title: a.title || '', data: a.data || {} };
    if (a.doc_url !== undefined) row.doc_url = a.doc_url;
    const q = c.from('merchant_assets');
    const res = a.id ? await q.update(row).eq('id', a.id).select('id, updated_at').single()
                     : await q.insert(row).select('id, updated_at').single();
    if (res.error) throw res.error;
    // Bump the folder so the most recently worked-on merchants sort first.
    c.from('merchants').update({ updated_at: new Date().toISOString() }).eq('id', a.merchant_ref).then(function () {}, function () {});
    return res.data;
  }
  async function deleteAsset(id) { const c = await client(); const { error } = await c.from('merchant_assets').delete().eq('id', id); if (error) throw error; return true; }
  // Everything in a folder: tool saves + the folder's ROI scenarios (configs).
  async function folderContents(merchantRef) {
    const c = await client();
    const [assets, cfg] = await Promise.all([
      listAssets(merchantRef),
      c.from('configs').select('id, merchant, merchant_ref, kind, title, logo_path, updated_by, updated_at')
        .eq('merchant_ref', merchantRef).order('updated_at', { ascending: false })
    ]);
    if (cfg.error) throw cfg.error;
    return { assets: assets, scenarios: cfg.data || [] };
  }

  // File an existing ROI scenario (config) into a merchant folder — touches only merchant_ref.
  async function linkScenario(configId, merchantRef) {
    const c = await client();
    const { data, error } = await c.from('configs').update({ merchant_ref: merchantRef }).eq('id', configId).select('id, merchant_ref');
    if (error) throw error;
    if (!data || !data.length) throw new Error('Not allowed to move that scenario (only the rep who saved it can)');
    return data[0];
  }

  // Rename a folder save — ROI scenario (configs) or tool save (merchant_assets). Title only.
  // A scenario's title is also its tab label on a multi-option merchant link.
  async function renameSave(kind, id, title) {
    const c = await client();
    const table = kind === 'roi' ? 'configs' : 'merchant_assets';
    const { data, error } = await c.from(table).update({ title: title }).eq('id', id).select('id, title');
    if (error) throw error;
    if (!data || !data.length) throw new Error('Not allowed to rename that save (only the rep who saved it can)');
    return data[0];
  }

  // ── Uploaded docs (private bucket "merchant-docs"; see merchant-docs-storage.sql) ──
  // A rep's existing Proposal / MSA / MNDA file, filed in a merchant folder. The file
  // lives in Storage; its merchant_assets row keeps data.file = {path, name, size, type}.
  const DOCS_BUCKET = 'merchant-docs';
  async function uploadDoc(file, merchantRef, kind) {
    const c = await client();
    const safe = String(file.name || 'file').replace(/[^\w.\-]+/g, '_').slice(-80);
    const path = merchantRef + '/' + kind + '/' + Date.now().toString(36) + '-' + safe;
    const { error } = await c.storage.from(DOCS_BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (error) throw error;
    return { path: path, name: file.name, size: file.size, type: file.type || '' };
  }
  // Short-lived link to open a private file (default 1 hour).
  async function docLink(path, seconds) {
    const c = await client();
    const { data, error } = await c.storage.from(DOCS_BUCKET).createSignedUrl(path, seconds || 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  async function removeDoc(path) { const c = await client(); const { error } = await c.storage.from(DOCS_BUCKET).remove([path]); if (error) throw error; return true; }

  // ── Active merchant (shared by the Rep Hub and every tool; same origin) ──
  // {id, name, logo} in localStorage; other tabs/iframes hear changes via 'storage'.
  const ACTIVE_KEY = 'si_active_merchant';
  function getActiveFolder() { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch (e) { return null; } }
  function setActiveFolder(f) {
    const v = f && f.id ? { id: f.id, name: f.name || '', logo: f.logo || f.logo_path || '' } : null;
    try { v ? localStorage.setItem(ACTIVE_KEY, JSON.stringify(v)) : localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
    _activeSubs.forEach(function (fn) { try { fn(v); } catch (e) {} });
    return v;
  }
  const _activeSubs = [];
  function onActiveFolder(fn) {
    _activeSubs.push(fn);
    window.addEventListener('storage', function (e) { if (e.key === ACTIVE_KEY) fn(getActiveFolder()); });
  }

  window.SIsb = {
    URL: SB_URL, client, currentUser, signInMagic, signOut,
    uploadLogo, saveConfig, loadConfig, listConfigs, updateByToken, deleteConfig,
    saveMerchant, getMerchant, getMerchantByName, listMerchants,
    ASSET_KINDS, listFolders, createFolder, updateFolder,
    listAssets, recentAssets, getAsset, saveAsset, deleteAsset, folderContents, linkScenario, renameSave, uploadDoc, docLink, removeDoc,
    getActiveFolder, setActiveFolder, onActiveFolder
  };
})();
