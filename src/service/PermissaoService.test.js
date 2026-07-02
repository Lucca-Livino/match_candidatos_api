import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import Usuario from '../models/Usuario.js';
import Rota from '../models/Rota.js';
import PermissaoService from './PermissaoService.js';

const DOMINIO = 'localhost';
const service = new PermissaoService();

async function criarUsuario(papel, extra = {}) {
  return Usuario.create({
    nome: 'Teste',
    email: `${papel}-${Date.now()}-${Math.random()}@t.com`,
    tipos_permissao: [papel],
    ...extra,
  });
}

describe('PermissaoService.verificarPermissao', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  beforeEach(async () => {
    await Rota.create({ route: 'vagas', domain: DOMINIO, active: true, get: true, post: true });
    await Rota.create({ route: 'usuarios', domain: DOMINIO, active: true, get: true, patch: true });
  });

  it('404 quando rota nao seedada', async () => {
    const u = await criarUsuario('administrador');
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/inexistente', metodoHttp: 'GET', dominio: DOMINIO });
    expect(r).toMatchObject({ ok: false, status: 404 });
  });

  it('403 quando rota existe mas metodo inativo', async () => {
    const u = await criarUsuario('recrutador');
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/vagas', metodoHttp: 'DELETE', dominio: DOMINIO });
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it('recrutador cria vaga (politica permite)', async () => {
    const u = await criarUsuario('recrutador');
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/vagas', metodoHttp: 'POST', dominio: DOMINIO });
    expect(r.ok).toBe(true);
  });

  it('candidato NAO cria vaga (politica nega)', async () => {
    const u = await criarUsuario('candidato');
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/vagas', metodoHttp: 'POST', dominio: DOMINIO });
    expect(r.ok).toBe(false);
  });

  it('allowSelf: candidato edita o proprio usuario', async () => {
    const u = await criarUsuario('candidato');
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: `/usuarios/${u._id}`, metodoHttp: 'PATCH', dominio: DOMINIO });
    expect(r.ok).toBe(true);
  });

  it('allowSelf: candidato NAO edita outro usuario', async () => {
    const u = await criarUsuario('candidato');
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/usuarios/000000000000000000000000', metodoHttp: 'PATCH', dominio: DOMINIO });
    expect(r.ok).toBe(false);
  });

  it('politica e autoritativa: granular NAO sobrescreve negacao de policy', async () => {
    // /vagas POST tem policy que nega candidato; mesmo com permissao granular, deve negar.
    const u = await criarUsuario('candidato', {
      permissions: [{ route: 'vagas', domain: DOMINIO, active: true, post: true }],
    });
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/vagas', metodoHttp: 'POST', dominio: DOMINIO });
    expect(r.ok).toBe(false);
  });

  it('fallback granular: concede acesso em rota SEM policy', async () => {
    await Rota.create({ route: 'relatorios', domain: DOMINIO, active: true, get: true });
    const u = await criarUsuario('candidato', {
      permissions: [{ route: 'relatorios', domain: DOMINIO, active: true, get: true }],
    });
    const r = await service.verificarPermissao({ usuarioId: u._id, caminho: '/relatorios', metodoHttp: 'GET', dominio: DOMINIO });
    expect(r.ok).toBe(true);
  });
});
