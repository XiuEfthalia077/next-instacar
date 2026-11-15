-- ===========================================================================
-- Migration: 20260101002100_user_documents_and_profiles.sql
-- Description: Adds document storage URLs, Stripe customer ID, ID verification
--              status to public.users, creates profiles view, and configures
--              the private user-documents storage bucket with RLS policies.
-- ===========================================================================

-- 1. Add document, verification, and Stripe customer columns to public.users
alter table public.users
  add column if not exists primary_id_url text default null,
  add column if not exists secondary_id_url text default null,
  add column if not exists proof_of_billing_url text default null,
  add column if not exists stripe_customer_id text default null,
  add column if not exists id_verified boolean not null default false;

-- Create index for Stripe customer lookup
create index if not exists idx_users_stripe_customer_id on public.users (stripe_customer_id);

-- 2. Create public.profiles view for standardized profile access
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
  created_at
from public.users;

-- 3. Create 'user-documents' private storage bucket if not already existing
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-documents',
  'user-documents',
  false,
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 4. Storage RLS Policies for user-documents bucket
-- Allow authenticated users to insert files only in their own folder: user-documents/{auth.uid()}/*
drop policy if exists "Users can upload their own documents" on storage.objects;
create policy "Users can upload their own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view their own files, or staff/admins/operators to view all files
drop policy if exists "Users can view their own documents" on storage.objects;
create policy "Users can view their own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-documents' and
    (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.users
        where auth_id = auth.uid() and role in ('admin', 'staff', 'operator')
      )
    )
  );

-- Allow users to update/replace their own documents
drop policy if exists "Users can update their own documents" on storage.objects;
create policy "Users can update their own documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own documents
drop policy if exists "Users can delete their own documents" on storage.objects;
create policy "Users can delete their own documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
