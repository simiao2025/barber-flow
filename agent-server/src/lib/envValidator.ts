// ============================================================
// BARBEAR-FLOW: Validação de Variáveis de Ambiente
// Executado na inicialização para garantir configuração correta
// ============================================================

import { createLogger } from './logger.js';

const logger = createLogger('EnvValidator');

interface EnvVarConfig {
  name: string;
  required: boolean;
  type?: 'url' | 'token' | 'number' | 'string';
  description: string;
}

const REQUIRED_VARS: EnvVarConfig[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    type: 'url',
    description: 'Connection string PostgreSQL',
  },
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: true,
    type: 'url',
    description: 'URL do Upstash Redis',
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: true,
    type: 'token',
    description: 'Token de autenticação do Upstash',
  },
  {
    name: 'EVOLUTION_API_URL',
    required: true,
    type: 'url',
    description: 'URL da Evolution API',
  },
  {
    name: 'EVOLUTION_API_KEY',
    required: true,
    type: 'token',
    description: 'API Key da Evolution API',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: true,
    type: 'token',
    description: 'API Key do Anthropic',
  },
];

const OPTIONAL_VARS: EnvVarConfig[] = [
  {
    name: 'OPENAI_API_KEY',
    required: false,
    type: 'token',
    description: 'API Key do OpenAI (Whisper) - graceful degrade',
  },
  {
    name: 'WEBHOOK_SECRET',
    required: false,
    type: 'token',
    description: 'Secret HMAC para validação do webhook',
  },
  {
    name: 'API_SECRET_KEY',
    required: false,
    type: 'token',
    description: 'API Key para proteger rotas administrativas',
  },
  {
    name: 'LLM_MODEL',
    required: false,
    type: 'string',
    description: 'Modelo LLM padrão',
  },
  {
    name: 'EVOLUTION_INSTANCE_NAME',
    required: false,
    type: 'string',
    description: 'Nome da instância Evolution API',
  },
  {
    name: 'PORT',
    required: false,
    type: 'number',
    description: 'Porta do servidor',
  },
  {
    name: 'LOG_LEVEL',
    required: false,
    type: 'string',
    description: 'Nível de logging',
  },
  {
    name: 'CORS_ALLOWED_ORIGINS',
    required: false,
    type: 'string',
    description: 'Origens permitidas para CORS',
  },
];

/**
 * Valida URL básico
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se token parece válido (não vazio, tamanho mínimo)
 */
function isValidToken(token: string): boolean {
  return token.length >= 8 && !token.includes('SEU_') && !token.includes('sua_') && !token.includes('your_') && !token.includes('...');
}

/**
 * Valida todas as variáveis de ambiente
 */
export function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProduction = process.env.NODE_ENV === 'production';

  // Valida variáveis obrigatórias
  for (const config of REQUIRED_VARS) {
    const value = process.env[config.name];

    if (!value) {
      errors.push(`❌ ${config.name} é obrigatória (não definida)`);
      continue;
    }

    // Validações por tipo
    if (config.type === 'url' && !isValidUrl(value)) {
      errors.push(`❌ ${config.name} não é uma URL válida: ${value}`);
    }

    if (config.type === 'token' && !isValidToken(value)) {
      if (isProduction) {
        errors.push(`❌ ${config.name} parece ser um placeholder. Defina um valor real.`);
      } else {
        warnings.push(`⚠️  ${config.description} parece ser um placeholder`);
      }
    }
  }

  // Valida variáveis opcionais
  for (const config of OPTIONAL_VARS) {
    const value = process.env[config.name];

    if (!value) {
      if (config.name === 'WEBHOOK_SECRET' && isProduction) {
        warnings.push(`⚠️  ${config.name} não definida - webhook sem validação HMAC`);
      }
      if (config.name === 'API_SECRET_KEY' && isProduction) {
        warnings.push(`⚠️  ${config.name} não definida - rotas administrativas desprotegidas`);
      }
      continue;
    }

    if (config.type === 'url' && !isValidUrl(value)) {
      errors.push(`❌ ${config.name} não é uma URL válida: ${value}`);
    }
  }

  // Validações específicas de produção
  if (isProduction) {
    // NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      errors.push('❌ NODE_ENV deve ser "production" em ambiente de produção');
    }

    // CORS
    const corsOrigins = process.env.CORS_ALLOWED_ORIGINS;
    if (!corsOrigins || corsOrigins.includes('*')) {
      errors.push('❌ CORS_ALLOWED_ORIGINS deve ser explícito em produção (não use *)');
    }

    // Webhook secret
    if (!process.env.WEBHOOK_SECRET) {
      warnings.push('⚠️  WEBHOOK_SECRET não definido - webhook sem validação');
    }

    // LOG_LEVEL
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'debug' || logLevel === 'trace') {
      warnings.push(`⚠️  LOG_LEVEL="${logLevel}" em produção pode gerar logs excessivos`);
    }

    // DATABASE_URL - verificar SSL
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      errors.push('❌ DATABASE_URL aponta para localhost em produção');
    }
  }

  // Expor resultados
  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(w));
  }

  if (errors.length > 0) {
    logger.fatal('Variáveis de ambiente inválidas:');
    errors.forEach((e) => logger.fatal(e));
    throw new Error(
      `Validação de variáveis de ambiente falhou (${errors.length} erro(s)). Verifique o .env.`
    );
  }

  logger.info(
    { env: process.env.NODE_ENV || 'development' },
    '✅ Variáveis de ambiente validadas com sucesso'
  );
}
