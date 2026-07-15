-- ============================================
-- MyPass360 — Add published_at + Owner Policies
-- Created: 2026-07-15
-- ============================================

-- Adicionar coluna published_at para controle de agendamento
alter table events
  add column if not exists published_at timestamptz null;

-- Índice para performance nas queries de visibilidade
create index if not exists idx_events_published_at on events(published_at);

-- ============================================
-- Atualizar RLS policy de leitura pública
-- Regra: status = 'published' E (published_at IS NULL OU published_at <= NOW())
-- ============================================
drop policy if exists "Eventos publicados são visíveis" on events;
create policy "Eventos publicados são visíveis"
  on events for select
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
  );

-- ============================================
-- Política: organizador vê seus próprios eventos (independente de status)
-- ============================================
drop policy if exists "Organizador vê seus eventos" on events;
create policy "Organizador vê seus eventos"
  on events for select
  using (auth.uid() = organizer_id);

-- ============================================
-- Política: organizador pode inserir eventos
-- ============================================
drop policy if exists "Organizador pode criar eventos" on events;
create policy "Organizador pode criar eventos"
  on events for insert
  with check (auth.uid() = organizer_id);

-- ============================================
-- Política: organizador pode atualizar seus eventos
-- ============================================
drop policy if exists "Organizador pode atualizar seus eventos" on events;
create policy "Organizador pode atualizar seus eventos"
  on events for update
  using (auth.uid() = organizer_id);

-- ============================================
-- Política: organizador pode deletar seus eventos
-- ============================================
drop policy if exists "Organizador pode deletar seus eventos" on events;
create policy "Organizador pode deletar seus eventos"
  on events for delete
  using (auth.uid() = organizer_id);