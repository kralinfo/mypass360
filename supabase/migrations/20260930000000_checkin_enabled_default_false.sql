-- ============================================================
-- Migration: Portaria fechada por padrão (REQ-24)
-- Data: 2026-09-30
-- Descrição: Altera o DEFAULT da coluna checkin_enabled para FALSE,
--            garantindo que eventos recém-criados iniciem com a
--            portaria FECHADA. O organizador deve abrir explicitamente.
-- ============================================================

ALTER TABLE events
  ALTER COLUMN checkin_enabled SET DEFAULT FALSE;

-- Atualiza eventos existentes que têm checkin_enabled = NULL
-- para FALSE (portaria fechada), pois antes o valor null era
-- interpretado como aberto na aplicação.
UPDATE events
  SET checkin_enabled = FALSE
  WHERE checkin_enabled IS NULL;

COMMENT ON COLUMN events.checkin_enabled IS 'Indica se a portaria / check-in está aberta/ativa para este evento. FALSE por padrão — deve ser aberta explicitamente pelo organizador.';
