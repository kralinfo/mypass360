# 🎫 Sistema de Ingressos — MyPass360

Documentação técnica e funcional do sistema de ingressos da plataforma MyPass360.

---

## Visão Geral

O sistema de ingressos possui **dois eixos de configuração independentes** definidos pelo dono do evento:

| Eixo | Campo no banco | O que controla |
|---|---|---|
| **Modelo do ingresso** | `events.ticket_layout` | Layout visual e nível de formalidade do PDF |
| **Identificação do participante** | `events.participant_id_type` | Se o portador precisa ser identificado e como |

Cada combinação resulta em uma experiência de checkout e de ingresso distinta para o comprador.

---

## Configurações disponíveis para o dono do evento

### 1. Modelo do Ingresso (`ticket_layout`)

#### 🎫 Ticket *(padrão)*
- `ticket_layout = 'ticket'`
- Layout compacto no estilo ingresso físico real (200mm × 75mm, horizontal)
- Fundo com gradiente roxo-azul, stub lateral destacável simulado
- QR Code no canto direito (stub)
- Ideal para eventos sociais, festas, shows, caminhadas
- **Permite configurar a identificação do participante** (ver seção abaixo)
- O portador pode editar o nome do ingresso em "Meus Ingressos" após a compra

#### 📄 PDF Formal
- `ticket_layout = 'formal_pdf'`
- PDF A4 profissional, com cabeçalho institucional e dados completos
- **Nome completo e CPF são obrigatórios para cada ingresso no checkout**
- O nome é gravado permanentemente — não pode ser editado após a emissão
- Ideal para eventos corporativos, seminários, congressos e cursos
- `participant_id_type` é ignorado neste modelo (identificação sempre completa)

---

### 2. Identificação do Participante (`participant_id_type`)
> Aplicável apenas quando `ticket_layout = 'ticket'`

#### 🚫 Sem nome — Ingresso Transferível
- `participant_id_type = 'none'`
- Nenhum dado de identificação é solicitado no checkout
- O ingresso **não contém nome em lugar nenhum**: nem na tela, nem no PDF, nem no preview
- O campo `buyer_name` é salvo como `null` permanentemente no banco
- O card em "Meus Ingressos" exibe o badge **"🎫 Ingresso ao Portador / Transferível"**
- O portador **não pode editar o nome** (não há campo de edição)
- Ideal para eventos onde o ingresso pode ser repassado livremente

#### 👤 Com nome *(opcional)*
- `participant_id_type = 'name'`
- Durante o checkout, o comprador **pode** informar o nome do portador de cada ingresso
- Se não preencher: o ingresso é gerado no nome do comprador (nome da conta)
- Após a compra, o portador **pode editar o nome** diretamente em "Meus Ingressos"
- A edição é permitida somente no modelo `ticket` — nunca no `formal_pdf`

---

## Fluxo completo por combinação

### Combinação A: Ticket + Sem nome
```
Dono do evento configura:
  ticket_layout = 'ticket'
  participant_id_type = 'none'

Comprador no checkout:
  → Não vê nenhum campo de nome
  → Finaliza a compra normalmente

Ingresso gerado:
  buyer_name = null (permanentemente)

Em "Meus Ingressos":
  → Card exibe badge "🎫 Ingresso ao Portador / Transferível"
  → Sem campo de edição de nome
  → PDF/Preview também sem nome, apenas badge

No PDF baixado:
  → Seção PORTADOR mostra "🎫 INGRESSO AO PORTADOR / TRANSFERÍVEL" (em itálico)
```

### Combinação B: Ticket + Com nome (opcional)
```
Dono do evento configura:
  ticket_layout = 'ticket'
  participant_id_type = 'name'

Comprador no checkout:
  → Pode preencher o nome do portador para cada ingresso
  → Se não preencher: nome da conta é usado automaticamente

Ingresso gerado:
  buyer_name = nome informado OU nome da conta

Em "Meus Ingressos":
  → Card exibe o nome do portador
  → Ícone de lápis ✏️ permite editar o nome inline
  → Ao salvar, o backend atualiza e refaz o fetch

No PDF baixado:
  → Seção COMPRADOR exibe o nome em maiúsculas
```

### Combinação C: PDF Formal
```
Dono do evento configura:
  ticket_layout = 'formal_pdf'
  (participant_id_type é irrelevante)

Comprador no checkout:
  → Obrigatório preencher nome completo e CPF para cada ingresso
  → Dados são vinculados formalmente ao ingresso

Ingresso gerado:
  buyer_name = nome informado (obrigatório)
  buyer_cpf  = CPF informado (obrigatório)

Em "Meus Ingressos":
  → Card exibe o nome do portador
  → SEM campo de edição (nome não pode ser alterado após emissão)

No PDF baixado:
  → Layout A4 com dados institucionais, nome completo e CPF do portador
```

---

## Tipos de ingresso (Ticket Types)

Cada evento possui uma lista de tipos de ingresso configurados pelo dono. Por padrão são criados:

| Nome | Preço |
|---|---|
| Inteira | Preço base do evento |
| Meia-entrada | Metade do preço base |

O dono pode:
- **Editar** qualquer tipo existente (nome, preço, quantidade)
- **Adicionar** novos tipos (ex: VIP, Cortesia, Estudante)
- **Remover** tipos que não possuem vendas associadas

> ⚠️ Tipos com pedidos vinculados não podem ser removidos (proteção de chave estrangeira no banco).

### Unicidade
A tabela `ticket_types` possui constraint `UNIQUE (event_id, name)` — dois tipos com o mesmo nome no mesmo evento são bloqueados em nível de banco.

---

## Dados técnicos do banco

### Tabela `events`
| Campo | Tipo | Valores | Padrão |
|---|---|---|---|
| `ticket_layout` | `TEXT` | `'ticket'`, `'formal_pdf'` | `'ticket'` |
| `participant_id_type` | `TEXT` | `'none'`, `'name'`, `'name_cpf'` | `'name'` |

> `'name_cpf'` está reservado para uso futuro no modelo Ticket (nome + CPF opcionais). Atualmente não é exposto na UI.

### Tabela `tickets`
| Campo | Tipo | Preenchimento |
|---|---|---|
| `buyer_name` | `TEXT` | `null` se `participant_id_type = 'none'`; nome do portador nos demais casos |
| `buyer_email` | `TEXT` | Sempre o e-mail da conta do comprador |
| `buyer_cpf` | `TEXT` | Obrigatório apenas em `ticket_layout = 'formal_pdf'` |
| `public_code` | `TEXT` | Código amigável gerado automaticamente (ex: `MP360-ABCD1234`) |
| `qr_code` | `TEXT` | Data URL da imagem QR Code (contém apenas o UUID do ticket) |

### Tabela `order_items`
| Campo | Tipo | Uso |
|---|---|---|
| `nominee_names` | `TEXT[]` | Array de nomes, um por ingresso (modelo `name`) |
| `nominee_cpfs` | `TEXT[]` | Array de CPFs, um por ingresso (modelo `formal_pdf`) |

---

## Regras de negócio

1. **Ingresso transferível é permanente**: Uma vez criado com `buyer_name = null`, o nome nunca pode ser adicionado — nem pelo comprador, nem pelo sistema.

2. **PDF Formal é imutável**: O nome e CPF gravados no checkout do PDF Formal não podem ser editados. A tela de "Meus Ingressos" não exibe o campo de edição para esse modelo.

3. **Sincronização de tipos de ingresso**: Ao editar um evento, o sistema faz merge inteligente:
   - Tipos existentes com o mesmo nome recebem `UPDATE`
   - Tipos novos recebem `INSERT`
   - Tipos removidos recebem `DELETE` apenas se não tiverem pedidos associados

4. **QR Code**: Contém apenas o UUID interno do ticket (nunca dados pessoais). A validação ocorre pelo backend ao escanear.

5. **Geração de ingressos**: Ocorre após a confirmação do pagamento. O `participant_id_type` do evento é consultado **uma única vez** antes de criar todos os tickets do pedido.

---

## Componentes frontend relevantes

| Componente | Localização | Função |
|---|---|---|
| `CadastrarEventoForm` | `apps/web/src/app/eventos/cadastrar/page.tsx` | Formulário de criação/edição com seleção de modelo de ingresso |
| `TicketCard` | `apps/web/src/features/tickets/components/TicketCard.tsx` | Card em "Meus Ingressos" com edição inline de nome |
| `TicketPdfGenerator` | `apps/web/src/features/tickets/components/TicketPdfGenerator.tsx` | Gerador de PDF compacto e formal, com modal de preview |
| `MyTicketsPage` | `apps/web/src/features/tickets/components/MyTicketsPage.tsx` | Página principal de ingressos do usuário |

---

## Endpoints backend relevantes

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/tickets/my` | Lista todos os ingressos do usuário autenticado |
| `PATCH` | `/api/v1/tickets/:id/buyer-name` | Atualiza o nome do portador (apenas modelo Ticket) |
| `POST` | `/api/v1/tickets/validate` | Valida e faz check-in de um ingresso pelo QR Code |
