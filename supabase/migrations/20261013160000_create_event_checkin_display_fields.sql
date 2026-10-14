-- ============================================================
-- Migration: Campos personalizados para exibição no Check-in
-- Data: 2026-10-13
-- Descrição: Permite ao organizador configurar até 3 campos adicionais
--            para serem exibidos na tela de confirmação de Check-in.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_checkin_display_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  field_id      UUID NOT NULL REFERENCES event_custom_fields(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkin_display_fields_event
  ON event_checkin_display_fields(event_id);

ALTER TABLE event_checkin_display_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_checkin_display_fields_service" ON event_checkin_display_fields;
CREATE POLICY "event_checkin_display_fields_service"
  ON event_checkin_display_fields
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
