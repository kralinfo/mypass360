-- ============================================
-- MyPass360 — Seed Data (Dados de teste)
-- Created: 2026-06-26
-- ============================================

-- Inserir evento de teste: Festival de Música
insert into events (title, slug, description, date, location, capacity, price, status)
values (
  'Festival de Música 2026',
  'festival-musica-2026',
  'O maior festival de música do ano com artistas nacionais e internacionais. Shows inesquecíveis, comida e diversão para toda a família.',
  '2026-09-15 18:00:00+00',
  'São Paulo, SP — Allianz Parque',
  5000,
  150.00,
  'published'
);

-- Tipos de ingresso para o Festival
insert into ticket_types (event_id, name, price, quantity)
select id, 'Pista', 150.00, 3000 from events where slug = 'festival-musica-2026';

insert into ticket_types (event_id, name, price, quantity)
select id, 'VIP', 350.00, 1000 from events where slug = 'festival-musica-2026';

insert into ticket_types (event_id, name, price, quantity)
select id, 'Camarote', 800.00, 500 from events where slug = 'festival-musica-2026';

-- Inserir segundo evento: Show de Rock
insert into events (title, slug, description, date, location, capacity, price, status)
values (
  'Show de Rock Nacional',
  'show-rock-nacional',
  'Uma noite dedicada ao rock nacional com as maiores bandas do cenário brasileiro.',
  '2026-08-20 20:00:00+00',
  'Rio de Janeiro, RJ — Jeunesse Arena',
  15000,
  120.00,
  'published'
);

insert into ticket_types (event_id, name, price, quantity)
select id, 'Pista', 120.00, 10000 from events where slug = 'show-rock-nacional';

insert into ticket_types (event_id, name, price, quantity)
select id, 'Camarote', 400.00, 2000 from events where slug = 'show-rock-nacional';

-- Inserir terceiro evento: Stand-Up Comedy
insert into events (title, slug, description, date, location, capacity, price, status)
values (
  'Noite de Stand-Up',
  'night-stand-up',
  'Os melhores comediantes em uma noite de risadas garantidas.',
  '2026-07-10 21:00:00+00',
  'Belo Horizonte, MG — Palácio das Artes',
  800,
  80.00,
  'published'
);

insert into ticket_types (event_id, name, price, quantity)
select id, 'Meia-entrada', 40.00, 400 from events where slug = 'night-stand-up';

insert into ticket_types (event_id, name, price, quantity)
select id, 'Inteira', 80.00, 400 from events where slug = 'night-stand-up';

-- Evento em rascunho (não deve aparecer no site)
insert into events (title, slug, description, date, location, capacity, price, status)
values (
  'Conferência Tech 2026',
  'conferencia-tech-2026',
  'Maior conferência de tecnologia do Brasil.',
  '2026-10-05 09:00:00+00',
  'São Paulo, SP — Centro de Convenções',
  3000,
  250.00,
  'draft'
);
