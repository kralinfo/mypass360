-- ==============================================================================
-- Migração: Adicionar coluna genre à tabela events
-- ==============================================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS genre text;

-- Recarregar cache de schema
NOTIFY pgrst, 'reload schema';
