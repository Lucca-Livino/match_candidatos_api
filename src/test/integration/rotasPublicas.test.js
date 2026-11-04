import request from 'supertest';
import { connectTestDatabase, disconnectTestDatabase } from '../setup/db.js';

let app;

beforeAll(async () => {
  await connectTestDatabase();
  ({ default: app } = await import('../../app.js'));
});
afterAll(disconnectTestDatabase);

describe('rotas publicas', () => {
  it.each([
    ['get', '/api/usuarios/registro'],
    ['patch', '/api/usuarios/registro'],
    ['delete', '/api/usuarios/registro'],
    ['get', '/api/usuarios/ativar'],
    ['patch', '/api/usuarios/ativar'],
    ['delete', '/api/usuarios/ativar'],
  ])('%s %s sem sessao exige login', async (metodo, caminho) => {
    const resposta = await request(app)[metodo](caminho).send({});
    expect(resposta.status).toBe(401);
  });

  it.each(['/api/usuarios/registro', '/api/usuarios/ativar'])(
    'POST %s continua publico',
    async (caminho) => {
      const resposta = await request(app).post(caminho).send({});
      expect(resposta.status).not.toBe(401);
      expect(resposta.status).not.toBe(403);
    },
  );
});
