-- ============================================================
-- Migration: Controle Mestre de Check-in por Evento
-- Data: 2026-08-25
-- Descrição: Adiciona coluna checkin_enabled na tabela events
--            permitindo que o administrador abra ou feche a portaria.
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS checkin_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN events.checkin_enabled IS 'Indica se a portaria / check-in está aberta/ativa para este evento.';
