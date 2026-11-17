# DevOps Integration Checklist

Este checklist acompanha a implementação dos requisitos de DevOps ao longo das fases da disciplina.

## Fase A1 - Integração Contínua e Conteinerização Inicial
- [x] Repositório Git estruturado (`.gitignore`, `README.md`, `CONTRIBUTING.md`).
- [x] Estratégia Trunk-Based Development definida.
- [x] Padrão de Commits documentado (Conventional Commits).
- [x] Regras de proteção da branch `main` documentadas.
- [x] Testes automatizados implementados e funcionais (Jest).
- [x] Pipeline de Integração Contínua (CI) com GitHub Actions (`ci.yml`).
- [x] CI executando lint, testes e build automaticamente em push/pull_request.

## Fase A2 - IaC e Continuous Delivery
- [x] `Dockerfile` funcional e otimizado (multi-stage, non-root user).
- [x] `.dockerignore` configurado corretamente.
- [x] Orquestração local com `docker-compose.yml`.
- [x] Entrega Contínua (CD) - Pipeline para build de imagem e publicação no Container Registry.
- [x] Gerenciamento de Secrets (Uso de GitHub Secrets e `.env.example`).
- [x] Versionamento Semântico (Semantic Versioning) implementado nas tags do Docker.
- [x] Estratégia de Rollback documentada e implementada (ver `docs/CD-ROLLBACK.md`).

## Fase A3 - DevSecOps e Observabilidade
- [x] SAST no pipeline: Semgrep (gate ERROR/HIGH/CRITICAL) e CodeQL `security-extended` (JS/TS e Actions).
- [x] Scan de vulnerabilidades em dependências: `npm audit` + Trivy `fs` (gate HIGH/CRITICAL) e Dependabot.
- [x] Scan de contêiner: Trivy `image` na imagem construída (gate HIGH/CRITICAL corrigíveis) + SBOM CycloneDX por release.
- [x] Scan de segredos e misconfig de IaC (Trivy `secret`/`misconfig`); resultados SARIF no GitHub Security.
- [x] Supply chain do pipeline: actions fixadas por SHA, ferramentas com versão fixa.
- [x] Observabilidade: aplicação exporta métricas (`/metrics`: latência, erros, tráfego, recursos e negócio).
- [x] Prometheus configurado para coletar métricas, com regras de alerta (SLOs).
- [x] Grafana com dashboard provisionado como código (latência, taxa de erros, tráfego, consumo de recursos, logs).
- [x] Logs estruturados (JSON) sem dados sensíveis, centralizados no Loki via Grafana Alloy.
- [x] Teste de integração da stack de observabilidade no CI (`scripts/verificar-observabilidade.sh`).
- [x] Documentação técnica completa no `README.md`.
- [x] Diagrama da arquitetura (Mermaid).
- [x] Diagrama do pipeline (Mermaid).
- [x] Análise de riscos.
- [x] Post-mortem (incidente real da v1.1.0).
- [x] Roteiro da Live Demo (`docs/LIVE-DEMO.md`).
