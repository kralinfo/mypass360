-- ============================================================
-- Migration: Trigger to update ticket_types.sold
-- ============================================================

CREATE OR REPLACE FUNCTION update_ticket_sold()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle new ticket creation
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('VALID', 'active', 'PENDING', 'CHECKED_IN', 'used') THEN
      UPDATE ticket_types SET sold = sold + 1 WHERE id = NEW.ticket_type_id;
    END IF;
  
  -- Handle status change (e.g. cancellation)
  ELSIF TG_OP = 'UPDATE' THEN
    -- If ticket goes from valid to cancelled
    IF OLD.status IN ('VALID', 'active', 'PENDING', 'CHECKED_IN', 'used') AND NEW.status IN ('CANCELED', 'cancelled') THEN
      UPDATE ticket_types SET sold = GREATEST(sold - 1, 0) WHERE id = NEW.ticket_type_id;
      
    -- If ticket goes from cancelled to valid
    ELSIF OLD.status IN ('CANCELED', 'cancelled') AND NEW.status IN ('VALID', 'active', 'PENDING', 'CHECKED_IN', 'used') THEN
      UPDATE ticket_types SET sold = sold + 1 WHERE id = NEW.ticket_type_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ticket_sold ON tickets;
CREATE TRIGGER trg_update_ticket_sold
  AFTER INSERT OR UPDATE OF status ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_sold();
