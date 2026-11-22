-- =====================================================================
-- Ordersystem – data for the statistics screens
-- Run AFTER 20261120_02_rls.sql. Safe to re-run (idempotent).
--
-- Every ordered_product row (= one sold item) now knows
--   created_at  when it was ordered / sold directly
--   price       price at that moment (later price changes don't rewrite revenue)
--   order_id    the order it came from (null = direct sale while cashing up)
--   waiter      who ordered it (direct sale: who sold it)
--   paid_at     when it was cashed up
--   paid_by     who cashed it up
--
-- created_at, price and paid_at are filled by a trigger, so they are
-- correct even for old app versions that don't send them.
-- Rows that existed before this migration only get their price
-- backfilled (from the current product price); time and waiter stay empty.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) new columns
-- ---------------------------------------------------------------------
-- added without default first, so old rows stay NULL instead of getting "now"
alter table public.ordered_product add column if not exists created_at timestamp with time zone null;
alter table public.ordered_product alter column created_at set default now();

alter table public.ordered_product add column if not exists price numeric null;
alter table public.ordered_product add column if not exists order_id bigint null;
alter table public.ordered_product add column if not exists waiter text null;
alter table public.ordered_product add column if not exists paid_at timestamp with time zone null;
alter table public.ordered_product add column if not exists paid_by text null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ordered_product_order_id_fkey') then
    alter table public.ordered_product
      add constraint ordered_product_order_id_fkey foreign key (order_id) references public.orders (id)
        on update cascade on delete set null;
  end if;
end $$;

create index if not exists ordered_product_created_at_idx on public.ordered_product (created_at);
create index if not exists ordered_product_paid_at_idx on public.ordered_product (paid_at);
create index if not exists ordered_product_order_id_idx on public.ordered_product (order_id);
create index if not exists orders_timestamp_idx on public.orders ("timestamp");

-- backfill the price of existing rows
update public.ordered_product op
   set price = p.price
  from public.product p
 where op.item = p.id
   and op.price is null;

-- ---------------------------------------------------------------------
-- 2) keep created_at / price / paid_at right on every insert and update
-- ---------------------------------------------------------------------
create or replace function public.ordered_product_stats_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());

    if new.price is null and new.item is not null then
      select price into new.price from public.product where id = new.item;
    end if;

    if new.paid then
      new.paid_at := coalesce(new.paid_at, now());
      new.paid_by := coalesce(new.paid_by, new.waiter);
    end if;
  else
    if new.paid and not coalesce(old.paid, false) then
      -- server time, the client clock can be off
      new.paid_at := now();
    elsif not new.paid then
      new.paid_at := null;
      new.paid_by := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ordered_product_stats_fields on public.ordered_product;

create trigger ordered_product_stats_fields
  before insert or update on public.ordered_product
  for each row execute function public.ordered_product_stats_fields();

-- ---------------------------------------------------------------------
-- 3) order -> ordered_product rows, now with order id, waiter and price
--    Replaces the body of the existing insert_ordered_products trigger
--    function (its trigger on "orders" stays attached). Reads
--    orders.products = [{"id": <product id>, "amount": <n>, "note": "..."}].
-- ---------------------------------------------------------------------
create or replace function public.insert_ordered_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  line jsonb;
  amount int;
begin
  for line in select value from jsonb_array_elements(coalesce(new.products, '[]'::jsonb))
  loop
    amount := coalesce((line ->> 'amount')::numeric::int, 0);

    if amount > 0 and (line ->> 'id') is not null then
      insert into public.ordered_product (item, "table", paid, order_id, waiter, created_at, price)
      select (line ->> 'id')::bigint, new."table", false, new.id, new.waiter,
             now(), p.price
        from generate_series(1, amount)
        left join public.product p on p.id = (line ->> 'id')::bigint;
    end if;
  end loop;

  return new;
end;
$$;

-- make sure the function is attached as AFTER INSERT trigger: order_id
-- references orders, so the order row must exist before its items
do $$
declare
  trg record;
begin
  -- drop: our function as BEFORE trigger, and any other function that also
  -- creates ordered_product rows (would insert every item twice)
  for trg in
    select t.tgname from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
     where t.tgrelid = 'public.orders'::regclass
       and not t.tgisinternal
       and (
         (t.tgfoid = 'public.insert_ordered_products'::regproc and (t.tgtype & 2) = 2) -- BEFORE
         or (t.tgfoid <> 'public.insert_ordered_products'::regproc and p.prosrc ilike '%insert into%ordered_product%')
       )
  loop
    raise notice 'dropping trigger % on orders', trg.tgname;
    execute format('drop trigger %I on public.orders', trg.tgname);
  end loop;

  if not exists (
    select 1 from pg_trigger t
     where t.tgrelid = 'public.orders'::regclass
       and t.tgfoid = 'public.insert_ordered_products'::regproc
       and not t.tgisinternal
  ) then
    create trigger insert_ordered_products
      after insert on public.orders
      for each row execute function public.insert_ordered_products();
  end if;
end $$;
