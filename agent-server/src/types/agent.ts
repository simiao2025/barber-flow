// ============================================================
// BARBEAR-FLOW: Tipos internos do agente
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

/**
 * Sessão do agente no Redis
 */
export interface AgentSession {
  phone: string;
  barbershopId: string;
  clientId?: string;
  clientName?: string;
  messages: Anthropic.MessageParam[];
  preferredProfessionalId?: string;
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  lastServiceId?: string;
  waitingHuman: boolean;
  manualMode: boolean;
  updatedAt: number;
}

/**
 * Definição de uma tool para o LLM (formato Anthropic)
 */
export type Tool = Anthropic.Tool;

/**
 * Resposta do LLM
 */
export interface LLMResponse {
  text: string;
  toolCall?: {
    name: string;
    input: Record<string, unknown>;
    toolUseId: string;
  };
  stopReason: 'tool_use' | 'end_turn' | 'max_tokens' | 'stop_sequence';
  inputTokens: number;
  outputTokens: number;
}

/**
 * Contexto para execução de uma tool
 */
export interface ExecutorContext {
  session: AgentSession;
  // repo: BarberShopRepository (definido em supabase.ts para evitar import circular)
  repo: any;
  // evolution: EvolutionService (definido em evolution.ts)
  evolution: any;
}

/**
 * Conteúdo de mensagem da sessão (pode ser texto ou tool result)
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_result'; tool_use_id: string; content: string };

/**
 * Mensagem no formato da sessão
 */
export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

/**
 * Dados para montagem do system prompt
 */
export interface SystemPromptContext {
  barbershopName: string;
  workingHours: string;
  servicesList: {
    name: string;
    price: number;
    duration: number;
    category?: string;
  }[];
  professionalsList: {
    name: string;
    specialties?: string[];
  }[];
  clientName?: string;
  clientUpcomingAppointments?: {
    date: string;
    time: string;
    service: string;
    professional: string;
  }[];
  currentDatetime: string;
}

/**
 * Detalhes de um agendamento
 */
export interface AppointmentDetails {
  id: string;
  clientName: string;
  professionalName: string;
  serviceName: string;
  date: string;
  time: string;
  totalPrice: number;
  status: string;
}

/**
 * Tipos de follow-up
 */
export type FollowUpType =
  | 'reminder_24h'
  | 'reminder_1h'
  | 'post_service'
  | 'reactivation_30d'
  | 'reactivation_60d'
  | 'reactivation_90d';

/**
 * Dados para mensagem de follow-up
 */
export interface FollowUpData {
  clientName: string;
  barbershopName: string;
  appointmentDate?: string;
  appointmentTime?: string;
  serviceName?: string;
  professionalName?: string;
  daysSinceLastVisit?: number;
}
