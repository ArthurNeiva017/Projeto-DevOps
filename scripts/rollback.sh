#!/usr/bin/env bash
# Rollback de um ambiente para uma versão estável.
#
# Uso: scripts/rollback.sh <ambiente> [versao]
#   Sem versão: volta para a última versão implantada com sucesso
#   (.deploy/<ambiente>/current, que não é alterado por um deploy que falhou).
set -euo pipefail

DEPLOY_ENV="${1:?Informe o ambiente (homologacao | producao)}"
TARGET="${2:-}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy/$DEPLOY_ENV"
mkdir -p "$STATE_DIR"

if [[ -z "$TARGET" ]]; then
  if [[ ! -f "$STATE_DIR/current" ]]; then
    echo "!! Nenhuma versão estável registrada para $DEPLOY_ENV - rollback impossível" >&2
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ROLLBACK_FAILED version=none env=$DEPLOY_ENV" >> "$STATE_DIR/history.log"
    exit 1
  fi
  TARGET="$(cat "$STATE_DIR/current")"
fi
TARGET="${TARGET#v}"

echo "==> Rollback de $DEPLOY_ENV para $TARGET"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ROLLBACK_START version=$TARGET env=$DEPLOY_ENV" >> "$STATE_DIR/history.log"

# A versão estável nunca roda com falha simulada
SIMULATE_FAILURE=false "$ROOT_DIR/scripts/deploy.sh" "$TARGET" "$DEPLOY_ENV"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ROLLBACK_OK version=$TARGET env=$DEPLOY_ENV" >> "$STATE_DIR/history.log"
