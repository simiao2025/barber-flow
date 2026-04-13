-- ============================================================
-- BARBEAR-FLOW: Schema Completo do Banco de Dados
-- Multi-tenant SaaS para Gestão de Barbearias
-- Supabase (PostgreSQL 15) + Row Level Security
-- ============================================================

-- ============================================================
-- 0. EXTENSÕES NECESSÁRIAS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. ENUMS
-- ============================================================

-- Status dos agendamentos
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'done', 'cancelled', 'no_show');

-- Fonte de criação dos agendamentos
CREATE TYPE appointment_source AS ENUM ('whatsapp', 'manual', 'app');

-- Tipo de transação financeira
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'commission');

-- Método de pagamento
CREATE TYPE payment_method AS ENUM ('cash', 'pix', 'card', 'other');

-- Tipo de cliente (origem de criação)
CREATE TYPE client_source AS ENUM ('whatsapp', 'manual');

-- Tipo de follow-up
CREATE TYPE follow_up_type AS ENUM ('reminder_24h', 'reminder_1h', 'post_service', 'reactivation_30d', 'reactivation_60d', 'reactivation_90d');

-- Status do follow-up
CREATE TYPE follow_up_status AS ENUM ('pending', 'sent', 'failed');

-- Status da conversa com IA
CREATE TYPE ai_intent AS ENUM ('agendamento', 'cancelamento', 'reativacao', 'duvida', 'elogio', 'reclamacao', 'outro');

-- Plano da barbearia
CREATE TYPE barbershop_plan AS ENUM ('free', 'basic', 'premium', 'enterprise');

-- Categoria de serviço
CREATE TYPE service_category AS ENUM ('corte', 'barba', 'combo', 'sobrancelha', 'pigmentacao', 'hidratacao', 'outro');

-- Categoria de produto
CREATE TYPE product_category AS ENUM ('pomada', 'gel', 'oleo', 'shampoo', 'balm', 'acessorio', 'outro');

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM ('new_appointment', 'human_handoff', 'low_stock', 'follow_up_failed', 'daily_summary');

-- Tipo de movimento de estoque
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');

-- OS do dispositivo
CREATE TYPE device_os_type AS ENUM ('ios', 'android', 'web');


-- ============================================================
-- 2. TABELAS
-- ============================================================

-- ----------------------------------------------------------
-- BARBERSHOPS (Barbearias)
-- ----------------------------------------------------------
CREATE TABLE barbershops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number VARCHAR(20),
  working_hours JSONB DEFAULT '{"segunda":{"open":"09:00","close":"18:00"},"terca":{"open":"09:00","close":"18:00"},"quarta":{"open":"09:00","close":"18:00"},"quinta":{"open":"09:00","close":"18:00"},"sexta":{"open":"09:00","close":"18:00"},"sabado":{"open":"09:00","close":"13:00"},"domingo":null}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  plan barbershop_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_working_hours_json CHECK (jsonb_typeof(working_hours) = 'object')
);

-- ----------------------------------------------------------
-- PROFESSIONALS (Profissionais/Barbeiros)
-- ----------------------------------------------------------
CREATE TABLE professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  service_ids UUID[],
  working_hours JSONB,
  commission_pct NUMERIC(5,2) DEFAULT 50.00 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- SERVICES (Serviços)
-- ----------------------------------------------------------
CREATE TABLE services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  category service_category DEFAULT 'outro',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- CLIENTS (Clientes)
-- ----------------------------------------------------------
CREATE TABLE clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  notes TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_by client_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_unique_client_per_barbershop UNIQUE (barbershop_id, phone)
);

-- ----------------------------------------------------------
-- APPOINTMENTS (Agendamentos)
-- ----------------------------------------------------------
CREATE TABLE appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  service_ids UUID[] NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  status appointment_status NOT NULL DEFAULT 'pending',
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  source appointment_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- PRODUCTS (Produtos)
-- ----------------------------------------------------------
CREATE TABLE products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  price_sale NUMERIC(10,2) NOT NULL CHECK (price_sale >= 0),
  price_cost NUMERIC(10,2) CHECK (price_cost >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  stock_min INTEGER NOT NULL DEFAULT 5 CHECK (stock_min >= 0),
  category product_category DEFAULT 'outro',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- FINANCIAL_TRANSACTIONS (Transações Financeiras)
-- ----------------------------------------------------------
CREATE TABLE financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'other',
  description TEXT,
  transaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- AI_CONVERSATIONS (Conversas com IA)
-- ----------------------------------------------------------
CREATE TABLE ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  phone VARCHAR(20),
  messages JSONB[] DEFAULT ARRAY[]::jsonb[],
  intent_last ai_intent DEFAULT 'outro',
  follow_up_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- FOLLOW_UPS (Acompanhamentos)
-- ----------------------------------------------------------
CREATE TABLE follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type follow_up_type NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status follow_up_status NOT NULL DEFAULT 'pending'
);

-- ----------------------------------------------------------
-- PUSH_TOKENS (Tokens para Push Notification)
-- ----------------------------------------------------------
CREATE TABLE push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL,
  device_os device_os_type NOT NULL DEFAULT 'android',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_unique_expo_token_per_user UNIQUE (owner_id, device_os, expo_token)
);

-- ----------------------------------------------------------
-- NOTIFICATIONS (Notificações internas do sistema)
-- ----------------------------------------------------------
CREATE TABLE notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title VARCHAR(255),
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- NOTIFICATIONS_LOG (Log de envio de push notifications)
-- ----------------------------------------------------------
CREATE TABLE notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  tokens_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_tokens TEXT[],  -- tokens que falharam (DeviceNotRegistered)
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- PRODUCT_STOCK_MOVEMENTS (Movimentações de estoque)
-- ----------------------------------------------------------
CREATE TABLE product_stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

-- barbershops
CREATE INDEX idx_barbershops_owner_id ON barbershops(owner_id);

-- professionals
CREATE INDEX idx_professionals_barbershop_id ON professionals(barbershop_id);
CREATE INDEX idx_professionals_is_active ON professionals(barbershop_id, is_active);

-- services
CREATE INDEX idx_services_barbershop_id ON services(barbershop_id);
CREATE INDEX idx_services_category ON services(barbershop_id, category);
CREATE INDEX idx_services_is_active ON services(barbershop_id, is_active);

-- clients
CREATE INDEX idx_clients_barbershop_id ON clients(barbershop_id);
CREATE INDEX idx_clients_phone ON clients(barbershop_id, phone);
CREATE INDEX idx_clients_email ON clients(barbershop_id, email);

-- appointments
CREATE INDEX idx_appointments_barbershop_id ON appointments(barbershop_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(barbershop_id, status);
CREATE INDEX idx_appointments_scheduled_status ON appointments(scheduled_at, status);

-- products
CREATE INDEX idx_products_barbershop_id ON products(barbershop_id);
CREATE INDEX idx_products_stock_alert ON products(barbershop_id, stock_qty) WHERE stock_qty < stock_min;

-- financial_transactions
CREATE INDEX idx_financial_transactions_barbershop_id ON financial_transactions(barbershop_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(barbershop_id, type);
CREATE INDEX idx_financial_transactions_transaction_at ON financial_transactions(transaction_at);
CREATE INDEX idx_financial_transactions_appointment_id ON financial_transactions(appointment_id);

-- ai_conversations
CREATE INDEX idx_ai_conversations_barbershop_id ON ai_conversations(barbershop_id);
CREATE INDEX idx_ai_conversations_phone ON ai_conversations(barbershop_id, phone);
CREATE INDEX idx_ai_conversations_follow_up ON ai_conversations(follow_up_at) WHERE follow_up_at IS NOT NULL;

-- follow_ups
CREATE INDEX idx_follow_ups_barbershop_id ON follow_ups(barbershop_id);
CREATE INDEX idx_follow_ups_client_id ON follow_ups(client_id);
CREATE INDEX idx_follow_ups_scheduled_for ON follow_ups(scheduled_for);
CREATE INDEX idx_follow_ups_pending ON follow_ups(status, scheduled_for) WHERE status = 'pending';

-- push_tokens
CREATE INDEX idx_push_tokens_owner_id ON push_tokens(owner_id);
CREATE INDEX idx_push_tokens_barbershop_id ON push_tokens(barbershop_id);
CREATE INDEX idx_push_tokens_expo_token ON push_tokens(expo_token);
CREATE INDEX idx_push_tokens_active ON push_tokens(barbershop_id, is_active) WHERE is_active = true;

-- notifications
CREATE INDEX idx_notifications_barbershop_id ON notifications(barbershop_id);
CREATE INDEX idx_notifications_owner_id ON notifications(owner_id);
CREATE INDEX idx_notifications_unread ON notifications(barbershop_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type_created ON notifications(barbershop_id, type, created_at);

-- notifications_log
CREATE INDEX idx_notifications_log_barbershop_id ON notifications_log(barbershop_id);
CREATE INDEX idx_notifications_log_sent_at ON notifications_log(sent_at);
CREATE INDEX idx_notifications_log_type ON notifications_log(barbershop_id, type, sent_at);

-- product_stock_movements
CREATE INDEX idx_product_stock_movements_product_id ON product_stock_movements(product_id);
CREATE INDEX idx_product_stock_movements_barbershop_id ON product_stock_movements(barbershop_id);
CREATE INDEX idx_product_stock_movements_type ON product_stock_movements(barbershop_id, type, created_at);
CREATE INDEX idx_product_stock_movements_created_at ON product_stock_movements(created_at DESC);


-- ============================================================
-- 4. TRIGGERS PARA updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER trg_barbershops_updated_at
  BEFORE UPDATE ON barbershops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
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


-- ============================================================
-- 5.1 Políticas RLS - BARBERSHOPS
-- ============================================================

-- Owner pode ver suas próprias barbearias
CREATE POLICY barbershops_select_policy ON barbershops
  FOR SELECT
  USING (owner_id = auth.uid());

-- Owner pode inserir suas barbearias
CREATE POLICY barbershops_insert_policy ON barbershops
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owner pode atualizar suas próprias barbearias
CREATE POLICY barbershops_update_policy ON barbershops
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Owner pode deletar suas próprias barbearias
CREATE POLICY barbershops_delete_policy ON barbershops
  FOR DELETE
  USING (owner_id = auth.uid());


-- ============================================================
-- 5.2 Políticas RLS - PROFESSIONALS
-- ============================================================

CREATE POLICY professionals_select_policy ON professionals
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY professionals_insert_policy ON professionals
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY professionals_update_policy ON professionals
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY professionals_delete_policy ON professionals
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.3 Políticas RLS - SERVICES
-- ============================================================

CREATE POLICY services_select_policy ON services
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY services_insert_policy ON services
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY services_update_policy ON services
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY services_delete_policy ON services
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.4 Políticas RLS - CLIENTS
-- ============================================================

CREATE POLICY clients_select_policy ON clients
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY clients_insert_policy ON clients
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY clients_update_policy ON clients
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY clients_delete_policy ON clients
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.5 Políticas RLS - APPOINTMENTS
-- ============================================================

CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.6 Políticas RLS - PRODUCTS
-- ============================================================

CREATE POLICY products_select_policy ON products
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY products_insert_policy ON products
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY products_update_policy ON products
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY products_delete_policy ON products
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.7 Políticas RLS - FINANCIAL_TRANSACTIONS
-- ============================================================

CREATE POLICY financial_transactions_select_policy ON financial_transactions
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY financial_transactions_insert_policy ON financial_transactions
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY financial_transactions_update_policy ON financial_transactions
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY financial_transactions_delete_policy ON financial_transactions
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.8 Políticas RLS - AI_CONVERSATIONS
-- ============================================================

CREATE POLICY ai_conversations_select_policy ON ai_conversations
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY ai_conversations_insert_policy ON ai_conversations
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY ai_conversations_update_policy ON ai_conversations
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY ai_conversations_delete_policy ON ai_conversations
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.9 Políticas RLS - FOLLOW_UPS
-- ============================================================

CREATE POLICY follow_ups_select_policy ON follow_ups
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY follow_ups_insert_policy ON follow_ups
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY follow_ups_update_policy ON follow_ups
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY follow_ups_delete_policy ON follow_ups
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.10 Políticas RLS - PUSH_TOKENS
-- ============================================================

CREATE POLICY push_tokens_select_policy ON push_tokens
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY push_tokens_insert_policy ON push_tokens
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY push_tokens_update_policy ON push_tokens
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY push_tokens_delete_policy ON push_tokens
  FOR DELETE
  USING (owner_id = auth.uid());


-- ============================================================
-- 5.11 Políticas RLS - NOTIFICATIONS
-- ============================================================

CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );


-- ============================================================
-- 5.12 Políticas RLS - NOTIFICATIONS_LOG
-- ============================================================

CREATE POLICY notifications_log_select_policy ON notifications_log
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY notifications_log_insert_policy ON notifications_log
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5.13 Políticas RLS - PRODUCT_STOCK_MOVEMENTS
-- ============================================================

CREATE POLICY product_stock_movements_select_policy ON product_stock_movements
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY product_stock_movements_insert_policy ON product_stock_movements
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 6. FUNÇÕES DO BANCO DE DADOS
-- ============================================================

-- ----------------------------------------------------------
-- 6.1 check_availability: Verifica se um profissional está
-- disponível em um determinado horário e duração
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION check_availability(
  p_professional_id UUID,
  p_datetime TIMESTAMPTZ,
  p_duration_min INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
  v_has_conflict BOOLEAN;
BEGIN
  -- Calcular horário de término
  v_end_time := p_datetime + (p_duration_min || ' minutes')::interval;

  -- Verificar se existe agendamento conflitante (confirmed, pending ou done)
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.professional_id = p_professional_id
      AND a.status IN ('pending', 'confirmed', 'done')
      AND a.scheduled_at < v_end_time
      AND (a.scheduled_at + (a.duration_min || ' minutes')::interval) > p_datetime
  ) INTO v_has_conflict;

  -- Retorna TRUE se NÃO há conflito
  RETURN NOT v_has_conflict;
END;
$$;


-- ----------------------------------------------------------
-- 6.2 get_available_slots: Retorna os horários disponíveis
-- para uma barbearia, data e serviço específicos
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_available_slots(
  p_barbershop_id UUID,
  p_date DATE,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  available_slot TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  duration_min INTEGER,
  slot_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_duration INTEGER;
  v_day_name TEXT;
  v_day_schedule JSONB;
  v_open_time TIME;
  v_close_time TIME;
  v_current_time TIME;
  v_slot_time TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_prof RECORD;
  v_tz TEXT := 'America/Sao_Paulo';
BEGIN
  -- Determinar o nome do dia em português
  v_day_name := CASE EXTRACT(DOW FROM p_date)
    WHEN 0 THEN 'domingo'
    WHEN 1 THEN 'segunda'
    WHEN 2 THEN 'terca'
    WHEN 3 THEN 'quarta'
    WHEN 4 THEN 'quinta'
    WHEN 5 THEN 'sexta'
    WHEN 6 THEN 'sabado'
  END;

  -- Obter duração do serviço (se especificado) ou usar padrão 30min
  IF p_service_id IS NOT NULL THEN
    SELECT s.duration_min INTO v_service_duration
    FROM services s
    WHERE s.id = p_service_id AND s.barbershop_id = p_barbershop_id;
    
    IF v_service_duration IS NULL THEN
      v_service_duration := 30;
    END IF;
  ELSE
    v_service_duration := 30;
  END IF;

  -- Iterar sobre profissionais ativos da barbearia
  FOR v_prof IN
    SELECT p.id, p.name, p.working_hours
    FROM professionals p
    WHERE p.barbershop_id = p_barbershop_id
      AND p.is_active = true
  LOOP
    -- Obter horário de funcionamento do profissional
    -- Se working_hours for NULL ou o dia estiver indisponível, pula
    v_day_schedule := v_prof.working_hours ->> v_day_name;
    
    IF v_day_schedule IS NOT NULL AND v_day_schedule IS NOT NULL THEN
      v_open_time := (v_day_schedule ->> 'open')::time;
      v_close_time := (v_day_schedule ->> 'close')::time;
      
      -- Gerar slots de 30 em 30 minutos dentro do horário de funcionamento
      v_current_time := v_open_time;

      WHILE v_current_time + (v_service_duration || ' minutes')::interval <= v_close_time LOOP
        -- Construir timestamp completo
        v_slot_time := (p_date || ' ' || v_current_time)::timestamp AT TIME ZONE v_tz;
        v_slot_end := v_slot_time + (v_service_duration || ' minutes')::interval;

        -- Verificar disponibilidade
        IF check_availability(v_prof.id, v_slot_time, v_service_duration) THEN
          professional_id := v_prof.id;
          professional_name := v_prof.name;
          available_slot := v_slot_time;
          slot_end := v_slot_end;
          duration_min := v_service_duration;
          slot_date := p_date;
          RETURN NEXT;
        END IF;

        -- Avançar 30 minutos
        v_current_time := v_current_time + '30 minutes'::interval;
      END LOOP;
    END IF;
  END LOOP;

  RETURN;
END;
$$;


-- ----------------------------------------------------------
-- 6.3 Função auxiliar: Incrementar total_visits do cliente
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_client_visits(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE clients
  SET total_visits = total_visits + 1,
      last_visit_at = NOW()
  WHERE id = p_client_id;
END;
$$;


-- ----------------------------------------------------------
-- 6.4 Função auxiliar: Obter faturamento mensal
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_monthly_revenue(
  p_barbershop_id UUID,
  p_month_start DATE
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expense NUMERIC,
  net_revenue NUMERIC,
  appointment_count BIGINT,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_end DATE;
BEGIN
  v_month_end := (p_month_start + INTERVAL '1 month')::date;

  SELECT
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END), 0),
    (SELECT COUNT(*) FROM appointments a WHERE a.barbershop_id = p_barbershop_id AND a.status = 'done' AND a.scheduled_at >= p_month_start::timestamptz AND a.scheduled_at < v_month_end::timestamptz),
    COUNT(*)
  INTO total_income, total_expense, net_revenue, appointment_count, transaction_count
  FROM financial_transactions ft
  WHERE ft.barbershop_id = p_barbershop_id
    AND ft.transaction_at >= p_month_start::timestamptz
    AND ft.transaction_at < v_month_end::timestamptz;

  RETURN;
END;
$$;


-- ----------------------------------------------------------
-- 6.5 Função helper: Obter barbearia do usuário logado
-- (para RLS multi-tenant simplificado)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_barbershop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM barbershops WHERE owner_id = auth.uid() LIMIT 1;
$$;


-- ----------------------------------------------------------
-- 6.6 Função: Fechar agendamento (done + transação + comissão)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION close_appointment(
  p_appointment_id UUID,
  p_payment_method payment_method,
  p_discount_amount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment appointments%ROWTYPE;
  v_professional professionals%ROWTYPE;
  v_total_price NUMERIC;
  v_commission_amount NUMERIC;
  v_transaction_id UUID;
  v_commission_transaction_id UUID;
BEGIN
  -- Buscar agendamento
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;

  IF v_appointment.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Agendamento já foi finalizado ou cancelado';
  END IF;

  -- Calcular preço com desconto
  v_total_price := v_appointment.total_price - p_discount_amount;

  -- Atualizar agendamento para 'done'
  UPDATE appointments
  SET status = 'done',
      total_price = v_total_price,
      notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN ' | ' || p_notes ELSE '' END,
      updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Buscar profissional para calcular comissão
  SELECT * INTO v_professional
  FROM professionals
  WHERE id = v_appointment.professional_id;

  -- Calcular comissão
  v_commission_amount := v_total_price * (v_professional.commission_pct / 100);

  -- Inserir transação de receita
  INSERT INTO financial_transactions (
    barbershop_id, appointment_id, type, category, amount, payment_method, description, transaction_at
  ) VALUES (
    v_appointment.barbershop_id,
    v_appointment.id,
    'income',
    'servicos',
    v_total_price,
    p_payment_method,
    'Serviço: ' || (SELECT string_agg(s.name, ', ') FROM services s WHERE s.id = ANY(v_appointment.service_ids)),
    NOW()
  ) RETURNING id INTO v_transaction_id;

  -- Inserir transação de comissão
  INSERT INTO financial_transactions (
    barbershop_id, appointment_id, type, category, amount, payment_method, description, transaction_at
  ) VALUES (
    v_appointment.barbershop_id,
    v_appointment.id,
    'commission',
    'comissao_' || v_professional.name,
    v_commission_amount,
    p_payment_method,
    'Comissão: ' || v_professional.name || ' (' || v_professional.commission_pct || '%)',
    NOW()
  ) RETURNING id INTO v_commission_transaction_id;

  -- Atualizar cliente (visitas)
  UPDATE clients
  SET total_visits = total_visits + 1,
      last_visit_at = NOW(),
      updated_at = NOW()
  WHERE id = v_appointment.client_id;

  -- Criar follow-up pós-serviço (1h depois)
  INSERT INTO follow_ups (barbershop_id, client_id, appointment_id, type, scheduled_for, status)
  VALUES (
    v_appointment.barbershop_id,
    v_appointment.client_id,
    v_appointment.id,
    'post_service',
    NOW() + INTERVAL '1 hour',
    'pending'
  );

  -- Criar notificação para o dono
  INSERT INTO notifications (barbershop_id, owner_id, type, title, body, data)
  SELECT
    v_appointment.barbershop_id,
    b.owner_id,
    'new_appointment',
    'Atendimento finalizado',
    v_appointment.notes,
    jsonb_build_object(
      'appointment_id', v_appointment.id,
      'client_name', c.name,
      'total_price', v_total_price
    )
  FROM barbershops b
  JOIN clients c ON c.id = v_appointment.client_id
  WHERE b.id = v_appointment.barbershop_id;

  RETURN jsonb_build_object(
    'appointment_id', v_appointment.id,
    'transaction_id', v_transaction_id,
    'commission_transaction_id', v_commission_transaction_id,
    'total_price', v_total_price,
    'commission_amount', v_commission_amount
  );
END;
$$;


-- ----------------------------------------------------------
-- 6.7 Função: Criar movimento de estoque
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION create_stock_movement(
  p_product_id UUID,
  p_type stock_movement_type,
  p_quantity INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_movement_id UUID;
  v_new_stock INTEGER;
BEGIN
  -- Buscar produto
  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  -- Calcular novo estoque
  v_new_stock := CASE p_type
    WHEN 'in' THEN v_product.stock_qty + p_quantity
    WHEN 'out' THEN v_product.stock_qty - p_quantity
    WHEN 'adjustment' THEN p_quantity  -- adjustment seta valor direto
  END;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Estoque não pode ser negativo. Estoque atual: %, Saída: %', v_product.stock_qty, p_quantity;
  END IF;

  -- Atualizar estoque
  UPDATE products
  SET stock_qty = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- Registrar movimento
  INSERT INTO product_stock_movements (
    barbershop_id, product_id, type, quantity, reason, created_by
  ) VALUES (
    v_product.barbershop_id, p_product_id, p_type, p_quantity, p_reason, auth.uid()
  ) RETURNING id INTO v_movement_id;

  -- Verificar estoque baixo e criar notificação
  IF v_new_stock <= v_product.stock_min THEN
    INSERT INTO notifications (barbershop_id, owner_id, type, title, body, data)
    SELECT
      v_product.barbershop_id,
      b.owner_id,
      'low_stock',
      'Estoque crítico: ' || v_product.name,
      'Estoque atual: ' || v_new_stock || ' (mínimo: ' || v_product.stock_min || ')',
      jsonb_build_object('product_id', p_product_id, 'new_stock', v_new_stock)
    FROM barbershops b
    WHERE b.id = v_product.barbershop_id;
  END IF;

  RETURN v_movement_id;
END;
$$;


-- ----------------------------------------------------------
-- 6.8 Função: Dashboard do dia
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard_today(p_barbershop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := NOW()::date;
  v_today_end TIMESTAMPTZ := (NOW()::date + INTERVAL '1 day');
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'appointments_confirmed', (
        SELECT COUNT(*) FROM appointments
        WHERE barbershop_id = p_barbershop_id
          AND status = 'confirmed'
          AND scheduled_at >= v_today_start
          AND scheduled_at < v_today_end
      ),
      'appointments_total', (
        SELECT COUNT(*) FROM appointments
        WHERE barbershop_id = p_barbershop_id
          AND status IN ('pending', 'confirmed')
          AND scheduled_at >= v_today_start
          AND scheduled_at < v_today_end
      ),
      'revenue_today', COALESCE((
        SELECT SUM(amount) FROM financial_transactions
        WHERE barbershop_id = p_barbershop_id
          AND type = 'income'
          AND transaction_at >= v_today_start
          AND transaction_at < v_today_end
      ), 0),
      'new_clients_whatsapp', (
        SELECT COUNT(*) FROM clients
        WHERE barbershop_id = p_barbershop_id
          AND created_by = 'whatsapp'
          AND created_at >= v_today_start
          AND created_at < v_today_end
      )
    ),
    'next_appointment', (
      SELECT jsonb_build_object(
        'client_name', c.name,
        'service', (SELECT s.name FROM services s WHERE s.id = a.service_ids[1]),
        'scheduled_at', a.scheduled_at,
        'professional_name', p.name
      )
      FROM appointments a
      JOIN clients c ON c.id = a.client_id
      JOIN professionals p ON p.id = a.professional_id
      WHERE a.barbershop_id = p_barbershop_id
        AND a.status IN ('pending', 'confirmed')
        AND a.scheduled_at >= NOW()
      ORDER BY a.scheduled_at ASC
      LIMIT 1
    ),
    'alerts', jsonb_build_object(
      'inactive_clients_count', (
        SELECT COUNT(*) FROM clients
        WHERE barbershop_id = p_barbershop_id
          AND (last_visit_at IS NULL OR last_visit_at < NOW() - INTERVAL '30 days')
      ),
      'low_stock_count', (
        SELECT COUNT(*) FROM products
        WHERE barbershop_id = p_barbershop_id
          AND stock_qty <= stock_min
          AND is_active = true
      ),
      'pending_handoff_count', (
        SELECT COUNT(*) FROM ai_conversations
        WHERE barbershop_id = p_barbershop_id
          AND intent_last = 'reclamacao'
          AND updated_at > NOW() - INTERVAL '24 hours'
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ============================================================
-- 7. COMENTÁRIOS NAS TABELAS (Documentação)
-- ============================================================

COMMENT ON TABLE barbershops IS 'Cadastro de barbearias (multi-tenant)';
COMMENT ON TABLE professionals IS 'Profissionais/barbeiros de cada barbearia';
COMMENT ON TABLE services IS 'Serviços oferecidos (corte, barba, combo, etc.)';
COMMENT ON TABLE clients IS 'Clientes cadastrados na barbearia';
COMMENT ON TABLE appointments IS 'Agendamentos de serviços';
COMMENT ON TABLE products IS 'Produtos vendidos pela barbearia';
COMMENT ON TABLE financial_transactions IS 'Transações financeiras (receitas, despesas e comissões)';
COMMENT ON TABLE ai_conversations IS 'Conversas com IA via WhatsApp';
COMMENT ON TABLE follow_ups IS 'Acompanhamentos automáticos (lembretes, reativação)';
COMMENT ON TABLE push_tokens IS 'Tokens para push notification (Expo)';
COMMENT ON TABLE notifications IS 'Notificações internas do sistema';
COMMENT ON TABLE notifications_log IS 'Log de envio de push notifications';
COMMENT ON TABLE product_stock_movements IS 'Movimentações de estoque de produtos';

-- ============================================================
-- 8. BUCKETS DO SUPABASE STORAGE (criar via Dashboard)
-- ============================================================
-- barbershop-logos  (logos das barbearias)
-- product-images    (fotos dos produtos)
-- avatars           (fotos de perfil de profissionais)
