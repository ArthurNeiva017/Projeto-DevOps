# 🎬 Roteiro da Live Demo (A3)

Objetivo: mostrar, em tempo real, uma alteração de código percorrendo o pipeline completo:

**Commit → Testes/SAST → Build/Deploy → Visualização dos dados no Dashboard**

Duração sugerida: **12 a 15 minutos**. O pipeline completo de uma tag leva cerca de 10 minutos (o CodeQL é a etapa mais lenta), então narre cada etapa enquanto ela roda.

---

## 0. Escolha o modo de deploy

| Modo | Como funciona | Quando usar |
|---|---|---|
| **A. Runner self-hosted** (recomendado) | Os jobs de deploy rodam na máquina da apresentação. O pipeline sobe homologação (`:8081`) e produção (`:8080`) **nela mesma**, junto com o Grafana. O dashboard muda sozinho quando o deploy termina | Demo 100% automática |
| **B. Runner do GitHub** (padrão) | O pipeline faz o deploy num runner efêmero, sobe a observabilidade lá e publica a verificação no *Summary*. Na máquina da apresentação você executa a **mesma imagem** publicada no GHCR | Sem configuração extra |

### Preparação do modo A (fazer antes da aula)

1. Máquina **Linux ou WSL2** com Docker, Docker Compose v2, Git, `curl` e Node.js 22.
2. *Settings → Actions → Runners → New self-hosted runner*: siga as instruções e inicie com `./run.sh`. O runner recebe a label `self-hosted`.
3. *Settings → Secrets and variables → Actions → Variables*: crie `DEPLOY_RUNNER = self-hosted`.
4. *Settings → Actions → General → Fork pull request workflows*: marque **"Require approval for all external contributors"**. O repositório é público (ver risco R8 no README).

> Para voltar ao modo B, apague a variável `DEPLOY_RUNNER`.

---

## 1. Checklist pré-demo (30 min antes)

- [ ] Último pipeline da `main` verde (*Actions*)
- [ ] Pelo menos duas versões publicadas no GHCR (ex.: `v1.2.0` e uma anterior), para o rollback ter destino
- [ ] Environments `homologacao` e `producao` criados; segredos cadastrados (inclusive `GRAFANA_ADMIN_PASSWORD`)
- [ ] **Modo A:** runner self-hosted *Idle* e ambiente atual no ar: <http://localhost:8080> e Grafana <http://localhost:3000>
- [ ] **Modo B:** stack local no ar com a versão atual (passo 5B)
- [ ] Abas abertas: repositório, *Actions*, *Security → Code scanning*, Grafana, aplicação
- [ ] Terminal no diretório do projeto, na `main` atualizada

---

## 2. Mostrar o estado atual (1 min)

1. Abrir a aplicação e o **Grafana → "Cyber Threat Hub - Observabilidade"**.
2. Mostrar o painel **"Versão em execução"** (ex.: `1.2.0`) e os sinais de ouro: tráfego, erros, latência e recursos.
3. Gerar tráfego para os gráficos se mexerem (deixe rodando em outro terminal):

```bash
# modo A: produção no runner  |  modo B: stack local (porta 3002)
node scripts/gerar-trafego.js --url http://localhost:8080 --duracao 900 --rps 6 --erros 0.1
```

---

## 3. Fazer a alteração e abrir o PR (2 min)

Exemplo de alteração visível e segura: um novo texto na interface ou um novo campo no `/api/health`.

```bash
git checkout -b feat/demo-ao-vivo
# ... edite, por exemplo, frontend/index.html (título) ou backend/src/server.js ...
cd backend && npm test && cd ..          # mostra os testes passando localmente
git commit -am "feat: alteração da live demo"
git push -u origin feat/demo-ao-vivo
```

Abra o **Pull Request** para a `main`. Mostre os checks obrigatórios rodando:

| Check | O que comentar |
|---|---|
| `Build, testes e integração` | Jest, build da imagem, **Trivy na imagem**, smoke test, integração com nginx e com Prometheus/Loki/Grafana |
| `DevSecOps (SAST + SCA + segredos + IaC)` | npm audit, **Semgrep**, **Trivy** (dependências, segredos, Dockerfile) |
| `SAST (CodeQL - ...)` | Análise semântica do JavaScript e dos próprios workflows |

Enquanto roda, abra o **Summary** do job DevSecOps (tabela de achados do Semgrep) e a aba **Security → Code scanning**.

### (Opcional, +2 min) Mostrar o gate de segurança barrando um PR

Em outra branch, introduza uma dependência sabidamente vulnerável:

```bash
git checkout -b demo/gate-seguranca main
cd backend && npm install lodash@4.17.11 && cd ..
git commit -am "chore: demo de dependência vulnerável" && git push -u origin demo/gate-seguranca
```

O PR fica **vermelho** em `npm audit` e no Trivy (prototype pollution, CRITICAL/HIGH) e o merge é bloqueado. **Feche o PR sem fazer merge** e apague a branch.

---

## 4. Merge e release (1 min)

Com os checks verdes, faça o **merge** do PR. Depois publique a versão (SemVer: `feat` → MINOR):

```bash
git checkout main && git pull
git tag -a v1.3.0 -m "feat: alteração da live demo"
git push origin v1.3.0
```

Em *Actions*, acompanhe: `build-and-test` / `security-scan` / `codeql` → `build-and-push` (GHCR + SBOM) → `deploy-homologacao` → `deploy-producao` → `release`.

---

## 5. Visualização no dashboard

### 5A. Modo self-hosted

Assim que `deploy-producao` termina:

* **"Versão em execução"** passa para `1.3.0`;
* uma **anotação roxa** ("Deploy / restart") aparece na linha do tempo;
* **Uptime** volta a zero; tráfego, latência e logs continuam sendo coletados, agora com `version=1.3.0` nos logs.

### 5B. Modo runner do GitHub

1. No *Summary* do `deploy-producao`, mostre a seção **"🔭 Verificação da observabilidade"** (Prometheus coletando, Loki recebendo logs, dashboard provisionado).
2. Implante localmente a imagem que o pipeline acabou de publicar:

```bash
# Bash
export IMAGE_NAME=ghcr.io/arthurneiva017/projeto-devops IMAGE_TAG=1.3.0
docker compose --profile observability pull app
docker compose --profile observability up -d --no-build --wait
```

```powershell
# PowerShell
$env:IMAGE_NAME = "ghcr.io/arthurneiva017/projeto-devops"; $env:IMAGE_TAG = "1.3.0"
docker compose --profile observability pull app
docker compose --profile observability up -d --no-build --wait
```

> Se o pacote do GHCR for privado, rode antes `docker login ghcr.io` com um token `read:packages`.

3. No Grafana (<http://localhost:3000>): versão `1.3.0`, anotação de deploy e métricas em tempo real.

### O que mostrar no dashboard

| Painel | Fala sugerida |
|---|---|
| Tráfego / Requisições por rota | "cada requisição do gerador aparece aqui em até 5 s" |
| Taxa de erros | "os 404/400 são as rotas inválidas do gerador; 5xx acima de 5% dispara o alerta `TaxaDeErrosAlta`" |
| Latência p50/p95/p99 | "`/api/dashboard` é a rota mais lenta porque consulta APIs externas" |
| CPU / Memória / Event loop | "consumo de recursos do container" |
| Logs → Avisos e erros | "logs JSON com `request_id`; nenhum token ou senha aparece (redação automática)" |

---

## 6. (Opcional) Rollback automático (3 min)

*Actions → CI/CD Pipeline → Run workflow*, **Use workflow from: Tags → v1.3.0**, `operation = deploy`, ✅ `simulate_failure`.

Resultado: homologação recebe a versão "defeituosa" (`/api/health` = 503), o health check falha, o **rollback automático** volta para a última versão estável e produção **não** é tocada. O `history.log` aparece no Summary. No modo A, o dashboard mostra o painel **Status**/versão mudando e a anotação de restart. Detalhes em [`CD-ROLLBACK.md`](CD-ROLLBACK.md#53-simulação-documentada-roteiro).

---

## Plano B (se algo falhar ao vivo)

| Problema | Saída |
|---|---|
| Pipeline lento (fila de runners) | Mostre uma execução verde anterior e o *Summary* dela; siga para o dashboard |
| Sem internet / GHCR indisponível | `docker compose --profile observability up -d --build` com `IMAGE_TAG=1.3.0` (build local) |
| Grafana sem dados | `bash scripts/verificar-observabilidade.sh cyber-threat-hub` indica qual componente falhou; confira `docker compose --profile observability logs alloy prometheus` |
| Porta ocupada | Ajuste `HTTP_PORT`, `GRAFANA_PORT` e `PROMETHEUS_PORT` no `.env` |
