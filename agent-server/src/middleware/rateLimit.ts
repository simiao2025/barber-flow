// ============================================================
// BARBEAR-FLOW: Middleware de Rate Limiting
// Implementação simples com sliding window em memória
// ============================================================

import type { MiddlewareHandler } from 'hono';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('RateLimiter');

interface RateLimitConfig {
  windowMs: number;    // Janela de tempo em ms
  max: number;         // Máximo de requests por janela
  message?: string;    // Mensagem de erro
  keyGenerator?: (req: Request) => string;
}

interface WindowEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private windows = new Map<string, WindowEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => {
        try {
          const url = new URL(req.url);
          return url.hostname || 'unknown';
        } catch {
          return 'unknown';
        }
      },
      message: 'Too many requests',
      ...config,
    };
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    let entry = this.windows.get(key);

    // Limpa janela expirada
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.windows.set(key, entry);
    }

    entry.count++;
    const allowed = entry.count <= this.config.max;
    const remaining = Math.max(0, this.config.max - entry.count);

    return { allowed, remaining, resetTime: entry.resetTime };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.windows.entries()) {
      if (now > entry.resetTime) {
        this.windows.delete(key);
      }
    }
  }
}

// Cleanup a cada 5 minutos
const cleanupInterval = setInterval(() => {
  // Instâncias são acessadas via closure nos middlewares
}, 5 * 60 * 1000);

/**
 * Cria middleware de rate limiting
 */
export function rateLimit(config: RateLimitConfig): MiddlewareHandler {
  const limiter = new RateLimiter(config);

  // Cleanup periódico
  setInterval(() => limiter.cleanup(), 5 * 60 * 1000);

  return async (c, next) => {
    // Não aplica rate limit em health check
    if (c.req.path === '/health') {
      return next();
    }

    const key = config.keyGenerator?.(c.req.raw) || c.req.raw.headers.get('cf-connecting-ip') || 'unknown';
    const result = limiter.check(key);

    c.header('X-RateLimit-Limit', String(config.max));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    if (!result.allowed) {
      logger.warn({ key, path: c.req.path }, 'Rate limit excedido');
      return c.json(
        { error: 'Too Many Requests', retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
        429
      );
    }

    return next();
  };
}

/**
 * Rate limiting específico para webhook (mais permissivo)
 */
export function webhookRateLimit(): MiddlewareHandler {
  return rateLimit({
    windowMs: 60 * 1000,    // 1 minuto
    max: 200,                // 200 requests/min
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for');
      return forwarded || req.headers.get('cf-connecting-ip') || 'webhook-unknown';
    },
    message: 'Webhook rate limit exceeded',
  });
}

/**
 * Rate limiting para rotas de API (mais restritivo)
 */
export function apiRateLimit(): MiddlewareHandler {
  return rateLimit({
    windowMs: 60 * 1000,    // 1 minuto
    max: 60,                 // 60 requests/min
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for');
      return forwarded || req.headers.get('cf-connecting-ip') || 'api-unknown';
    },
    message: 'API rate limit exceeded',
  });
}
