// ============================================================
// BARBEAR-FLOW: Middleware de Autenticação por API Key
// Protege rotas administrativas
// ============================================================

import type { MiddlewareHandler } from 'hono';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('AuthMiddleware');

/**
 * Cria middleware de autenticação por API Key
 * Verifica o header `x-api-key` contra API_SECRET_KEY
 */
export function requireApiKey(): MiddlewareHandler {
  return async (c, next) => {
    const secretKey = process.env.API_SECRET_KEY;

    // Se API_SECRET_KEY não está configurada, permite acesso (desenvolvimento)
    // mas loga warning em produção
    if (!secretKey) {
      if (process.env.NODE_ENV === 'production') {
        logger.error(
          'API_SECRET_KEY não configurada em produção - rota desprotegida!'
        );
      }
      return next();
    }

    const providedKey = c.req.header('x-api-key') || c.req.header('X-API-Key');

    if (!providedKey) {
      logger.warn({ path: c.req.path }, 'Requisição sem API key');
      return c.json(
        {
          error: 'Unauthorized',
          message: 'API key required. Send via x-api-key header.',
        },
        401
      );
    }

    // Comparação timing-safe para prevenir timing attacks
    if (!timingSafeEqual(Buffer.from(providedKey), Buffer.from(secretKey))) {
      logger.warn({ path: c.req.path }, 'API key inválida');
      return c.json(
        {
          error: 'Forbidden',
          message: 'Invalid API key.',
        },
        403
      );
    }

    return next();
  };
}

import { timingSafeEqual } from 'crypto';
