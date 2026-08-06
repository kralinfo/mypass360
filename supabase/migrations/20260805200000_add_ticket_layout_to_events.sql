-- ============================================================
-- Migration: Suporte a Dois Modelos de Ingresso
-- Data: 2026-08-05
-- Descrição: Adiciona campos de configuração de layout de
--            ingresso ao evento e campos de CPF ao ticket
--            e itens do pedido.
-- ============================================================

-- 1. Novos campos na tabela events
-- ticket_layout: qual modelo de ingresso o evento usa
-- participant_id_type: qual tipo de identificação exigir
-- -------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS ticket_layout TEXT NOT NULL DEFAULT 'ticket'
    CHECK (ticket_layout IN ('ticket', 'formal_pdf')),
  ADD COLUMN IF NOT EXISTS participant_id_type TEXT NOT NULL DEFAULT 'name'
    CHECK (participant_id_type IN ('none', 'name', 'name_cpf'));

-- 2. CPF do portador na tabela tickets
-- Utilizado apenas quando ticket_layout = 'formal_pdf'
-- -------------------------------------------------------------
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS buyer_cpf TEXT;

-- 3. CPFs dos portadores nos itens do pedido
-- Análogo ao nominee_names já existente
-- -------------------------------------------------------------
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS nominee_cpfs TEXT[];

-- 4. Comentários para documentação
-- -------------------------------------------------------------
COMMENT ON COLUMN events.ticket_layout IS
  'Modelo de ingresso do evento: ticket (padrão, compacto) ou formal_pdf (PDF A4 profissional com nome e CPF obrigatórios).';

COMMENT ON COLUMN events.participant_id_type IS
  'Tipo de identificação exigida no checkout. Aplica-se apenas quando ticket_layout = ticket. Valores: none (sem nome), name (nome opcional), name_cpf (nome e CPF — reservado para uso futuro no modelo ticket).';

COMMENT ON COLUMN tickets.buyer_cpf IS
  'CPF do portador do ingresso. Preenchido obrigatoriamente quando o evento usa ticket_layout = formal_pdf.';

COMMENT ON COLUMN order_items.nominee_cpfs IS
  'Array de CPFs dos portadores, um por ingresso adquirido. Utilizado quando ticket_layout = formal_pdf.';
