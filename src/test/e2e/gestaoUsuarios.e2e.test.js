import request from 'supertest';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado, logar, SENHA_PADRAO } from './setup/usuarios.js';
import { registrarCandidato } from './setup/cenarios.js';

describe('E2E — gestão de usuários pelo administrador', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const criarPeloAdmin = (admin, dados) =>
    admin.post('/api/usuarios').send({ nome: 'Conta Interna', senha: SENHA_PADRAO, ...dados });

  const emails = (res) => res.body.data.docs.map((u) => u.email).sort();

  it('cria conta com papel e contato, sem expor senha, e a conta já entra', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');

    const criado = await criarPeloAdmin(admin, {
      email: 'suporte.direto@e2e.test',
      tipos_permissao: ['suporte'],
      telefone: '(45) 99999-0000',
    }).expect(201);
    expect(criado.body.data).toMatchObject({ tipos_permissao: ['suporte'], telefone: '(45) 99999-0000' });
    expect(criado.body.data).not.toHaveProperty('senha');

    const suporte = await logar(app, 'suporte.direto@e2e.test');
    const me = await suporte.get('/api/me').expect(200);
    expect(me.body.data.tipos_permissao).toEqual(['suporte']);
  });

  it('recusa e-mail repetido, papel inválido e senha curta', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    await criarPeloAdmin(admin, { email: 'repetido@e2e.test', tipos_permissao: ['recrutador'] }).expect(201);

    const repetido = await criarPeloAdmin(admin, { email: 'repetido@e2e.test', tipos_permissao: ['recrutador'] });
    expect(repetido.status).toBe(409);
    expect(repetido.body.error.code).toBe('CONFLICT');

    await criarPeloAdmin(admin, { email: 'papel@e2e.test', tipos_permissao: ['imperador'] }).expect(400);
    await criarPeloAdmin(admin, { email: 'semPapel@e2e.test', tipos_permissao: [] }).expect(400);
    await criarPeloAdmin(admin, { email: 'curta@e2e.test', tipos_permissao: ['suporte'], senha: '123' }).expect(400);
  });

  it('administrador lista todos e filtra por papel, nome e situação', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador', { email: 'admin@e2e.test' });
    const recrutador = await criarUsuarioLogado(app, 'recrutador', { email: 'recrutador@e2e.test' });
    await criarUsuarioLogado(app, 'suporte', { email: 'suporte@e2e.test', nome: 'Sofia Suporte' });
    await registrarCandidato(app, { email: 'candidata@e2e.test' });

    await admin.patch(`/api/usuarios/${recrutador.id}/status`).send({ status_ativo: false }).expect(200);

    const todos = await admin.get('/api/usuarios?limit=50').expect(200);
    expect(emails(todos)).toEqual(['admin@e2e.test', 'candidata@e2e.test', 'recrutador@e2e.test', 'suporte@e2e.test']);
    expect(JSON.stringify(todos.body.data)).not.toContain('"senha"');

    const internos = await admin.get('/api/usuarios?papel=recrutador,suporte').expect(200);
    expect(emails(internos)).toEqual(['recrutador@e2e.test', 'suporte@e2e.test']);

    const porNome = await admin.get('/api/usuarios?nome=sofia').expect(200);
    expect(emails(porNome)).toEqual(['suporte@e2e.test']);

    const desativados = await admin.get('/api/usuarios?situacao=desativado').expect(200);
    expect(desativados.body.data.docs).toEqual([
      expect.objectContaining({ email: 'recrutador@e2e.test', situacao: 'desativado' }),
    ]);
  });

  it('recrutador só enxerga candidatos na listagem, mesmo pedindo outro papel', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    await criarUsuarioLogado(app, 'suporte');
    await criarUsuarioLogado(app, 'administrador');
    await registrarCandidato(app, { email: 'candidata@e2e.test' });

    const lista = await recrutador.get('/api/usuarios').expect(200);
    expect(emails(lista)).toEqual(['candidata@e2e.test']);

    const forcado = await recrutador.get('/api/usuarios?papel=administrador').expect(200);
    expect(emails(forcado)).toEqual(['candidata@e2e.test']);
  });

  it('excluir conta apaga o usuário, derruba a sessão e impede novo login', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const recrutador = await criarUsuarioLogado(app, 'recrutador', { email: 'excluido@e2e.test' });
    await recrutador.get('/api/me').expect(200);

    const res = await admin.delete(`/api/usuarios/${recrutador.id}`).expect(200);
    expect(res.body.data).toEqual({ id: recrutador.id, deletado: true });

    await recrutador.get('/api/me').expect(401);
    const login = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: 'excluido@e2e.test', password: SENHA_PADRAO });
    expect(login.status).not.toBe(200);

    await admin.get(`/api/usuarios/${recrutador.id}`).expect(404);
    await admin.delete(`/api/usuarios/${recrutador.id}`).expect(404);

    await criarPeloAdmin(admin, { email: 'excluido@e2e.test', tipos_permissao: ['recrutador'] }).expect(201);
  });

  it('administrador não se exclui por aqui e conta autoexcluída conta como inexistente', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const candidato = await registrarCandidato(app);

    const propria = await admin.delete(`/api/usuarios/${admin.id}`).expect(409);
    expect(propria.body.error.code).toBe('AUTOEXCLUSAO');

    await candidato.delete('/api/usuarios/me').send({ emailConfirmacao: candidato.email }).expect(200);
    await admin.delete(`/api/usuarios/${candidato.id}`).expect(404);

    await admin.delete('/api/usuarios/nao-e-objectid').expect(400);
  });
});
