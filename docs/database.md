# Guia de Banco de Dados — MyPass360

Este documento explica como criar e configurar o banco de dados do projeto usando o **Supabase**.

---

## 📋 Índice

1. [Criar projeto no Supabase](#1-criar-projeto-no-supabase)
2. [Obter credenciais](#2-obter-credenciais)
3. [Criar tabelas via SQL](#3-criar-tabelas-via-sql)
4. [Habilitar RLS (Row Level Security)](#4-habilitar-rls-row-level-security)
5. [Criar tabelas via Dashboard (alternativa)](#5-criar-tabelas-via-dashboard-alternativa)
6. [Inserir dados de teste](#6-inserir-dados-de-teste)
7. [Verificar se tudo funciona](#7-verificar-se-tudo-funciona)

---

## 1. Criar projeto no Supabase

### Passo a passo

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `mypass360` (ou o nome que preferir)
   - **Database Password**: guarde essa senha!
   - **Region**: escolha a mais próxima (ex: `Southeast Brazil - São Paulo`)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para o provisionamento

---

## 2. Obter credenciais

No painel do projeto:

1. Vá em **Project Settings** (ícone de engrenagem no menu lateral)
2. Clique em **API**
3. Copie os seguintes valores:

| Valor | Onde usar | Exemplo |
|-------|-----------|---------|
| **Project URL** | `SUPABASE_URL` | `https://xyzproject.supabase.co` |
| **anon public** | `SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| **service_role** | `SUPABASE_SERVICE_ROLE_KEY` (apenas backend) | `eyJhbGciOiJIUzI1NiIs...` |

4. Cole nos arquivos de ambiente:

```bash
# Raiz (.env)
SUPABASE_URL=https://xyzproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Frontend (apps/web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xyzproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Backend (apps/api/.env)
SUPABASE_URL=https://xyzproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## 3. Criar tabelas via SQL

### Acessando o SQL Editor

1. No painel do Supabase, vá em **Database** → **SQL Editor**
2. Clique em **"New query"**
3. Cole o SQL abaixo
4. Clique em **"Run"** (ou `Ctrl+Enter`)

### SQL completo

```sql
-- ============================================
-- MyPass360 — Schema do banco de dados
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
  name text not null, -- ex: "Meia-entrada", "VIP", "Pista"
  price numeric(10,2) not null,
  quantity int not null, -- quantidade disponível
  sold int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABELA: orders (Pedidos)
-- ============================================
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id),
  user_id uuid, -- pode ser null se usuário não logado
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  total numeric(10,2) not null default 0,
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
  unit_price numeric(10,2) not null
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
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'refunded')),
  external_id text, -- ID do gateway de pagamento
  pix_code text, -- base64 ou copia-e-cola do PIX
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
create or function update_updated_at()
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
```

---

## 4. Habilitar RLS (Row Level Security)

O RLS controla quem pode ler/escrever em cada tabela. Execute **após** criar as tabelas:

```sql
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS em todas as tabelas
alter table events enable row level security;
alter table ticket_types enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tickets enable row level security;
alter table payments enable row level security;

-- ============================================
-- POLÍTICAS: events
-- ============================================

-- Qualquer um pode ler eventos publicados
create policy "Eventos publicados são visíveis"
  on events for select
  using (status = 'published');

-- Apenas service_role pode criar/editar/deletar (via backend)
-- Não há políticas de insert/update/delete = apenas service_role acessa

-- ============================================
-- POLÍTICAS: ticket_types
-- ============================================

-- Qualquer um pode ler tipos de ingresso
create policy "Tipos de ingresso visíveis"
  on ticket_types for select
  using (true);

-- ============================================
-- POLÍTICAS: orders
-- ============================================

-- Usuários podem ver seus próprios pedidos
create policy "Usuários veem próprios pedidos"
  on orders for select
  using (auth.uid() = user_id or user_id is null);

-- Usuários podem criar pedidos
create policy "Usuários podem criar pedidos"
  on orders for insert
  with check (auth.uid() = user_id or user_id is null);

-- ============================================
-- POLÍTICAS: tickets
-- ============================================

-- Usuários podem ver seus próprios ingressos
create policy "Usuários veem próprios ingressos"
  on tickets for select
  using (auth.uid() = user_id or user_id is null);

-- ============================================
-- POLÍTICAS: payments
-- ============================================

-- Usuários podem ver seus próprios pagamentos
create policy "Usuários veem próprios pagamentos"
  on payments for select
  using (
    order_id in (
      select id from orders where auth.uid() = user_id or user_id is null
    )
  );
```

---

## 5. Criar tabelas via Dashboard (alternativa)

Se preferir usar a interface visual:

1. Vá em **Database** → **Table Editor**
2. Clique em **"Create a new table"**
3. Para cada tabela, siga:

### events

| Coluna | Tipo | Obrigatório | Primário |
|--------|------|-------------|----------|
| `id` | uuid | ✅ | ✅ |
| `title` | text | ✅ | |
| `slug` | text | ✅ | |
| `description` | text | | |
| `date` | timestamptz | ✅ | |
| `location` | text | ✅ | |
| `organizer_id` | uuid | | |
| `capacity` | int4 | ✅ | |
| `price` | numeric | ✅ | |
| `status` | text | ✅ | |
| `image_url` | text | | |
| `created_at` | timestamptz | ✅ | |
| `updated_at` | timestamptz | ✅ | |

### ticket_types

| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| `id` | uuid | ✅ |
| `event_id` | uuid | ✅ |
| `name` | text | ✅ |
| `price` | numeric | ✅ |
| `quantity` | int4 | ✅ |
| `sold` | int4 | ✅ |
| `created_at` | timestamptz | ✅ |

### orders

| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| `id` | uuid | ✅ |
| `event_id` | uuid | ✅ |
| `user_id` | uuid | |
| `status` | text | ✅ |
| `total` | numeric | ✅ |
| `created_at` | timestamptz | ✅ |
| `updated_at` | timestamptz | ✅ |

### order_items

| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| `id` | uuid | ✅ |
| `order_id` | uuid | ✅ |
| `ticket_type_id` | uuid | ✅ |
| `quantity` | int4 | ✅ |
| `unit_price` | numeric | ✅ |

### tickets

| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| `id` | uuid | ✅ |
| `order_id` | uuid | ✅ |
| `event_id` | uuid | ✅ |
| `user_id` | uuid | |
| `ticket_type_id` | uuid | |
| `qr_code` | text | ✅ |
| `status` | text | ✅ |
| `used_at` | timestamptz | |
| `created_at` | timestamptz | ✅ |

### payments

| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| `id` | uuid | ✅ |
| `order_id` | uuid | ✅ |
| `provider` | text | ✅ |
| `amount` | numeric | ✅ |
| `status` | text | ✅ |
| `external_id` | text | |
| `pix_code` | text | |
| `pix_expires_at` | timestamptz | |
| `created_at` | timestamptz | ✅ |
| `updated_at` | timestamptz | ✅ |

---

## 6. Inserir dados de teste

Após criar as tabelas, adicione um evento de exemplo:

```sql
-- Inserir evento de teste
insert into events (title, slug, description, date, location, capacity, price, status)
values (
  'Festival de Música 2026',
  'festival-musica-2026',
  'O maior festival de música do ano com artistas nacionais e internacionais.',
  '2026-09-15 18:00:00+00',
  'São Paulo, SP — Allianz Parque',
  5000,
  150.00,
  'published'
);

-- Inserir tipos de ingresso para o evento
insert into ticket_types (event_id, name, price, quantity)
select
  id,
  'Pista',
  150.00,
  3000
from events where slug = 'festival-musica-2026';

insert into ticket_types (event_id, name, price, quantity)
select
  id,
  'VIP',
  350.00,
  1000
from events where slug = 'festival-musica-2026';

insert into ticket_types (event_id, name, price, quantity)
select
  id,
  'Camarote',
  800.00,
  500
from events where slug = 'festival-musica-2026';
```

---

## 7. Verificar se tudo funciona

### No Supabase Dashboard

1. Vá em **Database** → **Table Editor**
2. Você deve ver as tabelas: `events`, `ticket_types`, `orders`, `order_items`, `tickets`, `payments`
3. Clique em `events` e veja o evento de teste

### Via API (após configurar o backend)

```bash
# Inicie o backend
pnpm --filter @mypass360/api dev

# Teste a API
curl http://localhost:3001/api/v1/events
```

### Via frontend

```bash
# Inicie o frontend
pnpm --filter @mypass360/web dev

# Acesse
open http://localhost:3000/eventos
```

---

## 📊 Diagrama do banco

```
┌─────────────┐       ┌─────────────────┐
│   events    │──1:N──│  ticket_types   │
│             │       │                 │
│ id (PK)     │       │ id (PK)         │
│ title       │       │ event_id (FK)   │
│ slug        │       │ name            │
│ date        │       │ price           │
│ location    │       │ quantity        │
│ capacity    │       │ sold            │
│ price       │       └─────────────────┘
│ status      │
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────────┐
│   orders    │──1:N──│  order_items    │
│             │       │                 │
│ id (PK)     │       │ id (PK)         │
│ event_id(FK)│       │ order_id (FK)   │
│ user_id     │       │ ticket_type_id  │
│ status      │       │ quantity        │
│ total       │       │ unit_price      │
└─────────────┘       └─────────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────────┐
│   tickets   │       │   payments      │
│             │       │                 │
│ id (PK)     │       │ id (PK)         │
│ order_id(FK)│       │ order_id (FK)   │
│ event_id(FK)│       │ provider        │
│ qr_code     │       │ amount          │
│ status      │       │ status          │
│ used_at     │       │ external_id     │
└─────────────┘       └─────────────────┘
```

---

## 🔧 Comandos úteis

### Resetar o banco (cuidado!)

```sql
-- Apaga TODOS os dados (não use em produção!)
truncate table payments, tickets, order_items, orders, ticket_types, events restart identity cascade;
```

### Verificar tabelas criadas

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

### Verificar políticas de RLS

```sql
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename;
```

---

## 📚 Referências

- [Supabase Docs — Tables](https://supabase.com/docs/guides/database/tables)
- [Supabase Docs — SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Docs — Data Types](https://www.postgresql.org/docs/current/datatype.html)
