// ============================================================
// BARBEAR-FLOW: Executor de tools
// ============================================================

import { z } from 'zod';
import { createLogger } from '../lib/logger.js';
import { ToolError, BusinessError } from '../lib/errors.js';
import { repo } from '../services/supabase.js';
import { agentSessionManager } from './session.js';
import type { ExecutorContext } from '../types/agent.js';

const logger = createLogger('ToolExecutor');

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================

const checkAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
  service_id: z.string().uuid().optional(),
  professional_id: z.string().uuid().optional(),
});

const createAppointmentSchema = z.object({
  professional_id: z.string().uuid(),
  service_ids: z.array(z.string().uuid()).min(1),
  scheduled_at: z.string().datetime(),
  client_name: z.string().min(2),
});

const updateAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  scheduled_at: z.string().datetime().optional(),
  professional_id: z.string().uuid().optional(),
  service_ids: z.array(z.string().uuid()).optional(),
});

const cancelAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  reason: z.string().optional(),
});

const getClientAppointmentsSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
});

const requestHumanHandoffSchema = z.object({
  reason: z.string().min(10),
});

// ============================================================
// TOOL EXECUTOR
// ============================================================

export async function executeTool(
  toolName: string,
  toolInput: unknown,
  context: ExecutorContext
): Promise<string> {
  const startTime = Date.now();
  logger.info({ toolName, toolInput }, 'Executando tool');

  try {
    let result: string;

    switch (toolName) {
      case 'check_availability':
        result = await executeCheckAvailability(toolInput, context);
        break;

      case 'create_appointment':
        result = await executeCreateAppointment(toolInput, context);
        break;

      case 'update_appointment':
        result = await executeUpdateAppointment(toolInput, context);
        break;

      case 'cancel_appointment':
        result = await executeCancelAppointment(toolInput, context);
        break;

      case 'get_client_appointments':
        result = await executeGetClientAppointments(toolInput, context);
        break;

      case 'list_services':
        result = await executeListServices(toolInput, context);
        break;

      case 'request_human_handoff':
        result = await executeRequestHumanHandoff(toolInput, context);
        break;

      default:
        throw new ToolError(`Tool desconhecida: ${toolName}`, {
          toolName,
          input: toolInput,
        });
    }

    const duration = Date.now() - startTime;
    logger.debug({ toolName, duration }, 'Tool executada com sucesso');

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({ toolName, duration, error }, 'Erro ao executar tool');

    if (error instanceof ToolError || error instanceof BusinessError) {
      throw error;
    }

    throw new ToolError(
      `Erro ao executar ${toolName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      {
        toolName,
        input: toolInput,
      }
    );
  }
}

// ============================================================
// IMPLEMENTAÇÃO DAS TOOLS
// ============================================================

async function executeCheckAvailability(
  input: unknown,
  context: ExecutorContext
): Promise<string> {
  const parsed = checkAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolError('Dados inválidos para check_availability', {
      toolName: 'check_availability',
      input,
    });
  }

  const { date, service_id, professional_id } = parsed.data;
  const slots = await repo.getAvailableSlots(
    context.session.barbershopId,
    date,
    service_id
  );

  if (slots.length === 0) {
    return `Nenhum horário disponível para ${date}. Tente outra data.`;
  }

  // Agrupa por profissional e formata para o LLM
  const byProf: Record<string, typeof slots> = {};
  for (const slot of slots) {
    if (!byProf[slot.professional_id]) {
      byProf[slot.professional_id] = [];
    }
    byProf[slot.professional_id].push(slot);
  }

  let result = `Horários disponíveis para ${date}:\n`;
  for (const [profId, profSlots] of Object.entries(byProf)) {
    const profName = profSlots[0].professional_name;
    result += `\n${profName}: `;
    result += profSlots
      .slice(0, 10)
      .map((s) => new Date(s.available_slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .join(', ');
  }

  return result;
}

async function executeCreateAppointment(
  input: unknown,
  context: ExecutorContext
): Promise<string> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolError('Dados inválidos para create_appointment', {
      toolName: 'create_appointment',
      input,
    });
  }

  const { professional_id, service_ids, scheduled_at, client_name } = parsed.data;

  // Busca ou cria cliente
  const client = await repo.getOrCreateClient(
    context.session.barbershopId,
    context.session.phone,
    client_name
  );

  // Busca serviços para calcular duração e preço
  let totalDuration = 0;
  let totalPrice = 0;
  for (const serviceId of service_ids) {
    const service = await repo.getServiceById(serviceId);
    if (service) {
      totalDuration += service.durationMin;
      totalPrice += parseFloat(service.price.toString());
    }
  }

  if (totalDuration === 0) {
    totalDuration = 30; // Default
  }

  // Cria agendamento
  const appointment = await repo.createAppointment({
    barbershopId: context.session.barbershopId,
    clientId: client.id,
    professionalId: professional_id,
    serviceIds: service_ids,
    scheduledAt: new Date(scheduled_at),
    durationMin: totalDuration,
    totalPrice,
    source: 'whatsapp',
  });

  // Agenda follow-ups
  await repo.scheduleFollowUps(appointment.id);

  // Atualiza sessão
  context.session.clientId = client.id;
  context.session.clientName = client.name;
  await agentSessionManager.saveSession(context.session);

  return `Agendamento criado com sucesso! ID: ${appointment.id}. Cliente: ${client.name}, Data: ${new Date(scheduled_at).toLocaleString('pt-BR')}, Valor: R$ ${totalPrice.toFixed(2)}.`;
}

async function executeUpdateAppointment(
  input: unknown,
  context: ExecutorContext
): Promise<string> {
  const parsed = updateAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolError('Dados inválidos para update_appointment', {
      toolName: 'update_appointment',
      input,
    });
  }

  const { appointment_id, scheduled_at, professional_id, service_ids } = parsed.data;

  const updateData: any = {};
  if (scheduled_at) updateData.scheduledAt = new Date(scheduled_at);
  if (professional_id) updateData.professionalId = professional_id;
  if (service_ids) updateData.serviceIds = service_ids;

  const appointment = await repo.updateAppointment(appointment_id, updateData);

  return `Agendamento ${appointment_id} atualizado com sucesso. Novo horário: ${new Date(appointment.scheduledAt).toLocaleString('pt-BR')}.`;
}

async function executeCancelAppointment(
  input: unknown,
  context: ExecutorContext
): Promise<string> {
  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolError('Dados inválidos para cancel_appointment', {
      toolName: 'cancel_appointment',
      input,
    });
  }

  const { appointment_id, reason } = parsed.data;
  await repo.cancelAppointment(appointment_id, reason);

  return `Agendamento ${appointment_id} cancelado.${reason ? ' Motivo: ' + reason : ''}`;
}

async function executeGetClientAppointments(
  input: unknown,
  context: ExecutorContext
): Promise<string> {
  const parsed = getClientAppointmentsSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolError('Dados inválidos para get_client_appointments', {
      toolName: 'get_client_appointments',
      input,
    });
  }

  if (!context.session.clientId) {
    return 'Cliente não identificado. Preciso do nome do cliente primeiro.';
  }

  const appointments = await repo.getClientAppointments(
    context.session.clientId,
    parsed.data.limit
  );

  if (appointments.length === 0) {
    return 'Você não tem agendamentos futuros.';
  }

  let result = 'Seus próximos agendamentos:\n';
  for (const appt of appointments) {
    const date = new Date(appt.scheduledAt);
    result += `- ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Status: ${appt.status}\n`;
  }

  return result;
}

async function executeListServices(
  _input: unknown,
  context: ExecutorContext
): Promise<string> {
  const servicesList = await repo.getServices(context.session.barbershopId);

  if (servicesList.length === 0) {
    return 'Nenhum serviço disponível no momento.';
  }

  let result = 'Nossos serviços:\n';
  for (const s of servicesList) {
    result += `- ${s.name}: R$ ${parseFloat(s.price.toString()).toFixed(2)} (${s.durationMin}min)\n`;
  }

  return result;
}

async function executeRequestHumanHandoff(
  input: unknown,
  context: ExecutorContext
): Promise<string> {
  const parsed = requestHumanHandoffSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolError('Dados inválidos para request_human_handoff', {
      toolName: 'request_human_handoff',
      input,
    });
  }

  // Marca sessão como esperando humano
  context.session.waitingHuman = true;
  await agentSessionManager.saveSession(context.session);

  logger.info(
    { phone: context.session.phone, reason: parsed.data.reason },
    'Transferência para humano solicitada'
  );

  return 'TRANSFERIDO_PARA_HUMANO: O atendimento foi transferido para um agente humano. Motivo: ' + parsed.data.reason;
}
