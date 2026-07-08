# MyPass360

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
pnpm --filter @mypass360/web dev    # http://localhost:3000
pnpm --filter @mypass360/api dev    # http://localhost:3001/api/v1
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
| `@mypass360/types` | Interfaces TypeScript (Event, Order, Ticket, User) |
| `@mypass360/validation` | Schemas Zod para validação de entrada |

## Banco de dados

Gerenciado pelo Supabase. Tabelas principais:

- `events` — Eventos publicados
- `ticket_types` — Tipos de ingresso por evento
- `orders` — Pedidos de compra
- `order_items` — Itens de cada pedido
- `tickets` — Ingressos emitidos com QR Code
- `payments` — Registros de pagamento

> Crie as migrations com `npx supabase migration new <nome>`.

### Migrações importantes do checkout/PIX

- A migração `supabase/migrations/20260708010500_add_pix_columns_to_payments.sql` adiciona as colunas `pix_code` e `pix_expires_at`.
- Se a tabela `payments` já existia antes dessa alteração, execute essa migração no projeto Supabase antes de testar `POST /payments`.
- Sem essas colunas, a API retorna erro semelhante a `Could not find the 'pix_code' column of 'payments' in the schema cache`.

### Fluxo atual de compra

- O checkout cria primeiro o pedido em `orders`.
- A tela `/checkout/pagamento` mostra o método de pagamento.
- No MVP, apenas `PIX` está habilitado.
- Ao escolher `PIX`, a API cria a cobrança mockada e retorna o código copia e cola.

## Deploy

| Serviço | Destino sugerido |
|---|---|
| `apps/web` | Vercel ou Netlify |
| `apps/api` | Railway, Render ou Fly.io |
| Banco | Supabase (gerenciado) |
