// ============================================================
// BARBEAR-FLOW: Middleware de CORS Configurável
// Permite origens específicas em produção
// ============================================================

import type { MiddlewareHandler } from 'hono';

/**
 * Cria middleware CORS com origens configuráveis
 * Lê CORS_ALLOWED_ORIGINS do .env (separado por vírgulas)
 */
export function configurableCors(): MiddlewareHandler {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || '*';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const isWildcard = allowedOrigins.includes('*');

  return async (c, next) => {
    const origin = c.req.header('Origin');

    if (isWildcard) {
      // Wildcard - permite tudo (desenvolvimento)
      c.header('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      // Origem específica
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    } else if (!origin) {
      // Request sem Origin (server-to-server) - permite
    } else {
      // Origem não permitida
      if (c.req.method === 'OPTIONS') {
        return c.body('', 403);
      }
    }

    c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-api-key, x-webhook-signature');
    c.header('Access-Control-Max-Age', '86400'); // 24h cache para preflight

    if (c.req.method === 'OPTIONS') {
      return c.body('', 200);
    }

    return next();
  };
}
