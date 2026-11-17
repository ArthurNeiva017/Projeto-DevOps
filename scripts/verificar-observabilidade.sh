#!/usr/bin/env bash
# Verifica, de ponta a ponta, se a stack de observabilidade está funcionando:
#   1. Prometheus coletando a aplicação (up == 1) e recebendo métricas HTTP
#   2. Regras de alerta carregadas
#   3. Loki recebendo os logs JSON da aplicação (via Grafana Alloy)
#   4. Grafana saudável, com as data sources e o dashboard provisionados
#
# Uso: scripts/verificar-observabilidade.sh [projeto-compose]
# Variáveis: PROMETHEUS_URL (padrão http://localhost:9090), GRAFANA_URL (padrão http://localhost:3000),
#            GRAFANA_ADMIN_USER / GRAFANA_ADMIN_PASSWORD (padrão admin/admin)
set -euo pipefail

PROJECT="${1:-cyber-threat-hub}"
PROM="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA="${GRAFANA_URL:-http://localhost:3000}"
# Credenciais do admin do Grafana (as mesmas passadas ao docker compose)
GRAFANA_AUTH="${GRAFANA_ADMIN_USER:-admin}:${GRAFANA_ADMIN_PASSWORD:-admin}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"

ok()   { echo "✅ $1"; echo "- ✅ $1" >> "$SUMMARY"; }
fail() { echo "::error::$1"; echo "- ❌ $1" >> "$SUMMARY"; exit 1; }

# Executa uma consulta PromQL e devolve o primeiro valor (ou vazio)
prom_query() {
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$1" \
    | sed -n 's/.*"value":\[[^,]*,"\([^"]*\)"\].*/\1/p' | head -n1
}

# Repete um teste até passar (máx. ~2 min)
retry() {
  local desc="$1"; shift
  for _ in $(seq 1 24); do
    if "$@"; then return 0; fi
    sleep 5
  done
  fail "$desc"
}

echo "### 🔭 Verificação da observabilidade ($PROJECT)" >> "$SUMMARY"

# 1. Prometheus
check_up()      { [ "$(prom_query 'up{job="cyber-threat-hub"}')" = "1" ]; }
check_traffic() { v=$(prom_query 'sum(http_requests_total{job="cyber-threat-hub"})'); [ -n "$v" ] && [ "${v%.*}" -gt 0 ]; }
check_version() { curl -fsS --get "$PROM/api/v1/query" --data-urlencode 'query=app_info{job="cyber-threat-hub"}' | grep -q '"version"'; }

retry "Prometheus não está coletando a aplicação (up != 1)" check_up
ok "Prometheus coletando /metrics da aplicação (up = 1)"
retry "Nenhuma métrica http_requests_total registrada" check_traffic
ok "Métricas HTTP recebidas: $(prom_query 'sum(http_requests_total{job="cyber-threat-hub"})') requisições"
retry "Métrica app_info (versão) ausente" check_version
VERSION=$(curl -fsS --get "$PROM/api/v1/query" --data-urlencode 'query=app_info{job="cyber-threat-hub"}' | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
ok "Versão em execução segundo o Prometheus: ${VERSION:-?}"

RULES=$(curl -fsS "$PROM/api/v1/rules" | grep -o '"type":"alerting"' | wc -l)
[ "$RULES" -ge 5 ] || fail "Regras de alerta não carregadas (encontradas: $RULES)"
ok "$RULES regras de alerta carregadas no Prometheus"

# 2. Loki (consultado de dentro da rede do compose, pelo container do Prometheus)
PROM_CONTAINER=$(docker ps -q \
  --filter "label=com.docker.compose.project=$PROJECT" \
  --filter "label=com.docker.compose.service=prometheus" | head -n1)
[ -n "$PROM_CONTAINER" ] || fail "Container do Prometheus não encontrado no projeto $PROJECT"
check_logs() {
  docker exec "$PROM_CONTAINER" \
    wget -qO- 'http://loki:3100/loki/api/v1/query_range?query=%7Bservice%3D%22app%22%7D&limit=5&since=1h' 2>/dev/null \
    | grep -q '"service":"app"'
}
retry "Loki não recebeu logs da aplicação (verifique o container alloy)" check_logs
ok "Loki recebendo logs estruturados da aplicação (via Alloy)"

# 3. Grafana
check_grafana() { curl -fsS "$GRAFANA/api/health" | grep -q '"database"'; }
retry "Grafana não respondeu em $GRAFANA/api/health" check_grafana
ok "Grafana saudável"

check_dashboard() { curl -fsS -u "$GRAFANA_AUTH" "$GRAFANA/api/dashboards/uid/cyber-threat-hub" | grep -q '"uid":"cyber-threat-hub"'; }
retry "Dashboard cyber-threat-hub não foi provisionado" check_dashboard
ok "Dashboard 'Cyber Threat Hub - Observabilidade' provisionado"

check_datasource() { curl -fsS -u "$GRAFANA_AUTH" "$GRAFANA/api/datasources/uid/$1/health" | grep -qi '"status":"OK"'; }
for ds in prometheus loki; do
  retry "Data source $ds com problema no Grafana" check_datasource "$ds"
  ok "Data source $ds conectada no Grafana"
done
