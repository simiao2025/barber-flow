// ============================================================
// BARBEAR-FLOW: Entry Point — Servidor Hono do Agente IA
// ============================================================

// Carregar variáveis de ambiente ANTES de tudo
import 'dotenv/config';

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger as pinoLogger } from './lib/logger.js';
import { validateEnv } from './lib/envValidator.js';
import { messageQueue } from './lib/queue.js';
import { closePool } from './db/index.js';
import { webhookRoute } from './routes/webhook.js';
import { conversationsRoute } from './routes/conversations.js';
import { healthRoute } from './routes/health.js';
import { FollowUpScheduler } from './services/scheduler.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { configurableCors } from './middleware/cors.js';
import { webhookRateLimit, apiRateLimit } from './middleware/rateLimit.js';

// ============================================================
// VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
// ============================================================

validateEnv();

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PORT = parseInt(process.env.PORT || '3000');
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ============================================================
// APP HONO
// ============================================================

const app = new Hono();

// 1. Security Headers (helmet-like)
app.use('*', securityHeaders());

// 2. CORS configurável
app.use('*', configurableCors());

// 3. Rate limiting global
app.use('*', apiRateLimit());

// 4. Rate limiting específico para webhook (mais permissivo)
app.use('/webhook/*', webhookRateLimit());

// 5. Logging middleware (apenas em development)
if (!isProduction) {
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    pinoLogger.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, duration: ms },
      'HTTP Request'
    );
  });
}

// Error handler global
app.onError((err, c) => {
  pinoLogger.error({ err, path: c.req.path, method: c.req.method }, 'Erro não tratado');

  // Não expor detalhes de erro em produção
  const isHttpError = err instanceof Error && 'statusCode' in err;

  return c.json(
    {
      error: isHttpError ? 'Client Error' : 'Internal Server Error',
      message: isProduction ? undefined : err.message,
      ...(isHttpError ? { statusCode: (err as any).statusCode } : {}),
    },
    isHttpError ? (err as any).statusCode : 500
  );
});

// ============================================================
// ROTAS
// ============================================================

// Health check
app.route('/health', healthRoute);

// Webhook Evolution API (com rate limit próprio)
app.route('/webhook', webhookRoute);

// Conversas do agente (protegidas por API key em produção)
app.route('/conversations', conversationsRoute);

// Rota raiz
app.get('/', (c) => {
  return c.json(
    {
      service: 'BarberFlow Agent Server',
      version: '1.0.0',
      status: 'running',
      env: isProduction ? 'production' : 'development',
      queue: {
        size: messageQueue.size,
        activeProcessing: messageQueue.activeProcessing,
      },
      timestamp: new Date().toISOString(),
    },
    200
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// ============================================================
// SERVIDOR
// ============================================================

let server: ReturnType<typeof serve>;
let scheduler: FollowUpScheduler | null = null;

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string) {
  pinoLogger.info({ signal }, 'Recebido sinal de shutdown');

  // Para scheduler
  if (scheduler) {
    scheduler.stop();
  }

  // Limpa fila
  messageQueue.clear();

  // Fecha pool de conexões
  await closePool();

  // Fecha servidor HTTP
  if (server) {
    server.close();
  }

  pinoLogger.info('Servidor encerrado');
  process.exit(0);
}

/**
 * Inicialização
 */
async function start() {
  pinoLogger.info(
    { port: PORT, env: NODE_ENV },
    'Iniciando BarberFlow Agent Server...'
  );

  // Inicia scheduler de follow-ups
  try {
    scheduler = new FollowUpScheduler();
    scheduler.start();
  } catch (error) {
    pinoLogger.warn({ error }, 'Falha ao iniciar scheduler (ignorado)');
  }

  // Inicia servidor HTTP
  server = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      pinoLogger.info(
        { port: info.port, env: NODE_ENV },
        `🚀 BarberFlow Agent Server rodando!`
      );
      pinoLogger.info(`   → Health: http://localhost:${info.port}/health`);
      pinoLogger.info(
        `   → Webhook: http://localhost:${info.port}/webhook/whatsapp`
      );

      if (isProduction) {
        pinoLogger.info('   → Modo: PRODUCTION');
      }
    }
  );

  // Graceful shutdown handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handler de uncaught exceptions
  process.on('uncaughtException', (error) => {
    pinoLogger.fatal({ error }, 'Uncaught Exception');
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    pinoLogger.error({ reason }, 'Unhandled Rejection');
  });
}

start().catch((error) => {
  pinoLogger.fatal({ error }, 'Falha fatal ao iniciar servidor');
  process.exit(1);
});
