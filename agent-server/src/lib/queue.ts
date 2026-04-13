// ============================================================
// BARBEAR-FLOW: Fila de processamento de mensagens
// Evita race condition ao processar múltiplas mensagens
// do mesmo número simultaneamente
// ============================================================

import { createLogger } from './logger.js';

const logger = createLogger('MessageQueue');

interface QueueItem {
  phone: string;
  execute: () => Promise<void>;
}

export class MessageQueue {
  private queue: QueueItem[] = [];
  private processing: Set<string> = new Set();

  /**
   * Adiciona mensagem à fila para processamento
   * Se já estiver processando para este número, enfileira
   */
  async enqueue(phone: string, execute: () => Promise<void>): Promise<void> {
    // Se não está processando para este número, executa imediatamente
    if (!this.processing.has(phone)) {
      this.processing.add(phone);
      try {
        await execute();
      } catch (error) {
        logger.error({ phone, error }, 'Erro ao processar mensagem da fila');
        throw error;
      } finally {
        this.processing.delete(phone);
        // Processar próximos itens enfileirados para este número
        await this.processNext(phone);
      }
      return;
    }

    // Se já está processando, adiciona à fila
    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push({
        phone,
        execute: async () => {
          try {
            await execute();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });
    });

    return promise;
  }

  /**
   * Processa o próximo item da fila para um número específico
   */
  private async processNext(phone: string): Promise<void> {
    const nextIndex = this.queue.findIndex((item) => item.phone === phone);

    if (nextIndex === -1) {
      return; // Sem itens na fila para este número
    }

    const nextItem = this.queue.splice(nextIndex, 1)[0];
    this.processing.add(phone);

    try {
      await nextItem.execute();
    } catch (error) {
      logger.error(
        { phone, error },
        'Erro ao processar próximo item da fila'
      );
    } finally {
      this.processing.delete(phone);
      // Continuar processando próximos
      await this.processNext(phone);
    }
  }

  /**
   * Retorna o tamanho da fila
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Retorna quantos números estão sendo processados
   */
  get activeProcessing(): number {
    return this.processing.size;
  }

  /**
   * Limpa a fila (para graceful shutdown)
   */
  clear(): void {
    logger.warn(
      { remainingItems: this.queue.length },
      'Limpando fila de mensagens'
    );
    this.queue = [];
  }
}

// Singleton global
export const messageQueue = new MessageQueue();
