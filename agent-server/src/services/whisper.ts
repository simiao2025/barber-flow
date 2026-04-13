// ============================================================
// BARBEAR-FLOW: Transcrição de áudio via OpenAI Whisper
// ============================================================

import OpenAI from 'openai';
import { createLogger } from '../lib/logger.js';
import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const logger = createLogger('WhisperService');

export class WhisperService {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn(
        'OPENAI_API_KEY não configurada. Transcrição de áudio desabilitada.'
      );
      // Não lança erro - serviço fica desabilitado graceful
      this.client = null as any;
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('WhisperService inicializado');
  }

  /**
   * Verifica se o serviço está disponível
   */
  get isEnabled(): boolean {
    return this.client !== null && this.client !== undefined;
  }

  /**
   * Transcreve áudio base64 para texto
   */
  async transcribeAudio(
    base64Audio: string,
    mimeType: string
  ): Promise<string> {
    if (!this.isEnabled) {
      logger.warn('WhisperService desabilitado - sem OPENAI_API_KEY');
      return '';
    }

    const startTime = Date.now();
    let tempFilePath: string | null = null;

    try {
      // Converte base64 para buffer
      const audioBuffer = Buffer.from(base64Audio, 'base64');

      // Cria arquivo temporário
      const extension = this.getExtensionFromMimeType(mimeType);
      tempFilePath = join(tmpdir(), `whisper-${randomUUID()}.${extension}`);
      await writeFile(tempFilePath, audioBuffer);

      // Chama Whisper API
      const transcription = await this.client.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: 'whisper-1',
        language: 'pt',
        response_format: 'text',
      });

      const duration = Date.now() - startTime;
      const text =
        typeof transcription === 'string'
          ? transcription
          : (transcription as any).text ?? '';

      logger.debug(
        { duration, textLength: text.length, mimeType },
        'Áudio transcrito com sucesso'
      );

      return text;
    } catch (error) {
      logger.error({ error, mimeType }, 'Erro na transcrição de áudio');
      // Retorna string vazia em caso de erro (não quebra o fluxo)
      return '';
    } finally {
      // Limpa arquivo temporário
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
        } catch {
          // Ignora erro de cleanup
        }
      }
    }
  }

  /**
   * Extrai extensão do MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/aac': 'aac',
    };
    return map[mimeType] || 'ogg';
  }
}

// Singleton
export const whisperService = new WhisperService();
