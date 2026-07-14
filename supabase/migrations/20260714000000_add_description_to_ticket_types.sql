-- ============================================
-- MyPass360 — Add description to ticket_types
-- Created: 2026-07-14
-- ============================================

alter table ticket_types
  add column if not exists description text;
