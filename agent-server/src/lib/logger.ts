// ============================================================
// BARBEAR-FLOW: Logger configurado com Pino
// ============================================================

import pino from 'pino';
import pinoHttp from 'pino-http';

const isProduction = process.env.NODE_ENV === 'production';

// Logger base para uso em qualquer módulo
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProduction
    ? undefined  // JSON em produção
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: {
    service: 'barber-flow-agent',
  },
});

// Middleware HTTP para Hono (compatible com pino-http)
export const httpLogger = pinoHttp({
  level: 'info',
  useLevel: 'info',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,req,res',
        },
      },
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
});

// Logger filho para módulos específicos
export function createLogger(module: string) {
  return logger.child({ module });
}
