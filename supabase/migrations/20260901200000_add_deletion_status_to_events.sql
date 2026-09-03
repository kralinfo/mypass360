-- ============================================
-- MyPass360 — Add Deletion Status to Events Table
-- Created: 2026-09-01
-- ============================================
-- Implementa o fluxo de solicitação e aprovação de exclusão de eventos.
-- Eventos publicados possuem deletion_status = 'pending' para análise do admin.
-- Exclusão aprovada realiza o arquivamento seguro (deletion_status = 'approved', status = 'cancelled').
-- ============================================

-- 1. Adicionar colunas relativas à solicitação de exclusão
alter table public.events
  add column if not exists deletion_status text not null default 'none'
  check (deletion_status in ('none', 'pending', 'approved', 'rejected'));

alter table public.events
  add column if not exists deletion_requested_at timestamptz null;

alter table public.events
  add column if not exists deletion_reason text null;

alter table public.events
  add column if not exists deletion_reviewed_at timestamptz null;

alter table public.events
  add column if not exists deletion_reviewed_by uuid null;

alter table public.events
  add column if not exists deletion_rejection_reason text null;

-- 2. Índice para consultas rápidas de exclusões pendentes
create index if not exists idx_events_deletion_status
  on public.events(deletion_status)
  where deletion_status = 'pending';

-- 3. Comentários explicativos
comment on column public.events.deletion_status is
  'Estado da solicitação de exclusão: none=sem solicitação, pending=em análise admin, approved=exclusão aprovada (arquivado), rejected=exclusão rejeitada';
comment on column public.events.deletion_reason is
  'Justificativa obrigatória fornecida pelo organizador para exclusão do evento';
