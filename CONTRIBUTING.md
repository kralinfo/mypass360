# Guia de Contribuição — MyPass360

Bem-vindo ao repositório do **MyPass360**! Este documento explica como configurar, rodar e contribuir com o projeto.

---

## 📋 Índice

1. [Visão geral do projeto](#1-visão-geral-do-projeto)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Configuração inicial](#3-configuração-inicial)
4. [Rodando o projeto localmente](#4-rodando-o-projeto-localmente)
5. [Estrutura do monorepo](#5-estrutura-do-monorepo)
6. [Fluxo de trabalho com Git](#6-fluxo-de-trabalho-com-git)
7. [Banco de dados (Supabase)](#7-banco-de-dados-supabase)
8. [Scripts disponíveis](#8-scripts-disponíveis)
9. [Padrões de código](#9-padrões-de-código)
10. [Como contribuir (Pull Requests)](#10-como-contribuir-pull-requests)
11. [Problemas comuns](#11-problemas-comuns)

---

## 1. Visão geral do projeto

O **MyPass360** é uma plataforma de venda de ingressos para eventos. É um **monorepo TypeScript** com:

| Camada | Tecnologia | Responsabilidade |
|--------|------------|------------------|
| **Frontend** | Next.js 15 (PWA) | Site público, checkout, área do comprador |
| **Backend** | NestJS 10 | API REST de eventos, pedidos, pagamentos, tickets |
| **Banco** | Supabase (PostgreSQL) | Autenticação, storage, banco de dados |
| **Infra** | pnpm + Turborepo | Workspaces, cache de build, tasks paralelas |

---

## 2. Pré-requisitos

Antes de começar, instale as seguintes ferramentas:

| Ferramenta | Versão mínima | Onde instalar |
|------------|---------------|---------------|
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org) ou `brew install node` |
| **pnpm** | 10+ | `npm install -g pnpm@10` |
| **Git** | 2.40+ | `brew install git` |
| **NestJS CLI** (opcional) | 10+ | `npm install -g @nestjs/cli` |
| **Supabase CLI** (opcional) | latest | [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli) |

Verifique se tudo está funcionando:

```bash
node -v        # v20.0.0 ou superior
pnpm -v       # 10.0.0 ou superior
git --version  # 2.40.0 ou superior
```

---

## 3. Configuração inicial

### 3.1. Clonar o repositório

```bash
git clone https://github.com/kralinfo/mnticket.git
cd mnticket
```

> ⚠️ Se preferir outro nome de pasta: `git clone https://github.com/kralinfo/mnticket.git mypass360`

### 3.2. Instalar dependências

```bash
pnpm install
```

### 3.3. Configurar variáveis de ambiente

Copie os arquivos de exemplo e preencha com suas credenciais:

```bash
# Raiz do projeto
cp .env.example .env

# Frontend
cp apps/web/.env.local.example apps/web/.env.local

# Backend
cp apps/api/.env.example apps/api/.env
```

#### Variáveis do Supabase (`.env` e `apps/web/.env.local`)

| Variável | O que é | Onde encontrar |
|----------|----------|----------------|
| `SUPABASE_URL` | URL do projeto Supabase | Project Settings → API |
| `SUPABASE_ANON_KEY` | Chave pública (anon) | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (backend apenas) | Project Settings → API → Service Role |

#### Variáveis do frontend (`apps/web/.env.local`)

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xyz.supabase.co` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Chave anon |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL da API |

#### Variáveis do backend (`apps/api/.env`)

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `NODE_ENV` | `development` | Ambiente |
| `PORT` | `3001` | Porta da API |
| `CORS_ORIGIN` | `http://localhost:3000` | Origem permitida |
| `SUPABASE_URL` | `https://xyz.supabase.co` | URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Chave de serviço |

---

## 4. Rodando o projeto localmente

### 4.1. Com tudo junto (recomendado para desenvolvimento)

```bash
pnpm dev
```

Isso inicia **frontend + backend** simultaneamente.

### 4.2. Individualmente

```bash
# Terminal 1 — Backend
pnpm --filter @mypass360/api dev

# Terminal 2 — Frontend
pnpm --filter @mypass360/web dev
```

### 4.3. Acessos

| Serviço | URL |
|---------|-----|
| **Frontend (PWA)** | http://localhost:3000 |
| **API** | http://localhost:3001/api/v1 |
| **Documentação da API** | http://localhost:3001/api/v1/docs |

---

## 5. Estrutura do monorepo

```
mypass360/
├── apps/
│   ├── web/                          # Next.js 15 — Frontend PWA
│   │   ├── public/                   # Assets estáticos, manifest.json
│   │   ├── src/
│   │   │   ├── app/                  # Páginas (App Router)
│   │   │   │   ├── page.tsx          # Home
│   │   │   │   ├── eventos/          # Listagem e detalhe de eventos
│   │   │   │   ├── checkout/         # Página de checkout
│   │   │   │   └── (auth)/           # Login e cadastro
│   │   │   ├── features/             # Módulos de negócio
│   │   │   │   ├── events/           # Eventos (service, hooks, components)
│   │   │   │   └── checkout/         # Checkout (service, hooks, components)
│   │   │   ├── lib/                  # Utilitários
│   │   │   │   ├── api.ts            # Client HTTP para a API
│   │   │   │   └── supabase/         # Clientes Supabase (browser/server)
│   │   │   └── sw.ts                 # Service Worker (PWA)
│   │   └── Dockerfile
│   │
│   └── api/                          # NestJS 10 — Backend
│       └── src/
│           ├── app.module.ts         # Módulo raiz
│           ├── main.ts               # Entry point
│           ├── common/               # Recursos compartilhados
│           │   └── supabase/         # Serviço e módulo Supabase
│           └── modules/              # Módulos de negócio
│               ├── auth/             # Autenticação
│               ├── events/           # Eventos
│               ├── orders/           # Pedidos
│               ├── payments/         # Pagamentos
│               └── tickets/          # Ingressos
│
├── packages/
│   ├── types/                        # Tipos TypeScript compartilhados
│   │   └── src/
│   │       ├── event.types.ts
│   │       ├── order.types.ts
│   │       ├── ticket.types.ts
│   │       └── user.types.ts
│   └── validation/                   # Schemas Zod compartilhados
│       └── src/schemas/
│           ├── event.schema.ts
│           ├── order.schema.ts
│           └── ticket.schema.ts
│
├── .github/
│   ├── workflows/ci.yml              # CI (GitHub Actions)
│   └── copilot-instructions.md      # Instruções para IA
│
├── package.json                      # Workspace raiz
├── pnpm-workspace.yaml               # Definição dos workspaces
├── turbo.json                        # Configuração do Turborepo
├── docker-compose.yml                # Docker para desenvolvimento
├── .env.example                      # Template de variáveis
├── .gitignore
├── .prettierrc                       # Configuração do Prettier
├── tsconfig.base.json                # TypeScript base
├── README.md
└── CONTRIBUTING.md                   # Este arquivo
```

---

## 6. Fluxo de trabalho com Git

### 6.1. Branching

- **`main`** — branch principal (protegida)
- **Feature branches** — `feat/nome-da-feature`
- **Bugfix branches** — `fix/nome-do-bug`
- **Hotfix branches** — `hotfix/nome-do-hotfix`

### 6.2. Ciclo de uma feature

```bash
# 1. Crie sua branch a partir da main
git checkout main
git pull origin main
git checkout -b feat/minha-feature

# 2. Desenvolva e faça commits
git add .
git commit -m "feat: adiciona funcionalidade X"

# 3. Push da branch
git push -u origin feat/minha-feature

# 4. Abra um Pull Request no GitHub

# 5. Após aprovação e merge, limpe
git checkout main
git pull origin main
git branch -d feat/minha-feature
```

### 6.3. Convenção de commits

Seguimos o padrão **Conventional Commits**:

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| `feat` | Nova funcionalidade | `feat: adiciona checkout de ingressos` |
| `fix` | Correção de bug | `fix: corrige validação de CEP` |
| `docs` | Documentação | `docs: atualiza README` |
| `style` | Formatação (sem mudança de lógica) | `style: formata com Prettier` |
| `refactor` | Refatoração | `refactor: extrai service de pagamento` |
| `test` | Testes | `test: adiciona teste de criação de evento` |
| `chore` | Configuração/infra | `chore: atualiza dependências` |

---

## 7. Banco de dados (Supabase)

### 7.1. Usando Supabase remoto (recomendado para desenvolvimento)

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e as chaves para os `.env`
4. Execute as migrations no **SQL Editor** do Supabase

### 7.2. Supabase local (opcional)

```bash
# Inicializa o Supabase local
npx supabase init

# Inicia os serviços (Docker necessário)
npx supabase start

# Acesse o Studio
# http://localhost:54323

# Crie uma migration
npx supabase migration new create_events

# Aplique as migrations
npx supabase migration up
```

### 7.3. Tabelas principais

```sql
-- Eventos
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  date timestamptz not null,
  location text,
  organizer_id uuid references auth.users(id),
  capacity int,
  price numeric default 0,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pedidos
create table orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  user_id uuid references auth.users(id),
  status text default 'pending',
  total numeric,
  created_at timestamptz default now()
);

-- Itens do pedido
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  ticket_type_id text,
  quantity int,
  unit_price numeric
);

-- Ingressos
create table tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  event_id uuid references events(id),
  user_id uuid references auth.users(id),
  qr_code text,
  status text default 'active',
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Pagamentos
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  provider text,
  amount numeric,
  status text default 'pending',
  external_id text,
  created_at timestamptz default now()
);
```

### 7.4. Row Level Security (RLS)

Habilite RLS nas tabelas para segurança:

```sql
-- Habilitar RLS
alter table events enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;

-- Política: qualquer um pode ler eventos publicados
create policy "Eventos publicos são visiveis" on events
  for select using (status = 'published');

-- Política: usuários só veem seus próprios pedidos
create policy "Usuarios veem proprios pedidos" on orders
  for select using (auth.uid() = user_id);
```

---

## 8. Scripts disponíveis

Execute na raiz do projeto:

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia todos os apps em modo desenvolvimento |
| `pnpm build` | Build de produção de todos os apps |
| `pnpm lint` | Lint em todo o monorepo |
| `pnpm test` | Testes em todos os apps |
| `pnpm type-check` | Verificação de tipos TypeScript |
| `pnpm format` | Formata código com Prettier |

### Scripts por app

```bash
# Apenas web
pnpm --filter @mypass360/web dev
pnpm --filter @mypass360/web build

# Apenas API
pnpm --filter @mypass360/api dev
pnpm --filter @mypass360/api build
```

---

## 9. Padrões de código

### 9.1. Princípios

- **SOLID** — Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
- **DRY** — Don't Repeat Yourself
- **Clean Architecture** — Controllers finos, Services com lógica, Repositories para dados

### 9.2. Frontend (Next.js)

```
src/features/nome-da-feature/
  ├── components/     # Componentes React (apenas UI)
  ├── hooks/          # Custom hooks (estado e orquestração)
  ├── services/       # Chamadas à API
  └── types.ts        # Tipos específicos
```

**Regras:**
- Componentes **nunca** contêm lógica de negócio
- Hooks gerenciam estado
- Services fazem chamadas HTTP

### 9.3. Backend (NestJS)

```
src/modules/nome-do-modulo/
  ├── dto/            # Data Transfer Objects (validação)
  ├── entities/       # Entidades do banco
  ├── controller.ts   # Apenas request/response
  ├── service.ts      # Lógica de negócio
  └── repository.ts   # Acesso a dados
```

**Regras:**
- Controllers são finos
- Services contêm lógica
- Repositories acessam dados

### 9.4. TypeScript

- **strict: true** habilitado
- Nomeação intencional (evite `data`, `helper`, `utils`)
- Funções pequenas (< 50 linhas)
- Arquivos pequenos (< 300 linhas)

### 9.5. Formatação

O **Prettier** está configurado. Execute:

```bash
pnpm format
```

---

## 10. Como contribuir (Pull Requests)

### Checklist antes de abrir PR

- [ ] Criei minha branch a partir de `main`
- [ ] Meu código compila sem erros (`pnpm build`)
- [ ] Meu código passa no lint (`pnpm lint`)
- [ ] Meu código passa nos testes (`pnpm test`)
- [ ] Tipos estão corretos (`pnpm type-check`)
- [ ] Atualizei a documentação se necessário
- [ ] Meu commit segue o padrão Conventional Commits

### Template de PR

```markdown
## O que foi feito

Breve descrição das mudanças.

## Tipo de mudança

- [ ] Nova funcionalidade (feat)
- [ ] Correção de bug (fix)
- [ ] Documentação (docs)
- [ ] Refatoração (refactor)

## Como testar

1. Passos para reproduzir
2. Resultado esperado

## Screenshots (se aplicável)

## Observações

```

### Review process

1. Abra o PR
2. Aguarde CI passar
3. Solicite review
4. Após aprovação, faça merge

---

## 11. Problemas comuns

### Erro: `ECONNREFUSED` ao acessar `/eventos`

**Causa:** A API não está rodando.

**Solução:** Inicie o backend:
```bash
pnpm --filter @mypass360/api dev
```

### Erro: `Cannot find module '@mypass360/types'`

**Causa:** Dependências não instaladas ou pacotes não linkados.

**Solução:**
```bash
pnpm install
pnpm build
```

### Erro: `Invalid API key` no Supabase

**Causa:** Variáveis de ambiente não configuradas.

**Solução:** Verifique se os `.env` estão preenchidos corretamente.

### Erro: Build falha com TypeScript

**Causa:** Erros de tipo no código.

**Solução:**
```bash
pnpm type-check
```
Corrija os erros indicados.

### Porta já em uso

**Causa:** Outra aplicação está usando a mesma porta.

**Solução:** Mate o processo ou use outra porta:
```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9

# Ou inicie em outra porta
pnpm --filter @mypass360/web dev -- -p 3002
```

---

## 📞 Dúvidas?

- Abra uma **Issue** no GitHub
- Consulte a documentação do [Next.js](https://nextjs.org/docs), [NestJS](https://docs.nestjs.com), ou [Supabase](https://supabase.com/docs)

---

**Bem-vindo ao time! 🚀**
