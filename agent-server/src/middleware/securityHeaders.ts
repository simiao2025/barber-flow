// ============================================================
// BARBEAR-FLOW: Middleware de Security Headers
// Inspirado no helmet - adiciona headers de segurança
// ============================================================

import type { MiddlewareHandler } from 'hono';

/**
 * Cria middleware de security headers
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Headers de segurança
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '0'); // Desabilitado - navegadores modernos usam CSP
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Download-Options', 'noopen');
    c.header('X-Permitted-Cross-Domain-Policies', 'none');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove headers que expõem info do servidor
    c.res.headers.delete('x-powered-by');

    if (isProduction) {
      // HSTS - force HTTPS
      c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      // CSP - Content Security Policy (restrictivo)
      c.header(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
      );
    }

    return next();
  };
}
