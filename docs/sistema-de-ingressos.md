# 🎫 Sistema de Ingressos — MyPass360

Documentação técnica e funcional do sistema de ingressos da plataforma MyPass360.

---

## Visão Geral

Na criação de eventos, o ingresso é sempre do tipo **Ticket**. O organizador escolhe se os ingressos serão sem identificação ou com nome obrigatório:

| Eixo | Campo no banco | O que controla |
|---|---|---|
| **Modelo do ingresso** | `events.ticket_layout` | Formato do ingresso (Ticket nas novas criações) |
| **Identificação do participante** | `events.participant_id_type` | Se o nome do portador é exigido |

Eventos antigos com `ticket_layout = 'formal_pdf'` continuam compatíveis, mas esse modelo não é mais oferecido ao criar eventos.

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

#### 👤 Com nome *(obrigatório)*
- `participant_id_type = 'name'`
- Durante o checkout, é obrigatório informar o nome do portador de cada ingresso
- A compra não pode continuar se algum nome estiver vazio, inclusive pela API
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

### Combinação B: Ticket + Com nome (obrigatório)
```
Dono do evento configura:
  ticket_layout = 'ticket'
  participant_id_type = 'name'

Comprador no checkout:
  → Deve preencher o nome do portador para cada ingresso
  → A validação impede a finalização sem todos os nomes

Ingresso gerado:
  buyer_name = nome informado

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
- Marcar cada tipo como **sem limite de quantidade**; eventos gratuitos também podem não ter limite de vagas

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
| `is_capacity_unlimited` | `BOOLEAN` | Capacidade gratuita ilimitada | `false` |

> `'formal_pdf'` e `'name_cpf'` permanecem por compatibilidade com eventos antigos; não são oferecidos na criação.

### Tabela `ticket_types`
| Campo | Tipo | Uso |
|---|---|---|
| `is_unlimited` | `BOOLEAN` | Quando `true`, o tipo de ingresso não tem limite de quantidade |

### Tabela `tickets`
| Campo | Tipo | Preenchimento |
|---|---|---|
| `buyer_name` | `TEXT` | `null` se `participant_id_type = 'none'`; nome do portador nos demais casos |
| `buyer_email` | `TEXT` | Sempre o e-mail da conta do comprador |
| `buyer_cpf` | `TEXT` | Utilizado apenas em eventos antigos com `ticket_layout = 'formal_pdf'` |
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

2. **Nome obrigatório**: Em eventos configurados com `participant_id_type = 'name'`, o nome de cada portador é obrigatório no checkout e validado também no backend.

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
| `CadastrarEventoForm` | `apps/web/src/app/eventos/cadastrar/page.tsx` | Formulário de criação/edição com identificação e limite de ingressos |
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
