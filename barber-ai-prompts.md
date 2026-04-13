# BarberAI — Prompts por fase para IDE Antigravity

> Agente IA nativo em TypeScript + Evolution API + Supabase + App Expo React Native  
> Execute os prompts na ordem indicada. Cada prompt é autocontido com stack, contexto e entregável esperado.

---

## Arquitetura do agente nativo

**Evolution API** recebe mensagem do WhatsApp → dispara webhook para o **servidor Hono/TypeScript** → o `AgentOrchestrator` carrega sessão do **Redis (Upstash)**, chama o **LLM (Anthropic Claude)** com tool use nativo, executa as tools (CRUD no **Supabase** via **Drizzle ORM**) e responde de volta via **Evolution API**. O cron de follow-ups roda no mesmo processo com `node-cron`. O app mobile (**Expo + React Native**) consome o Supabase diretamente com Realtime para atualizações ao vivo.

---

## Fase 1 — Fundação (semanas 1–4)

> Schema Supabase + Servidor do agente + App mobile core

---

### Prompt 1.1 — Schema Supabase completo

```
Crie o schema completo do banco de dados PostgreSQL no Supabase para um sistema SaaS de gestão de barbearia.

STACK: Supabase (PostgreSQL 15), Row Level Security, TypeScript, Drizzle ORM.

TABELAS:
- barbershops (id uuid PK, name, owner_id FK→auth.users, whatsapp_number, working_hours jsonb, settings jsonb, created_at)
- professionals (id, barbershop_id FK, name, avatar_url, service_ids uuid[], working_hours jsonb, commission_pct numeric, is_active bool)
- services (id, barbershop_id FK, name, description, price numeric, duration_min int, category, is_active bool)
- clients (id, barbershop_id FK, name, phone unique, email, notes, total_visits int default 0, last_visit_at, created_by enum(whatsapp|manual))
- appointments (id, barbershop_id FK, client_id FK, professional_id FK, service_ids uuid[], scheduled_at timestamptz, duration_min int, status enum(pending|confirmed|done|cancelled|no_show), total_price numeric, source enum(whatsapp|manual|app), notes, created_at)
- products (id, barbershop_id FK, name, brand, price_sale numeric, price_cost numeric, stock_qty int, stock_min int, is_active bool)
- financial_transactions (id, barbershop_id FK, appointment_id FK nullable, type enum(income|expense), category, amount numeric, payment_method enum(cash|pix|card), description, transaction_at)
- ai_conversations (id, barbershop_id FK, client_id FK nullable, phone, messages jsonb[], intent_last text, follow_up_at timestamptz, updated_at)
- follow_ups (id, barbershop_id FK, client_id FK, appointment_id FK nullable, type enum(reminder_24h|reminder_1h|post_service|reactivation), scheduled_for timestamptz, sent_at, status enum(pending|sent|failed))
- push_tokens (id, owner_id FK, barbershop_id FK, expo_token, device_os, updated_at)

ENTREGAR:
1. SQL completo (CREATE TABLE, ENUMs, índices, FK constraints)
2. Políticas RLS por tabela — owner só acessa dados da sua barbearia
3. Função SQL: check_slot_availability(p_barbershop_id, p_professional_id, p_start timestamptz, p_duration_min int) RETURNS bool
4. Função SQL: get_available_slots(p_barbershop_id, p_date date, p_service_id uuid) RETURNS TABLE(slot_start, slot_end, professional_id, professional_name)
5. Schema Drizzle ORM em TypeScript: src/db/schema.ts com todos os tipos inferidos usando pgTable, uuid, text, jsonb, timestamp, numeric, boolean, pgEnum
6. Arquivo src/db/index.ts com cliente Drizzle configurado para Supabase via connection string (postgres driver)
7. drizzle.config.ts configurado para migrations com drizzle-kit
8. Seed de dados fictícios para uma barbearia de exemplo
```

---

### Prompt 1.2 — Servidor do agente: estrutura do projeto TypeScript

```
Crie a estrutura completa do servidor backend do agente IA de barbearia em TypeScript.

STACK: Node.js 20+, Hono (web framework leve, edge-ready), TypeScript strict, Zod, Drizzle ORM, Supabase JS v2, @upstash/redis, pino (logger), dotenv. Deploy: Railway (Dockerfile).

ESTRUTURA DE PASTAS:
agent-server/
  src/
    index.ts                  ← entry point: inicia servidor Hono na porta 3000
    routes/
      webhook.ts              ← POST /webhook/whatsapp (Evolution API)
      appointments.ts         ← CRUD REST de agendamentos
      conversations.ts        ← gerenciamento de conversas (assumir/devolver agente)
      health.ts               ← GET /health
    agent/
      index.ts                ← AgentOrchestrator: orquestrador principal
      session.ts              ← gerenciamento de sessão no Redis
      tools.ts                ← definição das tools para o LLM (formato Anthropic)
      executor.ts             ← executa a tool chamada pelo LLM
      prompts.ts              ← system prompt e templates de mensagem
    services/
      evolution.ts            ← cliente da Evolution API (send, getMedia, sendTyping)
      llm.ts                  ← cliente Anthropic SDK com retry
      supabase.ts             ← BarberShopRepository: queries de negócio
      whisper.ts              ← transcrição de áudio via OpenAI Whisper
      scheduler.ts            ← cron jobs de follow-up com node-cron
    db/
      schema.ts               ← Drizzle schema (gerado no prompt 1.1)
      index.ts                ← cliente Drizzle
    lib/
      errors.ts               ← AgentError, ToolError, LLMError com códigos
      logger.ts               ← pino + pino-pretty para dev
      queue.ts                ← fila de processamento de mensagens (evita race condition)
    types/
      webhook.ts              ← tipos do payload Evolution API
      agent.ts                ← tipos internos: AgentSession, Tool, LLMResponse
  .env.example
  Dockerfile
  docker-compose.yml
  tsconfig.json
  package.json

ENTREGAR:
1. package.json com todas as dependências e scripts (dev com tsx watch, build com tsc, start)
2. tsconfig.json com strict mode e paths aliases (@agent/*, @services/*, @db/*)
3. src/index.ts: servidor Hono com middleware de logger, cors, error handler global, graceful shutdown
4. src/routes/webhook.ts: recebe POST do Evolution API, valida assinatura HMAC, enfileira mensagem e retorna 200 imediatamente (processamento assíncrono para não bloquear o webhook)
5. src/lib/logger.ts com pino configurado (JSON em produção, pretty em dev)
6. src/lib/errors.ts: classes de erro customizadas com código, mensagem e contexto
7. src/lib/queue.ts: fila simples por número de telefone (evita processar 2 mensagens do mesmo número simultâneo)
8. Dockerfile multi-stage (build + runtime com node:20-alpine) otimizado
9. docker-compose.yml com agent-server + redis local para desenvolvimento
10. .env.example com todas as variáveis necessárias documentadas
```

---

### Prompt 1.3 — Serviços: Evolution API + LLM + Supabase Repository

```
Implemente os três serviços externos do agente IA da barbearia.

STACK: TypeScript strict, Hono, Supabase JS v2, Drizzle ORM, Anthropic SDK (@anthropic-ai/sdk), axios com axios-retry, Zod.

ARQUIVO 1 — src/services/evolution.ts:
Classe EvolutionService com métodos:
- sendText(instance: string, phone: string, text: string): Promise<void>
- sendTyping(instance: string, phone: string, duration?: number): Promise<void>  ← simula "digitando..." por N ms
- getMediaBase64(instance: string, message: EvolutionMessage): Promise<{ base64: string, mimeType: string }>
- markAsRead(instance: string, messageId: string): Promise<void>
Usar axios com axios-retry (3 tentativas, backoff exponencial, retry em 429 e 5xx).
Autenticação via header apikey.
Log de cada chamada com tempo de resposta.

ARQUIVO 2 — src/services/llm.ts:
Classe LLMService com método principal:
- chat(params: { systemPrompt: string, messages: AnthropicMessage[], tools: Tool[] }): Promise<LLMResponse>

Onde LLMResponse = {
  text: string,
  toolCall?: { name: string, input: Record<string, unknown>, toolUseId: string }
}

Implementar com Anthropic SDK, modelo claude-sonnet-4-5.
Usar tool_use nativo da API Anthropic — não fazer JSON parsing manual da resposta.
Tratar stop_reason: 'tool_use' separado de 'end_turn'.
Retry com exponential backoff em erros 529 (overloaded) e 529.
Logar: modelo, tokens de entrada/saída, tempo de resposta, tool chamada (se houver).

ARQUIVO 3 — src/services/supabase.ts:
Classe BarberShopRepository com métodos:
- getBarbershopByInstance(instanceName: string): Promise<Barbershop>
- getOrCreateClient(barbershopId: string, phone: string, name?: string): Promise<Client>
- getClientAppointments(clientId: string, limit?: number): Promise<Appointment[]>
- getAvailableSlots(barbershopId: string, date: string, serviceId?: string): Promise<Slot[]>
- createAppointment(data: CreateAppointmentDTO): Promise<Appointment>
- updateAppointment(id: string, data: UpdateAppointmentDTO): Promise<Appointment>
- cancelAppointment(id: string, reason?: string): Promise<void>
- getServices(barbershopId: string): Promise<Service[]>
- getProfessionals(barbershopId: string): Promise<Professional[]>
- saveConversation(data: SaveConversationDTO): Promise<void>
- scheduleFollowUps(appointmentId: string): Promise<void>  ← cria registros reminder_24h e reminder_1h

Usar Drizzle ORM para todas as queries. Sem SQL raw.

ENTREGAR: código completo dos 3 arquivos com tipagem estrita, JSDoc nos métodos públicos e tratamento de erros que relança como classes customizadas (ToolError, LLMError).
```

---

### Prompt 1.4 — Núcleo do agente: session + tools + executor + orquestrador

```
Implemente o núcleo completo do agente IA de barbearia com tool use nativo da Anthropic.

STACK: TypeScript strict, Anthropic SDK (tool_use), @upstash/redis, Zod para validação dos inputs de cada tool.

ARQUIVO 1 — src/agent/session.ts:
Interface AgentSession {
  phone: string
  barbershopId: string
  clientId?: string
  clientName?: string
  messages: { role: 'user' | 'assistant', content: string | ContentBlock[] }[]
  preferredProfessionalId?: string
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening'
  lastServiceId?: string
  waitingHuman: boolean
  manualMode: boolean
  updatedAt: number
}
Implementar com @upstash/redis:
- getSession(phone: string): Promise<AgentSession | null>
- saveSession(session: AgentSession): Promise<void>  ← TTL de 2 horas
- clearSession(phone: string): Promise<void>
- Manter máximo de 12 turnos no histórico (remove os mais antigos ao exceder)

ARQUIVO 2 — src/agent/tools.ts:
Exportar AGENT_TOOLS: Anthropic.Tool[] com as seguintes tools:

1. check_availability
   Descrição: "Verifica horários disponíveis para agendamento"
   Input: { date: string (YYYY-MM-DD), service_id?: string, professional_id?: string }

2. create_appointment
   Descrição: "Cria um novo agendamento confirmado"
   Input: { professional_id: string, service_ids: string[], scheduled_at: string (ISO 8601), client_name: string }

3. update_appointment
   Descrição: "Reagenda ou altera um agendamento existente"
   Input: { appointment_id: string, scheduled_at?: string, professional_id?: string, service_ids?: string[] }

4. cancel_appointment
   Descrição: "Cancela um agendamento"
   Input: { appointment_id: string, reason?: string }

5. get_client_appointments
   Descrição: "Busca os próximos agendamentos do cliente atual"
   Input: { limit?: number }

6. list_services
   Descrição: "Lista todos os serviços disponíveis com preços e duração"
   Input: {}

7. request_human_handoff
   Descrição: "Transfere o atendimento para um humano quando o agente não consegue resolver"
   Input: { reason: string }

ARQUIVO 3 — src/agent/executor.ts:
Classe ToolExecutor com método:
execute(toolName: string, toolInput: unknown, context: ExecutorContext): Promise<string>

Onde ExecutorContext = { session: AgentSession, repo: BarberShopRepository, evolution: EvolutionService }

Para cada tool:
- Validar input com schema Zod específico antes de executar
- Executar a operação correspondente no repo
- Retornar string descritiva do resultado para o LLM
- Em request_human_handoff: setar session.waitingHuman = true, disparar push notification

ARQUIVO 4 — src/agent/index.ts:
Classe AgentOrchestrator com método:
processMessage(phone: string, messageText: string, instance: string): Promise<void>

Fluxo completo:
1. Busca barbershop pelo instance name via repo.getBarbershopByInstance()
2. Carrega ou cria sessão no Redis
3. Se session.waitingHuman === true ou session.manualMode === true: retorna sem processar
4. Monta system prompt dinâmico com buildSystemPrompt()
5. Adiciona mensagem do usuário ao histórico da sessão
6. Loop agentic (máximo 3 iterações):
   a. Chama LLMService.chat() com histórico + tools
   b. Se stop_reason === 'tool_use': executa tool via ToolExecutor, adiciona resultado ao histórico, continua loop
   c. Se stop_reason === 'end_turn': sai do loop com resposta final
7. Aguarda 800ms (simula digitação humana)
8. Chama evolution.sendTyping() por 1-2 segundos
9. Envia resposta via evolution.sendText()
10. Salva sessão atualizada no Redis
11. Salva conversa no Supabase via repo.saveConversation()

ENTREGAR: código completo dos 4 arquivos com tipagem estrita e comentários explicando cada decisão de design do fluxo.
```

---

### Prompt 1.5 — System prompt humanizado + templates de mensagem

```
Crie o sistema de prompts completo do agente em src/agent/prompts.ts.

STACK: TypeScript puro — funções que montam strings de prompt com injeção de dados dinâmicos.

FUNÇÃO 1 — buildSystemPrompt(context: SystemPromptContext): string

Interface SystemPromptContext {
  barbershopName: string
  workingHours: string          // ex: "Seg–Sex 9h–19h, Sáb 8h–17h"
  servicesList: { name: string, price: number, duration: number }[]
  professionalsList: { name: string, specialties?: string[] }[]
  clientName?: string
  clientUpcomingAppointments?: { date: string, time: string, service: string, professional: string }[]
  currentDatetime: string       // ex: "Terça-feira, 08/04/2025 às 14:32 (GMT-3)"
}

O system prompt deve cobrir:

IDENTIDADE: Nome da persona, canal (WhatsApp), objetivo do agente.

TOM E ESTILO:
- Linguagem informal e amigável, como um atendente real
- Mensagens curtas — máximo 3 linhas por resposta no WhatsApp
- Emojis com moderação (1 por mensagem no máximo)
- Nunca use bullet points ou listas formatadas no WhatsApp

CAPACIDADES DECLARADAS: O que o agente pode e não pode fazer.

REGRAS CRÍTICAS DE NEGÓCIO:
- Nunca invente horários — sempre use check_availability antes de sugerir
- Antes de criar agendamento, confirme: profissional, serviço, data, hora e valor total
- Ao confirmar agendamento: seja entusiasmado ("Ótimo! Tá agendado! ✂️")
- Se ambiguidade após 2 tentativas: ofereça transferir para a equipe
- Use o nome do cliente naturalmente, não em todas as frases
- Memorize preferências da sessão (profissional favorito, horário preferido)

CONTEXTO INJETADO: Renderiza os dados de servicesList, professionalsList, workingHours e appointments do cliente de forma legível.

FUNÇÃO 2 — buildFollowUpMessage(type: FollowUpType, data: FollowUpData): string
Retorna mensagem humanizada para cada tipo:
- reminder_24h: lembrete gentil para o dia seguinte
- reminder_1h: lembrete imediato 1 hora antes
- post_service: pedido de avaliação pós-atendimento
- reactivation_30d: convite leve para voltar
- reactivation_60d: convite com incentivo (ex: "temos novidades")
- reactivation_90d: mensagem mais pessoal, pergunta se está tudo bem

FUNÇÃO 3 — buildHandoffMessage(clientName?: string): string
Mensagem enviada ao cliente ao transferir para humano.

FUNÇÃO 4 — buildConfirmationMessage(appointment: AppointmentDetails): string
Mensagem completa de confirmação com todos os detalhes do agendamento.

FUNÇÃO 5 — buildWelcomeBackMessage(clientName: string, barbershopName: string): string
Mensagem para cliente que retorna após tempo sem aparecer.

ENTREGAR:
- Arquivo src/agent/prompts.ts completo com todas as funções tipadas
- 5 exemplos de system prompt renderizado com dados fictícios (comentados no arquivo)
- 3 exemplos de cada tipo de follow-up message
```

---

### Prompt 1.6 — App Expo: estrutura, auth e tela de agenda

```
Crie a estrutura completa do app mobile para o dono da barbearia.

STACK: Expo SDK 52, Expo Router v4, NativeWind v4, Supabase JS v2, TanStack Query v5, Zustand com MMKV, TypeScript strict, React Hook Form + Zod.

ESTRUTURA DE PASTAS:
barber-app/
  app/
    _layout.tsx               ← root layout: fonts, QueryClient, auth guard, notifications
    (auth)/
      login.tsx               ← e-mail + senha, Supabase Auth
      onboarding.tsx          ← wizard 3 etapas (fase 3)
    (tabs)/
      _layout.tsx             ← tab bar com ícones Lucide
      index.tsx               ← dashboard (fase 3)
      agenda.tsx              ← agendamentos ← IMPLEMENTAR AGORA
      clientes.tsx            ← lista de clientes
      financeiro.tsx          ← financeiro (fase 2)
      config.tsx              ← configurações
    appointments/
      [id].tsx                ← detalhe + edição de agendamento
      new.tsx                 ← criação de agendamento
    clients/
      [id].tsx                ← perfil do cliente
    conversas/
      index.tsx               ← lista de conversas do agente (fase 3)
      [phone].tsx             ← chat com cliente (fase 3)
  components/
    ui/
      Button.tsx, Input.tsx, Badge.tsx, Card.tsx
      Sheet.tsx (bottom sheet), Avatar.tsx, Skeleton.tsx
    agenda/
      CalendarStrip.tsx       ← calendário horizontal deslizável
      AppointmentCard.tsx     ← card do agendamento
      TimeSlotPicker.tsx      ← seletor de horário
    clients/
      ClientCard.tsx, ClientForm.tsx
  lib/
    supabase.ts               ← cliente com sessão em SecureStore
    queryClient.ts            ← TanStack Query config com defaults
  stores/
    auth.store.ts             ← Zustand + MMKV: user, barbershop ativo
  hooks/
    useAppointments.ts        ← IMPLEMENTAR AGORA
    useClients.ts
    useProfessionals.ts
    useServices.ts
  types/
    database.ts               ← tipos gerados pelo Supabase CLI (supabase gen types)

ENTREGAR:

1. package.json com todas as dependências e versões
2. app.config.ts com bundle identifier, permissões (câmera, notificações), plugins Expo
3. lib/supabase.ts: cliente com ExpoSecureStoreAdapter para persistência de sessão nativa
4. stores/auth.store.ts: sessão do dono + barbershop ativo com Zustand + zustand-mmkv
5. Tela (tabs)/agenda.tsx COMPLETA:
   - CalendarStrip horizontal para navegar datas (semana visível, toque para selecionar)
   - Lista de agendamentos do dia selecionado agrupados por horário
   - AppointmentCard: avatar do profissional, nome do cliente, serviço, horário, badge de status colorido
     (pending=amarelo, confirmed=azul, done=verde, cancelled=cinza, no_show=vermelho)
   - Supabase Realtime subscription no canal: appointments:barbershop_id=eq.{id}
   - Skeleton loading (3 cards animados) durante fetch inicial
   - Empty state ilustrativo quando não há agendamentos no dia
   - FAB (botão flutuante) para criar novo agendamento → navega para appointments/new.tsx
6. Hook useAppointments.ts com TanStack Query:
   - useAppointmentsByDate(date): query com Supabase, cache de 5 min
   - useCreateAppointment(): mutation com invalidação automática
   - useCancelAppointment(): mutation com confirmação
   - useUpdateAppointment(): mutation para reagendamento
7. Tela (auth)/login.tsx com formulário React Hook Form + Zod, Supabase Auth, redirect para tabs
8. app/_layout.tsx com: fontes carregadas, QueryClientProvider, auth guard (redireciona para login se sem sessão), inicialização de notificações (stub para fase 2)
```

---

> ✅ **Fase 1 concluída** quando: mensagem no WhatsApp → agente responde e cria agendamento no Supabase → app mobile exibe o agendamento em tempo real via Realtime.

---

## Fase 2 — Expansão (semanas 5–7)

> Follow-up nativo + Financeiro + Produtos + Push Notifications

---

### Prompt 2.1 — Serviço de follow-up com cron nativo (node-cron)

```
Implemente o serviço de follow-up automático nativo no servidor TypeScript.

STACK: node-cron, Supabase JS v2, Drizzle ORM, EvolutionService e prompts.ts já implementados.

ARQUIVO — src/services/scheduler.ts:
Classe FollowUpScheduler com método start(): void que registra todos os cron jobs.

CRON JOB 1 — Lembretes 24h e 1h (a cada 15 minutos): '*/15 * * * *'
Query Drizzle:
SELECT follow_ups + appointments + clients + professionals + services + barbershops
WHERE follow_ups.type IN ('reminder_24h', 'reminder_1h')
  AND follow_ups.status = 'pending'
  AND follow_ups.scheduled_for <= NOW() + INTERVAL '5 minutes'
  AND follow_ups.scheduled_for >= NOW() - INTERVAL '10 minutes'
Para cada resultado:
1. Monta mensagem com buildFollowUpMessage(type, data) do prompts.ts
2. Envia via EvolutionService.sendText() com a instância da barbearia
3. UPDATE follow_up: status='sent', sent_at=now()
4. Em erro: status='failed', loga com contexto completo (não cancela os demais)

CRON JOB 2 — Pós-atendimento (a cada hora): '0 * * * *'
Query: appointments com status='done', updated_at entre 45–75 min atrás, sem follow_up post_service enviado.
Envia mensagem de avaliação com buildFollowUpMessage('post_service', data).

CRON JOB 3 — Reativação de clientes (diário às 10h): '0 10 * * *'
Query: clients por barbershop onde last_visit_at < now() - INTERVAL '30 days'
  E sem follow_up de reativação enviado nos últimos 7 dias
Prioridade por inatividade:
- 30–60 dias → reactivation_30d
- 60–90 dias → reactivation_60d
- +90 dias → reactivation_90d
Limite: 30 envios por barbearia por execução (evita spam)
Intervalo de 500ms entre cada envio (evita bloqueio pelo WhatsApp)

CRON JOB 4 — Limpeza de sessões (diário às 3h): '0 3 * * *'
Remove ai_conversations com updated_at > 30 dias e sem follow_up pendente.

INTEGRAÇÃO em src/index.ts:
Instanciar FollowUpScheduler e chamar start() após servidor iniciar.
Log com lista de cron jobs ativos e próxima execução.

ENTREGAR: src/services/scheduler.ts completo com todos os jobs, processamento isolado por item, logs estruturados com pino e documentação de cada schedule em comentário JSDoc.
```

---

### Prompt 2.2 — Transcrição de áudio via Whisper

```
Implemente transcrição de mensagens de áudio do WhatsApp no agente IA.

STACK: TypeScript, OpenAI SDK (@openai/openai), form-data, EvolutionService já implementado.

ARQUIVO — src/services/whisper.ts:
Classe WhisperService com método:
transcribeAudio(base64Audio: string, mimeType: string): Promise<string>

Implementação:
1. Converte base64 para Buffer
2. Cria File object compatível com OpenAI SDK (nome: 'audio.ogg', type: 'audio/ogg')
3. Chama openai.audio.transcriptions.create({ file, model: 'whisper-1', language: 'pt' })
4. Retorna texto transcrito
5. Em erro de qualquer tipo: loga e retorna string vazia (não quebra o fluxo principal)

ALTERAÇÃO em src/routes/webhook.ts:
No handler, antes de chamar AgentOrchestrator.processMessage():
1. Verifica messageType === 'audioMessage' no payload Evolution API
2. Se sim:
   a. Chama EvolutionService.getMediaBase64() para baixar o áudio
   b. Chama WhisperService.transcribeAudio() com base64 e mimeType
   c. Se texto retornado não vazio: usa como messageText com prefixo '[Áudio]: '
   d. Se vazio: responde ao cliente "Não consegui ouvir o áudio. Pode escrever?" e encerra

ALTERAÇÃO em src/agent/prompts.ts (addendum ao buildSystemPrompt):
Adicionar regra: "Mensagens com prefixo '[Áudio]: ' são transcrições de voz do cliente.
Responda naturalmente sem mencionar o áudio ou a transcrição."

ALTERAÇÃO em src/agent/session.ts:
No histórico salvo, preservar o prefixo '[Áudio]: ' para rastreabilidade.

ENTREGAR:
- src/services/whisper.ts completo
- Diff preciso das alterações em webhook.ts, prompts.ts e session.ts
- OPENAI_API_KEY adicionada ao .env.example
- Exemplo de payload audioMessage do Evolution API para teste manual
```

---

### Prompt 2.3 — Supabase Edge Functions: financeiro e fechamento de caixa

```
Crie as Supabase Edge Functions do módulo financeiro da barbearia.

STACK: Supabase Edge Functions (Deno + TypeScript), Zod, supabase-js v2.

EDGE FUNCTION 1 — POST /financial/transaction
supabase/functions/financial-transaction/index.ts
Body: { barbershop_id, type, category, amount, payment_method, description, appointment_id?, transaction_at? }
- Valida com Zod (amount > 0, type em enum, payment_method em enum)
- Se appointment_id: verifica que appointment.barbershop_id === barbershop_id
- INSERT em financial_transactions
- Retorna transação criada com status 201

EDGE FUNCTION 2 — GET /financial/summary
supabase/functions/financial-summary/index.ts
Query params: barbershop_id, period (today|week|month|custom), start_date?, end_date?
Retorna objeto:
{
  total_income: number,
  total_expense: number,
  net: number,
  appointments_count: number,
  avg_ticket: number,
  breakdown: { category: string, total: number, count: number }[],
  top_services: { service_name: string, count: number, revenue: number }[],
  by_professional: { name: string, appointments: number, revenue: number, commission: number }[],
  by_payment_method: { method: string, total: number }[]
}

EDGE FUNCTION 3 — POST /financial/close-appointment
supabase/functions/close-appointment/index.ts
Body: { appointment_id, payment_method, discount_amount?, notes? }
Transação atômica (usar RPC ou múltiplas operações sequenciais):
1. Verifica appointment.status IN ('pending', 'confirmed')
2. Soma preços dos serviços, aplica desconto
3. UPDATE appointment: status='done', total_price calculado
4. INSERT financial_transaction com valor, método e referência ao appointment
5. Calcula comissão do profissional (professional.commission_pct × total)
6. INSERT financial_transaction do tipo 'commission' vinculada ao profissional
7. UPDATE client: total_visits++, last_visit_at=now()
8. INSERT follow_up do tipo 'post_service' com scheduled_for = now() + 1h
9. Retorna: { appointment, transaction, commission }

EDGE FUNCTION 4 — GET /financial/commissions
supabase/functions/financial-commissions/index.ts
Query params: barbershop_id, start_date, end_date
Retorna comissões agrupadas por profissional com: total_appointments, gross_revenue, commission_total, is_paid.

ENTREGAR:
- Código completo das 4 Edge Functions em supabase/functions/
- Resposta de erro padronizada: { error: { code, message } } com status HTTP correto
- supabase/config.toml atualizado com as 4 funções
- Exemplos de chamada curl para cada endpoint
```

---

### Prompt 2.4 — App mobile: financeiro, produtos e push notifications

```
Implemente os módulos de financeiro, produtos e push notifications no app mobile.

STACK: Expo SDK 52, NativeWind v4, TanStack Query v5, react-native-gifted-charts, Expo Notifications, React Hook Form + Zod, Supabase JS v2.

PARTE 1 — Tela financeiro.tsx:
- Toggle topo: Hoje / Semana / Mês (altera período das queries)
- Cards de resumo (2x2 grid):
  Receita total (verde), Despesa total (vermelho), Lucro líquido (azul), Atendimentos (cinza)
- BarChart semanal (react-native-gifted-charts): barras de receita + linha de atendimentos sobrepostos
- Lista de transações recentes: ícone de tipo, descrição, valor formatado, método de pagamento, horário relativo
- FAB → Bottom Sheet com formulário de nova transação (React Hook Form + Zod: tipo, categoria, valor, método, descrição)
- Hook useFinancial.ts com TanStack Query chamando as Edge Functions do prompt 2.3

PARTE 2 — Telas de produtos:

produtos.tsx:
- Lista com: nome, marca, preço de venda, estoque atual
- Badge vermelho "Estoque crítico" quando stock_qty <= stock_min
- SearchBar para filtrar por nome
- FAB para adicionar novo produto

produto/[id].tsx:
- Formulário completo (React Hook Form + Zod)
- Upload de foto: ImagePicker → Supabase Storage (bucket: product-images)
- Seção histórico de movimentações de estoque (tabela product_stock_movements)
- Botões de ajuste rápido: [−1] [quantidade atual] [+1] com confirmação

SQL adicional necessário:
CREATE TABLE product_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  type text CHECK (type IN ('in','out','adjustment')),
  qty int NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
Trigger PostgreSQL: ao UPDATE products.stock_qty,
se novo valor <= stock_min, INSERT em notifications({ barbershop_id, type:'low_stock', product_id }).

PARTE 3 — Push Notifications (lib/notifications.ts):

Funções a exportar:
- requestPermissionsAndGetToken(): Promise<string | null>
  Pede permissão, retorna Expo Push Token ou null
- registerToken(token: string, barbershopId: string): Promise<void>
  Upsert na tabela push_tokens via Supabase (ON CONFLICT owner_id, device_os DO UPDATE)
- setupNotificationHandlers(router: Router): void
  Listener de toque na notificação com navigate:
  - type 'new_appointment' → router.push('/(tabs)/agenda')
  - type 'human_handoff' → router.push('/conversas')
  - type 'low_stock' → router.push('/produtos')

Em app/_layout.tsx:
useEffect que chama requestPermissionsAndGetToken() + registerToken() + setupNotificationHandlers() ao montar, após usuário autenticado.

PARTE 4 — Edge Function para disparar push (supabase/functions/send-push/index.ts):
Body: { barbershop_id, title, body, type, data?: Record<string,unknown> }
- Busca push_tokens ativos da barbearia
- POST https://exp.host/--/api/v2/push/send com array de mensagens
- Trata tickets de erro (DeviceNotRegistered → remove token)
- INSERT em notifications_log (id, barbershop_id, type, title, body, tokens_count, sent_at)

ENTREGAR: código completo das telas, hooks, lib/notifications.ts, SQL do trigger, Edge Function send-push e SQL da tabela notifications_log.
```

---

> ✅ **Fase 2 concluída** quando: follow-ups são enviados automaticamente, o dono recebe push ao chegar novo agendamento e o financeiro do dia está visível no app.

---

## Fase 3 — Polimento e escala (semanas 8–9)

> Dashboard analytics + Tela de conversas + Multi-barbearia SaaS

---

### Prompt 3.1 — Dashboard analytics com realtime

```
Crie o dashboard principal do app mobile com métricas em tempo real.

STACK: Expo React Native, NativeWind v4, TanStack Query v5, react-native-gifted-charts, Supabase Realtime.

EDGE FUNCTION — GET /dashboard/today
supabase/functions/dashboard-today/index.ts
Query param: barbershop_id
Retorna tudo em uma única chamada:
{
  kpis: {
    appointments_confirmed: number,
    appointments_total: number,
    revenue_today: number,
    new_clients_whatsapp: number
  },
  next_appointment: {
    client_name: string,
    service: string,
    scheduled_at: string,
    professional_name: string
  } | null,
  weekly_chart: { date: string, revenue: number, appointments: number }[],  ← últimos 7 dias
  top_services: { name: string, count: number, revenue: number }[],         ← top 3
  top_professionals: { name: string, avatar_url: string, revenue: number }[], ← top 3
  alerts: {
    inactive_clients_count: number,
    low_stock_count: number,
    pending_handoff_count: number
  }
}

TELA — app/(tabs)/index.tsx:

SEÇÃO 1 — KPIs do dia:
- 2x2 grid de metric cards: Agendamentos (X/Y confirmados), Receita do dia (R$), Novos via WhatsApp, Próximo horário
- Supabase Realtime subscription no canal appointments:barbershop_id=eq.{id}
- Ao receber evento INSERT ou UPDATE: invalidar query do dashboard + atualizar KPI animado

SEÇÃO 2 — Gráfico semanal (react-native-gifted-charts):
- BarChart + LineChart sobrepostos
- Barras: receita por dia (cor teal)
- Linha: número de atendimentos (cor amber)
- Tooltip ao pressionar: detalhe do dia com receita e atendimentos

SEÇÃO 3 — Rankings:
- Top 3 serviços: nome + barra de progresso horizontal + valor
- Top 3 profissionais: avatar circular + nome + receita gerada

SEÇÃO 4 — Alertas (cards clicáveis):
- "X clientes inativos" → router.push('/clientes?filter=inactive')
- "X itens em estoque crítico" → router.push('/produtos?filter=low_stock')
- "X atendimentos aguardando humano" → router.push('/conversas?filter=handoff')

HOOK — hooks/useDashboard.ts:
- useQuery com staleTime de 2 min chamando Edge Function /dashboard/today
- useEffect com Supabase Realtime para invalidar query ao receber evento de appointment
- Retorna: { data, isLoading, refetch }

ENTREGAR: Edge Function, tela index.tsx completa, hook useDashboard.ts e configuração do Realtime subscription com cleanup correto no useEffect.
```

---

### Prompt 3.2 — Tela de conversas do agente no app mobile

```
Crie a tela de conversas do agente IA no app mobile, permitindo ao dono visualizar e assumir atendimentos.

STACK: Expo React Native, NativeWind v4, TanStack Query v5, Supabase Realtime.

NOVAS ROTAS no servidor (src/routes/conversations.ts):

GET /conversations/:barbershopId
- Busca ai_conversations com updated_at > now() - 24h ordenadas por updated_at DESC
- Join com clients para nome e avatar
- Retorna: [{ phone, client_name, last_message, updated_at, waiting_human, manual_mode }]

PATCH /conversations/:phone/mode
Body: { waitingHuman?: boolean, manualMode?: boolean }
- Atualiza session no Redis com os campos fornecidos
- Responde 200 com session atualizada

POST /conversations/:phone/send
Body: { barbershopId: string, text: string }
- Verifica que session.manualMode === true (não deixa enviar se agente estiver ativo)
- Envia mensagem via EvolutionService.sendText()
- Appenda ao histórico da sessão no Redis
- Salva em ai_conversations via Supabase
- Retorna 200

TELA 1 — app/conversas/index.tsx (lista):
- FlatList de conversas com: avatar/iniciais do cliente, nome, prévia da última mensagem, timestamp relativo
- Badge amarelo "Aguardando humano" quando waiting_human === true
- Badge cinza "Modo manual" quando manual_mode === true
- Contador no tab icon: número de conversas com waiting_human === true
- Supabase Realtime no canal ai_conversations:barbershop_id=eq.{id} para atualizar lista ao vivo
- Pull-to-refresh
- Ao tocar: navega para /conversas/[phone]

TELA 2 — app/conversas/[phone].tsx (chat):
- Header: nome do cliente + badge de status (Agente ativo | Aguardando humano | Modo manual) + botão voltar
- ScrollView de mensagens renderizadas como balões:
  - Esquerda / fundo azul claro: mensagens do cliente
  - Direita / fundo verde claro: mensagens do agente
  - Fundo cinza tracejado: tool calls executadas (mostrar nome da tool + resultado resumido, colapsável)
  - Ícone de microfone quando message content começa com '[Áudio]: '
  - Timestamp em cada mensagem (HH:MM)
- Auto-scroll para a última mensagem ao abrir e ao receber nova
- Footer condicional:
  - Se agente ativo: botão "Assumir atendimento" em laranja (largura total)
  - Se manual_mode: TextInput + botão enviar + botão "Devolver ao Agente" em cinza
- Supabase Realtime para atualizar mensagens ao vivo

AÇÕES:
- assumeConversation(): PATCH /conversations/:phone/mode { manualMode: true, waitingHuman: false }
  + envia mensagem automática ao cliente via POST /conversations/:phone/send
- sendMessage(text): POST /conversations/:phone/send
- returnToAgent(): PATCH /conversations/:phone/mode { manualMode: false, waitingHuman: false }
  + envia mensagem automática de retorno ao agente

HOOK — hooks/useConversation.ts:
- useConversations(barbershopId): lista de conversas com Realtime
- useConversationMessages(phone): mensagens de uma conversa com Realtime
- useConversationActions(): mutations para assumir, enviar, devolver

ENTREGAR: src/routes/conversations.ts, telas index.tsx e [phone].tsx completas, hook useConversation.ts.
```

---

### Prompt 3.3 — Multi-barbearia, onboarding SaaS e deploy final

```
Implemente suporte multi-barbearia (SaaS), onboarding completo e prepare o deploy de produção.

STACK: Supabase Auth + RLS revisado, Expo Router v4, Railway (servidor agent), Expo EAS Build (app).

PARTE 1 — Onboarding no app mobile:

app/(auth)/onboarding.tsx — wizard em 3 etapas com indicador de progresso:

Etapa 1 — Dados da barbearia:
- Campos: Nome da barbearia, Endereço, Telefone, Número do WhatsApp comercial
- Upload de logo: ImagePicker → Supabase Storage (bucket: barbershop-logos)
- Validação com Zod: todos obrigatórios, phone no formato brasileiro

Etapa 2 — Horários de funcionamento:
- Lista de dias da semana (Seg–Dom), cada um com:
  - Toggle de ativo/inativo
  - Se ativo: TimePicker de abertura e fechamento
- Salva em barbershop.working_hours como JSON: { "mon": { open: "09:00", close: "19:00" }, ... }

Etapa 3 — Serviços iniciais:
- Lista editável de serviços (mínimo 1 para avançar)
- Sugestões pré-preenchidas: Corte R$35/30min, Barba R$25/20min, Combo R$55/45min
- Adicionar/remover serviços com animação
- Ao concluir: chama Edge Function /onboarding/setup e redireciona para /(tabs)/index

EDGE FUNCTION — POST /onboarding/setup
supabase/functions/onboarding-setup/index.ts
Body: { name, address, phone, whatsapp_number, logo_url, working_hours, services[] }
Operações:
1. INSERT barbershops com dados fornecidos + owner_id = auth.uid()
2. INSERT services (todos fornecidos no wizard)
3. INSERT professional com nome do dono como profissional padrão
4. Retorna barbershop criado completo

PARTE 2 — Revisão RLS para multi-tenant:

Função helper SQL (criar uma vez):
CREATE OR REPLACE FUNCTION get_my_barbershop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM barbershops WHERE owner_id = auth.uid() LIMIT 1;
$$;

Para cada tabela com barbershop_id, garantir:
- SELECT: USING (barbershop_id = get_my_barbershop_id())
- INSERT: WITH CHECK (barbershop_id = get_my_barbershop_id())
- UPDATE: USING (barbershop_id = get_my_barbershop_id())
- DELETE: USING (barbershop_id = get_my_barbershop_id())

Script de teste de isolamento:
SQL que verifica que usuário A não consegue SELECT, INSERT, UPDATE ou DELETE em dados do usuário B.

PARTE 3 — Deploy de produção:

railway.toml:
[build]
builder = "DOCKERFILE"
[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyType = "ON_FAILURE"

.github/workflows/deploy-agent.yml:
Trigger: push na branch main, path: agent-server/**
Jobs: checkout → setup node 20 → npm ci → npm run typecheck → npm run build → railway up

.github/workflows/build-app.yml:
Trigger: push na branch main, path: barber-app/**
Jobs: checkout → setup node 20 → npm ci → eas build --platform all --non-interactive --profile production

CHECKLIST DE GO-LIVE:
- [ ] Variáveis de ambiente configuradas no Railway
- [ ] Instância Evolution API criada e webhook apontando para /webhook/whatsapp
- [ ] Supabase RLS habilitado e testado
- [ ] Expo EAS configurado com credenciais Apple e Google
- [ ] Push notifications testadas em device físico
- [ ] Cron jobs de follow-up validados em staging
- [ ] Sentry configurado no servidor e no app
- [ ] Domínio customizado no Railway com HTTPS

ENTREGAR: tela de onboarding completa, Edge Function /onboarding/setup, SQL completo de RLS revisado com função helper, railway.toml, ambos os workflows GitHub Actions e checklist de go-live.
```

---

> ✅ **Fase 3 concluída** quando: qualquer barbearia consegue se cadastrar, configurar o WhatsApp e começar a receber agendamentos pelo agente em menos de 10 minutos.

---

## Resumo das fases

| Prompt | Arquivo principal gerado | Fase |
|--------|--------------------------|------|
| 1.1 | `src/db/schema.ts` + SQL + RLS | 1 |
| 1.2 | Estrutura do projeto + `src/index.ts` | 1 |
| 1.3 | `evolution.ts` + `llm.ts` + `supabase.ts` | 1 |
| 1.4 | `session.ts` + `tools.ts` + `executor.ts` + `agent/index.ts` | 1 |
| 1.5 | `prompts.ts` + templates de mensagem | 1 |
| 1.6 | App Expo completo + tela agenda | 1 |
| 2.1 | `scheduler.ts` (cron jobs) | 2 |
| 2.2 | `whisper.ts` + alterações no webhook | 2 |
| 2.3 | Edge Functions financeiro | 2 |
| 2.4 | Telas financeiro + produtos + push | 2 |
| 3.1 | Dashboard + Edge Function + Realtime | 3 |
| 3.2 | Telas de conversas + rotas do servidor | 3 |
| 3.3 | Onboarding + RLS multi-tenant + deploy | 3 |

---

## Stack de referência rápida

| Camada | Tecnologia |
|--------|-----------|
| Servidor do agente | Hono + Node.js 20 + TypeScript strict |
| ORM | Drizzle ORM + drizzle-kit |
| Banco de dados | Supabase (PostgreSQL 15) + RLS |
| LLM | Anthropic Claude (claude-sonnet-4-5) com tool use nativo |
| WhatsApp | Evolution API v2 (self-hosted, Docker) |
| Sessão do agente | Upstash Redis (TTL 2h) |
| Transcrição de áudio | OpenAI Whisper API |
| App mobile | Expo SDK 52 + Expo Router v4 |
| UI mobile | NativeWind v4 (Tailwind para RN) |
| Estado global | Zustand + MMKV |
| Data fetching | TanStack Query v5 |
| Validação | Zod (em todas as camadas) |
| Deploy servidor | Railway (Dockerfile) |
| Deploy app | Expo EAS Build |
| CI/CD | GitHub Actions |
| Monitoramento | Sentry + pino logger |
