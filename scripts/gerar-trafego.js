#!/usr/bin/env node
// Gera tráfego na aplicação para popular o dashboard do Grafana (live demo / CI).
//
// Uso:
//   node scripts/gerar-trafego.js                         # http://localhost:3002 por 60s
//   node scripts/gerar-trafego.js --url http://localhost:8081 --duracao 30 --rps 10
//   node scripts/gerar-trafego.js --erros 0.3             # 30% das requisições geram erro
//
// Sem dependências: usa apenas o fetch nativo do Node.js 18+.

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE_URL = arg('url', process.env.TARGET_URL || 'http://localhost:3002').replace(/\/$/, '');
const DURATION_S = Number(arg('duracao', 60));
const RPS = Number(arg('rps', 5));
const ERROR_RATIO = Number(arg('erros', 0.1));

// Rotas "saudáveis" com pesos (as mais usadas pelo frontend aparecem mais)
const OK_ROUTES = [
    ['/api/health', 2],
    ['/api/dashboard', 3],
    ['/api/noticias', 3],
    ['/api/ameacas', 3],
    ['/api/cves', 2],
    ['/', 1]
];

// Rotas que geram 4xx/5xx de propósito, para o painel de taxa de erros
const ERROR_ROUTES = [
    '/api/rota-inexistente',        // 404
    '/api/cves/id-invalido',        // 400 (validação de entrada)
    '/api/cves/CVE-2099-99999'      // 503/500 quando a CVEFEED_API_KEY não está configurada
];

function pickWeighted(routes) {
    const total = routes.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [route, w] of routes) {
        if ((r -= w) <= 0) return route;
    }
    return routes[0][0];
}

const stats = { total: 0, porStatus: {}, falhasDeRede: 0 };

async function hit() {
    const route = Math.random() < ERROR_RATIO
        ? ERROR_ROUTES[Math.floor(Math.random() * ERROR_ROUTES.length)]
        : pickWeighted(OK_ROUTES);
    try {
        const res = await fetch(BASE_URL + route, {
            headers: { 'User-Agent': 'cth-gerador-de-trafego' },
            signal: AbortSignal.timeout(15000)
        });
        await res.arrayBuffer();
        stats.porStatus[res.status] = (stats.porStatus[res.status] || 0) + 1;
    } catch {
        stats.falhasDeRede++;
    } finally {
        stats.total++;
    }
}

async function main() {
    console.log(`Gerando ~${RPS} req/s em ${BASE_URL} por ${DURATION_S}s (erros: ${Math.round(ERROR_RATIO * 100)}%)`);
    const end = Date.now() + DURATION_S * 1000;
    const pending = new Set();

    while (Date.now() < end) {
        for (let i = 0; i < RPS; i++) {
            const p = hit().finally(() => pending.delete(p));
            pending.add(p);
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    await Promise.all(pending);

    console.log(`Concluído: ${stats.total} requisições`, JSON.stringify(stats.porStatus), `falhas de rede: ${stats.falhasDeRede}`);
    // Sai com erro se nenhuma requisição chegou à aplicação (útil no CI)
    process.exit(stats.total > 0 && stats.falhasDeRede < stats.total ? 0 : 1);
}

main();
