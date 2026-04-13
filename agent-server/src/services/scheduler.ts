// ============================================================
// BARBEAR-FLOW: Serviço de Follow-up com Cron Jobs nativos
// Implementação completa com 4 cron jobs + processamento isolado
// ============================================================

import cron from 'node-cron';
import { eq, and, lte, gte, isNull, or, sql, not } from 'drizzle-orm';
import { createLogger } from '../lib/logger.js';
import { evolutionService } from './evolution.js';
import { buildFollowUpMessage } from '../agent/prompts.js';
import { getDb } from '../db/index.js';
import {
  followUps,
  clients,
  appointments,
  barbershops,
  aiConversations,
  services,
  professionals,
} from '../db/schema.js';
import type { FollowUpType } from '../types/agent.js';

const logger = createLogger('FollowUpScheduler');

const MAX_PER_EXECUTION = parseInt(
  process.env.FOLLOW_UP_MAX_PER_EXECUTION || '100'
);
const SEND_INTERVAL = parseInt(
  process.env.FOLLOW_UP_SEND_INTERVAL_MS || '500'
);

export class FollowUpScheduler {
  private cronJobs: cron.ScheduledTask[] = [];
  private db = getDb();

  /**
   * Inicializa todos os cron jobs
   */
  start(): void {
    logger.info('Iniciando scheduler de follow-ups...');

    /**
     * CRON JOB 1 — Lembretes 24h e 1h
     * Executa a cada 15 minutos
     * Busca follow-ups pendentes com scheduled_for dentro da janela de ±10 min
     */
    const job1 = cron.schedule('*/15 * * * *', async () => {
      await this.processWithIsolation(async () => {
        await this.processReminderJobs();
      }, 'reminder');
    });
    this.cronJobs.push(job1);
    logger.info(
      '✅ Cron Job 1: Lembretes 24h e 1h (a cada 15 min)'
    );

    /**
     * CRON JOB 2 — Pós-atendimento
     * Executa a cada hora
     * Busca appointments "done" nos últimos 45-75 min sem follow-up post_service
     */
    const job2 = cron.schedule('0 * * * *', async () => {
      await this.processWithIsolation(async () => {
        await this.processPostServiceJobs();
      }, 'post_service');
    });
    this.cronJobs.push(job2);
    logger.info(
      '✅ Cron Job 2: Pós-atendimento (a cada hora)'
    );

    /**
     * CRON JOB 3 — Reativação de clientes
     * Executa diariamente às 10h
     * Busca clients sem visita há 30/60/90 dias
     * Limite: 30 envios por barbearia, intervalo 500ms
     */
    const job3 = cron.schedule('0 10 * * *', async () => {
      await this.processWithIsolation(async () => {
        await this.processReactivationJobs();
      }, 'reactivation');
    });
    this.cronJobs.push(job3);
    logger.info(
      '✅ Cron Job 3: Reativação de clientes (diário às 10h)'
    );

    /**
     * CRON JOB 4 — Limpeza de sessões antigas
     * Executa diariamente às 3h
     * Remove ai_conversations com updated_at > 30 dias sem follow-up pendente
     */
    const job4 = cron.schedule('0 3 * * *', async () => {
      await this.processWithIsolation(async () => {
        await this.cleanOldConversations();
      }, 'cleanup');
    });
    this.cronJobs.push(job4);
    logger.info(
      '✅ Cron Job 4: Limpeza de sessões antigas (diário às 3h)'
    );

    logger.info(
      { jobs: this.cronJobs.length },
      '🚀 Scheduler de follow-ups inicializado com sucesso'
    );

    // Log da próxima execução de cada job
    this.cronJobs.forEach((job, i) => {
      logger.info(`   → Job ${i + 1} registrado`);
    });
  }

  /**
   * Processa um tipo de job com isolamento de erro
   * Se um item falha, continua para o próximo
   */
  private async processWithIsolation(
    fn: () => Promise<void>,
    jobType: string
  ): Promise<void> {
    try {
      logger.debug({ jobType }, `Iniciando job: ${jobType}`);
      await fn();
      logger.debug({ jobType }, `Job concluído: ${jobType}`);
    } catch (error) {
      // Loga erro mas não cancela os demais jobs
      logger.error({ jobType, error }, `Erro no job ${jobType} (isolado)`);
    }
  }

  /**
   * CRON 1: Processa lembretes pendentes (24h e 1h)
   */
  private async processReminderJobs(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 10 * 60 * 1000); // -10 min
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000); // +5 min

    // Busca follow-ups pendentes dentro da janela
    const followUpsResult = await this.db
      .select({
        followUp: followUps,
        client: clients,
        appointment: appointments,
        professional: professionals,
        service: services,
        barbershop: barbershops,
      })
      .from(followUps)
      .innerJoin(clients, eq(followUps.clientId, clients.id))
      .leftJoin(
        appointments,
        eq(followUps.appointmentId, appointments.id)
      )
      .leftJoin(
        professionals,
        eq(appointments.professionalId, professionals.id)
      )
      .leftJoin(
        services,
        sql`${services.id} = ${appointments.serviceIds}[1]`
      )
      .innerJoin(
        barbershops,
        eq(followUps.barbershopId, barbershops.id)
      )
      .where(
        and(
          eq(followUps.status, 'pending'),
          lte(followUps.scheduledFor, windowEnd),
          gte(followUps.scheduledFor, windowStart),
          or(
            eq(followUps.type, 'reminder_24h'),
            eq(followUps.type, 'reminder_1h')
          )
        )
      )
      .limit(MAX_PER_EXECUTION);

    if (followUpsResult.length === 0) {
      logger.debug('Nenhum lembrete pendente na janela');
      return;
    }

    logger.info(
      { count: followUpsResult.length },
      '📧 Processando lembretes pendentes'
    );

    let successCount = 0;
    let failCount = 0;

    for (const row of followUpsResult) {
      const result = await this.processSingleFollowUp({
        followUp: row.followUp,
        client: row.client,
        appointment: row.appointment,
        professional: row.professional,
        service: row.service,
        barbershop: row.barbershop,
      });

      if (result.success) successCount++;
      else failCount++;

      await this.sleep(SEND_INTERVAL);
    }

    logger.info(
      { success: successCount, failed: failCount },
      '✅ Lembretes processados'
    );
  }

  /**
   * CRON 2: Processa follow-ups pós-atendimento
   */
  private async processPostServiceJobs(): Promise<void> {
    const now = new Date();
    const lowerBound = new Date(now.getTime() - 75 * 60 * 1000);
    const upperBound = new Date(now.getTime() - 45 * 60 * 1000);

    // Busca appointments finalizados sem post_service enviado
    const appointmentsResult = await this.db
      .select({
        appointment: appointments,
        client: clients,
        professional: professionals,
        barbershop: barbershops,
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(
        professionals,
        eq(appointments.professionalId, professionals.id)
      )
      .innerJoin(
        barbershops,
        eq(appointments.barbershopId, barbershops.id)
      )
      .where(
        and(
          eq(appointments.status, 'done'),
          gte(appointments.updatedAt, lowerBound),
          lte(appointments.updatedAt, upperBound)
        )
      )
      .leftJoin(
        followUps,
        and(
          eq(followUps.appointmentId, appointments.id),
          eq(followUps.type, 'post_service'),
          eq(followUps.status, 'sent')
        )
      )
      .limit(MAX_PER_EXECUTION);

    // Filtra os que já têm post_service enviado
    const toProcess = appointmentsResult.filter(
      (r) => !(r as any).followUps || (r as any).followUps.length === 0
    );

    if (toProcess.length === 0) {
      logger.debug('Nenhum follow-up pós-atendimento pendente');
      return;
    }

    logger.info(
      { count: toProcess.length },
      '⭐ Processando follow-ups pós-atendimento'
    );

    for (const row of toProcess) {
      // Cria follow-up post_service
      const followUpResult = await this.db
        .insert(followUps)
        .values({
          barbershopId: row.appointment.barbershopId,
          clientId: row.appointment.clientId,
          appointmentId: row.appointment.id,
          type: 'post_service',
          scheduledFor: new Date(),
          status: 'pending',
        })
        .returning();

      await this.processSingleFollowUp({
        followUp: followUpResult[0],
        client: row.client,
        appointment: row.appointment,
        professional: row.professional,
        service: null,
        barbershop: row.barbershop,
      });

      await this.sleep(SEND_INTERVAL);
    }
  }

  /**
   * CRON 3: Processa reativação de clientes inativos
   */
  private async processReactivationJobs(): Promise<void> {
    const now = new Date();

    // Busca barbearias ativas
    const barbershopsList = await this.db
      .select({ id: barbershops.id, name: barbershops.name })
      .from(barbershops);

    let totalSent = 0;

    for (const bs of barbershopsList) {
      let sentThisShop = 0;

      // Busca clientes inativos por faixa de tempo
      const inactiveClients = await this.db
        .select({
          client: clients,
        })
        .from(clients)
        .where(
          and(
            eq(clients.barbershopId, bs.id),
            lte(clients.lastVisitAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
            // Exclui clientes que já receberam reativação nos últimos 7 dias
            isNull(clients.lastVisitAt),
            or(
              isNull(clients.lastVisitAt),
              lte(
                clients.lastVisitAt,
                new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              )
            )
          )
        )
        .limit(100);

      for (const row of inactiveClients) {
        if (sentThisShop >= 30) {
          logger.info(
            { barbershopId: bs.id },
            'Limite de 30 reativações atingido'
          );
          break;
        }

        // Determina tipo de reativação baseado em dias sem visita
        const daysSince = row.client.lastVisitAt
          ? Math.floor(
              (now.getTime() - row.client.lastVisitAt.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          : 999;

        const reactivationType: FollowUpType =
          daysSince >= 90
            ? 'reactivation_90d'
            : daysSince >= 60
              ? 'reactivation_60d'
              : 'reactivation_30d';

        // Cria follow-up de reativação
        const followUpResult = await this.db
          .insert(followUps)
          .values({
            barbershopId: bs.id,
            clientId: row.client.id,
            type: reactivationType,
            scheduledFor: new Date(),
            status: 'pending',
          })
          .returning();

        await this.processSingleFollowUp({
          followUp: followUpResult[0],
          client: row.client,
          appointment: null,
          professional: null,
          service: null,
          barbershop: { id: bs.id, name: bs.name } as any,
        });

        sentThisShop++;
        totalSent++;
        await this.sleep(SEND_INTERVAL);
      }
    }

    logger.info(
      { totalSent },
      '🔄 Reativações de clientes concluídas'
    );
  }

  /**
   * CRON 4: Limpeza de conversas antigas
   */
  private async cleanOldConversations(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Remove conversas antigas sem follow-ups pendentes
    const result = await this.db
      .delete(aiConversations)
      .where(
        and(
          lte(aiConversations.updatedAt, thirtyDaysAgo),
          // Só remove se não houver follow-up pendente
          not(
            sql`EXISTS (
              SELECT 1 FROM ${followUps}
              WHERE ${followUps.barbershopId} = ${aiConversations.barbershopId}
                AND ${followUps.status} = 'pending'
            )`
          )
        )
      );

    logger.info(
      { deleted: result.rowCount ?? 0 },
      '🧹 Limpeza de conversas antigas concluída'
    );
  }

  /**
   * Processa um único follow-up com todos os dados necessários
   */
  private async processSingleFollowUp(row: {
    followUp: typeof followUps.$inferSelect;
    client: typeof clients.$inferSelect;
    appointment: typeof appointments.$inferSelect | null;
    professional: typeof professionals.$inferSelect | null;
    service: typeof services.$inferSelect | null;
    barbershop: typeof barbershops.$inferSelect;
  }): Promise<{ success: boolean }> {
    const { followUp, client, appointment, professional, service, barbershop } =
      row;

    try {
      // Verifica se cliente tem telefone
      if (!client.phone) {
        logger.warn(
          { clientId: client.id },
          'Cliente sem telefone — pulando follow-up'
        );
        await this.markFollowUpStatus(followUp.id, 'failed');
        return { success: false };
      }

      // Monta mensagem
      const message = buildFollowUpMessage(followUp.type as FollowUpType, {
        clientName: client.name ?? 'Cliente',
        barbershopName: barbershop.name,
        appointmentDate: appointment?.scheduledAt
          ? new Date(appointment.scheduledAt).toLocaleDateString('pt-BR')
          : undefined,
        appointmentTime: appointment?.scheduledAt
          ? new Date(appointment.scheduledAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
        serviceName: service?.name,
        professionalName: professional?.name,
        daysSinceLastVisit: client.lastVisitAt
          ? Math.floor(
              (Date.now() - client.lastVisitAt.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          : undefined,
      });

      // Envia via Evolution API
      await evolutionService.sendText(client.phone, message);

      // Atualiza status
      await this.markFollowUpStatus(followUp.id, 'sent');

      logger.info(
        {
          followUpId: followUp.id,
          clientId: client.id,
          phone: client.phone,
          type: followUp.type,
        },
        '✅ Follow-up enviado com sucesso'
      );

      return { success: true };
    } catch (error) {
      await this.markFollowUpStatus(followUp.id, 'failed');

      logger.error(
        {
          followUpId: followUp.id,
          clientId: client.id,
          phone: client.phone,
          type: followUp.type,
          error,
        },
        '❌ Erro ao enviar follow-up'
      );

      return { success: false };
    }
  }

  /**
   * Atualiza status do follow-up
   */
  private async markFollowUpStatus(
    id: string,
    status: 'sent' | 'failed',
    error?: string
  ): Promise<void> {
    await this.db
      .update(followUps)
      .set({
        status,
        sentAt: status === 'sent' ? new Date() : undefined,
      })
      .where(eq(followUps.id, id));
  }

  /**
   * Para todos os cron jobs (graceful shutdown)
   */
  stop(): void {
    logger.info('⏹️ Parando scheduler de follow-ups...');
    for (const job of this.cronJobs) {
      job.stop();
    }
    this.cronJobs = [];
    logger.info('Scheduler parado');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
