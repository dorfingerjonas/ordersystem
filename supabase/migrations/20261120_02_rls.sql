-- =====================================================================
-- Ordersystem – Row Level Security (admin role)
-- Run AFTER 20261120_01_new_ui.sql.
--
-- Admins are users with app_metadata.role = 'admin'. Set it with:
--
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--    where email = '<admin email>';
--
-- (The user has to log out and in again to get a fresh token.)
--
-- The printer service uses the service_role key and bypasses RLS.
--
-- IMPORTANT: this script REMOVES ALL EXISTING POLICIES on the tables
-- below, so the new rules are the only ones (permissive policies are
-- OR-combined, an old "allow all" policy would defeat the admin rules).
-- Check what exists first:
--
--   select tablename, policyname, cmd, roles, qual, with_check
--     from pg_policies where schemaname = 'public' order by tablename;
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- drop existing policies on the managed tables
do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('area', 'tables', 'category', 'product', 'device', 'infrastructure',
                        'orders', 'ordered_product', 'print_job')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- enable RLS + read access for every logged-in user
do $$
declare
  t text;
begin
  foreach t in array array['area', 'tables', 'category', 'product', 'device', 'infrastructure',
                           'orders', 'ordered_product', 'print_job']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read for authenticated" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- master data: only admins may write
do $$
declare
  t text;
begin
  foreach t in array array['area', 'tables', 'category', 'product', 'device', 'infrastructure']
  loop
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- orders: every waiter can create orders, only admins change/delete them
create policy "waiter insert" on public.orders
  for insert to authenticated with check (true);
create policy "admin update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.orders
  for delete to authenticated using (public.is_admin());

-- ordered_product: waiters cash up (update paid) and sell directly (insert)
create policy "waiter insert" on public.ordered_product
  for insert to authenticated with check (true);
create policy "waiter update" on public.ordered_product
  for update to authenticated using (true) with check (true);
create policy "admin delete" on public.ordered_product
  for delete to authenticated using (public.is_admin());

-- print jobs: only admins trigger test prints
create policy "admin insert" on public.print_job
  for insert to authenticated with check (public.is_admin());
create policy "admin delete" on public.print_job
  for delete to authenticated using (public.is_admin());
