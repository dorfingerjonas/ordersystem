-- =====================================================================
-- Ordersystem – idempotent orders (client outbox)
-- Run AFTER 20261122_08_statistics.sql. Safe to re-run (idempotent).
--
-- The app keeps every order in an outbox (IndexedDB) until the server
-- confirmed it and retries after a WiFi gap. Every order carries a UUID
-- created on the device (orders.client_id). The unique index makes a
-- retry of an order that already arrived a no-op
-- (insert ... on conflict (client_id) do nothing), so the
-- insert_ordered_products trigger never runs twice for one order and
-- nothing is printed twice.
--
-- Old app versions don't send client_id -> NULL, which is not unique-checked.
-- =====================================================================

alter table public.orders add column if not exists client_id uuid null;

-- a plain (non-partial) unique index, otherwise PostgREST's
-- on_conflict=client_id can't use it
create unique index if not exists orders_client_id_key on public.orders (client_id);

-- realtime for orders (printer service) – normally already there
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
