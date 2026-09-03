-- ============================================
-- MyPass360 — Create Notifications Table & Enable Supabase Realtime
-- Created: 2026-09-01
-- ============================================

-- 1. Criar tabela de notificações
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  read_at timestamptz null,
  entity_type text null,
  entity_id uuid null,
  action_url text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. Índices para performance em consultas por usuário e ordenação
create index if not exists idx_notifications_user_id_read
  on public.notifications(user_id, read);

create index if not exists idx_notifications_user_id_created_at
  on public.notifications(user_id, created_at desc);

-- 3. Habilitar RLS (Row Level Security) para segurança completa
alter table public.notifications enable row level security;

-- Políticas de segurança: Usuário só pode acessar e manipular suas próprias notificações
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can view own notifications'
  ) then
    create policy "Users can view own notifications"
      on public.notifications for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can update own notifications'
  ) then
    create policy "Users can update own notifications"
      on public.notifications for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can delete own notifications'
  ) then
    create policy "Users can delete own notifications"
      on public.notifications for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- 4. Ativar publicação Supabase Realtime na tabela notifications
do $$ begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when undefined_object then
    null;
end $$;

-- 5. Comentários explicativos
comment on table public.notifications is
  'Notificações persistidas do sistema enviadas aos usuários e administradores com suporte a Supabase Realtime';
comment on column public.notifications.type is
  'Tipo extensível da notificação (ex: event_approval_requested, event_approved, event_rejected, event_published)';
comment on column public.notifications.action_url is
  'URL de destino ao clicar na notificação (ex: /admin?sec=aprovacoes&event_id=XYZ)';
