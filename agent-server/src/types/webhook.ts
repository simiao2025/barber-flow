// ============================================================
// BARBEAR-FLOW: Tipos do payload do webhook da Evolution API
// ============================================================

export interface EvolutionWebhookPayload {
  event: string;
  instance: EvolutionInstance;
  data: EvolutionMessage;
}

export interface EvolutionInstance {
  instanceName: string;
  instanceId: string;
}

export interface EvolutionMessage {
  id: string;
  key: MessageKey;
  pushName?: string;
  messageType: MessageType;
  timestamp?: number;
  source?: string;
  message?: MessageContent;
  presence?: PresenceData;
}

export interface MessageKey {
  remoteJid: string;  // número do telefone: 5511999999999@s.whatsapp.net
  fromMe: boolean;
  id: string;
  participant?: string;
}

export type MessageType =
  | 'conversation'
  | 'audioMessage'
  | 'videoMessage'
  | 'imageMessage'
  | 'documentMessage'
  | 'extendedTextMessage'
  | 'reactionMessage'
  | 'contactsArrayMessage'
  | 'locationMessage'
  | 'listMessage'
  | 'listResponseMessage'
  | 'buttonsResponseMessage';

export interface MessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text: string;
  };
  audioMessage?: {
    url: string;
    mimetype: string;
    seconds?: number;
  };
  imageMessage?: {
    url: string;
    mimetype: string;
    caption?: string;
  };
  videoMessage?: {
    url: string;
    mimetype: string;
    caption?: string;
    seconds?: number;
  };
  documentMessage?: {
    url: string;
    mimetype: string;
    fileName: string;
    caption?: string;
  };
  reactionMessage?: {
    key: MessageKey;
    text: string;
  };
}

export interface PresenceData {
  state: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused';
  participant?: string;
}

/**
 * Extrai o número de telefone do remoteJid
 */
export function extractPhoneFromRemoteJid(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

/**
 * Verifica se a mensagem é de texto
 */
export function isTextMessage(message: EvolutionMessage): boolean {
  return (
    message.messageType === 'conversation' ||
    message.messageType === 'extendedTextMessage'
  );
}

/**
 * Verifica se a mensagem é de áudio
 */
export function isAudioMessage(message: EvolutionMessage): boolean {
  return message.messageType === 'audioMessage';
}

/**
 * Extrai o texto da mensagem (se for texto)
 */
export function extractTextMessage(message: EvolutionMessage): string {
  if (message.messageType === 'conversation') {
    return message.message?.conversation ?? '';
  }
  if (message.messageType === 'extendedTextMessage') {
    return message.message?.extendedTextMessage?.text ?? '';
  }
  return '';
}
