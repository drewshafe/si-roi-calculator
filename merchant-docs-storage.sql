-- ShipInsure Rep Hub — Merchant Folders file uploads (Proposal / MSA + SOW / MNDA docs)
-- Project: shipinsure-calculators (oiljklutlmtztascnkpm).
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run (idempotent).
--
-- What it adds
--   • A PRIVATE storage bucket "merchant-docs" for files reps upload into a merchant
--     folder (PDF / Word, up to 25 MB). Each upload is also a merchant_assets row
--     (kind proposal | msa | mnda) whose data.file.path points at the stored file.
--   • Signed-in reps (staff only — signups are disabled) can read + upload; only the
--     rep who uploaded a file can delete it. Anonymous visitors can't list or read
--     anything; reps open files through short-lived signed links.
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('merchant-docs', 'merchant-docs', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists merchant_docs_team_read    on storage.objects;
drop policy if exists merchant_docs_team_insert  on storage.objects;
drop policy if exists merchant_docs_owner_delete on storage.objects;
create policy merchant_docs_team_read    on storage.objects for select to authenticated using (bucket_id = 'merchant-docs');
create policy merchant_docs_team_insert  on storage.objects for insert to authenticated with check (bucket_id = 'merchant-docs');
create policy merchant_docs_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'merchant-docs' and owner = auth.uid());
