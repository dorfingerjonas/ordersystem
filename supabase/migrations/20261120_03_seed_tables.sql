-- =====================================================================
-- Ordersystem – Tischplan Saal (Bühne / Straßenseite)
-- Legt die Bereiche "Reihe 0" … "Reihe 11" und alle Tische laut Plan an.
-- Idempotent: vorhandene Bereiche (gleicher Name) und Tische (gleiche Nr)
-- werden wiederverwendet und nur neu zugeordnet/sortiert.
-- Tische, die nicht im Plan sind, werden NICHT gelöscht.
-- =====================================================================

do $$
declare
  plan constant jsonb := '[
    { "area": "Reihe 0",  "tables": ["02", "03", "04"] },
    { "area": "Reihe 1",  "tables": ["11", "12", "13", "14"] },
    { "area": "Reihe 2",  "tables": ["21", "22", "23", "24"] },
    { "area": "Reihe 3",  "tables": ["31", "32", "33", "34"] },
    { "area": "Reihe 4",  "tables": ["41", "42", "43", "44"] },
    { "area": "Reihe 5",  "tables": ["51", "52", "53"] },
    { "area": "Reihe 6",  "tables": ["61", "62", "63"] },
    { "area": "Reihe 7",  "tables": ["71", "72", "73"] },
    { "area": "Reihe 8",  "tables": ["81", "82", "83"] },
    { "area": "Reihe 9",  "tables": ["91", "92", "93"] },
    { "area": "Reihe 10", "tables": ["101", "102", "103"] },
    { "area": "Reihe 11", "tables": ["110", "111", "112", "113"] }
  ]';
  entry jsonb;
  table_nr text;
  area_id bigint;
  area_pos int := 0;
  table_pos int := 0;
begin
  for entry in select value from jsonb_array_elements(plan)
  loop
    area_pos := area_pos + 1;

    select id into area_id from public.area where name = entry ->> 'area' limit 1;

    if area_id is null then
      insert into public.area (name, ordering) values (entry ->> 'area', area_pos) returning id into area_id;
    else
      update public.area set ordering = area_pos where id = area_id;
    end if;

    for table_nr in select value from jsonb_array_elements_text(entry -> 'tables')
    loop
      table_pos := table_pos + 1;

      if exists (select 1 from public.tables where tables.nr = table_nr) then
        update public.tables set area = area_id, ordering = table_pos where tables.nr = table_nr;
      else
        insert into public.tables (nr, area, ordering) values (table_nr, area_id, table_pos);
      end if;
    end loop;
  end loop;

  -- keep the identity sequences ahead of the explicit ordering values
  perform setval(pg_get_serial_sequence('public.area', 'ordering'), greatest((select max(ordering) from public.area), 1));
  perform setval(pg_get_serial_sequence('public.tables', 'ordering'), greatest((select max(ordering) from public.tables), 1));
end $$;
