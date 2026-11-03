import { jest } from '@jest/globals';
import request from 'supertest';
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import Usuario from '../../models/Usuario.js';
import ItemCatalogo from '../../models/ItemCatalogo.js';
import seedRotas from '../../seeds/seedsRotas.js';
import PermissaoService from '../../service/PermissaoService.js';

const acesso = (papel, caminho, metodo) =>
  new PermissaoService().validarAcessoPorPapel({ _id: 'u', tipos_permissao: [papel] }, caminho, metodo);

describe('permissao do catalogo', () => {
  it.each(['administrador', 'recrutador', 'candidato', 'suporte'])('%s busca no catalogo', (papel) => {
    expect(acesso(papel, '/catalogo', 'GET')).toEqual({ encontrou: true, permitido: true });
  });

  it.each(['recrutador', 'candidato', 'suporte'])('%s nao cria item', (papel) => {
    expect(acesso(papel, '/catalogo', 'POST')).toEqual({ encontrou: true, permitido: false });
  });

  it('administrador cria e edita', () => {
    expect(acesso('administrador', '/catalogo', 'POST')).toEqual({ encontrou: true, permitido: true });
    expect(acesso('administrador', '/catalogo/abc', 'PATCH')).toEqual({ encontrou: true, permitido: true });
  });

  it('ninguem apaga', () => {
    expect(acesso('administrador', '/catalogo/abc', 'DELETE')).toEqual({ encontrou: true, permitido: false });
  });
});

describe('rotas HTTP do catalogo', () => {
  let app;
  let auth;

  const loginComo = (email) =>
    jest.spyOn(auth.api, 'getSession').mockResolvedValue({
      user: { id: 'x', email, name: 'T' },
      session: { id: 's' },
    });

  beforeAll(async () => {
    await connectTestDatabase();
    await ItemCatalogo.init();
    auth = (await import('../../utils/auth.js')).auth;
    app = (await import('../../app.js')).default;
  });
  beforeEach(async () => {
    await seedRotas({ useOwnConnection: false });
    await Usuario.create([
      { nome: 'Admin', email: 'a@t.com', tipos_permissao: ['administrador'] },
      { nome: 'Candidata', email: 'c@t.com', tipos_permissao: ['candidato'] },
    ]);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });
  afterAll(disconnectTestDatabase);

  it('administrador cria item, candidato busca e nao cria', async () => {
    loginComo('a@t.com');
    const criado = await request(app).post('/api/catalogo').send({ tipo: 'habilidade', nome: 'SQL' });
    expect(criado.status).toBe(201);

    jest.restoreAllMocks();
    loginComo('c@t.com');
    const busca = await request(app).get('/api/catalogo?tipo=habilidade&q=sq');
    expect(busca.status).toBe(200);
    expect(busca.body.data[0].nome).toBe('SQL');

    const negado = await request(app).post('/api/catalogo').send({ tipo: 'habilidade', nome: 'Go' });
    expect(negado.status).toBe(403);
    expect(negado.body.error.code).toBe('FORBIDDEN');
  });

  it('administrador lista o tipo inteiro com todos=true, inativos inclusive', async () => {
    loginComo('a@t.com');
    await request(app).post('/api/catalogo').send({ tipo: 'habilidade', nome: 'SQL' });
    const pascal = await request(app).post('/api/catalogo').send({ tipo: 'habilidade', nome: 'Pascal' });
    await request(app).patch(`/api/catalogo/${pascal.body.data.id}`).send({ ativo: false });

    const busca = await request(app).get('/api/catalogo?tipo=habilidade');
    expect(busca.body.data.map((i) => i.nome)).toEqual(['SQL']);

    const todos = await request(app).get('/api/catalogo?tipo=habilidade&todos=true');
    expect(todos.status).toBe(200);
    expect(todos.body.data.map((i) => [i.nome, i.ativo])).toEqual([['Pascal', false], ['SQL', true]]);
  });

  it('candidato nao lista com todos=true', async () => {
    loginComo('c@t.com');
    const negado = await request(app).get('/api/catalogo?tipo=habilidade&todos=true');
    expect(negado.status).toBe(403);
    expect(negado.body.error.code).toBe('FORBIDDEN');
  });
});
