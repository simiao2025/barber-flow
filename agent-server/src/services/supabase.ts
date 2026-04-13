// ============================================================
// BARBEAR-FLOW: Repository - Queries de negócio com Drizzle ORM
// ============================================================

import { eq, and, gt, gte, lte, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import {
  barbershops,
  professionals,
  services,
  clients,
  appointments,
  products,
  financialTransactions,
  aiConversations,
  followUps,
} from '../db/schema.js';
import type {
  Barbershop,
  Professional,
  Service,
  Client,
  Appointment,
  Product,
  FinancialTransaction,
  FollowUp,
  AvailableSlot,
} from '../db/schema.js';
import { createLogger } from '../lib/logger.js';
import { BusinessError, ToolError } from '../lib/errors.js';

const logger = createLogger('BarberShopRepository');

// ============================================================
// DTOs
// ============================================================

export interface CreateAppointmentDTO {
  barbershopId: string;
  clientId: string;
  professionalId: string;
  serviceIds: string[];
  scheduledAt: Date;
  durationMin: number;
  totalPrice: number;
  source: 'whatsapp' | 'manual' | 'app';
  notes?: string;
}

export interface UpdateAppointmentDTO {
  scheduledAt?: Date;
  professionalId?: string;
  serviceIds?: string[];
  status?: 'pending' | 'confirmed' | 'done' | 'cancelled' | 'no_show';
  notes?: string;
}

export interface SaveConversationDTO {
  barbershopId: string;
  clientId?: string;
  phone: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  intentLast?: string;
  followUpAt?: Date;
}

// ============================================================
// Repository Class
// ============================================================

export class BarberShopRepository {
  private db = getDb();

  // ============================================================
  // BARBERSHOPS
  // ============================================================

  /**
   * Busca barbearia pelo nome da instância Evolution API
   */
  async getBarbershopByInstance(instanceName: string): Promise<Barbershop> {
    const result = await this.db
      .select()
      .from(barbershops)
      .where(
        sql`LOWER(${barbershops.whatsappNumber}) LIKE '%' || LOWER(${instanceName}) || '%'`
      )
      .limit(1);

    if (result.length === 0) {
      throw new BusinessError(
        `Barbearia não encontrada para instância: ${instanceName}`,
        { code: 'BARBERSHOP_NOT_FOUND' }
      );
    }

    return result[0];
  }

  /**
   * Busca barbearia por ID
   */
  async getBarbershopById(id: string): Promise<Barbershop | null> {
    const result = await this.db
      .select()
      .from(barbershops)
      .where(eq(barbershops.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  // ============================================================
  // CLIENTS
  // ============================================================

  /**
   * Busca ou cria cliente pelo telefone
   */
  async getOrCreateClient(
    barbershopId: string,
    phone: string,
    name?: string
  ): Promise<Client> {
    // Tenta buscar cliente existente
    const existing = await this.db
      .select()
      .from(clients)
      .where(
        and(eq(clients.barbershopId, barbershopId), eq(clients.phone, phone))
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Cria novo cliente
    const result = await this.db
      .insert(clients)
      .values({
        barbershopId,
        name: name || 'Cliente',
        phone,
        createdBy: 'whatsapp',
      })
      .returning();

    logger.info({ clientId: result[0].id, phone }, 'Novo cliente criado');
    return result[0];
  }

  /**
   * Busca agendamentos futuros de um cliente
   */
  async getClientAppointments(
    clientId: string,
    limit: number = 5
  ): Promise<Appointment[]> {
    return this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          inArray(appointments.status, ['pending', 'confirmed']),
          gt(appointments.scheduledAt, new Date())
        )
      )
      .orderBy(appointments.scheduledAt)
      .limit(limit);
  }

  // ============================================================
  // SERVICES & PROFESSIONALS
  // ============================================================

  /**
   * Lista todos os serviços ativos de uma barbearia
   */
  async getServices(barbershopId: string): Promise<Service[]> {
    return this.db
      .select()
      .from(services)
      .where(
        and(eq(services.barbershopId, barbershopId), eq(services.isActive, true))
      )
      .orderBy(services.category, services.name);
  }

  /**
   * Lista todos os profissionais ativos de uma barbearia
   */
  async getProfessionals(barbershopId: string): Promise<Professional[]> {
    return this.db
      .select()
      .from(professionals)
      .where(
        and(
          eq(professionals.barbershopId, barbershopId),
          eq(professionals.isActive, true)
        )
      )
      .orderBy(professionals.name);
  }

  /**
   * Busca serviço por ID
   */
  async getServiceById(id: string): Promise<Service | null> {
    const result = await this.db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Busca profissional por ID
   */
  async getProfessionalById(id: string): Promise<Professional | null> {
    const result = await this.db
      .select()
      .from(professionals)
      .where(eq(professionals.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  // ============================================================
  // APPOINTMENTS
  // ============================================================

  /**
   * Busca horários disponíveis usando função SQL do banco
   */
  async getAvailableSlots(
    barbershopId: string,
    date: string, // YYYY-MM-DD
    serviceId?: string
  ): Promise<AvailableSlot[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM get_available_slots(
        ${barbershopId}::uuid,
        ${date}::date,
        ${serviceId || null}::uuid
      )
    `);

    return (result as any).rows || [];
  }

  /**
   * Verifica disponibilidade de profissional em horário específico
   */
  async checkAvailability(
    professionalId: string,
    dateTime: Date,
    durationMin: number
  ): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT check_availability(
        ${professionalId}::uuid,
        ${dateTime}::timestamptz,
        ${durationMin}::integer
      ) as available
    `);

    return (result as any).rows?.[0]?.available ?? false;
  }

  /**
   * Cria novo agendamento
   */
  async createAppointment(
    data: CreateAppointmentDTO
  ): Promise<Appointment> {
    // Verifica disponibilidade antes de criar
    const isAvailable = await this.checkAvailability(
      data.professionalId,
      data.scheduledAt,
      data.durationMin
    );

    if (!isAvailable) {
      throw new BusinessError(
        'Profissional não está disponível neste horário',
        { code: 'SLOT_UNAVAILABLE' }
      );
    }

    const result = await this.db
      .insert(appointments)
      .values({
        barbershopId: data.barbershopId,
        clientId: data.clientId,
        professionalId: data.professionalId,
        serviceIds: data.serviceIds,
        scheduledAt: data.scheduledAt,
        durationMin: data.durationMin,
        status: 'confirmed',
        totalPrice: String(data.totalPrice),
        source: data.source,
        notes: data.notes,
      })
      .returning();

    logger.info(
      {
        appointmentId: result[0].id,
        clientId: data.clientId,
        scheduledAt: data.scheduledAt,
      },
      'Agendamento criado com sucesso'
    );

    return result[0];
  }

  /**
   * Atualiza agendamento existente
   */
  async updateAppointment(
    id: string,
    data: UpdateAppointmentDTO
  ): Promise<Appointment> {
    const updateData: Partial<typeof appointments.$inferInsert> = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();

    if (result.length === 0) {
      throw new ToolError('Agendamento não encontrado', {
        toolName: 'update_appointment',
        input: { id },
      });
    }

    logger.info({ appointmentId: id }, 'Agendamento atualizado');
    return result[0];
  }

  /**
   * Cancela agendamento
   */
  async cancelAppointment(id: string, reason?: string): Promise<void> {
    await this.db
      .update(appointments)
      .set({
        status: 'cancelled',
        notes: sql`CASE WHEN ${appointments.notes} IS NOT NULL THEN ${appointments.notes} || ' | Cancelado: ' || ${reason} ELSE 'Cancelado: ' || ${reason} END`,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id));

    logger.info({ appointmentId: id, reason }, 'Agendamento cancelado');
  }

  // ============================================================
  // CONVERSATIONS
  // ============================================================

  /**
   * Salva conversa no banco
   */
  async saveConversation(data: SaveConversationDTO): Promise<void> {
    // Busca conversa existente por phone
    const existing = await this.db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.barbershopId, data.barbershopId),
          eq(aiConversations.phone, data.phone)
        )
      )
      .limit(1);

    const messagesJson = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    if (existing.length > 0) {
      // Atualiza conversa existente
      await this.db
        .update(aiConversations)
        .set({
          clientId: data.clientId ?? existing[0].clientId,
          messages: messagesJson as any,
          intentLast: (data.intentLast as any) ?? existing[0].intentLast,
          followUpAt: data.followUpAt ?? existing[0].followUpAt,
          updatedAt: new Date(),
        })
        .where(eq(aiConversations.id, existing[0].id));
    } else {
      // Cria nova conversa
      await this.db.insert(aiConversations).values({
        barbershopId: data.barbershopId,
        clientId: data.clientId,
        phone: data.phone,
        messages: messagesJson as any,
        intentLast: data.intentLast as any,
        followUpAt: data.followUpAt,
      });
    }
  }

  // ============================================================
  // FOLLOW-UPS
  // ============================================================

  /**
   * Agenda follow-ups para um agendamento
   */
  async scheduleFollowUps(appointmentId: string): Promise<void> {
    // Busca dados do agendamento
    const appt = await this.db
      .select({
        barbershopId: appointments.barbershopId,
        clientId: appointments.clientId,
        scheduledAt: appointments.scheduledAt,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (appt.length === 0) return;

    const { barbershopId, clientId, scheduledAt } = appt[0];

    // Agenda lembrete 24h antes
    await this.db.insert(followUps).values({
      barbershopId,
      clientId,
      appointmentId,
      type: 'reminder_24h',
      scheduledFor: new Date(
        new Date(scheduledAt).getTime() - 24 * 60 * 60 * 1000
      ),
      status: 'pending',
    });

    // Agenda lembrete 1h antes
    await this.db.insert(followUps).values({
      barbershopId,
      clientId,
      appointmentId,
      type: 'reminder_1h',
      scheduledFor: new Date(
        new Date(scheduledAt).getTime() - 1 * 60 * 60 * 1000
      ),
      status: 'pending',
    });

    logger.info({ appointmentId }, 'Follow-ups agendados');
  }

  /**
   * Busca follow-ups pendentes para envio
   */
  async getPendingFollowUps(
    barbershopId?: string,
    maxCount: number = 100
  ): Promise<(FollowUp & { client: Client; appointment: Appointment | null })[]> {
    const query = this.db
      .select({
        followUp: followUps,
        client: clients,
        appointment: appointments,
      })
      .from(followUps)
      .innerJoin(clients, eq(followUps.clientId, clients.id))
      .leftJoin(
        appointments,
        eq(followUps.appointmentId, appointments.id)
      )
      .where(
        and(
          eq(followUps.status, 'pending'),
          lte(followUps.scheduledFor, new Date()),
          barbershopId
            ? eq(followUps.barbershopId, barbershopId)
            : undefined
        )
      )
      .orderBy(followUps.scheduledFor)
      .limit(maxCount);

    const results = await query;

    return results.map((r) => ({
      ...r.followUp,
      client: r.client,
      appointment: r.appointment,
    }));
  }

  /**
   * Atualiza status de follow-up
   */
  async updateFollowUpStatus(
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

  // ============================================================
  // PRODUCTS
  // ============================================================

  /**
   * Lista produtos ativos de uma barbearia
   */
  async getProducts(barbershopId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.barbershopId, barbershopId),
          eq(products.isActive, true)
        )
      )
      .orderBy(products.name);
  }

  /**
   * Busca produtos com estoque crítico
   */
  async getLowStockProducts(barbershopId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.barbershopId, barbershopId),
          lte(products.stockQty, products.stockMin),
          eq(products.isActive, true)
        )
      )
      .orderBy(products.stockQty);
  }

  // ============================================================
  // FINANCIAL
  // ============================================================

  /**
   * Cria transação financeira
   */
  async createFinancialTransaction(
    data: Omit<typeof financialTransactions.$inferInsert, 'id' | 'createdAt'>
  ): Promise<FinancialTransaction> {
    const result = await this.db
      .insert(financialTransactions)
      .values(data)
      .returning();

    return result[0];
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * Busca dados do dashboard de hoje via função SQL
   */
  async getDashboardToday(barbershopId: string): Promise<any> {
    const result = await this.db.execute(sql`
      SELECT get_dashboard_today(${barbershopId}::uuid) as dashboard
    `);

    return (result as any).rows?.[0]?.dashboard ?? null;
  }
}

// Singleton
export const repo = new BarberShopRepository();
