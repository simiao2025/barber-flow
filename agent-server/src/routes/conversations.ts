// ============================================================
// BARBEAR-FLOW: Rotas de conversas do agente
// Permitir ao dono visualizar e assumir atendimentos
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { createLogger } from '../lib/logger.js';
import { agentSessionManager } from '../agent/session.js';
import { evolutionService } from '../services/evolution.js';

const logger = createLogger('ConversationsRoute');

export const conversationsRoute = new Hono();

// ============================================================
// VALIDAÇÃO
// ============================================================

const modeSchema = z.object({
  waitingHuman: z.boolean().optional(),
  manualMode: z.boolean().optional(),
});

const sendMessageSchema = z.object({
  barbershopId: z.string().uuid(),
  text: z.string().min(1).max(1000),
});

// ============================================================
// ROTAS
// ============================================================

/**
 * GET /conversations/:barbershopId
 * Lista conversas ativas das últimas 24h
 */
conversationsRoute.get('/:barbershopId', async (c) => {
  try {
    const { barbershopId } = c.req.param();

    // Buscar conversas recentes do Supabase
    // (implementação simplificada - em produção usar repo)
    const db = (c as any).get('db');

    const conversations = await db.query.aiConversations.findMany({
      where: (conversations, { eq, and, gt }) =>
        and(
          eq(conversations.barbershopId, barbershopId),
          gt(conversations.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        ),
      orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
    });

    return c.json({ conversations }, 200);
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar conversas');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /conversations/:phone/mode
 * Alterna entre modo agente e modo humano
 */
conversationsRoute.patch('/:phone/mode', async (c) => {
  try {
    const { phone } = c.req.param();
    const body = await c.req.json();
    const parsed = modeSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }

    // Atualiza sessão no Redis
    const session = await agentSessionManager.getSession(phone);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (parsed.data.waitingHuman !== undefined) {
      session.waitingHuman = parsed.data.waitingHuman;
    }

    if (parsed.data.manualMode !== undefined) {
      session.manualMode = parsed.data.manualMode;
    }

    await agentSessionManager.saveSession(session);

    // Envia mensagem automática ao cliente
    if (parsed.data.manualMode) {
      await evolutionService.sendText(
        phone,
        'Entendi! Um dos nossos atendentes vai assumir sua conversa. Aguarde um momento!'
      );
    } else if (parsed.data.waitingHuman === false && parsed.data.manualMode === false) {
      await evolutionService.sendText(
        phone,
        'Beleza! Nosso assistente IA voltou a atender. Como posso ajudar?'
      );
    }

    logger.info({ phone, ...parsed.data }, 'Modo da conversa alterado');
    return c.json({ session }, 200);
  } catch (error) {
    logger.error({ error }, 'Erro ao alterar modo da conversa');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /conversations/:phone/send
 * Envia mensagem manual (apenas em modo manual)
 */
conversationsRoute.post('/:phone/send', async (c) => {
  try {
    const { phone } = c.req.param();
    const body = await c.req.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }

    // Verifica se está em modo manual
    const session = await agentSessionManager.getSession(phone);

    if (!session || !session.manualMode) {
      return c.json(
        { error: 'Agent must be in manual mode to send messages' },
        403
      );
    }

    // Envia mensagem
    await evolutionService.sendText(phone, parsed.data.text);

    // Adiciona ao histórico da sessão
    session.messages.push({
      role: 'assistant',
      content: parsed.data.text,
    });

    await agentSessionManager.saveSession(session);

    return c.json({ status: 'sent' }, 200);
  } catch (error) {
    logger.error({ error }, 'Erro ao enviar mensagem manual');
    return c.json({ error: 'Internal server error' }, 500);
  }
});
