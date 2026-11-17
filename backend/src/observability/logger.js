// Logger estruturado (JSON por linha) - coletado pelo Grafana Alloy e enviado ao Loki.
//
// - Uma linha JSON por evento: fácil de filtrar no Loki com `| json`.
// - Assinatura compatível com console.* (logger.info('msg', valor, ...)).
// - Campos sensíveis (senhas, tokens, chaves, webhooks) são mascarados antes de sair.
const util = require('util');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const SENSITIVE_KEY = /pass|senha|secret|token|api[_-]?key|authorization|cookie|webhook/i;
const REDACTED = '[REDACTED]';

function defaultLevel() {
    if (process.env.LOG_LEVEL && LEVELS[process.env.LOG_LEVEL] !== undefined) return process.env.LOG_LEVEL;
    // Durante os testes (Jest define NODE_ENV=test) só mostra problemas reais
    return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}

let currentLevel = defaultLevel();
const hooks = [];

// Mascara recursivamente chaves sensíveis em objetos de contexto
function redact(value, depth = 0) {
    if (value === null || typeof value !== 'object' || depth > 5) return value;
    if (value instanceof Error) return serializeError(value);
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        out[k] = SENSITIVE_KEY.test(k) && v ? REDACTED : redact(v, depth + 1);
    }
    return out;
}

// Remove credenciais que possam aparecer embutidas em URLs/mensagens
function scrubText(text) {
    return String(text)
        .replace(/(https?:\/\/)[^\s:@/]+:[^\s@/]+@/gi, '$1' + REDACTED + '@')
        .replace(/(bot)\d{6,}:[\w-]{20,}/gi, '$1' + REDACTED)
        .replace(/(Bearer\s+)[\w.-]+/gi, '$1' + REDACTED);
}

function serializeError(err) {
    const out = { type: err.name, message: scrubText(err.message) };
    if (err.code) out.code = err.code;
    if (err.response && err.response.status) out.status = err.response.status;
    if (err.stack) out.stack = scrubText(err.stack.split('\n').slice(0, 6).join('\n'));
    return out;
}

function write(level, args) {
    if (LEVELS[level] < LEVELS[currentLevel]) {
        hooks.forEach((h) => h(level));
        return;
    }

    let fields = {};
    let rest = args;
    // logger.info({ campo: 1 }, 'mensagem') -> campos estruturados
    if (args.length && args[0] && typeof args[0] === 'object' && !(args[0] instanceof Error)) {
        fields = redact(args[0]);
        rest = args.slice(1);
    }

    const errors = rest.filter((a) => a instanceof Error);
    const plain = rest.map((a) => (a instanceof Error ? a.message : a));
    const entry = {
        time: new Date().toISOString(),
        level,
        service: 'cyber-threat-hub',
        version: process.env.APP_VERSION || 'dev',
        msg: scrubText(util.format(...plain)),
        ...fields
    };
    if (errors.length) entry.err = serializeError(errors[0]);

    const line = JSON.stringify(entry) + '\n';
    if (LEVELS[level] >= LEVELS.warn) process.stderr.write(line);
    else process.stdout.write(line);

    hooks.forEach((h) => h(level));
}

const logger = {
    debug: (...a) => write('debug', a),
    info: (...a) => write('info', a),
    warn: (...a) => write('warn', a),
    error: (...a) => write('error', a),
    setLevel(level) {
        if (LEVELS[level] === undefined) throw new Error(`Nível de log inválido: ${level}`);
        currentLevel = level;
    },
    getLevel: () => currentLevel,
    // Usado pelo módulo de métricas para contar logs por nível sem dependência circular
    addHook: (fn) => hooks.push(fn),
    redact,
    scrubText
};

module.exports = logger;
