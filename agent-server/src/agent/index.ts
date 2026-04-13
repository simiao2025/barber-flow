// ============================================================
// BARBEAR-FLOW: Orquestrador principal do agente IA
// ============================================================

import { createLogger } from '../lib/logger.js';
import { agentSessionManager } from './session.js';
import { llmService } from '../services/llm.js';
import { evolutionService } from '../services/evolution.js';
import { repo } from '../services/supabase.js';
import { AGENT_TOOLS } from './tools.js';
import { executeTool } from './executor.js';
import { buildSystemPrompt } from './prompts.js';
import { ExecutorContext } from '../types/agent.js';

const logger = createLogger('AgentOrchestrator');

const MAX_AGENT_ITERATIONS = 3; // Máximo de iterações no loop agentic
const TYPING_DELAY_MIN = 800;
const TYPING_DELAY_MAX = 2000;

class AgentOrchestrator {
  /**
   * Processa uma mensagem do WhatsApp
   */
  async processMessage(
    phone: string,
    messageText: string,
    instance: string
  ): Promise<void> {
    const startTime = Date.now();
    logger.info({ phone, messageText }, 'Iniciando processamento de mensagem');

    try {
      // 1. Busca barbearia pela instância
      const barbershop = await repo.getBarbershopByInstance(instance);
      logger.debug(
        { barbershopId: barbershop.id, barbershopName: barbershop.name },
        'Barbearia encontrada'
      );

      // 2. Busca ou cria cliente
      const client = await repo.getOrCreateClient(
        barbershop.id,
        phone,
        undefined
      );

      // 3. Carrega ou cria sessão no Redis
      let session = await agentSessionManager.getSession(phone);
      if (!session) {
        session = await agentSessionManager.createSession(
          phone,
          barbershop.id,
          client.id,
          client.name
        );
        logger.info({ phone }, 'Nova sessão criada');
      }

      // 4. Se waitingHuman ou manualMode, não processa
      if (session.waitingHuman) {
        logger.info({ phone }, 'Sessão aguardando humano — ignorando');
        return;
      }
      if (session.manualMode) {
        logger.info({ phone }, 'Sessão em modo manual — ignorando');
        return;
      }

      // 5. Adiciona mensagem do usuário ao histórico
      session = await agentSessionManager.addUserMessage(phone, messageText);

      // 6. Monta system prompt dinâmico
      const services = await repo.getServices(barbershop.id);
      const professionals = await repo.getProfessionals(barbershop.id);
      const upcomingAppointments = await repo.getClientAppointments(client.id, 3);

      // Formata horários de funcionamento
      const wh = barbershop.workingHours as any;
      const workingHoursText = wh
        ? Object.entries(wh)
            .filter(([, v]) => v !== null)
            .map(
              ([k, v]: [string, any]) =>
                `${k}: ${v?.open ?? 'N/A'}–${v?.close ?? 'N/A'}`
            )
            .join(', ')
        : 'Não configurado';

      // Formata agendamentos futuros
      const upcomingFormatted = upcomingAppointments.map((a) => ({
        date: new Date(a.scheduledAt).toLocaleDateString('pt-BR'),
        time: new Date(a.scheduledAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        service: 'Serviço', // Buscar nome do serviço
        professional: 'Profissional', // Buscar nome do profissional
      }));

      const systemPrompt = buildSystemPrompt({
        barbershopName: barbershop.name,
        workingHours: workingHoursText,
        servicesList: services.map((s) => ({
          name: s.name,
          price: parseFloat(s.price.toString()),
          duration: s.durationMin,
          category: s.category ?? undefined,
        })),
        professionalsList: professionals.map((p) => ({
          name: p.name,
          specialties: [],
        })),
        clientName: client.name ?? undefined,
        clientUpcomingAppointments:
          upcomingFormatted.length > 0 ? upcomingFormatted : undefined,
        currentDatetime: new Date().toLocaleString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        }),
      });

      // 7. Loop agentic (máximo 3 iterações)
      let finalResponse = '';
      let iterations = 0;

      for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
        iterations++;

        // 7a. Chama LLM
        const llmResponse = await llmService.chat({
          systemPrompt,
          messages: session.messages,
          tools: AGENT_TOOLS,
        });

        // 7b. Se tool_use: executa tool e continua
        if (llmResponse.stopReason === 'tool_use' && llmResponse.toolCall) {
          logger.info(
            { tool: llmResponse.toolCall.name },
            'Tool chamada pelo LLM'
          );

          // Adiciona resposta do assistente (tool call) ao histórico
          await agentSessionManager.addAssistantMessage(phone, llmResponse.text);

          // Executa tool
          const toolContext: ExecutorContext = {
            session,
            repo,
            evolution: evolutionService,
          };

          const toolResult = await executeTool(
            llmResponse.toolCall.name,
            llmResponse.toolCall.input,
            toolContext
          );

          // Adiciona resultado da tool ao histórico
          await agentSessionManager.addToolResult(
            phone,
            llmResponse.toolCall.toolUseId,
            toolResult
          );

          // Atualiza sessão local
          session = (await agentSessionManager.getSession(phone))!;
          continue; // Continua o loop
        }

        // 7c. Se end_turn: resposta final
        if (llmResponse.stopReason === 'end_turn') {
          finalResponse = llmResponse.text;
          break;
        }

        // Se max_tokens ou stop_sequence: usa texto parcial
        finalResponse = llmResponse.text;
        break;
      }

      // 8. Simula digitação humana
      const typingDelay =
        TYPING_DELAY_MIN +
        Math.random() * (TYPING_DELAY_MAX - TYPING_DELAY_MIN);
      await this.sleep(typingDelay);

      // 9. Envia typing indicator
      try {
        await evolutionService.sendTyping(phone, 1500);
      } catch {
        // Ignora falha de typing
      }

      // 10. Envia resposta
      await evolutionService.sendText(phone, finalResponse);

      // 11. Salva resposta no histórico
      await agentSessionManager.addAssistantMessage(phone, finalResponse);

      // 12. Salva conversa no Supabase
      await repo.saveConversation({
        barbershopId: barbershop.id,
        clientId: client.id,
        phone,
        messages: session.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          timestamp: new Date().toISOString(),
        })),
      });

      const duration = Date.now() - startTime;
      logger.info(
        { phone, duration, iterations },
        'Mensagem processada com sucesso'
      );
    } catch (error) {
      logger.error({ phone, error }, 'Erro ao processar mensagem');

      // Resposta de erro ao cliente
      try {
        await evolutionService.sendText(
          phone,
          'Desculpa, tive um problema técnico aqui. Pode repetir sua mensagem? 😅'
        );
      } catch {
        // Se nem isso funcionar, loga e segue
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton
export const agentOrchestrator = new AgentOrchestrator();
