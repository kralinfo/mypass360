-- ============================================
-- MyPass360 — Add Visibility (PUBLIC vs PRIVATE) to Events Table
-- Created: 2026-09-08
-- ============================================
-- Permite definir se o evento é Público (aparece no catálogo/busca)
-- ou Privado (oculto do catálogo público, acessível via link direto)
-- Default: 'PUBLIC' (garante 100% retrocompatibilidade com eventos existentes)
-- ============================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'PUBLIC'
  CHECK (visibility IN ('PUBLIC', 'PRIVATE'));

-- Índice para otimização de consultas da listagem pública
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);

-- Comentário explicativo
COMMENT ON COLUMN public.events.visibility IS 'Visibilidade do evento: PUBLIC (exibido no catálogo público) ou PRIVATE (acessível apenas via link direto)';
