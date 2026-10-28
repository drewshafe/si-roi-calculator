-- ShipInsure Rep Hub — Merchant Folders (every tool's saves, per merchant)
-- Project: shipinsure-calculators (oiljklutlmtztascnkpm). Same auth as the calculators + Vault.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run (idempotent).
--
-- What it adds
--   • merchant_assets — one row per saved item in a merchant folder:
--       kind = checkout | email | claim | proposal | msa | mnda
--       data = the tool's saved state (the same bundle its share link carries)
--       doc_url = the generated Google Doc (MSA / MNDA), when there is one
--   • merchants — team-wide editing (any rep can rename / re-logo / archive a folder),
--     plus `archived` and `domain` columns for the Merchant Folders tab.
--   • asset_get(id) — read ONE save by its exact id without signing in, so short
--     share links (?asset=…) open for merchants. No listing / enumeration possible.
--
-- Security model (matches Merchant Vault)
--   • Reps (signed-in; signups are disabled so every user is ShipInsure staff) can
--     read + create + edit ALL folder saves (team handoff). Only the creator deletes.
--   • Anonymous visitors cannot list or read the table; only asset_get by exact id.
-- ────────────────────────────────────────────────────────────────────────────

-- 1) MERCHANT FOLDERS — team-wide editing + archive/domain columns
alter table public.merchants add column if not exists archived boolean not null default false;
alter table public.merchants add column if not exists domain   text;

grant select, insert, update on public.merchants to authenticated;
drop policy if exists merchants_team_read   on public.merchants;
drop policy if exists merchants_team_update on public.merchants;
create policy merchants_team_read   on public.merchants for select to authenticated using (true);
create policy merchants_team_update on public.merchants for update to authenticated using (true) with check (true);

-- 2) MERCHANT ASSETS — every tool's saves, filed under a merchant folder
create table if not exists public.merchant_assets (
  id               text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  merchant_ref     text not null references public.merchants(id) on delete cascade,
  kind             text not null check (kind in ('checkout','email','claim','proposal','msa','mnda')),
  title            text not null default '',
  data             jsonb not null default '{}'::jsonb,
  doc_url          text,
  rep_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rep_email        text default (auth.jwt() ->> 'email'),
  updated_by_email text default (auth.jwt() ->> 'email'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists merchant_assets_folder_idx on public.merchant_assets (merchant_ref, kind, updated_at desc);
create index if not exists merchant_assets_recent_idx on public.merchant_assets (updated_at desc);

-- Stamp who/when on every edit (so the folder shows "edited by … · 2h ago").
create or replace function public.merchant_assets_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by_email := coalesce(auth.jwt() ->> 'email', new.updated_by_email);
  return new;
end;
$$;
drop trigger if exists merchant_assets_touch on public.merchant_assets;
create trigger merchant_assets_touch before update on public.merchant_assets
  for each row execute function public.merchant_assets_touch();

alter table public.merchant_assets enable row level security;
revoke all on public.merchant_assets from anon;
grant select, insert, update, delete on public.merchant_assets to authenticated;

drop policy if exists merchant_assets_team_read    on public.merchant_assets;
drop policy if exists merchant_assets_team_insert  on public.merchant_assets;
drop policy if exists merchant_assets_team_update  on public.merchant_assets;
drop policy if exists merchant_assets_owner_delete on public.merchant_assets;
create policy merchant_assets_team_read    on public.merchant_assets for select to authenticated using (true);
create policy merchant_assets_team_insert  on public.merchant_assets for insert to authenticated with check (rep_id = auth.uid());
create policy merchant_assets_team_update  on public.merchant_assets for update to authenticated using (true) with check (true);
create policy merchant_assets_owner_delete on public.merchant_assets for delete to authenticated using (rep_id = auth.uid());

-- 3) SHARE-LINK READ — one save by exact id (no login). Returns null if not found.
create or replace function public.asset_get(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.merchant_assets; m public.merchants;
begin
  select * into r from public.merchant_assets where id = p_id;
  if not found then return null; end if;
  select * into m from public.merchants where id = r.merchant_ref;
  return jsonb_build_object(
    'id', r.id, 'kind', r.kind, 'title', r.title, 'data', r.data, 'doc_url', r.doc_url,
    'merchant_ref', r.merchant_ref, 'merchant', coalesce(m.name, ''), 'updated_at', r.updated_at
  );
end;
$$;
revoke all on function public.asset_get(text) from public;
grant execute on function public.asset_get(text) to anon, authenticated;
