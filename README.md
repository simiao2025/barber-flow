# 🪒 BarberFlow

> **SaaS Multi-Tenant para Gestão de Barbearias** — Agendamento via WhatsApp com IA, gestão completa de clientes, profissionais, serviços, financeiro e estoque.

## 🚀 Visão Geral

BarberFlow é uma plataforma completa para barbearias gerenciarem seus negócios através de um **agente IA no WhatsApp** + **app mobile** para o barbeiro.

### Funcionalidades

| Área | Recursos |
|------|----------|
| **🤖 Agente IA (WhatsApp)** | Agendamento, cancelamento, follow-ups automáticos, transcrição de áudio |
| **📱 App Mobile (Expo)** | Dashboard, agenda, clientes, financeiro, produtos, profissionais, serviços, configurações |
| **💰 Financeiro** | Resumo por período, comissões por profissional, transações manuais, ticket médio |
| **📦 Estoque** | Produtos, movimentações (entrada/saída/ajuste), alertas de estoque baixo |
| **👥 Profissionais** | CRUD completo, % comissão, serviços vinculados |
| **✂️ Serviços** | CRUD completo, 7 categorias, preço e duração |
| **🔔 Notificações** | Push notifications, lembretes 24h/1h, reativação de clientes inativos |

## 🏗️ Arquitetura

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   WhatsApp      │─────▶│  Evolution API    │─────▶│  Agent Server   │
│   (Cliente)     │      │  (Gateway)        │      │  (Hono + TS)    │
└─────────────────┘      └──────────────────┘      └───────┬─────────┘
                                                           │
                          ┌──────────────────┐      ┌──────▼─────────┐
│   App Mobile    │      │   Supabase       │◀─────│  Drizzle ORM    │
│   (Expo/React)  │─────▶│   PostgreSQL     │      │  (Queries)      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

### Stack

| Componente | Tecnologia |
|------------|------------|
| **Agent Server** | Hono + TypeScript + Node.js 20 |
| **App Mobile** | Expo (React Native) + Zustand + TanStack Query |
| **Banco de Dados** | Supabase (PostgreSQL) + RLS + Edge Functions |
| **ORM** | Drizzle ORM |
| **LLM** | Anthropic Claude (tool use nativo) |
| **WhatsApp** | Evolution API |
| **Áudio → Texto** | OpenAI Whisper |
| **Sessão do Agente** | Upstash Redis |
| **Deploy** | Railway / Docker |

## 📁 Estrutura do Projeto

```
barber-flow/
├── agent-server/                  # Servidor do agente IA
│   ├── src/
│   │   ├── agent/                 # Orchestrator, session, tools, prompts
│   │   ├── db/                    # Drizzle ORM schema + pool
│   │   ├── lib/                   # Logger, errors, queue, env validator
│   │   ├── middleware/            # Security, CORS, rate limit, auth
│   │   ├── routes/                # Webhook, conversas, health
│   │   ├── services/              # Evolution, LLM, Whisper, scheduler
│   │   └── types/                 # Tipos TypeScript
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── scripts/predeploy-check.ts
├── barber-app/                    # App mobile (Expo)
│   ├── app/                       # Rotas Expo Router (18 telas)
│   │   ├── (auth)/                # Login, onboarding
│   │   ├── (tabs)/                # 6 tabs principais
│   │   ├── appointments/          # Criar + detalhe de agendamento
│   │   ├── clients/               # Criar/editar cliente
│   │   ├── profissionais/         # Lista + formulário
│   │   ├── servicos/              # Lista + formulário
│   │   └── conversas/             # Lista + chat individual
│   ├── hooks/                     # 10 hooks React Query + mutations
│   ├── lib/                       # Supabase client, notifications, query
│   ├── stores/                    # Zustand auth store
│   └── types/                     # Tipos TypeScript do banco
├── supabase/                      # Migrations do banco
│   ├── 001_schema_completo.sql    # 13 tabelas, 15 enums, RLS, índices
│   ├── 002_stock_triggers.sql     # Trigger alerta estoque baixo
│   └── 003_rls_multi_tenant.sql   # RLS otimizado com helper
├── MIGRATIONS-README.md           # Guia de execução das migrations
└── GO-LIVE-CHECKLIST.md           # Checklist pré-lançamento
```

## 📱 App Mobile — Mapa Completo de Rotas

### Tabs Principais (6)

| Tab | Rota | Funcionalidades |
|-----|------|----------------|
| 📅 **Agenda** | `(tabs)/agenda` | Visão por dia, navegação semanal, realtime, FAB novo agendamento |
| 📊 **Dashboard** | `(tabs)/index` | KPIs do dia, gráfico semanal, rankings de serviços/profissionais, alertas |
| 👥 **Clientes** | `(tabs)/clientes` | Lista, busca, filtros (ativos/inativos), botão criar cliente |
| 💰 **Financeiro** | `(tabs)/financeiro` | 3 sub-tabs: resumo, comissões, transações + modal nova transação |
| 📦 **Produtos** | `(tabs)/produtos` | Lista com estoque, barra visual, filtros, modal movimentação |
| ⚙️ **Config** | `(tabs)/config` | Conta, preferências, WhatsApp, suporte, logout |

### Rotas Modais

| Rota | Tela |
|------|------|
| `/appointments/new` | Criar agendamento (cliente + profissional + serviços + data/hora) |
| `/appointments/[id]` | Detalhe do agendamento (confirmar, finalizar, cancelar) |
| `/clients/new` | Criar/editar cliente (nome, telefone, email, observações) |
| `/profissionais` | Lista de profissionais (comissão, status, ações) |
| `/profissionais/new` | Criar/editar profissional (nome, comissão, serviços) |
| `/servicos` | Lista de serviços (preço, duração, categoria, ações) |
| `/servicos/new` | Criar/editar serviço (nome, preço, duração, 7 categorias) |
| `/conversas` | Lista de conversas com IA |
| `/conversas/[phone]` | Chat individual com cliente |

### Hooks (10)

| Hook | Query | Mutations |
|------|-------|-----------|
| `useDashboard` | ✅ KPIs via Edge Function | — |
| `useAppointments` | ✅ Por data, próximos | `create`, `cancel`, `update` |
| `useClients` | ✅ Lista com filtros | `create`, `update` |
| `useProfessionals` | ✅ Lista | `create`, `update`, `delete` |
| `useServices` | ✅ Lista | `create`, `update`, `delete` |
| `useProducts` | ✅ Lista com filtros | `stockMovement` |
| `useFinancialSummary` | ✅ Resumo por período | — |
| `useCommissions` | ✅ Por profissional/período | — |
| `useTransactions` | ✅ Lista | `create` |
| `useConversation` | ✅ Lista conversas | `assume`, `returnToAgent`, `sendMessage` |

## ⚡ Quick Start

### 1. Agent Server

```bash
cd agent-server

# Copiar e preencher variáveis
cp .env.example .env

# Instalar dependências
npm install

# Validar configuração
npm run predeploy

# Rodar em desenvolvimento
npm run dev
```

### 2. App Mobile

```bash
cd barber-app

# Copiar e preencher variáveis
cp .env.example .env

# Instalar dependências
npm install

# Rodar app
npx expo start
```

### 3. Banco de Dados

Executar no **SQL Editor do Supabase** (na ordem):

1. `supabase/001_schema_completo.sql`
2. `supabase/002_stock_triggers.sql`
3. `supabase/003_rls_multi_tenant.sql`

## 🔒 Variáveis de Ambiente

### Agent Server (agent-server/.env)

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | ✅ | URL do Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Token do Redis |
| `EVOLUTION_API_URL` | ✅ | URL da Evolution API |
| `EVOLUTION_API_KEY` | ✅ | API Key da Evolution |
| `ANTHROPIC_API_KEY` | ✅ | API Key do Anthropic |
| `WEBHOOK_SECRET` | ⚠️ | HMAC para validar webhook |
| `API_SECRET_KEY` | ⚠️ | Auth para rotas admin |
| `OPENAI_API_KEY` | ❌ | Whisper (transcrição de áudio) |

> ⚠️ = Recomendado para produção &nbsp;|&nbsp; ❌ = Opcional (graceful degrade)

Veja todos em [agent-server/.env.example](agent-server/.env.example) e [agent-server/.env.production.example](agent-server/.env.production.example).

## 🐳 Docker

```bash
# Desenvolvimento
docker-compose up -d

# Build da imagem
docker build -t barbear-flow-agent-server:latest .

# Produção
docker run --env-file .env.production -p 3000:3000 barbear-flow-agent-server:latest
```

## 🚀 Deploy

### Railway

1. Conectar o repositório no Railway
2. Configurar variáveis de ambiente no dashboard
3. Deploy automático no push

### Pré-Deploy

```bash
cd agent-server
npm run typecheck     # Verificar tipos
npm run build         # Compilar TypeScript
npm run predeploy     # Checklist automatizado
```

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [MIGRATIONS-README.md](MIGRATIONS-README.md) | Guia de execução das migrations |
| [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) | Checklist pré-lançamento |
| [agent-server/PRODUCTION-GUIDE.md](agent-server/PRODUCTION-GUIDE.md) | Guia completo de deploy |
| [barber-ai-prompts.md](barber-ai-prompts.md) | Prompts e comportamento da IA |

## 🔐 Segurança

- **Validação HMAC** de webhook com `timingSafeEqual`
- **Rate Limiting** configurável (200/min webhook, 60/min API)
- **CORS configurável** por domínio (não `*` em produção)
- **Security Headers** (HSTS, X-Frame-Options, CSP)
- **API Key Auth** para rotas administrativas
- **Row Level Security (RLS)** no Supabase
- **Non-root Docker container**
- **Graceful shutdown** com cleanup completo
- **Startup validation** de variáveis de ambiente

## 📊 Agente IA — Ferramentas

| Tool | Descrição |
|------|-----------|
| `check_availability` | Consulta horários disponíveis |
| `create_appointment` | Cria agendamento |
| `update_appointment` | Atualiza agendamento |
| `cancel_appointment` | Cancela agendamento |
| `get_client_appointments` | Lista agendamentos do cliente |
| `get_dashboard_today` | Dashboard do dia |
| `request_human_handoff` | Solicita atendimento humano |

## 📄 Licença

Proprietário — Todos os direitos reservados.

---

**Desenvolvido com** ❤️ **para barbearias**
