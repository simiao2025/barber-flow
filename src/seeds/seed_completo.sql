-- ============================================================
-- BARBEAR-FLOW: Seed de Dados de Exemplo
-- Barbearia fictícia: "Barbearia Flow Studio"
-- ============================================================

-- NOTA: Antes de executar este seed, você precisa:
-- 1. Criar um usuário no auth.users do Supabase
-- 2. Substituir o UUID do owner_id abaixo pelo ID do usuário criado

-- UUID fictício do owner (SUBSTITUA pelo UUID real do auth.users)
-- Exemplo: '00000000-0000-0000-0000-000000000001'

-- ============================================================
-- 1. BARBERSHOP
-- ============================================================
INSERT INTO barbershops (id, name, owner_id, whatsapp_number, working_hours, settings, plan)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Barbearia Flow Studio',
  '00000000-0000-0000-0000-000000000001',  -- SUBSTITUA este UUID
  '5511999999999',
  '{
    "segunda": {"open": "09:00", "close": "19:00"},
    "terca": {"open": "09:00", "close": "19:00"},
    "quarta": {"open": "09:00", "close": "19:00"},
    "quinta": {"open": "09:00", "close": "19:00"},
    "sexta": {"open": "09:00", "close": "20:00"},
    "sabado": {"open": "08:00", "close": "17:00"},
    "domingo": null
  }'::jsonb,
  '{
    "whatsapp_enabled": true,
    "ai_enabled": true,
    "currency": "BRL",
    "timezone": "America/Sao_Paulo",
    "require_confirmation": true,
    "allow_online_booking": true
  }'::jsonb,
  'premium'
);


-- ============================================================
-- 2. SERVIÇOS
-- ============================================================
INSERT INTO services (id, barbershop_id, name, description, price, duration_min, category, is_active)
VALUES
  -- Cortes
  ('20000000-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Corte Degradê', 'Corte degradê moderno com acabamento na máquina e navalha', 45.00, 40, 'corte', true),
  ('20000000-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Corte Social', 'Corte social clássico com acabamento perfeito', 40.00, 35, 'corte', true),
  ('20000000-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Corte Infantil', 'Corte para crianças até 12 anos', 35.00, 30, 'corte', true),
  ('20000000-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Corte + Pigmentação', 'Corte completo com pigmentação capilar', 75.00, 60, 'corte', true),
  ('20000000-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Corte + Sobrancelha', 'Corte com design de sobrancelha', 55.00, 45, 'corte', true),

  -- Barba
  ('20000000-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Barba Completa', 'Barba com navalha, toalha quente e pós-barba', 35.00, 30, 'barba', true),
  ('20000000-0001-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Barba + Toalha Quente', 'Barba com tratamento de toalha quente e massagem facial', 45.00, 40, 'barba', true),
  ('20000000-0001-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Acabamento de Barba', 'Acabamento e alinhamento de barba', 20.00, 15, 'barba', true),

  -- Combos
  ('20000000-0001-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Combo Premium', 'Corte + Barba + Sobrancelha + Hidratação', 95.00, 75, 'combo', true),
  ('20000000-0001-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Combo Clássico', 'Corte + Barba simples', 65.00, 55, 'combo', true),
  ('20000000-0001-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'Combo Noivo', 'Corte + Barba + Hidratação + Penteados para ocasião especial', 150.00, 90, 'combo', true),

  -- Outros serviços
  ('20000000-0001-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Hidratação Capilar', 'Tratamento de hidratação profunda', 40.00, 30, 'hidratacao', true),
  ('20000000-0001-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'Design de Sobrancelha', 'Design masculino com navalha', 25.00, 20, 'sobrancelha', true),
  ('20000000-0001-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'Pigmentação Capilar', 'Coloração e pigmentação profissional', 60.00, 50, 'pigmentacao', true);


-- ============================================================
-- 3. PROFISSIONAIS
-- ============================================================
INSERT INTO professionals (id, barbershop_id, name, avatar_url, service_ids, working_hours, commission_pct, is_active)
VALUES
  (
    '30000000-0001-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Carlos "Mão de Tesoura"',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    ARRAY[
      '20000000-0001-0000-0000-000000000001',
      '20000000-0001-0000-0000-000000000002',
      '20000000-0001-0000-0000-000000000003',
      '20000000-0001-0000-0000-000000000005',
      '20000000-0001-0000-0000-000000000009',
      '20000000-0001-0000-0000-000000000010'
    ]::UUID[],
    '{
      "segunda": {"open": "09:00", "close": "19:00"},
      "terca": {"open": "09:00", "close": "19:00"},
      "quarta": {"open": "09:00", "close": "19:00"},
      "quinta": {"open": "09:00", "close": "19:00"},
      "sexta": {"open": "09:00", "close": "20:00"},
      "sabado": {"open": "08:00", "close": "17:00"},
      "domingo": null
    }'::jsonb,
    50.00,
    true
  ),
  (
    '30000000-0001-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Rafael "Navalha de Ouro"',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael',
    ARRAY[
      '20000000-0001-0000-0000-000000000004',
      '20000000-0001-0000-0000-000000000006',
      '20000000-0001-0000-0000-000000000007',
      '20000000-0001-0000-0000-000000000008',
      '20000000-0001-0000-0000-000000000009',
      '20000000-0001-0000-0000-000000000010',
      '20000000-0001-0000-0000-000000000011',
      '20000000-0001-0000-0000-000000000012',
      '20000000-0001-0000-0000-000000000013',
      '20000000-0001-0000-0000-000000000014'
    ]::UUID[],
    '{
      "segunda": {"open": "10:00", "close": "19:00"},
      "terca": {"open": "10:00", "close": "19:00"},
      "quarta": {"open": "10:00", "close": "19:00"},
      "quinta": {"open": "10:00", "close": "19:00"},
      "sexta": {"open": "09:00", "close": "20:00"},
      "sabado": {"open": "09:00", "close": "17:00"},
      "domingo": null
    }'::jsonb,
    55.00,
    true
  ),
  (
    '30000000-0001-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'Lucas "Estilo Fino"',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
    ARRAY[
      '20000000-0001-0000-0000-000000000001',
      '20000000-0001-0000-0000-000000000002',
      '20000000-0001-0000-0000-000000000006',
      '20000000-0001-0000-0000-000000000009',
      '20000000-0001-0000-0000-000000000010',
      '20000000-0001-0000-0000-000000000012'
    ]::UUID[],
    '{
      "segunda": {"open": "09:00", "close": "18:00"},
      "terca": null,
      "quarta": {"open": "09:00", "close": "18:00"},
      "quinta": {"open": "09:00", "close": "18:00"},
      "sexta": {"open": "09:00", "close": "19:00"},
      "sabado": {"open": "08:00", "close": "15:00"},
      "domingo": null
    }'::jsonb,
    45.00,
    true
  );


-- ============================================================
-- 4. CLIENTES
-- ============================================================
INSERT INTO clients (id, barbershop_id, name, phone, email, notes, total_visits, last_visit_at, created_by)
VALUES
  ('40000000-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'João Silva', '5511987654321', 'joao.silva@email.com', 'Cliente VIP, prefere degradê baixo', 25, NOW() - INTERVAL '3 days', 'manual'),
  ('40000000-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pedro Santos', '5511987654322', 'pedro.santos@email.com', 'Sempre pede o Carlos', 12, NOW() - INTERVAL '7 days', 'whatsapp'),
  ('40000000-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Marcos Oliveira', '5511987654323', 'marcos.oliveira@email.com', NULL, 8, NOW() - INTERVAL '14 days', 'manual'),
  ('40000000-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'André Costa', '5511987654324', NULL, 'Gosta de barba bem feita com toalha quente', 30, NOW() - INTERVAL '1 day', 'manual'),
  ('40000000-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Felipe Almeida', '5511987654325', 'felipe.almeida@email.com', NULL, 3, NOW() - INTERVAL '30 days', 'whatsapp'),
  ('40000000-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Ricardo Lima', '5511987654326', 'ricardo.lima@email.com', 'Cliente novo, primeira vez', 1, NOW() - INTERVAL '2 days', 'manual'),
  ('40000000-0001-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Thiago Ferreira', '5511987654327', NULL, 'Trabalha no banco, só pode após 18h', 18, NOW() - INTERVAL '5 days', 'whatsapp'),
  ('40000000-0001-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Bruno Rodrigues', '5511987654328', 'bruno.rodrigues@email.com', NULL, 0, NULL, 'manual'),
  ('40000000-0001-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Gust Martins', '5511987654329', 'gust.martins@email.com', 'Fã do combo premium', 42, NOW() - INTERVAL '4 days', 'manual'),
  ('40000000-0001-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Diego Souza', '5511987654330', NULL, 'Não vem há 45 dias - candidato a reativação', 15, NOW() - INTERVAL '45 days', 'whatsapp');


-- ============================================================
-- 5. AGENDAMENTOS (Exemplos variados)
-- ============================================================
INSERT INTO appointments (id, barbershop_id, client_id, professional_id, service_ids, scheduled_at, duration_min, status, total_price, source, notes)
VALUES
  -- Agendamento feito hoje
  ('50000000-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000001', '30000000-0001-0000-0000-000000000001', ARRAY['20000000-0001-0000-0000-000000000001']::UUID[], NOW() + INTERVAL '2 hours', 40, 'confirmed', 45.00, 'whatsapp', 'WhatsApp - agendado via IA'),

  -- Agendamento para amanhã
  ('50000000-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000004', '30000000-0001-0000-0000-000000000002', ARRAY['20000000-0001-0000-0000-000000000009']::UUID[], NOW() + INTERVAL '1 day 3 hours', 75, 'pending', 95.00, 'manual', 'Combo Premium agendado na recepção'),

  -- Agendamento finalizado ontem
  ('50000000-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000003', '30000000-0001-0000-0000-000000000001', ARRAY['20000000-0001-0000-0000-000000000002', '20000000-0001-0000-0000-000000000006']::UUID[], NOW() - INTERVAL '1 day', 55, 'done', 65.00, 'app', 'Corte Social + Barba'),

  -- Agendamento cancelado
  ('50000000-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000005', '30000000-0001-0000-0000-000000000003', ARRAY['20000000-0001-0000-0000-000000000001']::UUID[], NOW() - INTERVAL '2 days', 40, 'cancelled', 45.00, 'whatsapp', 'Cliente cancelou por motivo pessoal'),

  -- Agendamento para semana que vem
  ('50000000-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000009', '30000000-0001-0000-0000-000000000002', ARRAY['20000000-0001-0000-0000-000000000011']::UUID[], NOW() + INTERVAL '7 days 4 hours', 90, 'confirmed', 150.00, 'manual', 'Combo Noivo - sábado às 10h'),

  -- Agendamento no-show (cliente não apareceu)
  ('50000000-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000010', '30000000-0001-0000-0000-000000000001', ARRAY['20000000-0001-0000-0000-000000000002']::UUID[], NOW() - INTERVAL '5 days', 35, 'no_show', 40.00, 'manual', 'Cliente não compareceu');


-- ============================================================
-- 6. PRODUTOS
-- ============================================================
INSERT INTO products (id, barbershop_id, name, brand, price_sale, price_cost, stock_qty, stock_min, category, is_active)
VALUES
  -- Pomadas
  ('60000000-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Pomada Modeladora Matte', 'Upgraded', 45.00, 22.00, 15, 5, 'pomada', true),
  ('60000000-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pomada Brilho Intenso', 'Upgraded', 42.00, 20.00, 12, 5, 'pomada', true),
  ('60000000-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Pomada Modeladora Strong', 'Mustache', 55.00, 28.00, 8, 5, 'pomada', true),

  -- Óleos
  ('60000000-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Óleo para Barba Premium', 'Viking', 38.00, 18.00, 20, 5, 'oleo', true),
  ('60000000-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Óleo Hidratante Capilar', 'Upgraded', 35.00, 16.00, 10, 5, 'oleo', true),

  -- Shampoos
  ('60000000-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Shampoo para Barba', 'Viking', 32.00, 15.00, 18, 5, 'shampoo', true),
  ('60000000-0001-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Shampoo 2 em 1 Cabelo/Barba', 'Upgraded', 48.00, 24.00, 3, 5, 'shampoo', true),

  -- Balms
  ('60000000-0001-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Balm Hidratante Pós-Barba', 'Viking', 28.00, 13.00, 25, 5, 'balm', true),
  ('60000000-0001-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Balm Capilar Reparador', 'Upgraded', 40.00, 19.00, 14, 5, 'balm', true),

  -- Géis
  ('60000000-0001-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Gel Extra Forte', 'Mustache', 25.00, 12.00, 22, 5, 'gel', true),

  -- Acessórios
  ('60000000-0001-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'Pente de Madeira Profissional', 'BarberPro', 18.00, 8.00, 30, 5, 'acessorio', true),
  ('60000000-0001-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Escova Redutora de Volume', 'BarberPro', 22.00, 10.00, 15, 5, 'acessorio', true);


-- ============================================================
-- 7. TRANSAÇÕES FINANCEIRAS
-- ============================================================
INSERT INTO financial_transactions (id, barbershop_id, appointment_id, type, category, amount, payment_method, description, transaction_at)
VALUES
  -- Receitas de agendamentos finalizados
  ('70000000-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '50000000-0001-0000-0000-000000000003', 'income', 'servicos', 65.00, 'pix', 'Corte Social + Barba - Pedro Santos', NOW() - INTERVAL '1 day'),

  -- Despesas do mês
  ('70000000-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', NULL, 'expense', 'aluguel', 2500.00, 'pix', 'Aluguel do ponto comercial', NOW() - INTERVAL '10 days'),
  ('70000000-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL, 'expense', 'produtos', 450.00, 'card', 'Compra de produtos (pomadas, óleos)', NOW() - INTERVAL '15 days'),
  ('70000000-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', NULL, 'expense', 'manutencao', 180.00, 'cash', 'Manutenção cadeira de barbeiro', NOW() - INTERVAL '20 days'),
  ('70000000-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', NULL, 'expense', 'energia', 320.00, 'pix', 'Conta de energia elétrica', NOW() - INTERVAL '5 days'),
  ('70000000-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', NULL, 'expense', 'internet', 150.00, 'pix', 'Internet fibra óptica', NOW() - INTERVAL '5 days'),

  -- Receita de venda de produtos
  ('70000000-0001-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', NULL, 'income', 'vendas_produtos', 130.00, 'pix', 'Venda de pomadas e óleo para cliente', NOW() - INTERVAL '3 days');


-- ============================================================
-- 8. CONVERSAS COM IA
-- ============================================================
INSERT INTO ai_conversations (id, barbershop_id, client_id, phone, messages, intent_last, follow_up_at)
VALUES
  (
    '80000000-0001-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '40000000-0001-0000-0000-000000000001',
    '5511987654321',
    ARRAY[
      '{"role": "user", "content": "E aí, quero agendar um corte amanhã à tarde", "timestamp": "' || (NOW() - INTERVAL '2 days') || '"}',
      '{"role": "assistant", "content": "Fala João! Beleza! Vou verificar os horários disponíveis. Que dia exatamente?", "timestamp": "' || (NOW() - INTERVAL '2 days' + INTERVAL '30 seconds') || '"}',
      '{"role": "user", "content": "Amanhã dia 15, depois das 14h", "timestamp": "' || (NOW() - INTERVAL '2 days' + INTERVAL '2 minutes') || '"}',
      '{"role": "assistant", "content": "Perfeito! Encontrei horário com o Carlos às 14h30 and 15h30. Qual prefere?", "timestamp": "' || (NOW() - INTERVAL '2 days' + INTERVAL '2 minutes 30 seconds') || '"}',
      '{"role": "user", "content": "14h30 pode ser, degradê de sempre", "timestamp": "' || (NOW() - INTERVAL '2 days' + INTERVAL '5 minutes') || '"}',
      '{"role": "assistant", "content": "Fechado! Agendado: Degradê com Carlos amanhã às 14h30. Te mando lembrete antes! ✂️", "timestamp": "' || (NOW() - INTERVAL '2 days' + INTERVAL '5 minutes 15 seconds') || '"}'
    ]::jsonb[],
    'agendamento',
    NOW() + INTERVAL '1 hour'
  ),
  (
    '80000000-0001-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    '5511987654325',
    ARRAY[
      '{"role": "user", "content": "Quanto tá o corte aí?", "timestamp": "' || (NOW() - INTERVAL '5 days') || '"}',
      '{"role": "assistant", "content": "Olá! Nosso corte degradê é R$45, social R$40 e infantil R$35. Também temos combos com barba a partir de R$65! Posso te ajudar a agendar?", "timestamp": "' || (NOW() - INTERVAL '5 days' + INTERVAL '20 seconds') || '"}',
      '{"role": "user", "content": "Vou ver e depois eu falo", "timestamp": "' || (NOW() - INTERVAL '5 days' + INTERVAL '1 minute') || '"}',
      '{"role": "assistant", "content": "Sem problemas! Quando quiser, é só chamar. Estamos de seg a sáb! 👊", "timestamp": "' || (NOW() - INTERVAL '5 days' + INTERVAL '1 minute 10 seconds') || '"}'
    ]::jsonb[],
    'duvida',
    NOW() + INTERVAL '3 days'
  );


-- ============================================================
-- 9. FOLLOW-UPS (Acompanhamentos)
-- ============================================================
INSERT INTO follow_ups (id, barbershop_id, client_id, appointment_id, type, scheduled_for, sent_at, status)
VALUES
  -- Lembrete 24h para agendamento futuro
  ('90000000-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000001', '50000000-0001-0000-0000-000000000001', 'reminder_24h', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '22 hours', 'sent'),

  -- Lembrete 1h para agendamento de amanhã
  ('90000000-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000004', '50000000-0001-0000-0000-000000000002', 'reminder_1h', NOW() + INTERVAL '26 hours', NULL, 'pending'),

  -- Follow-up pós-serviço
  ('90000000-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000003', '50000000-0001-0000-0000-000000000003', 'post_service', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '23 hours', 'sent'),

  -- Reativação para cliente sumido
  ('90000000-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000010', NULL, 'reactivation_30d', NOW() + INTERVAL '1 day 10 hours', NULL, 'pending'),

  -- Lembrete 24h pendente
  ('90000000-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000009', '50000000-0001-0000-0000-000000000005', 'reminder_24h', NOW() + INTERVAL '6 days 23 hours', NULL, 'pending'),

  -- Reativação para Felipe (30 dias sem aparecer)
  ('90000000-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '40000000-0001-0000-0000-000000000005', NULL, 'reactivation_30d', NOW() + INTERVAL '5 hours', NULL, 'pending');


-- ============================================================
-- RESUMO DO SEED
-- ============================================================
-- Barbearia: Barbearia Flow Studio
-- Serviços: 14 (cortes, barbas, combos, etc.)
-- Profissionais: 3 (Carlos, Rafael, Lucas)
-- Clientes: 10 (com variados níveis de atividade)
-- Agendamentos: 6 (confirmed, pending, done, cancelled, no_show)
-- Produtos: 12 (pomadas, óleos, shampoos, balms, géis, acessórios)
-- Transações: 7 (receitas e despesas)
-- Conversas IA: 2 (agendamento e dúvida)
-- Follow-ups: 6 (pendentes e enviados)
-- ============================================================
