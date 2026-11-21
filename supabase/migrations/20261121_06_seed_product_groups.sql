-- =====================================================================
-- Ordersystem – Produktgruppen für die bestehenden Produkte
-- Run AFTER 20261120_04_seed_products.sql and 20261121_05_product_groups.sql.
-- Die Produkt-IDs bleiben gleich -> Umsatz und offene Posten bleiben erhalten.
-- Idempotent.
-- =====================================================================

insert into public.product_group (id, name, category, ordering, attributes, prices, surcharges, excluded, prefix_name)
overriding system value values
  (1, 'Mineral', 12, 20,
   '[{"id": "a1", "name": "Größe", "values": ["0,25l", "0,5l"]}]',
   '{"[\"0,25l\"]": 2.0, "[\"0,5l\"]": 2.5}',
   '{}', '[]', true),
  (2, 'Saft gespritzt', 12, 22,
   '[{"id": "a1", "name": "Sorte", "values": ["Orange", "Apfel", "Johannis"]},
     {"id": "a2", "name": "Mischung", "values": ["Leitung", "Mineral"]},
     {"id": "a3", "name": "Größe", "values": ["0,25l", "0,5l"]}]',
   '{"[\"Leitung\",\"0,25l\"]": 2.5, "[\"Leitung\",\"0,5l\"]": 3.5, "[\"Mineral\",\"0,25l\"]": 3.0, "[\"Mineral\",\"0,5l\"]": 4.0}',
   '{}', '[]', false)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  ordering = excluded.ordering,
  attributes = excluded.attributes,
  prices = excluded.prices,
  surcharges = excluded.surcharges,
  excluded = excluded.excluded,
  prefix_name = excluded.prefix_name;

-- link the existing products to their group
update public.product p set product_group = v.grp, variant = v.variant::jsonb, archived = false
from (values
  (30, 1, '{"a1": "0,25l"}'),
  (31, 1, '{"a1": "0,5l"}'),
  (32, 2, '{"a1": "Orange", "a2": "Leitung", "a3": "0,25l"}'),
  (33, 2, '{"a1": "Apfel", "a2": "Leitung", "a3": "0,25l"}'),
  (34, 2, '{"a1": "Johannis", "a2": "Leitung", "a3": "0,25l"}'),
  (35, 2, '{"a1": "Orange", "a2": "Leitung", "a3": "0,5l"}'),
  (36, 2, '{"a1": "Apfel", "a2": "Leitung", "a3": "0,5l"}'),
  (37, 2, '{"a1": "Johannis", "a2": "Leitung", "a3": "0,5l"}'),
  (38, 2, '{"a1": "Orange", "a2": "Mineral", "a3": "0,25l"}'),
  (39, 2, '{"a1": "Apfel", "a2": "Mineral", "a3": "0,25l"}'),
  (40, 2, '{"a1": "Johannis", "a2": "Mineral", "a3": "0,25l"}'),
  (41, 2, '{"a1": "Orange", "a2": "Mineral", "a3": "0,5l"}'),
  (42, 2, '{"a1": "Apfel", "a2": "Mineral", "a3": "0,5l"}'),
  (43, 2, '{"a1": "Johannis", "a2": "Mineral", "a3": "0,5l"}')
) as v(id, grp, variant)
where p.id = v.id;

-- keep identity sequences ahead of the explicit values
select setval(pg_get_serial_sequence('public.product_group', 'id'), (select max(id) from public.product_group));
select setval(pg_get_serial_sequence('public.product_group', 'ordering'),
              greatest((select max(ordering) from public.product_group), (select max(ordering) from public.product)));
