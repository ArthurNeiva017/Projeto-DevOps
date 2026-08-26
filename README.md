# 🛡️ Ransomware Monitor

> Plataforma web para monitoramento de ataques de ransomware, desenvolvida para a disciplina de **Integração DevOps — UniCEUB**.

O **Ransomware Monitor** é uma aplicação voltada para a coleta, centralização e visualização de informações sobre ataques de ransomware provenientes de diferentes fontes de inteligência.

A plataforma também identifica incidentes relacionados ao **Brasil 🇧🇷** e foi projetada para realizar alertas automáticos através de diferentes canais de comunicação.

---

## 🎯 Objetivo

Centralizar informações sobre ataques de ransomware em uma única interface, permitindo acompanhar novos incidentes e identificar rapidamente ataques envolvendo organizações brasileiras.

O sistema utiliza dados provenientes de:

* 🟥 Ransomware.Live
* 🟥 RansomFeed
* 🟥 RansomLook

Os dados coletados são normalizados, tratados para evitar duplicidades e armazenados localmente em **SQLite**.

---

## 🚨 Alertas de ataques no Brasil

Quando um novo incidente relacionado ao Brasil for identificado, o sistema poderá realizar notificações através de:

* 📧 E-mail
* ✈️ Telegram
* 💬 Microsoft Teams
* 🎮 Discord

O sistema mantém o controle dos alertas enviados para evitar notificações duplicadas do mesmo incidente.

---

## 🖥️ Threat Feed

A interface apresenta os incidentes de ransomware através de um **Threat Feed** em tempo real, utilizando uma identidade visual inspirada em plataformas de Cyber Threat Intelligence.

Cada incidente pode apresentar informações como:

* Grupo de ransomware
* Vítima
* País
* Data
* Fonte da informação

Também são disponibilizados filtros e pesquisa para facilitar a análise dos incidentes.

---

## 🛠️ Tecnologias

### Aplicação

![HTML5](https://img.shields.io/badge/HTML5-Frontend-orange?logo=html5)
![CSS3](https://img.shields.io/badge/CSS3-Style-blue?logo=css3)
![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-yellow?logo=javascript)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-API-black?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-Database-blue?logo=sqlite)

### DevOps

![Git](https://img.shields.io/badge/Git-Versionamento-orange?logo=git)
![GitHub](https://img.shields.io/badge/GitHub-Repositório-black?logo=github)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-blue?logo=githubactions)
![Docker](https://img.shields.io/badge/Docker-Container-blue?logo=docker)

### DevSecOps e Observabilidade

![Trivy](https://img.shields.io/badge/Trivy-Security-blue)
![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-orange?logo=prometheus)
![Grafana](https://img.shields.io/badge/Grafana-Dashboard-orange?logo=grafana)

---

## 🏗️ Arquitetura

```text
Ransomware.Live ─┐
RansomFeed ──────┼────► Node.js / Express
RansomLook ──────┘             │
                               ▼
                       Normalização
                               │
                       Deduplicação
                               │
                               ▼
                            SQLite
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
         HTML / CSS / JS              Ataque é do Brasil?
          Threat Feed                       │
                                           SIM
                                            │
                         ┌──────────┬────────┼────────┐
                         ▼          ▼        ▼        ▼
                       E-mail    Telegram   Teams   Discord
```

---

## 📂 Estrutura do projeto

```text
ransomware-monitor/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── database/
│   ├── integrations/
│   ├── alerts/
│   ├── middleware/
│   ├── metrics/
│   └── server.js
│
├── public/
│   ├── index.html
│   ├── css/
│   └── js/
│
├── tests/
│
├── monitoring/
│   ├── prometheus/
│   └── grafana/
│
├── .github/
│   └── workflows/
│
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

> A estrutura poderá sofrer alterações durante a evolução do projeto.

---

## ⚙️ Executando o projeto

### 1. Clone o repositório

```bash
git clone URL_DO_REPOSITORIO
cd ransomware-monitor
```

### 2. Instale as dependências

Certifique-se de possuir o **Node.js** instalado.

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` utilizando `.env.example` como referência.

```env
PORT=3000

EMAIL_USER=
EMAIL_PASSWORD=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

DISCORD_WEBHOOK_URL=

TEAMS_WEBHOOK_URL=

ALERTS_ENABLED=false
```

> ⚠️ Nunca envie o arquivo `.env` para o GitHub.

---

### 4. Inicie a aplicação

```bash
npm start
```

Depois, acesse:

```text
http://localhost:3000
```

---

## 🗄️ Banco de dados

O projeto utiliza **SQLite** como banco de dados local.

O banco é responsável principalmente pelo armazenamento de:

* incidentes coletados;
* informações normalizadas;
* identificação da fonte;
* controle de duplicidade;
* histórico de alertas enviados.

O arquivo contendo os dados reais do SQLite não deve ser versionado no GitHub.

---

## 🧪 Testes

Os testes automatizados verificam funcionalidades críticas da aplicação, como normalização, identificação de ataques brasileiros, deduplicação e endpoints da API.

Para executar:

```bash
npm test
```

Para verificar a qualidade do código:

```bash
npm run lint
```

---

## 🔄 CI/CD

O projeto utiliza **GitHub Actions** para automatizar etapas do processo de integração e entrega.

```text
Commit / Pull Request
        │
        ▼
     npm ci
        │
        ▼
      ESLint
        │
        ▼
      Tests
        │
        ▼
 Security Analysis
        │
        ▼
   Docker Build
        │
        ▼
 Container Scan
        │
        ▼
       GHCR
        │
        ▼
      Deploy
```

As etapas serão adicionadas progressivamente conforme os marcos da disciplina.

---

## 🐳 Docker

A aplicação será preparada para execução através de containers.

```bash
docker build -t ransomware-monitor .
```

Execução:

```bash
docker run -p 3000:3000 ransomware-monitor
```

Com Docker Compose:

```bash
docker compose up -d
```

O banco SQLite utilizará armazenamento persistente para evitar perda dos dados ao recriar o container.

---

## 🔐 Segurança

Credenciais e tokens utilizados pelas integrações não devem permanecer diretamente no código-fonte.

São utilizadas variáveis de ambiente e **GitHub Secrets** para informações sensíveis, como:

* tokens;
* webhooks;
* senhas;
* credenciais;
* configurações privadas.

O pipeline DevSecOps também será preparado para realizar:

* análise estática de segurança;
* análise das dependências Node.js;
* análise de vulnerabilidades das imagens Docker.

---

## 📊 Observabilidade

A etapa final do projeto utilizará:

**Prometheus** → coleta de métricas.

**Grafana** → visualização e monitoramento.

Entre os indicadores planejados estão:

* tráfego da aplicação;
* latência;
* taxa de erros;
* consumo de recursos;
* ataques coletados;
* ataques relacionados ao Brasil;
* alertas enviados;
* falhas nas integrações.

---

## 📦 Etapas do projeto

### A1 — Integração Contínua

* Repositório Git estruturado
* Aplicação inicial
* Interface web
* SQLite
* Testes automatizados
* Pipeline CI

### A2 — IaC e Entrega Contínua

* Dockerfile
* Docker Compose
* Pipeline CD
* Container Registry
* Secrets Management
* Semantic Versioning
* Rollback

### A3 — DevSecOps e Observabilidade

* SAST
* Análise de dependências
* Scan de containers
* Prometheus
* Grafana
* Logs e métricas
* Documentação técnica
* Live Demo

---

## 📈 Fluxo DevOps

```text
DESENVOLVIMENTO
      │
      ▼
     Git
      │
      ▼
Pull Request
      │
      ▼
      CI
      │
 ┌────┴────┐
 │         │
Lint     Tests
 │         │
 └────┬────┘
      ▼
 DevSecOps
      │
      ▼
Docker Build
      │
      ▼
Container Registry
      │
      ▼
     Deploy
      │
      ▼
  Prometheus
      │
      ▼
    Grafana
```

---

## 🎓 Projeto acadêmico

Projeto desenvolvido para a disciplina de **Integração DevOps — UniCEUB**, com o objetivo de aplicar na prática conceitos de:

`Git` • `CI/CD` • `Containers` • `DevSecOps` • `Observabilidade` • `Automação`

---

## ⚠️ Aviso

Este projeto possui finalidade **acadêmica e educacional**.

As informações apresentadas são provenientes de fontes externas de inteligência sobre ransomware e podem conter dados incompletos, atrasados ou sujeitos a alterações.

---

## 📄 Licença

Projeto desenvolvido para fins acadêmicos.
