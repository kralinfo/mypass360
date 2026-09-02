-- ============================================
-- MyPass360 — Add Approval Status to Events
-- Created: 2026-09-01
-- ============================================
-- Implementa o ciclo de vida de aprovação de eventos.
-- Separamos "approval_status" do "status" de visibilidade para
-- preservar todas as RLS policies e queries existentes intactas.
--
-- Fluxo:
-- Rascunho → Solicitar publicação (pending) → Admin aprova (approved)
-- → Organizador publica (status = 'published')
-- ============================================

-- 1. Adicionar coluna approval_status
alter table events
  add column if not exists approval_status text not null default 'none'
  check (approval_status in ('none', 'pending', 'approved', 'rejected'));

-- 2. Campos de rastreamento temporal e de responsabilidade
alter table events
  add column if not exists approval_requested_at timestamptz null;

alter table events
  add column if not exists approval_reviewed_at timestamptz null;

-- UUID do admin que analisou a solicitação (sem FK em auth.users por limitação do RLS)
alter table events
  add column if not exists approved_by uuid null;

-- Campo preparado para futura justificativa de rejeição
alter table events
  add column if not exists approval_rejection_reason text null;

-- ============================================
-- 3. Índices para performance
-- ============================================
create index if not exists idx_events_approval_status
  on events(approval_status);

create index if not exists idx_events_approval_pending
  on events(approval_status, approval_requested_at)
  where approval_status = 'pending';

-- ============================================
-- 4. Migração de dados existentes
-- Eventos já publicados recebem approval_status = 'approved'
-- para não quebrar o fluxo atual.
-- ============================================
update events
  set approval_status = 'approved'
  where status = 'published'
    and approval_status = 'none';

-- ============================================
-- 5. Comentários nas colunas para documentação
-- ============================================
comment on column events.approval_status is
  'Estado editorial do evento: none=rascunho inicial, pending=aguardando análise admin, approved=aprovado para publicação, rejected=reprovado';

comment on column events.approval_requested_at is
  'Data/hora em que o organizador solicitou a publicação';

comment on column events.approval_reviewed_at is
  'Data/hora em que o admin tomou a decisão (aprovar/rejeitar)';

comment on column events.approved_by is
  'UUID do administrador que analisou a solicitação';

comment on column events.approval_rejection_reason is
  'Justificativa da rejeição (campo preparado para uso futuro)';
