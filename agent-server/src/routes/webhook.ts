// ============================================================
// BARBEAR-FLOW: Webhook da Evolution API
// Recebe mensagens do WhatsApp e processa via agente IA
// ============================================================

import { Hono } from 'hono';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { createLogger } from '../lib/logger.js';
import { messageQueue } from '../lib/queue.js';
import {
  extractPhoneFromRemoteJid,
  isTextMessage,
  isAudioMessage,
  extractTextMessage,
} from '../types/webhook.js';
import { agentOrchestrator } from '../agent/index.js';
import { whisperService } from '../services/whisper.js';
import { evolutionService } from '../services/evolution.js';

const logger = createLogger('WebhookRoute');

export const webhookRoute = new Hono();

/**
 * Valida assinatura HMAC do webhook
 */
function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * POST /webhook/whatsapp
 * Recebe webhook da Evolution API
 */
webhookRoute.post('/whatsapp', async (c) => {
  const startTime = Date.now();

  try {
    const rawBody = await c.req.text();

    // Validar assinatura HMAC (se configurada)
    if (process.env.WEBHOOK_SECRET) {
      const signature = c.req.header('X-Webhook-Signature');
      if (!signature) {
        logger.warn('Webhook sem assinatura - rejeitando');
        return c.json({ error: 'Missing signature' }, 401);
      }
      if (!validateWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
        logger.warn('Webhook com assinatura inválida - rejeitando');
        return c.json({ error: 'Invalid signature' }, 403);
      }
    }

    // Parse do body
    const body = JSON.parse(rawBody);

    // Extrair dados da mensagem
    const phone = extractPhoneFromRemoteJid(body.data?.key?.remoteJid ?? '');
    const message = body.data;

    if (!phone) {
      logger.warn({ body }, 'Webhook sem número de telefone');
      return c.json({ error: 'Missing phone' }, 400);
    }

    logger.info({ phone, messageType: message?.messageType }, 'Webhook recebido');

    // Determinar tipo de mensagem e extrair texto
    let messageText = '';

    if (isTextMessage(message)) {
      messageText = extractTextMessage(message);
    } else if (isAudioMessage(message)) {
      // Transcrever áudio
      try {
        const media = await evolutionService.getMediaBase64(message);
        const transcribed = await whisperService.transcribeAudio(
          media.base64,
          media.mimeType
        );

        if (transcribed) {
          messageText = '[Áudio]: ' + transcribed;
          logger.debug({ phone }, 'Áudio transcrito com sucesso');
        } else {
          // Responder que não conseguiu ouvir
          await evolutionService.sendText(
            phone,
            'Não consegui ouvir o áudio. Pode escrever?'
          );
          return c.json({ status: 'audio_failed' }, 200);
        }
      } catch (error) {
        logger.error({ phone, error }, 'Erro ao processar áudio');
        await evolutionService.sendText(
          phone,
          'Não consegui ouvir o áudio. Pode escrever?'
        );
        return c.json({ status: 'audio_failed' }, 200);
      }
    } else {
      // Mensagem não suportada (imagem, vídeo, etc.)
      logger.info(
        { phone, messageType: message?.messageType },
        'Tipo de mensagem não suportado'
      );
      await evolutionService.sendText(
        phone,
        'No momento só aceito mensagens de texto e áudio. Como posso ajudar?'
      );
      return c.json({ status: 'unsupported_type' }, 200);
    }

    // Enfileira mensagem para processamento assíncrono
    await messageQueue.enqueue(phone, async () => {
      try {
        await agentOrchestrator.processMessage(
          phone,
          messageText,
          body.instance?.instanceName ?? 'barber-flow'
        );
      } catch (error) {
        logger.error({ phone, error }, 'Erro ao processar mensagem');
      }
    });

    const duration = Date.now() - startTime;
    logger.debug({ phone, duration }, 'Webhook processado com sucesso');

    // Retorna 200 imediatamente (processamento assíncrono)
    return c.json({ status: 'queued' }, 200);
  } catch (error) {
    logger.error({ error }, 'Erro no webhook');
    return c.json(
      { error: 'Internal server error' },
      500
    );
  }
});

/**
 * GET /webhook/whatsapp
 * Health check do webhook (para verificação)
 */
webhookRoute.get('/whatsapp', (c) => {
  return c.json({ status: 'ok', service: 'webhook' }, 200);
});
