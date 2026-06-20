# App Ingresso

Plataforma de venda de ingressos para eventos — monorepo com **Next.js PWA** + **NestJS API** + **Supabase**.

## Estrutura

```
app-ingresso/
├── apps/
│   ├── web/          # Next.js 15 (PWA) — site público, checkout, área do comprador
│   └── api/          # NestJS 10 — API REST modular
├── packages/
│   ├── types/        # Tipos TypeScript compartilhados
│   └── validation/   # Schemas Zod compartilhados
├── docker-compose.yml
└── turbo.json
```

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20+ |
| pnpm | 10+ |
| Conta Supabase | — |

## Configuração inicial

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Preencha com suas credenciais do [Supabase](https://supabase.com/dashboard).

### 3. Supabase local (opcional)

```bash
npx supabase init
npx supabase start
```

## Desenvolvimento

```bash
# Todos os apps juntos
pnpm dev

# Individualmente
pnpm --filter @app-ingresso/web dev    # http://localhost:3000
pnpm --filter @app-ingresso/api dev    # http://localhost:3001/api/v1
```

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia todos os apps em modo watch |
| `pnpm build` | Build de produção de todos os apps |
| `pnpm lint` | Lint em todo o monorepo |
| `pnpm test` | Testes em todos os apps |
| `pnpm type-check` | Verificação de tipos TypeScript |
| `pnpm format` | Formata com Prettier |

## Apps

### `apps/web` — Frontend PWA

- Next.js 15 com App Router
- PWA via `@serwist/next`
- Auth e dados via `@supabase/ssr`
- Porta: **3000**

### `apps/api` — Backend API

- NestJS 10 com arquitetura modular
- Supabase como banco de dados (PostgreSQL)
- Porta: **3001** | Prefixo: `/api/v1`

**Módulos disponíveis:**

| Módulo | Responsabilidade |
|---|---|
| `auth` | Registro e login via Supabase Auth |
| `events` | CRUD de eventos |
| `orders` | Criação e gestão de pedidos |
| `tickets` | Emissão e validação de ingressos |
| `payments` | Processamento de pagamentos |

## Packages

| Pacote | Conteúdo |
|---|---|
| `@app-ingresso/types` | Interfaces TypeScript (Event, Order, Ticket, User) |
| `@app-ingresso/validation` | Schemas Zod para validação de entrada |

## Banco de dados

Gerenciado pelo Supabase. Tabelas principais:

- `events` — Eventos publicados
- `ticket_types` — Tipos de ingresso por evento
- `orders` — Pedidos de compra
- `order_items` — Itens de cada pedido
- `tickets` — Ingressos emitidos com QR Code
- `payments` — Registros de pagamento

> Crie as migrations com `npx supabase migration new <nome>`.

## Deploy

| Serviço | Destino sugerido |
|---|---|
| `apps/web` | Vercel ou Netlify |
| `apps/api` | Railway, Render ou Fly.io |
| Banco | Supabase (gerenciado) |
# mnticket
