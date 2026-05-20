import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { Client } = pg;

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERRO: DATABASE_URL não encontrada no ambiente.");
    process.exit(1);
  }

  console.log("Conectando ao banco de dados Neon...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Conectado com sucesso!");

  try {
    // 0. Reset Public Schema
    console.log("Reiniciando schema 'public' para uma migração limpa...");
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
      GRANT ALL ON SCHEMA public TO neondb_owner;
    `);

    // 1. Setup Auth Schema Mock
    console.log("Configurando mock do schema 'auth'...");
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        raw_app_meta_data JSONB,
        raw_user_meta_data JSONB,
        is_admin BOOLEAN,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT COALESCE(
          current_setting('request.jwt.claims', true)::json->>'sub',
          '00000000-0000-0000-0000-000000000001'
        )::UUID;
      $$ LANGUAGE sql STABLE;

      INSERT INTO auth.users (id, email)
      VALUES ('00000000-0000-0000-0000-000000000001', 'owner@barberflow.com')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Schema 'auth' e mock do usuário configurados.");

    // List of migrations to run
    const migrations = [
      { name: "001_schema_completo.sql", path: path.resolve("../supabase/001_schema_completo.sql") },
      { name: "002_stock_triggers.sql", path: path.resolve("../supabase/002_stock_triggers.sql") },
      { name: "003_rls_multi_tenant.sql", path: path.resolve("../supabase/003_rls_multi_tenant.sql") },
      { name: "001_rbac_user_profiles.sql", path: path.resolve("./src/db/migrations/001_rbac_user_profiles.sql") },
      { name: "seed_completo.sql", path: path.resolve("../src/seeds/seed_completo.sql") }
    ];

    for (const m of migrations) {
      console.log(`\n--------------------------------------------`);
      console.log(`Executando migration: ${m.name}`);
      console.log(`Caminho: ${m.path}`);
      if (!fs.existsSync(m.path)) {
        throw new Error(`Arquivo não encontrado: ${m.path}`);
      }
      
      const sql = fs.readFileSync(m.path, 'utf8');
      
      // Execute the entire SQL script
      await client.query(sql);
      console.log(`✅ ${m.name} concluída com sucesso!`);
    }

    console.log("\n============================================");
    console.log("🎉 MIGRATION E SEED COMPLETOS NO NEON DATABASE!");
    console.log("============================================");

  } catch (error) {
    console.error("❌ ERRO NA MIGRAÇÃO:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
