# Skill: Eventos e Cadastro de Eventos

## Objetivo
Este documento serve como referência para o desenvolvimento futuro das funcionalidades de eventos, cadastro de eventos, tipos de ingresso e fluxo de checkout no MyPass360.

## Contexto do projeto
- Monorepo TypeScript com `apps/web` (Next.js App Router) e `apps/api` (NestJS)
- Supabase/PostgreSQL como backend de dados
- `packages/types` contém contratos de domínio compartilhados
- `packages/validation` contém schemas de validação reutilizáveis
- O domínio principal é ticketing de eventos: eventos, ticket types, carrinho, pedidos e pagamentos

## Estrutura de evento
### Banco de dados
- `supabase/migrations/20260626015817_create_initial_schema.sql`
  - `events`: id, title, slug, description, date, location, organizer_id, capacity, price, status, image_url, created_at, updated_at
  - `ticket_types`: id, event_id, name, price, quantity, description, sold, created_at
  - `orders`, `order_items`, `tickets`, `payments`
- `supabase/migrations/20260714000000_add_description_to_ticket_types.sql`
  - adiciona a coluna `description` em `ticket_types`

### Backend (API)
- `apps/api/src/modules/events/events.module.ts`
- `apps/api/src/modules/events/events.controller.ts`
- `apps/api/src/modules/events/events.service.ts`
- `apps/api/src/modules/events/events.repository.ts`
- `apps/api/src/modules/events/dto/create-event.dto.ts`

#### Boas práticas de API
- Controllers devem ser finos, delegando regra para services
- Validar payloads via DTOs e `class-validator`
- Persistir transações e incluir `ticket_types` com descrição quando presentes
- Usar `slug` como chave amigável para eventos públicos

## Frontend (Web)
### Páginas e componentes principais
- `apps/web/src/app/eventos/page.tsx` — listagem de eventos
- `apps/web/src/app/eventos/[slug]/page.tsx` — detalhe do evento, seleção de ingressos, compra direta e carrinho
- `apps/web/src/app/eventos/cadastrar/page.tsx` — cadastro de evento
- `apps/web/src/app/carrinho/page.tsx` — carrinho de ingressos
- `apps/web/src/app/checkout/page.tsx` — checkout de um evento ou carrinho
- `apps/web/src/app/checkout/pagamento/page.tsx` — tela de pagamento PIX

### Comportamento de fluxo
- `Comprar agora` deve pular o carrinho e ir direto para o checkout do evento selecionado
- `Adicionar ao carrinho` deve manter o item no carrinho e não avançar ao checkout
- `Adicionar tudo ao carrinho` deve adicionar todas as quantidades selecionadas
- `Comprar tudo` deve criar checkout direto com as entradas selecionadas no evento
- O botão de voltar em telas internas deve ser posicionado no conteúdo e não na navbar
- Na confirmação de pagamento, o botão voltar deve considerar a origem (`event` ou `cart`)

### UX / Visibilidade de ingressos
- Só apresentar tipos de ingresso com quantidade selecionada no resumo de checkout
- O campo `description` de ticket type deve ser mostrado quando presente
- A quantidade deve resetar para zero após adicionar ao carrinho, mas não após compra direta

## Contratos e validação
- `packages/types/src/event.types.ts`
- `packages/types/src/ticket.types.ts`
- `packages/types/src/order.types.ts`
- `packages/types/src/payment.types.ts`
- `packages/validation/src/schemas/event.schema.ts`
- `packages/validation/src/schemas/order.schema.ts`
- `packages/validation/src/schemas/ticket.schema.ts`

### Diretrizes de schema
- Reutilizar tipos compartilhados sempre que possível
- Validar `slug`, `date`, `price`, `quantity` e `status`
- Incluir `description` em `ticket_types` como opcional

## Padrões de implementação
### Eventos e cadastro
- Nomear arquivos e componentes por função: `eventos`, `cadastrar`, `checkout`
- Usar `fetchPublishedEventBySlug` para buscar evento público por `slug`
- Manter a lógica de formulário em client component quando usar estado local
- Manter carregamento e mensagens de erro explícitas

### Checkout direto vs carrinho
- Diferenciar origem com parâmetro `from=event` ou `from=cart`
- Guardar seleção direta em `sessionStorage` enquanto o usuário avança para o checkout
- Carregar itens do carrinho apenas quando a origem for `cart`
- No checkout direto, não preencher `selectedItems` com entradas zeradas

## Problemas recorrentes
- Evitar que `create policy` de RLS repita sem `drop policy if exists`
- Verificar sempre o uso de `router.back()` vs redirecionamento explícito para evitar navegação errada
- Validar `hydrateSelectedItems` no hook de checkout para não gerar runtime error
- Testar o fluxo `comprar agora` com múltiplos tipos e quantidades zeradas

## Recomendações para futuras alterações
1. Ao adicionar novos campos em `ticket_types`, atualizar schema, DTO e frontend juntos.
2. Sempre revisar a origem do checkout antes de decidir entre `cart` e `event`.
3. Priorizar UX transparente: botão de voltar deve ser previsível e consistente.
4. Manter a nomenclatura do domínio em português para facilitar entendimento do time.

## Como usar esta skill
- Consulte este documento antes de mexer no domínio de eventos
- Verifique os arquivos listados para saber onde implementar cada mudança
- Use os padrões de fluxo e contratados para manter consistência
- Atualize o documento quando o domínio de eventos ganhar novos requisitos

## Anotações rápidas
- `eventos` = lista e detalhe de evento
- `cadastrar evento` = criação de evento com tipos de ingresso
- `checkout` = finalização de compra, pode ser direto ou via carrinho
- `pagamento` = etapa PIX / confirmação de pagamento
- `carrinho` = agrupamento de itens por evento
