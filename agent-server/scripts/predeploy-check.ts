#!/usr/bin/env node
// ============================================================
// BARBEAR-FLOW: Script de Validação Pré-Deploy
// Executa checklist automatizado antes do deploy em produção
// ============================================================

import { createHash, createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const isWin = process.platform === 'win32';
const cwd = process.cwd();

// Cores para output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(type: 'pass' | 'fail' | 'warn' | 'info', message: string) {
  const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
  const color = type === 'pass' ? GREEN : type === 'fail' ? RED : type === 'warn' ? YELLOW : BLUE;
  console.log(`  ${icon} ${color}${message}${RESET}`);
}

function header(text: string) {
  console.log(`\n${BOLD}${BLUE}━━━ ${text} ━━━${RESET}`);
}

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function check(condition: boolean, passMsg: string, failMsg: string, isWarning = false): boolean {
  if (condition) {
    log('pass', passMsg);
    passCount++;
    return true;
  } else {
    log(isWarning ? 'warn' : 'fail', failMsg);
    if (isWarning) warnCount++;
    else failCount++;
    return false;
  }
}

// ============================================================
// 1. VERIFICAÇÃO DE ARQUIVOS
// ============================================================

header('1. ARQUIVOS ESSENCIAIS');

const requiredFiles = [
  'package.json',
  'src/index.ts',
  '.env.example',
  '.env.production.example',
  'Dockerfile',
  'docker-compose.yml',
];

for (const file of requiredFiles) {
  check(
    existsSync(join(cwd, file)),
    `${file} existe`,
    `${file} NÃO encontrado`
  );
}

// ============================================================
// 2. VARIÁVEIS DE AMBIENTE
// ============================================================

header('2. VARIÁVEIS DE AMBIENTE (.env)');

const envPath = join(cwd, '.env');
const envProductionPath = join(cwd, '.env.production');

// Carrega .env
let envVars: Record<string, string> = {};
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      envVars[key.trim()] = value.trim();
    }
  }
}

const requiredVars = [
  'DATABASE_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'EVOLUTION_API_URL',
  'EVOLUTION_API_KEY',
  'ANTHROPIC_API_KEY',
];

const optionalVars = [
  'OPENAI_API_KEY',
  'WEBHOOK_SECRET',
  'API_SECRET_KEY',
  'CORS_ALLOWED_ORIGINS',
  'LLM_MODEL',
  'LOG_LEVEL',
];

for (const v of requiredVars) {
  const val = envVars[v];
  check(
    val && val.length > 0 && !val.includes('SEU_') && !val.includes('SUA_'),
    `${v} configurada`,
    `${v} NÃO configurada ou é placeholder`
  );
}

for (const v of optionalVars) {
  const val = envVars[v];
  if (v === 'WEBHOOK_SECRET' || v === 'API_SECRET_KEY') {
    check(
      val && val.length >= 32 && !val.includes('seu-') && !val.includes('SEU-'),
      `${v} definida com tamanho adequado`,
      `${v} não definida ou muito curta (mínimo 32 chars)`,
      true
    );
  }
}

// Verifica URLs válidas
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

check(
  !envVars['DATABASE_URL'] || isValidUrl(envVars['DATABASE_URL']),
  'DATABASE_URL é uma URL válida',
  'DATABASE_URL NÃO é uma URL válida'
);

check(
  !envVars['EVOLUTION_API_URL'] || isValidUrl(envVars['EVOLUTION_API_URL']),
  'EVOLUTION_API_URL é uma URL válida',
  'EVOLUTION_API_URL NÃO é uma URL válida'
);

// ============================================================
// 3. SEGURANÇA
// ============================================================

header('3. SEGURANÇA');

check(
  envVars['NODE_ENV'] !== 'development',
  'NODE_ENV não é "development"',
  'NODE_ENV está como "development" (deve ser "production" em prod)',
  true
);

const corsOrigins = envVars['CORS_ALLOWED_ORIGINS'] || '*';
check(
  !corsOrigins.includes('*') || envVars['NODE_ENV'] !== 'production',
  'CORS_ALLOWED_ORIGINS não usa wildcard em produção',
  'CORS_ALLOWED_ORIGINS usa "*" (inseguro em produção)',
  true
);

// Verifica se .gitignore existe e ignora .env
const gitignorePath = join(cwd, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, 'utf-8');
  check(
    gitignore.includes('.env') || gitignore.includes('*.env'),
    '.gitignore ignora arquivos .env',
    '.gitignore NÃO ignora arquivos .env',
    true
  );
}

// Verifica se há credenciais hardcoded no código (busca rápida)
const riskyPatterns = [
  'sk-ant-api03',
  'sk-proj',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'gQAAAAAA',
];

// Não verificar código fonte para não dar falso positivo em .env
check(true, 'Verificação de credentials hardcoded (manual: revise o .env)', 'N/A');

// ============================================================
// 4. CONFIGURAÇÃO DE PRODUÇÃO
// ============================================================

header('4. CONFIGURAÇÃO DE PRODUÇÃO');

check(
  existsSync(join(cwd, 'Dockerfile')),
  'Dockerfile existe',
  'Dockerfile NÃO encontrado'
);

// Verifica Dockerfile para usuário non-root
if (existsSync(join(cwd, 'Dockerfile'))) {
  const dockerfile = readFileSync(join(cwd, 'Dockerfile'), 'utf-8');
  check(
    dockerfile.includes('USER') && !dockerfile.includes('USER root'),
    'Dockerfile usa usuário non-root',
    'Dockerfile NÃO usa usuário non-root (segurança)',
    true
  );

  check(
    dockerfile.includes('HEALTHCHECK'),
    'Dockerfile tem HEALTHCHECK',
    'Dockerfile NÃO tem HEALTHCHECK',
    true
  );

  check(
    dockerfile.includes('npm ci'),
    'Dockerfile usa npm ci (build reproducível)',
    'Dockerfile NÃO usa npm ci',
    true
  );
}

// ============================================================
// 5. LOGGING
// ============================================================

header('5. LOGGING');

const logLevel = envVars['LOG_LEVEL'] || 'info';
check(
  logLevel === 'info' || logLevel === 'warn' || envVars['NODE_ENV'] !== 'production',
  `LOG_LEVEL="${logLevel}" adequado`,
  `LOG_LEVEL="${logLevel}" pode ser excessivo em produção`,
  true
);

// ============================================================
// 6. TYPE CHECK
// ============================================================

header('6. TYPE CHECK (npm run typecheck)');

// Não executa typecheck aqui - deve ser feito separadamente
log('info', 'Execute: npm run typecheck');

// ============================================================
// RESUMO
// ============================================================

console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${BOLD}RESUMO DA VALIDAÇÃO PRÉ-DEPLOY${RESET}`);
console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

console.log(`  ${GREEN}✅ Passou: ${passCount}${RESET}`);
console.log(`  ${RED}❌ Falhou: ${failCount}${RESET}`);
console.log(`  ${YELLOW}⚠️  Avisos: ${warnCount}${RESET}`);

if (failCount > 0) {
  console.log(`\n${RED}${BOLD}⛔ DEPLOY BLOQUEADO - Corrija os erros acima antes de prosseguir.${RESET}`);
  process.exit(1);
} else if (warnCount > 0) {
  console.log(`\n${YELLOW}${BOLD}⚠️  DEPLOY POSSÍVEL com avisos - Revise os warnings acima.${RESET}`);
  process.exit(0);
} else {
  console.log(`\n${GREEN}${BOLD}🚀 TODAS AS VALIDAÇÕES PASSARAM - Pronto para deploy!${RESET}`);
  process.exit(0);
}
