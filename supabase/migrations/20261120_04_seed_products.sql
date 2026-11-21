-- =====================================================================
-- Ordersystem – Kategorien und Produkte (Stadtkapelle Schwanenstadt 2025)
-- Quelle: product_rows.csv. IDs bleiben erhalten, damit die Drucker-
-- Zuordnung (infrastructure.categories = 11, 12, 13) weiter passt.
-- Idempotent: gleiche ID wird aktualisiert statt doppelt angelegt.
-- Korrigiert: "Leitubgswasser" -> "Leitungswasser", doppeltes Leerzeichen
-- in "Apfel Mineral 0,5l".
-- =====================================================================

insert into public.category (id, name, ordering) overriding system value values
  (13, 'Speisen', 1),
  (11, 'alkoholisch', 2),
  (12, 'anti-alkoholisch', 3),
  (16, 'Weinbar', 4)
on conflict (id) do update set name = excluded.name, ordering = excluded.ordering;

insert into public.product (id, name, price, category, ordering, available) overriding system value values
  (18, 'Paar Frankfurter', 5.0, 13, 1, true),
  (19, 'Paar Debreziner', 5.0, 13, 2, true),
  (16, 'Schinkenstangerl', 3.0, 13, 3, true),
  (12, 'Portion Leberkäse', 4.5, 13, 4, true),
  (17, 'Leberkäse Semmerl', 4.0, 13, 5, true),
  (48, 'Gulasch Suppe', 4.5, 13, 6, true),
  (49, 'Käsestangerl', 3.0, 13, 7, true),
  (50, 'Würstl in Saft', 5.5, 13, 8, true),
  (9, 'Bier 0,5l', 4.0, 11, 9, true),
  (22, 'Fl. Bier Märzen', 3.5, 11, 10, true),
  (23, 'Bier 0,3l', 3.5, 11, 11, true),
  (24, 'Radler 0,3l', 3.5, 11, 12, true),
  (25, 'Radler 0,5l', 4.5, 11, 13, true),
  (26, 'Spritzer 0,25l', 3.5, 11, 14, true),
  (27, 'Süßer Spritzer 0,25l', 3.5, 11, 15, true),
  (28, 'Fl. Sommerspritzer', 3.5, 11, 16, true),
  (29, 'Sommerspritzer', 4.5, 11, 17, true),
  (51, 'Sekt', 3.0, 11, 18, true),
  (52, 'Cappy Sekt', 2.5, 11, 19, true),
  (30, 'Mineral 0,25l', 2.0, 12, 20, true),
  (31, 'Mineral 0,5l', 2.5, 12, 21, true),
  (32, 'Orange Leitung 0,25l', 2.5, 12, 22, true),
  (33, 'Apfel Leitung 0,25l', 2.5, 12, 23, true),
  (34, 'Johannis Leitung 0,25l', 2.5, 12, 24, true),
  (35, 'Orange Leitung 0,5l', 3.5, 12, 25, true),
  (36, 'Apfel Leitung 0,5l', 3.5, 12, 26, true),
  (37, 'Johannis Leitung 0,5l', 3.5, 12, 27, true),
  (38, 'Orange Mineral 0,25l', 3.0, 12, 28, true),
  (39, 'Apfel Mineral 0,25l', 3.0, 12, 29, true),
  (40, 'Johannis Mineral 0,25l', 3.0, 12, 30, true),
  (41, 'Orange Mineral 0,5l', 4.0, 12, 31, true),
  (42, 'Apfel Mineral 0,5l', 4.0, 12, 32, true),
  (43, 'Johannis Mineral 0,5l', 4.0, 12, 33, true),
  (44, 'Cola', 3.5, 12, 34, true),
  (45, 'Fanta', 3.5, 12, 35, true),
  (46, 'Sprite', 3.5, 12, 36, true),
  (47, 'Mezzo Mix', 3.5, 12, 37, true),
  (65, 'Leitungswasser 0,5l', 0.0, 12, 38, true),
  (53, 'Fl. Grüner Veltliner', 21.0, 16, 39, true),
  (54, '1/8 Grüner Veltliner', 3.5, 16, 40, true),
  (55, 'Fl. Welschriesling', 18.0, 16, 41, true),
  (56, '1/8 Welschriesling', 3.5, 16, 42, true),
  (57, 'Fl. Riesling', 20.0, 16, 43, true),
  (58, '1/8 Riesling', 3.5, 16, 44, true),
  (59, 'Fl. Zweigelt', 19.0, 16, 45, true),
  (60, '1/8 Zweigelt', 3.5, 16, 46, true),
  (61, 'Fl. Blaufränkisch', 21.0, 16, 47, true),
  (62, '1/8 Blaufränkisch', 3.5, 16, 48, true),
  (63, 'Fl. Cuvee', 19.0, 16, 49, true),
  (64, '1/8 Cuvee', 3.5, 16, 50, true)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  category = excluded.category,
  ordering = excluded.ordering,
  available = excluded.available;

-- keep identity sequences ahead of the explicit values
select setval(pg_get_serial_sequence('public.category', 'id'), (select max(id) from public.category));
select setval(pg_get_serial_sequence('public.category', 'ordering'), (select max(ordering) from public.category));
select setval(pg_get_serial_sequence('public.product', 'id'), (select max(id) from public.product));
select setval(pg_get_serial_sequence('public.product', 'ordering'), (select max(ordering) from public.product));
