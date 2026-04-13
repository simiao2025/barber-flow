# 📋 Ordem de Execução das Migrations — BARBEAR-FLOW

## ⚠️ IMPORTANTE

Este projeto usa **dois workflows diferentes** de migração de banco de dados:

1. **Supabase Migrations** (`supabase/001-003.sql`) — Schema completo + RLS + Triggers + Índices
2. **Drizzle ORM** (`agent-server/src/db/schema.ts`) — Apenas para queries via TypeScript (runtime)

O Drizzle **NÃO** é responsável por criar o schema. Ele apenas mapeia tabelas existentes.

---

## Ordem de Execução (Supabase)

Executar **nesta ordem** no SQL Editor do Supabase:

### 1️⃣ `supabase/001_schema_completo.sql`
- 15 ENUMs
- 13 tabelas
- ~40 índices
- 8 triggers de `updated_at`
- Políticas RLS (Row Level Security)
- CHECK constraints
- UNIQUE constraints
- FK para `auth.users`

### 2️⃣ `supabase/002_stock_triggers.sql`
- Função `notify_low_stock()`
- Trigger `trg_low_stock_alert` em `products`

### 3️⃣ `supabase/003_rls_multi_tenant.sql`
- Função helper `get_my_barbershop_id()`
- Revisão completa das políticas RLS (usa função helper)
- RLS em 13 tabelas
- Políticas para `push_tokens`, `notifications`, `notifications_log`, `product_stock_movements`

---

## Drizzle ORM — Apenas para Queries

O Drizzle (`agent-server/src/db/schema.ts`) é **apenas um mapeador** de tabelas existentes. Ele:

- ✅ Lê e escreve dados nas tabelas criadas pelo Supabase
- ✅ Faz type-safe queries
- ❌ **NÃO** cria/modifica tabelas
- ❌ **NÃO** cria índices, triggers ou RLS

### Drizzle Config
```bash
# NÃO rodar db:push em produção (o schema já existe via Supabase)
npm run db:push  # ⛔ NÃO USAR

# Drizzle-kit serve apenas para gerar tipos, não migrations
npx drizzle-kit generate  # ⛔ NÃO USAR (já temos migrations Supabase)
```

---

## Verificar se o Banco Está Pronto

Após executar as 3 migrations, rodar no SQL Editor:

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar enums
SELECT enumlabel, enumtypid::regtype FROM pg_enum;

-- Verificar RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Verificar triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers;

-- Verificar índices
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
```

### Esperado:
- **13 tabelas**
- **15 enums**
- **~40 índices**
- **~8 triggers**
- **RLS habilitado** em todas as tabelas de negócio

---

## Agent-Server: Startup Validation

O agent-server valida variáveis de ambiente na inicialização mas **NÃO** valida o schema do banco.

Se o Drizzle encontrar uma tabela/coluna que não existe, o erro será:
```
column "xyz" does not exist
relation "table_name" does not exist
```

Nesse caso, verificar se as migrations Supabase foram executadas.

---

## Histórico de Mudanças no Schema

Para futuras alterações:

1. **Sempre atualizar** `supabase/` com novas migrations numeradas
2. **Sincronizar** `agent-server/src/db/schema.ts` com as mudanças
3. **NÃO** usar `drizzle-kit push` em produção
4. **Sempre** testar migrations em ambiente de staging antes
