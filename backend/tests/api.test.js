const request = require('supertest');
const app = require('../src/server');
const db = require('../src/database/db');
const sinon = require('sinon');
const axios = require('axios');

describe('API Endpoints', () => {
    beforeEach(() => {
        // Evita chamadas externas reais durante os testes
        sinon.stub(axios, 'get').resolves({ data: [] });
        sinon.stub(axios, 'post').resolves({ data: {} });
    });

    afterEach(() => {
        sinon.restore();
    });

    // Como o app usa o SQLite persistente que já existe, podemos apenas validar
    // a resposta das rotas e a estrutura do JSON retornado.
    
    it('GET /api/dashboard deve retornar as métricas principais', async () => {
        const res = await request(app).get('/api/dashboard');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('metrics');
        expect(res.body.metrics).toHaveProperty('threats');
    });

    it('GET /api/noticias deve retornar uma lista de notícias', async () => {
        const res = await request(app).get('/api/noticias');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('noticias');
        expect(Array.isArray(res.body.noticias)).toBeTruthy();
    });

    it('GET /api/ameacas deve retornar uma lista de ameaças', async () => {
        const res = await request(app).get('/api/ameacas');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('ameacas');
        expect(Array.isArray(res.body.ameacas)).toBeTruthy();
    });

    it('GET /api/cves deve retornar a lista de vulnerabilidades', async () => {
        const res = await request(app).get('/api/cves');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('cves');
        expect(Array.isArray(res.body.cves)).toBeTruthy();
    });
    
    // Teste isolado garantindo que se tentar acessar rota inexistente retorne 404
    it('GET /api/rota-inexistente deve retornar 404', async () => {
        const res = await request(app).get('/api/rota-inexistente');
        expect(res.statusCode).toEqual(404);
    });
});
