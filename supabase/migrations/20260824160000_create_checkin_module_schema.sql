-- ============================================================
-- Migration: Módulo de Check-in e Controle de Acessos
-- Data: 2026-08-24
-- Descrição: Cria as tabelas checkin_accesses (credenciais de portaria)
--            e checkins (histórico e auditoria de entradas por evento).
-- ============================================================

-- 1. Tabela de Acessos / Credenciais de Portaria
-- Cada registro representa um ponto de entrada ou operador vinculado a um evento.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkin_accesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- 2. Tabela de Check-ins Registrados
-- ticket_id é UNIQUE para impedir estritamente no nível do banco que
-- um ingresso seja validado mais de uma vez (proteção contra concorrência).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkins (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id          UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  checkin_access_id  UUID REFERENCES checkin_accesses(id) ON DELETE SET NULL,
  checked_in_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices de Otimização
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checkin_accesses_event_id ON checkin_accesses (event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_accesses_code ON checkin_accesses (code);
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON checkins (event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_ticket_id ON checkins (ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkins_access_id ON checkins (checkin_access_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON checkins (checked_in_at);

-- 4. Políticas de RLS (Row Level Security)
-- -------------------------------------------------------------
ALTER TABLE checkin_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Permite leitura e escrita irrestrita via service_role (usado pelo backend NestJS)
DROP POLICY IF EXISTS "checkin_accesses_service" ON checkin_accesses;
CREATE POLICY "checkin_accesses_service"
  ON checkin_accesses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "checkins_service" ON checkins;
CREATE POLICY "checkins_service"
  ON checkins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE checkin_accesses IS 'Credenciais de operadores de portaria vinculadas a eventos específicos.';
COMMENT ON TABLE checkins IS 'Auditoria e registros persistentes de cada entrada realizada no evento.';
