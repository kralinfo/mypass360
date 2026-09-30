-- ============================================
-- MyPass360 — Create Event Invitations & Event Members Tables
-- Created: 2026-09-30
-- ============================================

-- 1. Tabela de Convites de Sócios / Colaboradores
create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  invited_email text not null,
  invited_user_id uuid null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  expires_at timestamptz null default (now() + interval '7 days')
);

-- 2. Tabela de Membros / Sócios dos Eventos
create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'PARTNER' check (role in ('OWNER', 'PARTNER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REMOVED')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- 3. Índices para performance
create index if not exists idx_event_invitations_event_id on public.event_invitations(event_id);
create index if not exists idx_event_invitations_email on public.event_invitations(invited_email);
create index if not exists idx_event_invitations_token on public.event_invitations(token);
create index if not exists idx_event_members_user_event on public.event_members(user_id, event_id);

-- 4. Habilitar RLS (Row Level Security)
alter table public.event_invitations enable row level security;
alter table public.event_members enable row level security;

-- Políticas para event_invitations
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'event_invitations' and policyname = 'Owner can manage invitations'
  ) then
    create policy "Owner can manage invitations"
      on public.event_invitations for all
      using (
        exists (
          select 1 from public.events e
          where e.id = event_invitations.event_id
          and e.organizer_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'event_invitations' and policyname = 'Invited user can view own invitation'
  ) then
    create policy "Invited user can view own invitation"
      on public.event_invitations for select
      using (
        invited_email = lower(auth.jwt() ->> 'email')
        or invited_user_id = auth.uid()
      );
  end if;
end $$;

-- Políticas para event_members
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'event_members' and policyname = 'Members can view event members'
  ) then
    create policy "Members can view event members"
      on public.event_members for select
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.events e
          where e.id = event_members.event_id
          and e.organizer_id = auth.uid()
        )
      );
  end if;
end $$;

-- 5. Ativar publicação Supabase Realtime nas tabelas
do $$ begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_invitations'
  ) then
    alter publication supabase_realtime add table public.event_invitations;
  end if;
exception
  when undefined_object then null;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_members'
  ) then
    alter publication supabase_realtime add table public.event_members;
  end if;
exception
  when undefined_object then null;
end $$;

comment on table public.event_invitations is 'Convites para sócios e colaboradores de eventos';
comment on table public.event_members is 'Membros/Sócios vinculados a um evento com permissões operacionais';
