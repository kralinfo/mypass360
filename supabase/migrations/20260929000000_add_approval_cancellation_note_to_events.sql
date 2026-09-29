-- ============================================
-- MyPass360 — Add approval_cancellation_note to Events
-- Created: 2026-09-29
-- ============================================
-- Adiciona a coluna de observação de cancelamento de
-- solicitação de publicação, usada quando o organizador
-- cancela a solicitação pendente voluntariamente.
-- ============================================

alter table events
  add column if not exists approval_cancellation_note text null;

comment on column events.approval_cancellation_note is
  'Observação opcional deixada pelo organizador ao cancelar a solicitação de publicação pendente.';
