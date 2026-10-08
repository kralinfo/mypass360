-- Campos personalizados coletados de cada participante (configuração por evento)
CREATE TABLE IF NOT EXISTS event_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'select')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_custom_fields_event ON event_custom_fields(event_id);

-- Opções dos campos do tipo seleção (nunca apagadas: apenas desativadas)
CREATE TABLE IF NOT EXISTS event_custom_field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES event_custom_fields(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_event_custom_field_options_field ON event_custom_field_options(field_id);

-- Respostas por ingresso/participante (o valor é gravado como texto para preservar o histórico)
CREATE TABLE IF NOT EXISTS ticket_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES event_custom_fields(id),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_custom_field_values_ticket ON ticket_custom_field_values(ticket_id);

-- Respostas informadas no checkout (uma entrada por ingresso), copiadas para o ticket na emissão
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
