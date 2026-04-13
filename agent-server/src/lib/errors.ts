// ============================================================
// BARBEAR-FLOW: Classes de erro customizadas
// ============================================================

/**
 * Classe base para todos os erros do agente
 */
export class AgentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AgentError';
    this.code = options.code || 'AGENT_ERROR';
    this.statusCode = options.statusCode || 500;
    this.context = options.context;

    // Manter stack trace correta
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Erros relacionados a ferramentas (tools) do agente
 */
export class ToolError extends AgentError {
  constructor(
    message: string,
    options: {
      toolName?: string;
      input?: unknown;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: 'TOOL_ERROR',
      statusCode: 400,
      context: {
        toolName: options.toolName,
        input: options.input,
        ...options.context,
      },
    });
    this.name = 'ToolError';
  }
}

/**
 * Erros relacionados ao LLM (Anthropic)
 */
export class LLMError extends AgentError {
  constructor(
    message: string,
    options: {
      model?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'LLM_ERROR',
      statusCode: 500,
      context: {
        model: options.model,
        ...options.context,
      },
      cause: options.cause,
    });
    this.name = 'LLMError';
  }
}

/**
 * Erros relacionados à Evolution API
 */
export class EvolutionAPIError extends AgentError {
  constructor(
    message: string,
    options: {
      endpoint?: string;
      statusCode?: number;
      response?: unknown;
    } = {}
  ) {
    super(message, {
      code: 'EVOLUTION_API_ERROR',
      statusCode: options.statusCode || 502,
      context: {
        endpoint: options.endpoint,
        response: options.response,
      },
    });
    this.name = 'EvolutionAPIError';
  }
}

/**
 * Erros de sessão do agente
 */
export class SessionError extends AgentError {
  constructor(
    message: string,
    options: {
      phone?: string;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: 'SESSION_ERROR',
      statusCode: 400,
      context: {
        phone: options.phone,
        ...options.context,
      },
    });
    this.name = 'SessionError';
  }
}

/**
 * Erros de validação
 */
export class ValidationError extends AgentError {
  constructor(
    message: string,
    options: {
      field?: string;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      context: {
        field: options.field,
        ...options.context,
      },
    });
    this.name = 'ValidationError';
  }
}

/**
 * Erros de negócio (regras de domínio)
 */
export class BusinessError extends AgentError {
  constructor(
    message: string,
    options: {
      code?: string;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: options.code || 'BUSINESS_ERROR',
      statusCode: 409,
      context: options.context,
    });
    this.name = 'BusinessError';
  }
}
