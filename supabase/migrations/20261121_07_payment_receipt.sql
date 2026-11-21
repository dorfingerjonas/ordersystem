-- =====================================================================
-- Ordersystem – payment receipts ("Zahlungsbestätigung")
-- Run AFTER 20261120_02_rls.sql. Safe to re-run (idempotent).
--
-- After cashing up, a waiter can print a simple payment confirmation
-- (e.g. for a club's bookkeeping) on a printer of their choice. It is
-- NOT an invoice: no VAT, no RKSV signature.
--
-- Reuses the print_job queue: type 'RECEIPT' + snapshot in payload
-- (lines, total, table, ...), so later price changes do not matter.
-- The print_job id is printed as "Beleg-Nr.".
-- =====================================================================

alter table public.print_job
  add column if not exists payload jsonb null;

alter table public.print_job
  drop constraint if exists print_job_type_check;

alter table public.print_job
  add constraint print_job_type_check check (type in ('TEST', 'RECEIPT'));

-- every logged-in user may print a receipt (test prints stay admin only)
drop policy if exists "insert receipt" on public.print_job;

create policy "insert receipt" on public.print_job
  for insert to authenticated with check (type = 'RECEIPT');
