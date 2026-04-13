// ============================================================
// BARBEAR-FLOW: Cliente da Evolution API
// ============================================================

import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { createLogger } from '../lib/logger.js';
import { EvolutionAPIError } from '../lib/errors.js';

const logger = createLogger('EvolutionService');

export interface EvolutionMessageContent {
  number: string;
  text: string;
  delay?: number;
}

export class EvolutionService {
  private client: AxiosInstance;
  private instanceName: string;

  constructor() {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      throw new Error(
        'EVOLUTION_API_URL e EVOLUTION_API_KEY são obrigatórios'
      );
    }

    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'barber-flow';

    this.client = axios.create({
      baseURL: process.env.EVOLUTION_API_URL,
      headers: {
        apikey: process.env.EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: parseInt(process.env.EVOLUTION_API_TIMEOUT_MS || '30000'),
    });

    // Retry com backoff exponencial
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry em 429 (rate limit) e 5xx
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          (error.response?.status ?? 0) >= 500
        );
      },
    });

    logger.info(
      { url: process.env.EVOLUTION_API_URL, instance: this.instanceName },
      'EvolutionService inicializado'
    );
  }

  /**
   * Envia mensagem de texto para um número
   */
  async sendText(phone: string, text: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.client.post(
        `/message/sendText/${this.instanceName}`,
        {
          number: phone,
          text,
        }
      );

      const duration = Date.now() - startTime;
      logger.debug({ phone, duration }, 'Mensagem de texto enviada');
    } catch (error) {
      logger.error({ phone, error }, 'Erro ao enviar mensagem de texto');
      throw new EvolutionAPIError(`Falha ao enviar texto para ${phone}`, {
        endpoint: '/message/sendText',
        response: error,
      });
    }
  }

  /**
   * Simula "digitando..." por N milissegundos
   */
  async sendTyping(
    phone: string,
    duration: number = 1500
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await this.client.post(
        `/chat/sendPresence/${this.instanceName}`,
        {
          number: phone,
          delay: duration,
        }
      );

      const execDuration = Date.now() - startTime;
      logger.debug({ phone, duration, execDuration }, 'Typing enviado');
    } catch (error) {
      // Não falha o fluxo se typing falhar
      logger.warn({ phone, error }, 'Falha ao enviar typing (ignorado)');
    }
  }

  /**
   * Baixa mídia de mensagem e retorna como base64
   */
  async getMediaBase64(message: any): Promise<{
    base64: string;
    mimeType: string;
  }> {
    const startTime = Date.now();
    try {
      const response = await this.client.post(
        `/message/getBase64FromMedia/${this.instanceName}`,
        {
          messageId: message.id,
        }
      );

      const duration = Date.now() - startTime;
      logger.debug({ messageId: message.id, duration }, 'Mídia baixada');

      return {
        base64: response.data.base64,
        mimeType: response.data.mimeType || 'application/octet-stream',
      };
    } catch (error) {
      logger.error({ messageId: message?.id, error }, 'Erro ao baixar mídia');
      throw new EvolutionAPIError('Falha ao baixar mídia', {
        endpoint: '/message/getBase64FromMedia',
        response: error,
      });
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client.post(`/chat/markAsRead/${this.instanceName}`, {
        messageId,
      });
    } catch (error) {
      logger.warn({ messageId, error }, 'Falha ao marcar como lido (ignorado)');
    }
  }
}

// Singleton
export const evolutionService = new EvolutionService();
