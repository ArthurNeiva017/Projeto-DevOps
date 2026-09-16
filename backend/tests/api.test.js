const request = require('supertest');
const app = require('../src/server');
const db = require('../src/database/db');
const sinon = require('sinon');
const axios = require('axios');

describe('API Endpoints', () => {

    beforeAll((done) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS NOTICIA (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                fonte TEXT,
                data_publicacao DATETIME,
                resumo TEXT,
                url TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS AMEACA (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grupo TEXT,
                vitima TEXT,
                data_incidente DATETIME,
                pais TEXT,
                fonte TEXT,
                url TEXT,
                email_sent BOOLEAN DEFAULT 0,
                reportText TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS METRICA (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_entidade TEXT,
                quantidade INTEGER,
                data_referencia DATETIME
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS CVE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cve_id TEXT NOT NULL,
                data_publicacao DATETIME,
                cvss REAL,
                resumo TEXT,
                url TEXT
            )`, done);
        });
    });

    beforeEach(() => {
        sinon.stub(axios, 'get').resolves({ data: [] });
        sinon.stub(axios, 'post').resolves({ data: {} });
    });

    afterEach(() => {
        sinon.restore();
    });

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

    it('GET /api/rota-inexistente deve retornar 404', async () => {
        const res = await request(app).get('/api/rota-inexistente');

        expect(res.statusCode).toEqual(404);
    });
});
