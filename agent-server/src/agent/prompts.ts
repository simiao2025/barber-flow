// ============================================================
// BARBEAR-FLOW: System prompts e templates de mensagem
// ============================================================

import type { SystemPromptContext, FollowUpType, FollowUpData, AppointmentDetails } from '../types/agent.js';

// ============================================================
// FUNÇÃO 1 — buildSystemPrompt
// ============================================================

export function buildSystemPrompt(context: SystemPromptContext): string {
  const {
    barbershopName,
    workingHours,
    servicesList,
    professionalsList,
    clientName,
    clientUpcomingAppointments,
    currentDatetime,
  } = context;

  // Renderiza lista de serviços
  const servicesText = servicesList
    .map((s) => `  - ${s.name}: R$${s.price.toFixed(2)} (${s.duration}min)`)
    .join('\n');

  // Renderiza lista de profissionais
  const profText = professionalsList
    .map((p) => `  - ${p.name}${p.specialties ? ` (${p.specialties.join(', ')})` : ''}`)
    .join('\n');

  // Renderiza agendamentos futuros do cliente
  const apptText = clientUpcomingAppointments
    ? clientUpcomingAppointments
        .map(
          (a) =>
            `  - ${a.date} às ${a.time}: ${a.service} com ${a.professional}`
        )
        .join('\n')
    : 'Nenhum agendamento futuro.';

  return `Você é o assistente virtual da ${barbershopName}, atendendo clientes via WhatsApp.

IDENTIDADE:
- Nome: Assistente da ${barbershopName}
- Canal: WhatsApp
- Objetivo: Ajudar clientes a agendar, reagendar e cancelar atendimentos, tirar dúvidas sobre serviços e preços, e oferecer uma experiência incrível.

TOM E ESTILO:
- Linguagem informal e amigável, como um atendente real de barbearia
- Mensagens curtas — máximo 3 linhas por resposta no WhatsApp
- Emojis com moderação (no máximo 1 por mensagem)
- Nunca use bullet points ou listas formatadas no WhatsApp
- Use linguagem natural, como se estivesse conversando por mensagem

HORÁRIO DE FUNCIONAMENTO:
${workingHours}

SERVIÇOS DISPONÍVEIS:
${servicesText}

PROFISSIONAIS:
${profText}

${clientName ? `CLIENTE ATUAL: ${clientName}` : ''}

PRÓXIMOS AGENDAMENTOS DO CLIENTE:
${apptText}

DATA/HORA ATUAL: ${currentDatetime}

CAPACIDADES:
- Verificar horários disponíveis para agendamento
- Criar novos agendamentos
- Reagendar ou alterar agendamentos existentes
- Cancelar agendamentos
- Listar serviços e preços
- Verificar próximos agendamentos do cliente
- Transferir para atendente humano quando necessário

REGRAS CRÍTICAS DE NEGÓCIO:
1. NUNCA invente horários — sempre use a tool check_availability antes de sugerir qualquer horário
2. Antes de criar agendamento, CONFIRME com o cliente: profissional, serviço, data, hora e valor total
3. Ao confirmar agendamento: seja entusiasmado ("Ótimo! Tá agendado! ✂️")
4. Se houver ambiguidade após 2 tentativas de esclarecimento: ofereça transferir para a equipe humana
5. Use o nome do cliente naturalmente, NÃO em todas as frases
6. Memorize preferências da sessão (profissional favorito, horário preferido)
7. Se o cliente pedir algo que você não pode fazer: seja honesto e ofereça transferência para humano
8. Não envie mensagens muito longas — se precisar dar muita informação, divida em 2-3 mensagens

EXEMPLO DE FLUXO DE AGENDAMENTO:
1. Cliente diz "quero agendar um corte"
2. Você pergunta qual profissional e que dia/horário
3. Usa check_availability para ver horários
4. Sugere 2-3 opções de horário
5. Cliente escolhe
6. Confirma: "Então fica: Corte Degradê com Carlos, terça 15/04 às 14h30, R$45. Posso fechar?"
7. Cliente confirma
8. Usa create_appointment
9. Responde: "Fechado! Tá agendado pra terça às 14h30 com o Carlos. Te mando lembrete antes! ✂️"`;
}

// ============================================================
// FUNÇÃO 2 — buildFollowUpMessage
// ============================================================

export function buildFollowUpMessage(
  type: FollowUpType,
  data: FollowUpData
): string {
  const { clientName, barbershopName = 'Barbearia' } = data;

  switch (type) {
    case 'reminder_24h':
      return `Ei ${clientName}! Passando pra lembrar que amanhã você tem horário na ${barbershopName} às ${data.appointmentTime}. Confirma aí? 👊`;

    case 'reminder_1h':
      return `${clientName}, seu horário é daqui 1h (${data.appointmentTime}) na ${barbershopName}. Te esperando! ✂️`;

    case 'post_service':
      return `Fala ${clientName}! Como ficou o corte/barba de hoje? De 1 a 5, qual nota você dá? Sua opinião é muito importante pra gente! 💈`;

    case 'reactivation_30d':
      return `Ei ${clientName}! Faz uns 30 dias que não te vemos por aqui. Bora dar uma renovada no visual? 😎`;

    case 'reactivation_60d':
      return `${clientName}, saudade! Temos novidades na ${barbershopName}. Que tal voltar e conferir? 🙌`;

    case 'reactivation_90d':
      return `Oi ${clientName}! Tudo certo por aí? Faz tempo que não te vemos e queremos saber se está tudo bem. Quando quiser voltar, é só chamar! 💙`;

    default:
      return `Olá ${clientName}! Mensagem da ${barbershopName}.`;
  }
}

// ============================================================
// FUNÇÃO 3 — buildHandoffMessage
// ============================================================

export function buildHandoffMessage(clientName?: string): string {
  return clientName
    ? `Beleza ${clientName}! Vou transferir você pra um dos nossos atendentes. Aguarda um pouquinho que já te respondem! 👊`
    : 'Entendi! Vou transferir você pra um dos nossos atendentes. Aguarda um pouquinho! 👊';
}

// ============================================================
// FUNÇÃO 4 — buildConfirmationMessage
// ============================================================

export function buildConfirmationMessage(
  appointment: AppointmentDetails
): string {
  const { clientName, professionalName, serviceName, date, time, totalPrice } =
    appointment;

  return `Ótimo ${clientName}! Tá tudo agendado! ✂️

📅 ${date} às ${time}
💈 ${professionalName}
✂️ ${serviceName}
💰 R$ ${totalPrice.toFixed(2)}

Te mando um lembrete antes. Qualquer coisa, é só chamar!`;
}

// ============================================================
// FUNÇÃO 5 — buildWelcomeBackMessage
// ============================================================

export function buildWelcomeBackMessage(
  clientName: string,
  barbershopName: string
): string {
  return `Ei ${clientName}! Quanto tempo! Bem de volta pra ${barbershopName}! Bora agendar um horário? ✂️`;
}

// ============================================================
// EXEMPLOS RENDERIZADOS (para referência e teste)
// ============================================================

/*
EXEMPLO 1 — System Prompt com dados fictícios:

const ctx: SystemPromptContext = {
  barbershopName: 'Barbearia Flow Studio',
  workingHours: 'Seg–Sex 9h–19h, Sáb 8h–17h',
  servicesList: [
    { name: 'Corte Degradê', price: 45, duration: 40 },
    { name: 'Barba Completa', price: 35, duration: 30 },
    { name: 'Combo Premium', price: 95, duration: 75 },
  ],
  professionalsList: [
    { name: 'Carlos "Mão de Tesoura"', specialties: ['Degradê', 'Social'] },
    { name: 'Rafael "Navalha de Ouro"', specialties: ['Barba', 'Combo'] },
  ],
  clientName: 'João Silva',
  clientUpcomingAppointments: [
    { date: '15/04/2025', time: '14:30', service: 'Corte Degradê', professional: 'Carlos' },
  ],
  currentDatetime: 'Terça-feira, 08/04/2025 às 14:32 (GMT-3)',
};

console.log(buildSystemPrompt(ctx));

EXEMPLO 2 — Follow-up reminder_24h:
console.log(buildFollowUpMessage('reminder_24h', {
  clientName: 'João Silva',
  barbershopName: 'Barbearia Flow Studio',
  appointmentTime: '14:30',
}));
// "Ei João Silva! Passando pra lembrar que amanhã você tem horário na Barbearia Flow Studio às 14:30. Confirma aí? 👊"

EXEMPLO 3 — Follow-up post_service:
console.log(buildFollowUpMessage('post_service', {
  clientName: 'Pedro Santos',
  barbershopName: 'Barbearia Flow Studio',
}));
// "Fala Pedro Santos! Como ficou o corte/barba de hoje? De 1 a 5, qual nota você dá? Sua opinião é muito importante pra gente! 💈"
*/
