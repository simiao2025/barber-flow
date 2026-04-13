// ============================================================
// BARBEAR-FLOW: Definição das tools para o LLM (Anthropic)
// ============================================================

import type { Tool } from '../types/agent.js';

/**
 * Definição de todas as tools disponíveis para o agente
 */
export const AGENT_TOOLS: Tool[] = [
  {
    name: 'check_availability',
    description: 'Verifica horários disponíveis para agendamento em uma data específica',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data no formato YYYY-MM-DD (ex: 2025-04-15)',
        },
        service_id: {
          type: 'string',
          description: 'ID do serviço desejado (opcional)',
        },
        professional_id: {
          type: 'string',
          description: 'ID do profissional preferido (opcional)',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Cria um novo agendamento confirmado. Sempre confirme todos os detalhes com o cliente antes de usar esta tool.',
    input_schema: {
      type: 'object',
      properties: {
        professional_id: {
          type: 'string',
          description: 'ID do profissional que vai atender',
        },
        service_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de IDs dos serviços agendados',
        },
        scheduled_at: {
          type: 'string',
          description: 'Data e hora no formato ISO 8601 (ex: 2025-04-15T14:30:00-03:00)',
        },
        client_name: {
          type: 'string',
          description: 'Nome do cliente',
        },
      },
      required: ['professional_id', 'service_ids', 'scheduled_at', 'client_name'],
    },
  },
  {
    name: 'update_appointment',
    description: 'Reagenda ou altera um agendamento existente',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'ID do agendamento a ser alterado',
        },
        scheduled_at: {
          type: 'string',
          description: 'Nova data e hora (ISO 8601)',
        },
        professional_id: {
          type: 'string',
          description: 'Novo profissional',
        },
        service_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Novos serviços',
        },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela um agendamento existente. Peça motivo do cancelamento.',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'ID do agendamento a ser cancelado',
        },
        reason: {
          type: 'string',
          description: 'Motivo do cancelamento (opcional)',
        },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'get_client_appointments',
    description: 'Busca os próximos agendamentos do cliente atual',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de agendamentos (padrão: 5)',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_services',
    description: 'Lista todos os serviços disponíveis com preços e duração',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'request_human_handoff',
    description: 'Transfere o atendimento para um humano quando o agente não consegue resolver ou quando o cliente pede',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo da transferência para o humano',
        },
      },
      required: ['reason'],
    },
  },
];
