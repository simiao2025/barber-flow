-- ============================================================
-- BARBEAR-FLOW: Migration - RBAC (user_profiles + professionals.user_id)
-- Data: 2026-05-20
-- ============================================================

-- 1. Criar tabela user_profiles (ponte entre auth.users e barbershops com role)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'professional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Adicionar coluna user_id na tabela professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: usuário pode ler seu próprio perfil
CREATE POLICY "Users can read own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: owner pode ler todos os perfis da sua barbearia
CREATE POLICY "Owners can read barbershop profiles" ON user_profiles 
  FOR SELECT USING (
    barbershop_id IN (
      SELECT up.barbershop_id FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'owner'
    )
  );

-- Policy: owner pode inserir perfis na sua barbearia
CREATE POLICY "Owners can create profiles" ON user_profiles 
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT up.barbershop_id FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'owner'
    )
  );

-- Policy: owner pode deletar perfis da sua barbearia  
CREATE POLICY "Owners can delete profiles" ON user_profiles
  FOR DELETE USING (
    barbershop_id IN (
      SELECT up.barbershop_id FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'owner'
    )
  );

-- 4. Migrar owners existentes para user_profiles
INSERT INTO user_profiles (user_id, barbershop_id, role)
SELECT owner_id, id, 'owner' FROM barbershops
ON CONFLICT (user_id) DO NOTHING;
