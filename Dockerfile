# syntax=docker/dockerfile:1

# ---------- Estágio 1: dependências ----------
# Instala apenas as dependências de produção. Ferramentas de build ficam
# neste estágio caso o sqlite3 precise compilar o binário nativo.
FROM node:22-bookworm-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Estágio 2: runtime ----------
FROM node:22-bookworm-slim AS runtime

ARG APP_VERSION=dev
ARG GIT_SHA=unknown

LABEL org.opencontainers.image.title="cyber-threat-hub" \
      org.opencontainers.image.description="Plataforma de Cyber Threat Intelligence" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.source="https://github.com/ArthurNeiva017/Projeto-DevOps"

ENV NODE_ENV=production \
    PORT=3001 \
    APP_VERSION=${APP_VERSION} \
    GIT_SHA=${GIT_SHA} \
    DB_PATH=/app/data/database.sqlite

# Hardening (DevSecOps):
#  - aplica as correções de segurança disponíveis dos pacotes do sistema operacional;
#  - remove npm/corepack/yarn: não são usados em runtime e trazem dependências que
#    só aumentariam a superfície de ataque e os achados do scan de contêiner (Trivy).
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
              /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app

# Copia node_modules do estágio de dependências e o código-fonte (sem .env, ver .dockerignore)
COPY --from=deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/src ./backend/src
COPY --chown=node:node frontend ./frontend

# /app/backend gravável para o POST /api/settings persistir o .env em runtime
RUN mkdir -p /app/data && chown -R node:node /app/data && chown node:node /app/backend

# Executa como usuário sem privilégios
USER node

EXPOSE 3001
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

WORKDIR /app/backend
CMD ["node", "src/server.js"]
