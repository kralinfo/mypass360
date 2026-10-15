-- ============================================================
-- Migration: Venda de Ingressos por Lotes (Ticket Batches)
-- Data: 2026-10-14
-- Descricao: Implementa venda por lotes sem quebrar o modelo
--            existente de preco unico por tipo de ingresso.
-- ============================================================

-- 1. Flag de modo batch no ticket_types
ALTER TABLE ticket_types
  ADD COLUMN IF NOT EXISTS batch_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tabela: ticket_batches
CREATE TABLE IF NOT EXISTS ticket_batches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  quantity       INT NOT NULL CHECK (quantity >= 0),
  is_unlimited   BOOLEAN NOT NULL DEFAULT FALSE,
  display_order  INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'future'
                   CHECK (status IN ('future', 'open', 'sold_out', 'closed')),
  sold           INT NOT NULL DEFAULT 0 CHECK (sold >= 0),
  reserved       INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_ticket_batches_ticket_type_id
  ON ticket_batches(ticket_type_id);

CREATE INDEX IF NOT EXISTS idx_ticket_batches_status
  ON ticket_batches(status);

CREATE INDEX IF NOT EXISTS idx_ticket_batches_display_order
  ON ticket_batches(ticket_type_id, display_order);

-- 4. Trigger updated_at
DROP TRIGGER IF EXISTS trg_ticket_batches_updated_at ON ticket_batches;
CREATE TRIGGER trg_ticket_batches_updated_at
  BEFORE UPDATE ON ticket_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Relacionar order_items ao lote
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS ticket_batch_id UUID REFERENCES ticket_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_ticket_batch_id
  ON order_items(ticket_batch_id);

-- 6. RLS para ticket_batches
ALTER TABLE ticket_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_batches_select_public" ON ticket_batches;
CREATE POLICY "ticket_batches_select_public"
  ON ticket_batches FOR SELECT USING (true);

DROP POLICY IF EXISTS "ticket_batches_all_service" ON ticket_batches;
CREATE POLICY "ticket_batches_all_service"
  ON ticket_batches FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Funcao: lote vigente
CREATE OR REPLACE FUNCTION get_active_batch(p_ticket_type_id UUID)
RETURNS UUID
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  SELECT id INTO v_batch_id
  FROM ticket_batches
  WHERE ticket_type_id = p_ticket_type_id AND status = 'open'
  ORDER BY display_order ASC LIMIT 1;

  IF v_batch_id IS NOT NULL THEN RETURN v_batch_id; END IF;

  SELECT id INTO v_batch_id
  FROM ticket_batches
  WHERE ticket_type_id = p_ticket_type_id AND status = 'future'
  ORDER BY display_order ASC LIMIT 1;

  RETURN v_batch_id;
END;
$$;

-- 8. Funcao: avanca lote quando esgotado
CREATE OR REPLACE FUNCTION advance_batch_if_needed(p_ticket_type_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_open_batch RECORD;
  v_next_batch_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ticket_types WHERE id = p_ticket_type_id AND batch_mode = TRUE
  ) THEN RETURN; END IF;

  SELECT * INTO v_open_batch
  FROM ticket_batches
  WHERE ticket_type_id = p_ticket_type_id AND status = 'open'
  ORDER BY display_order ASC LIMIT 1;

  IF v_open_batch.id IS NOT NULL THEN
    IF NOT v_open_batch.is_unlimited
       AND (v_open_batch.sold + v_open_batch.reserved) >= v_open_batch.quantity THEN
      UPDATE ticket_batches SET status = 'sold_out', updated_at = now() WHERE id = v_open_batch.id;
      SELECT id INTO v_next_batch_id
      FROM ticket_batches
      WHERE ticket_type_id = p_ticket_type_id AND status = 'future'
      ORDER BY display_order ASC LIMIT 1;
      IF v_next_batch_id IS NOT NULL THEN
        UPDATE ticket_batches SET status = 'open', updated_at = now() WHERE id = v_next_batch_id;
      END IF;
    END IF;
  ELSE
    SELECT id INTO v_next_batch_id
    FROM ticket_batches
    WHERE ticket_type_id = p_ticket_type_id AND status = 'future'
    ORDER BY display_order ASC LIMIT 1;
    IF v_next_batch_id IS NOT NULL THEN
      UPDATE ticket_batches SET status = 'open', updated_at = now() WHERE id = v_next_batch_id;
    END IF;
  END IF;
END;
$$;
