#!/usr/bin/env bash
# Deploy simulado de uma versão da imagem em um ambiente (homologacao | producao).
#
# Uso: scripts/deploy.sh <versao> <ambiente>
#   ex: IMAGE_NAME=ghcr.io/usuario/repo scripts/deploy.sh 1.2.0 homologacao
#
# Cada ambiente é um projeto docker compose isolado (containers, rede e volume
# próprios) exposto em uma porta diferente. O deploy só é considerado bem-sucedido
# se o health check passar; o resultado fica registrado em .deploy/<ambiente>/.
set -euo pipefail

VERSION="${1:?Informe a versão (ex: 1.2.0)}"
DEPLOY_ENV="${2:?Informe o ambiente (homologacao | producao)}"
VERSION="${VERSION#v}"

case "$DEPLOY_ENV" in
  homologacao) HTTP_PORT=8081 ;;
  producao)    HTTP_PORT=8080 ;;
  *) echo "Ambiente inválido: $DEPLOY_ENV" >&2; exit 2 ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy/$DEPLOY_ENV"
mkdir -p "$STATE_DIR"

export IMAGE_NAME="${IMAGE_NAME:-cyber-threat-hub}"
export IMAGE_TAG="$VERSION"
export HTTP_PORT
export SIMULATE_FAILURE="${SIMULATE_FAILURE:-false}"

COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.yml" -p "cth-$DEPLOY_ENV")

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1 version=$VERSION env=$DEPLOY_ENV" >> "$STATE_DIR/history.log"
}

echo "==> Deploy de $IMAGE_NAME:$VERSION em $DEPLOY_ENV (porta $HTTP_PORT)"

# Imagens publicadas vêm do registry; imagens locais (sem registry) usam a já existente
if [[ "$IMAGE_NAME" == */* ]]; then
  "${COMPOSE[@]}" pull app
fi

# --wait aguarda os health checks do compose; falha se algum serviço ficar unhealthy
if ! "${COMPOSE[@]}" up -d --no-build --wait --wait-timeout 120; then
  echo "!! Serviços não ficaram saudáveis" >&2
  "${COMPOSE[@]}" ps || true
  "${COMPOSE[@]}" logs --tail 30 app || true
  log "DEPLOY_FAILED"
  exit 1
fi

# Verificação externa (através do nginx), conferindo a versão em execução
HEALTH=$(curl -fsS --retry 5 --retry-delay 2 --retry-all-errors "http://localhost:$HTTP_PORT/api/health") || {
  echo "!! Health check externo falhou" >&2
  log "DEPLOY_FAILED"
  exit 1
}
echo "Health: $HEALTH"
if ! grep -q "\"version\":\"$VERSION\"" <<< "$HEALTH"; then
  echo "!! Versão em execução não corresponde a $VERSION" >&2
  log "DEPLOY_FAILED"
  exit 1
fi

# Guarda a versão anterior estável antes de atualizar a atual
if [[ -f "$STATE_DIR/current" ]] && [[ "$(cat "$STATE_DIR/current")" != "$VERSION" ]]; then
  cp "$STATE_DIR/current" "$STATE_DIR/previous"
fi
echo "$VERSION" > "$STATE_DIR/current"
log "DEPLOY_OK"

echo "==> $VERSION em execução em $DEPLOY_ENV: http://localhost:$HTTP_PORT"
