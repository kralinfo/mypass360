-- ============================================
-- MyPass360 — Add Free Event & RSVP Support
-- Created: 2026-09-08
-- ============================================
-- 1. Suporte a eventos gratuitos (PAID vs FREE) e senha de acesso na tabela events
-- 2. Permitir tickets sem order_id (para inscrições gratuitas diretas)
-- 3. Identificar tipo de inscrição (registration_type) nos ingressos
-- ============================================

-- 1. Alterações na tabela events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'PAID'
  CHECK (event_type IN ('PAID', 'FREE'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS access_password_hash TEXT NULL;

-- 2. Alterações na tabela tickets
-- Permitir que order_id seja NULL para inscrições gratuitas
ALTER TABLE public.tickets
  ALTER COLUMN order_id DROP NOT NULL;

-- Adicionar tipo de registro no ingresso (PAID vs FREE)
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS registration_type TEXT NOT NULL DEFAULT 'PAID'
  CHECK (registration_type IN ('PAID', 'FREE'));

-- Índices para otimização de busca
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_tickets_registration_type ON public.tickets(registration_type);

-- Comentários explicativos
COMMENT ON COLUMN public.events.event_type IS 'Tipo do evento: PAID (Pago) ou FREE (Gratuito com RSVP)';
COMMENT ON COLUMN public.events.access_password_hash IS 'Hash BCrypt da senha de acesso para inscrições gratuitas (opcional)';
COMMENT ON COLUMN public.tickets.registration_type IS 'Tipo da inscrição/ingresso: PAID (Comprado) ou FREE (Inscrição Gratuita)';
