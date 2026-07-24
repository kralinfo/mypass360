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
pnpm --dir apps/api exec nest start --watch

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
- Ao continuar, o backend cria uma **Preferência (Checkout Pro)** no Mercado Pago e o comprador é redirecionado para o ambiente seguro do Mercado Pago para concluir o pagamento (PIX, cartão, boleto, etc).
- Após o pagamento, o Mercado Pago redireciona de volta para `/checkout/pagamento` e o **webhook** confirma e atualiza o pedido para `paid`.

> Usamos o Checkout Pro (`Preference`) em vez da API de Pagamentos direta porque contas novas/não totalmente verificadas do Mercado Pago costumam receber o erro `Unauthorized use of live credentials` ao tentar criar pagamentos PIX diretamente. O Checkout Pro não tem essa restrição.

### Configuração de pagamentos

```bash
cp apps/api/.env.example apps/api/.env
```

Preencha:
- `MERCADO_PAGO_ACCESS_TOKEN` com a credencial do seu aplicativo Mercado Pago.
- `WEB_APP_URL` com o domínio público do frontend (ex: `https://app.mypass360.com`). **Não funciona com `localhost`** — o Mercado Pago rejeita `back_urls` locais.
- `API_PUBLIC_URL` com o domínio público do backend, usado para informar o `notification_url` do webhook automaticamente.

> Em desenvolvimento local, se `WEB_APP_URL` continuar como `localhost`, o backend simplesmente omite `back_urls`/`auto_return` para evitar erro do Mercado Pago — o comprador ainda consegue pagar, só não retorna automaticamente ao site.

> O checkout depende do e-mail do comprador autenticado no Supabase.
> Sem um usuário logado com e-mail válido, a criação da preferência é bloqueada.

### Webhook do Mercado Pago

- Configure no painel do Mercado Pago a URL:

```text
http://localhost:3001/api/v1/payments/webhook/mercadopago
```

- Em produção, use a URL pública do backend com o mesmo caminho (ou deixe o backend informar automaticamente via `API_PUBLIC_URL`).
- O webhook consulta o status do pagamento no Mercado Pago e atualiza o pedido para `paid` quando a cobrança é aprovada.

### Endpoint de Checkout Pro

- `POST /api/v1/payments/preference` recebe `{ orderId, amount, payerEmail }` e retorna `{ preferenceId, initPoint }`.
- O frontend redireciona o navegador para `initPoint`, que é a página hospedada pelo Mercado Pago para concluir o pagamento.

## Deploy

| Serviço | Destino atual |
|---|---|
| `apps/web` | Vercel |
| `apps/api` | Render |
| Banco | Supabase (gerenciado) |

### Deploy do `apps/api` (Render)

- **Root Directory:** `.` (raiz do monorepo)
- **Build Command:**
  ```bash
  pnpm install --frozen-lockfile && pnpm --filter @mypass360/api build
  ```
- **Start Command:**
  ```bash
  node apps/api/dist/main.js
  ```
- **Environment Variables:** as mesmas de `apps/api/.env`, mais:
  - `CORS_ORIGIN` → domínio de produção do `apps/web` (Vercel)
  - `WEB_APP_URL` → domínio de produção do `apps/web` (Vercel)
  - `API_PUBLIC_URL` → domínio do próprio serviço no Render (ex: `https://mypass360.onrender.com`)

> A raiz `/` não existe — todas as rotas ficam sob `/api/v1`. Teste com `/api/v1/events`.

### Deploy do `apps/web` (Vercel)

- **Root Directory:** `apps/web`
- **Build Command:**
  ```bash
  cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @mypass360/web build
  ```
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` → URL pública da API no Render
  - `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`

### Depois de publicar os dois

1. Atualize `CORS_ORIGIN` e `WEB_APP_URL` no Render com a URL final da Vercel.
2. Cadastre o webhook no painel do Mercado Pago com a URL pública do Render (`/api/v1/payments/webhook/mercadopago`).
