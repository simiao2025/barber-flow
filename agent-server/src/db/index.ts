// ============================================================
// BARBEAR-FLOW: Cliente Supabase + Drizzle ORM
// ============================================================

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('SupabaseClient');

const { Pool } = pg;

// Singleton do pool de conexões
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS || '5000'),
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Erro inesperado no pool PostgreSQL');
    });

    logger.info('Pool PostgreSQL criado');
  }

  return pool;
}

// Cliente Drizzle singleton
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Fechar pool (para graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Pool PostgreSQL fechado');
    pool = null;
    dbInstance = null;
  }
}
