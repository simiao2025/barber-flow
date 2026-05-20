// ============================================================
// BARBEAR-FLOW: Rotas de Profissionais (RBAC)
// ============================================================

import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { userProfiles, professionals } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('ProfessionalsRoutes');
const app = new Hono();

/**
 * POST /api/professionals/:id/create-login
 * Body: { email: string, password: string }
 * Creates a Supabase Auth user and links to the professional
 */
app.post('/:id/create-login', async (c) => {
  try {
    const professionalId = c.req.param('id');
    const { email, password } = await c.req.json<{ email: string; password: string }>();

    if (!email || !password) {
      return c.json({ error: 'Email e senha são obrigatórios' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, 400);
    }

    const db = getDb();

    // Verificar se o profissional existe
    const [professional] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, professionalId))
      .limit(1);

    if (!professional) {
      return c.json({ error: 'Profissional não encontrado' }, 404);
    }

    if (professional.userId) {
      return c.json({ error: 'Este profissional já possui um login' }, 409);
    }

    // Criar usuário no Supabase Auth via API Admin
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return c.json({ error: 'Configuração do Supabase incompleta' }, 500);
    }

    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'professional',
          professional_id: professionalId,
          barbershop_id: professional.barbershopId,
        },
      }),
    });

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json();
      logger.error({ errorData }, 'Erro ao criar usuário no Supabase Auth');
      return c.json({ error: errorData.msg || 'Erro ao criar usuário' }, 400);
    }

    const newUser = await createUserResponse.json() as { id: string; email: string };

    // Vincular user_id ao profissional
    await db
      .update(professionals)
      .set({ userId: newUser.id, updatedAt: new Date() })
      .where(eq(professionals.id, professionalId));

    // Criar user_profile
    await db.insert(userProfiles).values({
      userId: newUser.id,
      barbershopId: professional.barbershopId,
      professionalId: professionalId,
      role: 'professional',
    });

    logger.info(
      { professionalId, userId: newUser.id, email },
      '✅ Login criado para profissional'
    );

    return c.json({
      success: true,
      userId: newUser.id,
      email: newUser.email,
    });
  } catch (error: any) {
    logger.error({ error }, 'Erro ao criar login para profissional');
    return c.json({ error: error.message || 'Erro interno' }, 500);
  }
});

/**
 * DELETE /api/professionals/:id/revoke-login
 * Removes the Supabase Auth user linked to a professional
 */
app.delete('/:id/revoke-login', async (c) => {
  try {
    const professionalId = c.req.param('id');
    const db = getDb();

    const [professional] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, professionalId))
      .limit(1);

    if (!professional || !professional.userId) {
      return c.json({ error: 'Profissional não encontrado ou sem login' }, 404);
    }

    // Remover user_profile
    await db
      .delete(userProfiles)
      .where(eq(userProfiles.userId, professional.userId));

    // Remover user_id do profissional
    await db
      .update(professionals)
      .set({ userId: null, updatedAt: new Date() })
      .where(eq(professionals.id, professionalId));

    // Deletar usuário do Supabase Auth
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${professional.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      });
    }

    logger.info({ professionalId }, '🗑️ Login do profissional revogado');

    return c.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Erro ao revogar login do profissional');
    return c.json({ error: error.message || 'Erro interno' }, 500);
  }
});

export { app as professionalsRoutes };
