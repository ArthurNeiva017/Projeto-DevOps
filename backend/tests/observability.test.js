const request = require('supertest');
const sinon = require('sinon');
const axios = require('axios');
const app = require('../src/server');
const logger = require('../src/observability/logger');
const { trackJob, register } = require('../src/observability/metrics');

describe('Observabilidade - métricas Prometheus', () => {
    beforeEach(() => {
        sinon.stub(axios, 'get').resolves({ data: [] });
    });

    afterEach(() => sinon.restore());

    it('GET /metrics expõe métricas no formato Prometheus', async () => {
        await request(app).get('/api/noticias');
        const res = await request(app).get('/metrics');

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/text\/plain/);
        expect(res.text).toContain('http_requests_total');
        expect(res.text).toContain('http_request_duration_seconds_bucket');
        expect(res.text).toContain('process_resident_memory_bytes');
        expect(res.text).toContain('app_info');
    });

    it('registra requisições com a rota normalizada (sem alta cardinalidade)', async () => {
        await request(app).get('/api/cves/CVE-2099-0001');
        await request(app).get('/api/rota-que-nao-existe');

        const metrics = await register.getSingleMetricAsString('http_requests_total');
        expect(metrics).toContain('route="/api/cves/:id"');
        expect(metrics).toContain('route="not_found"');
        expect(metrics).not.toContain('CVE-2099-0001');
    });

    it('conta respostas de erro 5xx com o status code correto', async () => {
        process.env.SIMULATE_FAILURE = 'true';
        try {
            await request(app).get('/api/health');
        } finally {
            delete process.env.SIMULATE_FAILURE;
        }
        const metrics = await register.getSingleMetricAsString('http_requests_total');
        expect(metrics).toMatch(/route="\/api\/health",status_code="503"/);
    });

    it('trackJob mede coletas com sucesso e com falha sem propagar a exceção', async () => {
        await trackJob('teste_ok', async () => 'ok')();
        const result = await trackJob('teste_falha', async () => { throw new Error('fonte fora do ar'); })();

        expect(result).toBeUndefined();
        const metrics = await register.getSingleMetricAsString('cth_feed_sync_duration_seconds');
        expect(metrics).toMatch(/source="teste_ok",status="success"/);
        expect(metrics).toMatch(/source="teste_falha",status="error"/);
    });

    it('retorna X-Request-Id em todas as respostas', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['x-request-id']).toBeDefined();
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});

describe('Segurança - validação de entrada', () => {
    it('GET /api/cves/:id rejeita identificadores fora do padrão CVE', async () => {
        const res = await request(app).get('/api/cves/..%2F..%2Fadmin');
        expect(res.statusCode).toEqual(400);
    });
});

describe('Observabilidade - logs estruturados', () => {
    let written;
    let previousLevel;

    beforeEach(() => {
        written = [];
        previousLevel = logger.getLevel();
        logger.setLevel('debug');
        sinon.stub(process.stdout, 'write').callsFake((line) => { written.push(line); return true; });
        sinon.stub(process.stderr, 'write').callsFake((line) => { written.push(line); return true; });
    });

    afterEach(() => {
        sinon.restore();
        logger.setLevel(previousLevel);
    });

    const lastEntry = () => JSON.parse(written[written.length - 1]);

    it('emite uma linha JSON com nível, mensagem e versão', () => {
        logger.info('Coleta concluída: %d itens', 5);
        const entry = lastEntry();

        expect(entry).toMatchObject({ level: 'info', msg: 'Coleta concluída: 5 itens', service: 'cyber-threat-hub' });
        expect(entry).toHaveProperty('time');
        expect(entry).toHaveProperty('version');
    });

    it('mascara campos sensíveis (senhas, tokens, webhooks)', () => {
        logger.warn({ SMTP_PASS: 'super-secreta', TELEGRAM_BOT_TOKEN: '123:abc', canal: 'email' }, 'config');
        const line = written[written.length - 1];

        expect(line).not.toContain('super-secreta');
        expect(line).not.toContain('123:abc');
        expect(lastEntry()).toMatchObject({ SMTP_PASS: '[REDACTED]', canal: 'email' });
    });

    it('remove credenciais embutidas em URLs e tokens Bearer', () => {
        logger.error('Falha em https://user:senha123@smtp.exemplo.com com Bearer abc.def.ghi');
        const line = written[written.length - 1];

        expect(line).not.toContain('senha123');
        expect(line).not.toContain('abc.def.ghi');
    });

    it('serializa objetos Error no campo err', () => {
        logger.error('Erro ao consultar fonte', new Error('timeout'));
        expect(lastEntry().err).toMatchObject({ type: 'Error', message: 'timeout' });
    });
});
