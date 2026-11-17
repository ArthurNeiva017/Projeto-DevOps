// Métricas Prometheus da aplicação, expostas em GET /metrics.
//
// Cobrem os "quatro sinais de ouro" exibidos no dashboard do Grafana:
//   - Tráfego ......... http_requests_total
//   - Erros ........... http_requests_total{status_code=~"5.."}
//   - Latência ........ http_request_duration_seconds (histograma -> p50/p95/p99)
//   - Saturação ....... process_cpu_*, process_resident_memory_bytes, nodejs_heap_*, event loop lag
// Além de métricas de negócio (coletas das fontes de inteligência, alertas enviados, registros no banco).
const client = require('prom-client');
const crypto = require('crypto');
const logger = require('./logger');
const db = require('../database/db');

const register = new client.Registry();
register.setDefaultLabels({ app: 'cyber-threat-hub' });

// CPU, memória, heap, GC, event loop lag, handles abertos...
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Latência das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
});

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestsInFlight = new client.Gauge({
    name: 'http_requests_in_flight',
    help: 'Requisições HTTP em andamento',
    registers: [register]
});

const appInfo = new client.Gauge({
    name: 'app_info',
    help: 'Versão da aplicação em execução (valor sempre 1)',
    labelNames: ['version', 'git_sha', 'node_version'],
    registers: [register]
});
appInfo.set({
    version: process.env.APP_VERSION || 'dev',
    git_sha: (process.env.GIT_SHA || 'unknown').slice(0, 7),
    node_version: process.version
}, 1);

const logEventsTotal = new client.Counter({
    name: 'app_log_events_total',
    help: 'Eventos de log emitidos pela aplicação, por nível',
    labelNames: ['level'],
    registers: [register]
});
logger.addHook((level) => logEventsTotal.inc({ level }));

const feedSyncDuration = new client.Histogram({
    name: 'cth_feed_sync_duration_seconds',
    help: 'Duração das coletas das fontes de inteligência',
    labelNames: ['source', 'status'],
    buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120],
    registers: [register]
});

const alertsSentTotal = new client.Counter({
    name: 'cth_alerts_sent_total',
    help: 'Alertas de ataques no Brasil enviados, por canal e resultado',
    labelNames: ['channel', 'result'],
    registers: [register]
});

// Quantidade de registros por tabela, consultada no SQLite a cada scrape
const TABLES = { noticias: 'NOTICIA', ameacas: 'AMEACA', cves: 'CVE' };
new client.Gauge({
    name: 'cth_db_records',
    help: 'Registros armazenados no banco, por tabela',
    labelNames: ['table'],
    registers: [register],
    async collect() {
        const count = (sql) => new Promise((resolve) => {
            db.get(sql, [], (err, row) => resolve(err || !row ? null : row.count));
        });
        for (const [label, table] of Object.entries(TABLES)) {
            const value = await count(`SELECT COUNT(*) AS count FROM ${table}`);
            if (value !== null) this.set({ table: label }, value);
        }
        const br = await count("SELECT COUNT(*) AS count FROM AMEACA WHERE pais IN ('BR', 'Brazil', 'Brasil')");
        if (br !== null) this.set({ table: 'ameacas_brasil' }, br);
    }
});

// Rota "normalizada" para não explodir a cardinalidade (ex.: /api/cves/:id e não cada CVE)
function routeLabel(req, res) {
    if (req.route && req.route.path) return (req.baseUrl || '') + req.route.path;
    if (res.statusCode === 404) return 'not_found';
    return req.path.startsWith('/api') ? 'unmatched' : 'static';
}

// Middleware: mede latência, conta requisições e gera o log de acesso estruturado
function httpMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    const requestId = req.get('x-request-id') || crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);
    httpRequestsInFlight.inc();

    res.on('finish', () => {
        httpRequestsInFlight.dec();
        const seconds = Number(process.hrtime.bigint() - start) / 1e9;
        const labels = { method: req.method, route: routeLabel(req, res), status_code: String(res.statusCode) };
        httpRequestDuration.observe(labels, seconds);
        httpRequestsTotal.inc(labels);

        // Health check e scrape do Prometheus são muito frequentes: só em nível debug
        const quiet = labels.route === '/api/health' || labels.route === '/metrics' || labels.route === 'static';
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : quiet ? 'debug' : 'info';
        logger[level]({
            type: 'http_access',
            request_id: requestId,
            method: req.method,
            route: labels.route,
            path: req.path, // sem query string, para não registrar parâmetros
            status: res.statusCode,
            duration_ms: Math.round(seconds * 1000 * 100) / 100,
            user_agent: req.get('user-agent')
        }, `${req.method} ${req.path} ${res.statusCode}`);
    });

    next();
}

async function metricsHandler(req, res) {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error('Erro ao gerar métricas', err);
        res.status(500).end();
    }
}

// Envolve uma coleta de fonte de inteligência medindo duração e resultado
function trackJob(source, fn) {
    return async (...args) => {
        const end = feedSyncDuration.startTimer({ source });
        try {
            const result = await fn(...args);
            end({ status: 'success' });
            return result;
        } catch (err) {
            end({ status: 'error' });
            logger.error({ source }, `Falha na coleta de ${source}`, err);
            return undefined;
        }
    };
}

// result: 'sent' | 'not_sent' (canal desativado/sem configuração) | 'failed' (exceção)
function recordAlert(channel, result) {
    alertsSentTotal.inc({ channel, result });
}

module.exports = { register, httpMiddleware, metricsHandler, trackJob, recordAlert };
