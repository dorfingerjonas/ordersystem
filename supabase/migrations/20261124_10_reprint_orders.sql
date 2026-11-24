-- =====================================================================
-- Ordersystem – reprint order slips ("Bon neu drucken")
-- Run AFTER 20261121_07_payment_receipt.sql. Safe to re-run (idempotent).
--
-- Admins can print an order slip again from the order list. Reuses the
-- print_job queue: type 'ORDER', payload = {"order_id": <id>, "all": bool}.
--   all = false  only the lines of the categories this printer is
--                responsible for (like the original slip)
--   all = true   every line of the order on this printer (e.g. when the
--                original printer is broken)
-- The slip is marked "NACHDRUCK". Inserting stays admin only (existing
-- "admin insert" policy); orders.printed is not touched.
-- =====================================================================

alter table public.print_job
  drop constraint if exists print_job_type_check;

alter table public.print_job
  add constraint print_job_type_check check (type in ('TEST', 'RECEIPT', 'ORDER'));
