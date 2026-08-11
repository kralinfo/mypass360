-- ============================================================
-- Migration: Arquitetura Definitiva de Tickets
-- Data: 2026-07-23
-- Descrição: Adiciona campos necessários para a arquitetura
--            completa de tickets (Meus Ingressos, QR Code,
--            PDF, check-in futuro, cancelamento, transferência).
--
-- NOTA: A tabela tickets já possui: id, order_id, event_id,
--       user_id, ticket_type_id, qr_code, status, used_at,
--       created_at. Esta migration EXPANDE esses campos.
-- ============================================================

-- 1. Remover a constraint de status antiga (aceita apenas active/used/cancelled)
--    para substituir por uma que aceita os novos valores também.
-- -------------------------------------------------------------
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_status_check;

-- 2. Adicionar a nova constraint de status com os valores expandidos
-- -------------------------------------------------------------
ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN (
    'PENDING',
    'VALID',
    'CHECKED_IN',
    'CANCELED',
    'active',
    'used',
    'cancelled'
  ));

-- 3. Novos campos na tabela tickets
-- -------------------------------------------------------------
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS public_code      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS buyer_name       TEXT,
  ADD COLUMN IF NOT EXISTS buyer_email      TEXT,
  ADD COLUMN IF NOT EXISTS issued_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_item_id    UUID REFERENCES order_items(id) ON DELETE SET NULL,
  -- Campos reservados para check-in futuro (ainda não utilizados pela aplicação)
  ADD COLUMN IF NOT EXISTS checked_in_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by    TEXT,
  ADD COLUMN IF NOT EXISTS validation_token TEXT;

-- 4. Índices adicionais para performance
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tickets_user_id
  ON tickets (user_id);

CREATE INDEX IF NOT EXISTS idx_tickets_public_code
  ON tickets (public_code);

CREATE INDEX IF NOT EXISTS idx_tickets_order_item_id
  ON tickets (order_item_id);

-- 5. Atualizar políticas de RLS para a tabela tickets
--    (a original permite user_id IS NULL — mantemos compatibilidade)
-- -------------------------------------------------------------

-- Remover política antiga e recriar com lógica melhorada
DROP POLICY IF EXISTS "Usuários veem próprios ingressos" ON tickets;

CREATE POLICY "Usuários veem próprios ingressos"
  ON tickets
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Política para inserção via service_role (backend gera os tickets)
DROP POLICY IF EXISTS "tickets_insert_service" ON tickets;

CREATE POLICY "tickets_insert_service"
  ON tickets
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para atualização via service_role (check-in, cancelamento, etc.)
DROP POLICY IF EXISTS "tickets_update_service" ON tickets;

CREATE POLICY "tickets_update_service"
  ON tickets
  FOR UPDATE
  TO service_role
  USING (true);
