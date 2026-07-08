-- ============================================
-- MyPass360 — Add PIX fields to payments
-- Created: 2026-07-08
-- ============================================

alter table payments
  add column if not exists pix_code text,
  add column if not exists pix_expires_at timestamptz;

create index if not exists idx_payments_status on payments(status);
