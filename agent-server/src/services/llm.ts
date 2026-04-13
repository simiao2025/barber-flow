// ============================================================
// BARBEAR-FLOW: Cliente Anthropic (LLM) com tool use nativo
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../lib/logger.js';
import { LLMError } from '../lib/errors.js';
import type { LLMResponse, Tool } from '../types/agent.js';

const logger = createLogger('LLMService');

export interface LLMChatParams {
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tools?: Tool[];
  maxTokens?: number;
}

export class LLMService {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY é obrigatória');
    }

    this.model = process.env.LLM_MODEL || 'claude-sonnet-4-5-20250514';

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 3,
    });

    logger.info({ model: this.model }, 'LLMService inicializado');
  }

  /**
   * Chama o LLM com system prompt, mensagens e tools opcionais
   */
  async chat(params: LLMChatParams): Promise<LLMResponse> {
    const startTime = Date.now();
    const { systemPrompt, messages, tools, maxTokens = 1024 } = params;

    try {
      const messageParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages as Anthropic.MessageParam[],
        temperature: 0.7,
        ...(tools && tools.length > 0 ? { tools } : {}),
      };

      const response = await this.client.messages.create(messageParams);
      const duration = Date.now() - startTime;

      // Extrair texto e tool call da resposta
      let text = '';
      let toolCall: LLMResponse['toolCall'] | undefined;

      for (const content of response.content) {
        if (content.type === 'text') {
          text += content.text;
        } else if (content.type === 'tool_use') {
          toolCall = {
            name: content.name,
            input: content.input as Record<string, unknown>,
            toolUseId: content.id,
          };
        }
      }

      // Log da chamada
      logger.info(
        {
          model: this.model,
          stopReason: response.stop_reason,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          duration,
          toolCalled: toolCall?.name ?? null,
        },
        'LLM chamada concluída'
      );

      return {
        text,
        toolCall,
        stopReason: response.stop_reason as LLMResponse['stopReason'],
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { model: this.model, duration, error },
        'Erro na chamada LLM'
      );

      // Retry manual em erros 529 (overloaded)
      if (
        error instanceof Anthropic.APIError &&
        (error.status === 529 || error.status === 500)
      ) {
        logger.warn('Retrying em erro 529/500...');
        await this.sleep(2000);
        return this.chat(params);
      }

      throw new LLMError(
        `Falha na chamada LLM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        {
          model: this.model,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton
export const llmService = new LLMService();
