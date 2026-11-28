-- ============================================================================
-- Migration: 20260101002400_account_verification_and_doc_revisions.sql
-- Description:
--   1. Adds account_status & verification metadata to public.users
--      (PENDING_VERIFICATION | APPROVED | REJECTED).
--   2. Creates public.user_document_revisions table for per-document status
--      tracking (PENDING_REVIEW | APPROVED | REJECTED), admin remarks, and
--      immutable revision history (old rejected files are never deleted).
--   3. Adds payment_verification_status & terms acceptance tracking to
--      public.bookings for manual staff approval flow (Task 5).
--   4. Hardens user-documents storage RLS (supports user_<id>/ folder,
--      removes operator read access, preserves old files for audit).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Account Verification Status on public.users
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists account_status text not null default 'PENDING_VERIFICATION',
  add column if not exists account_verification_remarks text default null,
  add column if not exists verified_at timestamptz default null,
  add column if not exists verified_by bigint default null references public.users (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_account_status_check'
  ) then
    alter table public.users
      add constraint users_account_status_check
      check (account_status in ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED'));
  end if;
end $$;

-- Backfill existing verified users and internal roles so existing accounts keep working
update public.users
set account_status = 'APPROVED',
    verified_at = coalesce(verified_at, now())
where (id_verified = true or role in ('admin', 'staff', 'operator'))
  and account_status = 'PENDING_VERIFICATION';

create index if not exists idx_users_account_status on public.users (account_status);

-- Refresh public.profiles view to expose account_status
create or replace view public.profiles as
select
  id,
  auth_id,
  name,
  email,
  phone,
  role,
  branch_id,
  primary_id_url,
  secondary_id_url,
  proof_of_billing_url,
  stripe_customer_id,
  id_verified,
  is_verified,
  created_at,
  account_status,
  account_verification_remarks,
  verified_at
from public.users;

-- ----------------------------------------------------------------------------
-- 2. Document Management & Immutable Revision History
-- ----------------------------------------------------------------------------
create table if not exists public.user_document_revisions (
  id             bigserial primary key,
  user_id        bigint not null references public.users (id) on delete cascade,
  doc_type       text not null check (doc_type in ('primary_id', 'secondary_id', 'proof_of_billing')),
  version        integer not null default 1,
  file_path      text not null,
  file_name      text not null,
  status         text not null default 'PENDING_REVIEW'
                 check (status in ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  admin_remarks  text default null,
  is_current     boolean not null default true,
  reviewed_by    bigint default null references public.users (id) on delete set null,
  reviewed_at    timestamptz default null,
  uploaded_at    timestamptz not null default now()
);

create index if not exists idx_user_doc_rev_user_current
  on public.user_document_revisions (user_id, doc_type, is_current);

create index if not exists idx_user_doc_rev_status
  on public.user_document_revisions (status);

alter table public.user_document_revisions enable row level security;

-- Users can read their own document history; Admin & Staff can read all (Operators excluded)
drop policy if exists user_doc_revisions_select on public.user_document_revisions;
create policy user_doc_revisions_select
  on public.user_document_revisions for select
  to authenticated
  using (
    user_id = public.current_user_id()
    or public.current_user_role() in ('admin', 'staff')
  );

-- Users can insert new document revisions for themselves (always starting as PENDING_REVIEW)
drop policy if exists user_doc_revisions_insert on public.user_document_revisions;
create policy user_doc_revisions_insert
  on public.user_document_revisions for insert
  to authenticated
  with check (
    (
      user_id = public.current_user_id()
      and status = 'PENDING_REVIEW'
      and admin_remarks is null
    )
    or public.current_user_role() in ('admin', 'staff')
  );

-- Users may mark their own prior revisions non-current on re-upload; Admin & Staff may approve/reject
drop policy if exists user_doc_revisions_update on public.user_document_revisions;
create policy user_doc_revisions_update
  on public.user_document_revisions for update
  to authenticated
  using (
    user_id = public.current_user_id()
    or public.current_user_role() in ('admin', 'staff')
  )
  with check (
    public.current_user_role() in ('admin', 'staff')
    or (
      user_id = public.current_user_id()
      and is_current = false
    )
  );

-- No DELETE policy for customers: old rejected files & records are preserved for Admin audit.

-- Backfill existing documents from public.users into user_document_revisions (idempotent)
insert into public.user_document_revisions (user_id, doc_type, version, file_path, file_name, status, is_current)
select
  u.id,
  'primary_id',
  1,
  u.primary_id_url,
  split_part(u.primary_id_url, '/', array_length(string_to_array(u.primary_id_url, '/'), 1)),
  case when u.id_verified then 'APPROVED' else 'PENDING_REVIEW' end,
  true
from public.users u
where u.primary_id_url is not null and u.primary_id_url <> ''
  and not exists (
    select 1 from public.user_document_revisions r
    where r.user_id = u.id and r.doc_type = 'primary_id'
  );

insert into public.user_document_revisions (user_id, doc_type, version, file_path, file_name, status, is_current)
select
  u.id,
  'secondary_id',
  1,
  u.secondary_id_url,
  split_part(u.secondary_id_url, '/', array_length(string_to_array(u.secondary_id_url, '/'), 1)),
  case when u.id_verified then 'APPROVED' else 'PENDING_REVIEW' end,
  true
from public.users u
where u.secondary_id_url is not null and u.secondary_id_url <> ''
  and not exists (
    select 1 from public.user_document_revisions r
    where r.user_id = u.id and r.doc_type = 'secondary_id'
  );

insert into public.user_document_revisions (user_id, doc_type, version, file_path, file_name, status, is_current)
select
  u.id,
  'proof_of_billing',
  1,
  u.proof_of_billing_url,
  split_part(u.proof_of_billing_url, '/', array_length(string_to_array(u.proof_of_billing_url, '/'), 1)),
  case when u.id_verified then 'APPROVED' else 'PENDING_REVIEW' end,
  true
from public.users u
where u.proof_of_billing_url is not null and u.proof_of_billing_url <> ''
  and not exists (
    select 1 from public.user_document_revisions r
    where r.user_id = u.id and r.doc_type = 'proof_of_billing'
  );

-- ----------------------------------------------------------------------------
-- 3. Booking Payment Verification & Terms Tracking (Task 5)
-- ----------------------------------------------------------------------------
alter table public.bookings
  add column if not exists payment_verification_status text not null default 'PENDING_VERIFICATION',
  add column if not exists payment_verified_by bigint default null references public.users (id) on delete set null,
  add column if not exists payment_verified_at timestamptz default null,
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz default null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_payment_verification_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_verification_status_check
      check (payment_verification_status in ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'));
  end if;
end $$;

-- Backfill already-confirmed/released/completed bookings as VERIFIED
update public.bookings
set payment_verification_status = 'VERIFIED'
where status in ('Confirmed', 'Released', 'Completed')
  and payment_verification_status = 'PENDING_VERIFICATION';

-- ----------------------------------------------------------------------------
-- 4. Harden user-documents Storage RLS (Audit-Safe & Strict Privacy)
-- ----------------------------------------------------------------------------
drop policy if exists "Users can upload their own documents" on storage.objects;
create policy "Users can upload their own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = ('user_' || public.current_user_id()::text)
    )
  );

drop policy if exists "Users can view their own documents" on storage.objects;
create policy "Users can view their own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = ('user_' || public.current_user_id()::text)
      or public.current_user_role() in ('admin', 'staff')
    )
  );

-- Preserve revision history: drop customer DELETE policy so rejected files remain for Admin audit
drop policy if exists "Users can delete their own documents" on storage.objects;
