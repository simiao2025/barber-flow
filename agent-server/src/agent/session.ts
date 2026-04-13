// ============================================================
// BARBEAR-FLOW: Gerenciamento de sessão do agente no Redis
// ============================================================

import { Redis } from '@upstash/redis';
import { createLogger } from '../lib/logger.js';
import type { AgentSession } from '../types/agent.js';

const logger = createLogger('AgentSession');

const SESSION_TTL_SECONDS = 7200; // 2 horas
const MAX_TURNS = 12;

export class AgentSessionManager {
  private redis: Redis;

  constructor() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN são obrigatórios');
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    logger.info('AgentSessionManager inicializado');
  }

  /**
   * Busca sessão pelo telefone
   */
  async getSession(phone: string): Promise<AgentSession | null> {
    const key = this.getSessionKey(phone);
    const data = await this.redis.get<AgentSession>(key);
    return data ?? null;
  }

  /**
   * Cria ou atualiza sessão no Redis
   */
  async saveSession(session: AgentSession): Promise<void> {
    const key = this.getSessionKey(session.phone);

    // Manter máximo de 12 turnos no histórico
    if (session.messages.length > MAX_TURNS) {
      // Remove os mais antigos, mantém os mais recentes
      session.messages = session.messages.slice(-MAX_TURNS);
      logger.debug(
        { phone: session.phone },
        'Histórico da sessão truncado para 12 turnos'
      );
    }

    session.updatedAt = Date.now();

    await this.redis.set(key, session, { ex: SESSION_TTL_SECONDS });
    logger.debug({ phone: session.phone }, 'Sessão salva no Redis');
  }

  /**
   * Limpa sessão do Redis
   */
  async clearSession(phone: string): Promise<void> {
    const key = this.getSessionKey(phone);
    await this.redis.del(key);
    logger.info({ phone }, 'Sessão removida do Redis');
  }

  /**
   * Cria nova sessão
   */
  async createSession(
    phone: string,
    barbershopId: string,
    clientId?: string,
    clientName?: string
  ): Promise<AgentSession> {
    const session: AgentSession = {
      phone,
      barbershopId,
      clientId,
      clientName,
      messages: [],
      waitingHuman: false,
      manualMode: false,
      updatedAt: Date.now(),
    };

    await this.saveSession(session);
    logger.info({ phone, barbershopId }, 'Nova sessão criada');
    return session;
  }

  /**
   * Adiciona mensagem do usuário ao histórico
   */
  async addUserMessage(phone: string, content: string): Promise<AgentSession> {
    let session = await this.getSession(phone);

    if (!session) {
      throw new Error(`Sessão não encontrada para ${phone}`);
    }

    session.messages.push({
      role: 'user' as const,
      content,
    });

    await this.saveSession(session);
    return session;
  }

  /**
   * Adiciona mensagem do assistente ao histórico
   */
  async addAssistantMessage(phone: string, content: string): Promise<void> {
    const session = await this.getSession(phone);
    if (!session) return;

    session.messages.push({
      role: 'assistant' as const,
      content,
    });

    await this.saveSession(session);
  }

  /**
   * Adiciona resultado de tool ao histórico
   */
  async addToolResult(
    phone: string,
    toolUseId: string,
    content: string
  ): Promise<void> {
    const session = await this.getSession(phone);
    if (!session) return;

    session.messages.push({
      role: 'user' as const,
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content,
        },
      ],
    });

    await this.saveSession(session);
  }

  /**
   * Gera chave do Redis para um telefone
   */
  private getSessionKey(phone: string): string {
    return `agent:session:${phone}`;
  }
}

// Singleton
export const agentSessionManager = new AgentSessionManager();
