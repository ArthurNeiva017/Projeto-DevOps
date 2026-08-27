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
- [ ] `Dockerfile` funcional e otimizado (multi-stage, non-root user).
- [ ] `.dockerignore` configurado corretamente.
- [ ] Orquestração local com `docker-compose.yml`.
- [ ] Entrega Contínua (CD) - Pipeline para build de imagem e publicação no Container Registry.
- [ ] Gerenciamento de Secrets (Uso de GitHub Secrets e `.env.example`).
- [ ] Versionamento Semântico (Semantic Versioning) implementado nas tags do Docker.
- [ ] Estratégia de Rollback documentada e implementada.

## Fase A3 - DevSecOps e Observabilidade
- [ ] Segurança (SAST) - Ferramenta de análise de código e vulnerabilidades rodando na CI (ex: Trivy/CodeQL).
- [ ] Observabilidade - Aplicação exportando métricas úteis (Latência, Erros, Requests).
- [ ] Prometheus configurado para coletar métricas.
- [ ] Grafana configurado com Dashboard de monitoramento.
- [ ] Logs úteis e estruturados sem dados sensíveis.
- [ ] Documentação Técnica Completa no `README.md`.
- [ ] Diagrama da Arquitetura (Mermaid).
- [ ] Diagrama do Pipeline (Mermaid).
- [ ] Análise de Riscos.
- [ ] Post-Mortem simulado.
- [ ] Preparação para Live Demo (Roteiro passo a passo).
