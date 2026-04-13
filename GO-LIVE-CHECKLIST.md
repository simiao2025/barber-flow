# BARBEAR-FLOW: Checklist de Go-Live

## Pré-Deploy

### Infraestrutura
- [ ] Projeto Supabase criado (production)
- [ ] Database PostgreSQL provisionado
- [ ] Storage buckets criados:
  - [ ] `barbershop-logos` (logos das barbearias)
  - [ ] `product-images` (fotos dos produtos)
  - [ ] `avatars` (fotos de perfil)
- [ ] RLS habilitado e testado em todas as tabelas
- [ ] Edge Functions deployadas:
  - [ ] financial-transaction
  - [ ] financial-summary
  - [ ] close-appointment
  - [ ] financial-commissions
  - [ ] dashboard-today
  - [ ] send-push
  - [ ] onboarding-setup

### Agent Server (Railway)
- [ ] Projeto Railway criado
- [ ] Variáveis de ambiente configuradas:
  - [ ] `DATABASE_URL`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `EVOLUTION_API_URL`
  - [ ] `EVOLUTION_API_KEY`
  - [ ] `EVOLUTION_INSTANCE_NAME`
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
  - [ ] `OPENAI_API_KEY`
  - [ ] `WEBHOOK_SECRET`
  - [ ] `LOG_LEVEL`
  - [ ] `NODE_ENV=production`
- [ ] Domínio customizado configurado com HTTPS
- [ ] Health check passando: `https://seu-dominio.com/health`

### WhatsApp (Evolution API)
- [ ] Instância Evolution API criada e conectada
- [ ] Webhook configurado: `https://seu-dominio.com/webhook/whatsapp`
- [ ] Assinatura HMAC configurada
- [ ] Mensagem de teste enviada e respondida pelo agente

### App Mobile (Expo)
- [ ] EAS Build configurado
- [ ] Credenciais Apple (Certificate + Provisioning Profile)
- [ ] Credenciais Google (Keystore)
- [ ] Push notifications testadas em device físico
- [ ] App compilado e instalado em pelo menos 1 device de teste

### CI/CD (GitHub Actions)
- [ ] Secrets configurados no GitHub:
  - [ ] `RAILWAY_TOKEN`
  - [ ] `RAILWAY_DOMAIN`
  - [ ] `EXPO_TOKEN`
  - [ ] `EXPO_PUBLIC_SUPABASE_URL`
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Workflow `deploy-agent.yml` testado (push → deploy automático)
- [ ] Workflow `build-app.yml` testado (push → build EAS)

---

## Testes de Validação

### Fluxo Completo (E2E)
- [ ] Mensagem no WhatsApp → Agente responde e cria agendamento
- [ ] Agendamento aparece no app mobile em tempo real (Realtime)
- [ ] Follow-up enviado automaticamente (teste com scheduled_for = now + 1 min)
- [ ] Fechamento de agendamento cria transação financeira + comissão
- [ ] Dashboard do dia carrega corretamente
- [ ] Push notification recebida no device

### Multi-Tenant (Isolamento)
- [ ] Usuário A NÃO consegue ver dados do Usuário B
- [ ] RLS bloqueando INSERT cruzado entre barbearias
- [ ] Função `get_my_barbershop_id()` funcionando corretamente

### Performance
- [ ] Resposta do agente em < 5 segundos
- [ ] Dashboard carrega em < 2 segundos
- [ ] Realtime funcionando sem duplicação de eventos

---

## Monitoramento

- [ ] Sentry configurado no servidor (agent-server)
  - [ ] DSN configurado em variável de ambiente
  - [ ] Source maps enviados
- [ ] Pino Logger em modo JSON (production)
- [ ] Alertas de erro crítico configurados

---

## Documentação

- [ ] README.md do projeto com:
  - [ ] Instruções de setup local
  - [ ] Diagrama de arquitetura
  - [ ] Guia de variáveis de ambiente
  - [ ] Links úteis (Railway, Supabase, Evolution API)
- [ ] Documentação da API (rotas do servidor)
- [ ] Runbook de incidentes (o que fazer se X falhar)

---

## Go-Live ✅

### Dia do Lançamento
- [ ] Backup completo do banco
- [ ] Todos os cron jobs verificados
- [ ] Agent server rodando e saudável
- [ ] Webhook do WhatsApp ativo e respondendo
- [ ] App mobile publicado (App Store / Play Store ou TestFlight)
- [ ] Time de suporte avisado

### Pós-Lançamento (24h)
- [ ] Monitorar logs de erro
- [ ] Verificar taxa de sucesso dos follow-ups
- [ ] Validar métricas do dashboard
- [ ] Coletar feedback dos primeiros usuários

---

**Data do Go-Live:** ___/___/2025
**Responsável:** ____________________
