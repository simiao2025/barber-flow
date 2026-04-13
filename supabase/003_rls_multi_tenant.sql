-- ============================================================
-- BARBEAR-FLOW: RLS Revisado para Multi-Tenant
-- Função helper + políticas otimizadas
-- ============================================================

-- ============================================================
-- 1. FUNÇÃO HELPER: Obter barbearia do usuário logado
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_barbershop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM barbershops WHERE owner_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION get_my_barbershop_id IS 'Retorna o ID da barbearia do usuário autenticado. Usado em políticas RLS.';


-- ============================================================
-- 2. POLÍTICAS RLS OTIMIZADAS COM FUNÇÃO HELPER
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock_movements ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2.1 BARBERSHOPS
-- ============================================================
DROP POLICY IF EXISTS barbershops_select_policy ON barbershops;
CREATE POLICY barbershops_select_policy ON barbershops
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS barbershops_insert_policy ON barbershops;
CREATE POLICY barbershops_insert_policy ON barbershops
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS barbershops_update_policy ON barbershops;
CREATE POLICY barbershops_update_policy ON barbershops
  FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS barbershops_delete_policy ON barbershops;
CREATE POLICY barbershops_delete_policy ON barbershops
  FOR DELETE
  USING (owner_id = auth.uid());


-- ============================================================
-- 2.2 PROFESSIONALS (usando função helper)
-- ============================================================
DROP POLICY IF EXISTS professionals_select_policy ON professionals;
CREATE POLICY professionals_select_policy ON professionals
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS professionals_insert_policy ON professionals;
CREATE POLICY professionals_insert_policy ON professionals
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS professionals_update_policy ON professionals;
CREATE POLICY professionals_update_policy ON professionals
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS professionals_delete_policy ON professionals;
CREATE POLICY professionals_delete_policy ON professionals
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.3 SERVICES
-- ============================================================
DROP POLICY IF EXISTS services_select_policy ON services;
CREATE POLICY services_select_policy ON services
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS services_insert_policy ON services;
CREATE POLICY services_insert_policy ON services
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS services_update_policy ON services;
CREATE POLICY services_update_policy ON services
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS services_delete_policy ON services;
CREATE POLICY services_delete_policy ON services
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.4 CLIENTS
-- ============================================================
DROP POLICY IF EXISTS clients_select_policy ON clients;
CREATE POLICY clients_select_policy ON clients
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS clients_insert_policy ON clients;
CREATE POLICY clients_insert_policy ON clients
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS clients_update_policy ON clients;
CREATE POLICY clients_update_policy ON clients
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS clients_delete_policy ON clients;
CREATE POLICY clients_delete_policy ON clients
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.5 APPOINTMENTS
-- ============================================================
DROP POLICY IF EXISTS appointments_select_policy ON appointments;
CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS appointments_insert_policy ON appointments;
CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS appointments_update_policy ON appointments;
CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS appointments_delete_policy ON appointments;
CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.6 PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS products_select_policy ON products;
CREATE POLICY products_select_policy ON products
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS products_insert_policy ON products;
CREATE POLICY products_insert_policy ON products
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS products_update_policy ON products;
CREATE POLICY products_update_policy ON products
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS products_delete_policy ON products;
CREATE POLICY products_delete_policy ON products
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.7 FINANCIAL_TRANSACTIONS
-- ============================================================
DROP POLICY IF EXISTS financial_transactions_select_policy ON financial_transactions;
CREATE POLICY financial_transactions_select_policy ON financial_transactions
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS financial_transactions_insert_policy ON financial_transactions;
CREATE POLICY financial_transactions_insert_policy ON financial_transactions
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS financial_transactions_update_policy ON financial_transactions;
CREATE POLICY financial_transactions_update_policy ON financial_transactions
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS financial_transactions_delete_policy ON financial_transactions;
CREATE POLICY financial_transactions_delete_policy ON financial_transactions
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.8 AI_CONVERSATIONS
-- ============================================================
DROP POLICY IF EXISTS ai_conversations_select_policy ON ai_conversations;
CREATE POLICY ai_conversations_select_policy ON ai_conversations
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS ai_conversations_insert_policy ON ai_conversations;
CREATE POLICY ai_conversations_insert_policy ON ai_conversations
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS ai_conversations_update_policy ON ai_conversations;
CREATE POLICY ai_conversations_update_policy ON ai_conversations
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS ai_conversations_delete_policy ON ai_conversations;
CREATE POLICY ai_conversations_delete_policy ON ai_conversations
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.9 FOLLOW_UPS
-- ============================================================
DROP POLICY IF EXISTS follow_ups_select_policy ON follow_ups;
CREATE POLICY follow_ups_select_policy ON follow_ups
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS follow_ups_insert_policy ON follow_ups;
CREATE POLICY follow_ups_insert_policy ON follow_ups
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS follow_ups_update_policy ON follow_ups;
CREATE POLICY follow_ups_update_policy ON follow_ups
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS follow_ups_delete_policy ON follow_ups;
CREATE POLICY follow_ups_delete_policy ON follow_ups
  FOR DELETE
  USING (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.10 PUSH_TOKENS
-- ============================================================
DROP POLICY IF EXISTS push_tokens_select_policy ON push_tokens;
CREATE POLICY push_tokens_select_policy ON push_tokens
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_insert_policy ON push_tokens;
CREATE POLICY push_tokens_insert_policy ON push_tokens
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_update_policy ON push_tokens;
CREATE POLICY push_tokens_update_policy ON push_tokens
  FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_delete_policy ON push_tokens;
CREATE POLICY push_tokens_delete_policy ON push_tokens
  FOR DELETE
  USING (owner_id = auth.uid());


-- ============================================================
-- 2.11 NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id() OR owner_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id() OR owner_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE
  USING (barbershop_id = get_my_barbershop_id() OR owner_id = auth.uid());


-- ============================================================
-- 2.12 NOTIFICATIONS_LOG
-- ============================================================
DROP POLICY IF EXISTS notifications_log_select_policy ON notifications_log;
CREATE POLICY notifications_log_select_policy ON notifications_log
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS notifications_log_insert_policy ON notifications_log;
CREATE POLICY notifications_log_insert_policy ON notifications_log
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 2.13 PRODUCT_STOCK_MOVEMENTS
-- ============================================================
DROP POLICY IF EXISTS product_stock_movements_select_policy ON product_stock_movements;
CREATE POLICY product_stock_movements_select_policy ON product_stock_movements
  FOR SELECT
  USING (barbershop_id = get_my_barbershop_id());

DROP POLICY IF EXISTS product_stock_movements_insert_policy ON product_stock_movements;
CREATE POLICY product_stock_movements_insert_policy ON product_stock_movements
  FOR INSERT
  WITH CHECK (barbershop_id = get_my_barbershop_id());


-- ============================================================
-- 3. SCRIPT DE TESTE DE ISOLAMENTO
-- ============================================================
/*
-- Este script verifica que o usuário A NÃO consegue acessar dados do usuário B

-- Configure dois usuários diferentes e execute:

-- Como usuário B:
SET request.jwt.claims.sub = 'USER_B_ID';

-- Tentar SELECT nos dados do usuário A (deve retornar 0 linhas)
SELECT COUNT(*) FROM professionals
WHERE barbershop_id = 'USER_A_BARBERSHOP_ID';
-- Esperado: 0

-- Tentar INSERT (deve falhar com RLS violation)
INSERT INTO services (barbershop_id, name, price, duration_min)
VALUES ('USER_A_BARBERSHOP_ID', 'Teste', 10, 10);
-- Esperado: ERROR: new row violates row-level security policy

-- Limpar sessão
RESET ALL;
*/


-- ============================================================
-- 4. ÍNDICE PARA FUNÇÃO HELPER (otimização)
-- ============================================================

-- Garantir que owner_id tem índice
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id ON barbershops(owner_id);
