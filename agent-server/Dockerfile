# ============================================================
# Dockerfile Multi-Stage para Barber-Flow Agent Server
# Deploy: Railway / Docker
# ============================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build (se necessário)
RUN apk add --no-cache libc6-compat

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar todas as dependências (incluindo dev)
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar build TypeScript
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget tini

# Copiar apenas package.json e instalar deps de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar build gerado
COPY --from=builder /app/dist ./dist

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Criar diretório temporário com permissões corretas
RUN mkdir -p /tmp && chown -R nodejs:nodejs /tmp

USER nodejs

# Expor porta
EXPOSE 3000

# Labels para OCI
LABEL org.opencontainers.image.title="BarberFlow Agent Server"
LABEL org.opencontainers.image.description="Servidor do agente IA para gestão de barbearias"
LABEL org.opencontainers.image.version="1.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Usar tini como init system para reaparência de zombies
ENTRYPOINT ["tini", "--"]

# Comando de inicio
CMD ["node", "dist/index.js"]
