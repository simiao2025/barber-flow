# 🚀 BARBEAR-FLOW — Guia de Deploy para Produção

## Checklist Pré-Deploy

### 1. Variáveis de Ambiente
- [ ] Copiar `.env.production.example` para `.env.production`
- [ ] Preencher TODAS as variáveis com valores reais
- [ ] Gerar `WEBHOOK_SECRET`: `openssl rand -hex 32`
- [ ] Gerar `API_SECRET_KEY`: `openssl rand -hex 32`
- [ ] Definir `CORS_ALLOWED_ORIGINS` com domínios explícitos (NÃO use `*`)
- [ ] Definir `LOG_LEVEL=info` (não `debug` em produção)
- [ ] Verificar que `DATABASE_URL` NÃO aponta para localhost
- [ ] Verificar que `NODE_ENV=production`

### 2. Validação Automática
```bash
cd agent-server
npm run predeploy
```
Este script verifica:
- Arquivos essenciais
- Variáveis de ambiente obrigatórias
- Configurações de segurança
- Dockerfile (usuário non-root, healthcheck)
- Padrões de logging

### 3. Type Check e Build
```bash
npm run typecheck   # Verificar tipos TypeScript
npm run build       # Compilar para produção
```

### 4. Docker Build
```bash
# Build da imagem
docker build -t barbear-flow-agent-server:latest .

# Teste local
docker run --env-file .env.production -p 3000:3000 barbear-flow-agent-server:latest

# Health check
curl http://localhost:3000/health
```

### 5. Deploy (Railway / Docker)

#### Railway
```bash
# Variáveis de ambiente configuradas no dashboard Railway
# DATABASE_URL, ANTHROPIC_API_KEY, etc.

railway up
```

#### Docker Compose
```bash
# Com .env.production no servidor
docker-compose --env-file .env.production up -d

# Verificar logs
docker-compose logs -f agent-server

# Health check
curl http://localhost:3000/health
```

---

## Melhorias Enterprise Implementadas

### 🔒 Segurança
| Melhoria | Descrição |
|----------|-----------|
| **HMAC Webhook Validation** | Validação completa com `timingSafeEqual` para prevenir timing attacks |
| **Rate Limiting** | Sliding window com headers `X-RateLimit-*` (200/min webhook, 60/min API) |
| **Security Headers** | HSTS, X-Content-Type-Options, X-Frame-Options, CSP, CORP, COOP |
| **CORS Configurável** | Origens explícitas via `CORS_ALLOWED_ORIGINS` (não mais `*` em produção) |
| **API Key Auth** | Middleware `requireApiKey()` para rotas administrativas |
| **Non-root Docker** | Container roda como usuário `nodejs` (UID 1001) |
| **.gitignore** | Bloqueia todos os arquivos `.env` e sensíveis |

### ⚙️ Confiabilidade
| Melhoria | Descrição |
|----------|-----------|
| **Env Validation** | Validação de variáveis na inicialização (bloqueia startup se crítico) |
| **Graceful Shutdown** | SIGINT/SIGTERM → para scheduler → limpa fila → fecha DB → exit |
| **Health Checks** | Docker HEALTHCHECK + `/health` endpoint |
| **Timeouts Configuráveis** | Todos os serviços externos com timeouts via `.env` |
| **DB Pool Configurável** | `DATABASE_POOL_MAX`, `IDLE_TIMEOUT`, `CONNECTION_TIMEOUT` |
| **Tini Init System** | Previne processos zombie no Docker |

### 📊 Observabilidade
| Melhoria | Descrição |
|----------|-----------|
| **Logging Estruturado** | Pino JSON em produção, colorido em dev |
| **HTTP Logging** | Requests logados em development com duration |
| **Error Handler Global** | Erros não expõem stack trace em produção |
| **Rate Limit Headers** | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |

### 🐳 Docker
| Melhoria | Descrição |
|----------|-----------|
| **Multi-stage Build** | Stage 1: build, Stage 2: runtime (imagem mínima) |
| **OCI Labels** | Metadata da imagem padronizada |
| **Health Check** | Automático via wget no HEALTHCHECK |
| **Resource Limits** | CPU e memória limitados no docker-compose |
| **Dependency Health** | `depends_on` com `condition: service_healthy` |

---

## Variáveis de Ambiente Completas

### Obrigatórias
| Variável | Exemplo | Finalidade |
|----------|---------|------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL (Drizzle) |
| `UPSTASH_REDIS_REST_URL` | `https://xyz.upstash.io` | Sessão do agente |
| `UPSTASH_REDIS_REST_TOKEN` | `gQAAAA...` | Auth Redis |
| `EVOLUTION_API_URL` | `https://evolution.dominio.com` | WhatsApp Gateway |
| `EVOLUTION_API_KEY` | `ca47d6f0-...` | Auth Evolution |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Claude LLM |

### Recomendadas para Produção
| Variável | Exemplo | Finalidade |
|----------|---------|------------|
| `WEBHOOK_SECRET` | `openssl rand -hex 32` | HMAC webhook |
| `API_SECRET_KEY` | `openssl rand -hex 32` | Auth rotas admin |
| `CORS_ALLOWED_ORIGINS` | `https://app.dominio.com` | Origens CORS |
| `LOG_LEVEL` | `info` | Nível de log |

### Opcionais
| Variável | Default | Finalidade |
|----------|---------|------------|
| `OPENAI_API_KEY` | — | Whisper transcrição |
| `LLM_MODEL` | `claude-sonnet-4-5-20250514` | Modelo LLM |
| `EVOLUTION_INSTANCE_NAME` | `barbear-flow` | Nome instância |
| `PORT` | `3000` | Porta HTTP |

### Timeouts (ms)
| Variável | Default |
|----------|---------|
| `EVOLUTION_API_TIMEOUT_MS` | `30000` |
| `ANTHROPIC_API_TIMEOUT_MS` | `60000` |
| `OPENAI_API_TIMEOUT_MS` | `30000` |
| `DATABASE_CONNECTION_TIMEOUT_MS` | `5000` |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` |

---

## Removido/Não Usado

As seguintes variáveis estavam no `.env` mas **não são usadas pelo agent-server**:
- `SUPABASE_URL` → Acesso via `DATABASE_URL` (Drizzle)
- `SUPABASE_SERVICE_ROLE_KEY` → Não usado no agent-server
- `SUPABASE_ANON_KEY` → Não usado no agent-server
- `GROQ_API_KEY` → Código não implementado

Estas variáveis foram removidas do `.env` principal para evitar confusão.

---

## Estrutura de Arquivos (agent-server)

```
agent-server/
├── .env                         # Desenvolvimento (local)
├── .env.example                 # Template de variáveis
├── .env.production.example      # Template de produção
├── .gitignore                   # Ignora .env e sensíveis
├── Dockerfile                   # Multi-stage, non-root, tini
├── docker-compose.yml           # Com healthchecks e limits
├── package.json                 # Scripts + deps
├── scripts/
│   └── predeploy-check.ts       # Validação pré-deploy
└── src/
    ├── index.ts                 # Entry point (security middleware)
    ├── middleware/
    │   ├── securityHeaders.ts   # Helmet-like
    │   ├── cors.ts              # CORS configurável
    │   ├── rateLimit.ts         # Rate limiting
    │   └── auth.ts              # API Key auth
    ├── lib/
    │   ├── envValidator.ts      # Validação de variáveis
    │   ├── logger.ts            # Pino logger
    │   ├── errors.ts            # Classes de erro
    │   └── queue.ts             # Message queue
    ├── routes/
    │   ├── webhook.ts           # Webhook com HMAC validation
    │   ├── conversations.ts     # Gestão de conversas
    │   └── health.ts            # Health check
    ├── services/
    │   ├── evolution.ts         # Evolution API client
    │   ├── llm.ts               # Anthropic client
    │   ├── whisper.ts           # OpenAI Whisper
    │   ├── supabase.ts          # BarberShopRepository
    │   └── scheduler.ts         # Cron jobs
    ├── agent/
    │   ├── orchestrator.ts      # Orquestrador IA
    │   ├── session.ts           # Redis session
    │   ├── executor.ts          # Tool execution
    │   ├── prompts.ts           # System prompts
    │   └── tools.ts             # Tool definitions
    ├── db/
    │   ├── index.ts             # PostgreSQL pool + Drizzle
    │   └── schema.ts            # Schema completo
    └── types/
        ├── agent.ts             # Tipos do agente
        └── webhook.ts           # Tipos do webhook
```

---

## Próximos Passos Recomendados

1. **CI/CD**: Adicionar GitHub Actions para rodar `typecheck` + `predeploy` no PR
2. **Monitoring**: Integrar com Sentry/Datadog para error tracking
3. **Backups**: Configurar backup automático do Supabase
4. **Alerting**: Configurar alertas para health check falhando
5. **API Docs**: Adicionar OpenAPI/Swagger para rotas públicas
6. **Tests**: Adicionar testes unitários e de integração

---

## 📋 Migrations do Banco de Dados

### Fluxo Correto

Este projeto usa **Supabase Migrations** (não Drizzle migrations):

| Arquivo | Conteúdo |
|---------|----------|
| `supabase/001_schema_completo.sql` | 13 tabelas, 15 enums, ~40 índices, RLS, triggers |
| `supabase/002_stock_triggers.sql` | Trigger `notify_low_stock` |
| `supabase/003_rls_multi_tenant.sql` | Função `get_my_barbershop_id()`, RLS revisado |

### Executar na Ordem

```bash
# 1. SQL Editor do Supabase → colar 001_schema_completo.sql → Run
# 2. SQL Editor do Supabase → colar 002_stock_triggers.sql → Run
# 3. SQL Editor do Supabase → colar 003_rls_multi_tenant.sql → Run
```

### Drizzle ORM — Apenas Runtime

```bash
# NÃO rodar db:push em produção (schema já existe)
npm run db:push  # ⛔ NÃO USAR

# O Drizzle apenas mapeia tabelas existentes — não cria nada
```

Ver detalhes completos em `MIGRATIONS-README.md` na raiz do projeto.
