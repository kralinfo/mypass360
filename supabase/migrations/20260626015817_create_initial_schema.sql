-- ============================================
-- MyPass360 — Initial Schema
-- Created: 2026-06-26
-- ============================================

-- Habilitar extensão para UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- TABELA: events (Eventos)
-- ============================================
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  description text,
  date timestamptz not null,
  location text not null,
  organizer_id uuid,
  capacity int not null default 0,
  price numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'finished')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- TABELA: ticket_types (Tipos de ingresso)
-- ============================================
create table if not exists ticket_types (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  quantity int not null check (quantity >= 0),
  sold int not null default 0 check (sold >= 0),
  created_at timestamptz not null default now()
);

-- ============================================
-- TABELA: orders (Pedidos)
-- ============================================
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id),
  user_id uuid,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  total numeric(10,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- TABELA: order_items (Itens do pedido)
-- ============================================
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

-- ============================================
-- TABELA: tickets (Ingressos)
-- ============================================
create table if not exists tickets (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id),
  user_id uuid,
  ticket_type_id uuid references ticket_types(id),
  qr_code text unique not null,
  status text not null default 'active' check (status in ('active', 'used', 'cancelled')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABELA: payments (Pagamentos)
-- ============================================
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  provider text not null check (provider in ('pix', 'credit_card', 'boleto')),
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'refunded')),
  external_id text,
  pix_code text,
  pix_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ÍNDICES para performance
-- ============================================
create index if not exists idx_events_slug on events(slug);
create index if not exists idx_events_status on events(status);
create index if not exists idx_events_date on events(date);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_tickets_qr on tickets(qr_code);
create index if not exists idx_tickets_event on tickets(event_id);
create index if not exists idx_ticket_types_event on ticket_types(event_id);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_payments_order on payments(order_id);

-- ============================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers para updated_at
drop trigger if exists trg_events_updated_at on events;
create trigger trg_events_updated_at
  before update on events
  for each row execute function update_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

drop trigger if exists trg_payments_updated_at on payments;
create trigger trg_payments_updated_at
  before update on payments
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table events enable row level security;
alter table ticket_types enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tickets enable row level security;
alter table payments enable row level security;

-- Políticas de leitura pública para eventos publicados
create policy "Eventos publicados são visíveis"
  on events for select
  using (status = 'published');

create policy "Tipos de ingresso visíveis"
  on ticket_types for select
  using (true);

-- Políticas para usuários autenticados
create policy "Usuários veem próprios pedidos"
  on orders for select
  using (auth.uid() = user_id or user_id is null);

create policy "Usuários podem criar pedidos"
  on orders for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Usuários veem próprios ingressos"
  on tickets for select
  using (auth.uid() = user_id or user_id is null);

create policy "Usuários veem próprios pagamentos"
  on payments for select
  using (
    order_id in (
      select id from orders where auth.uid() = user_id or user_id is null
    )
  );
