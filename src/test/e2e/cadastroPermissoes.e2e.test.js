import request from 'supertest';
import Grupo from '../../models/Grupo.js';
import Rota from '../../models/Rota.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado, logar, SENHA_PADRAO } from './setup/usuarios.js';

describe('E2E — cadastro de rotas e grupos', () => {
  let app;
  let dominio;

  beforeAll(async () => {
    app = await subirAmbiente();
    dominio = process.env.PERMISSION_DOMAIN || 'localhost';
    await Promise.all([Rota.init(), Grupo.init()]);
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const ID_INEXISTENTE = '000000000000000000000000';

  const criarRotaPainel = (admin) =>
    admin.post('/api/rotas').send({ route: 'painel', domain: dominio, active: true, get: true }).expect(201);

  const criarRecrutadorPeloAdmin = async (admin, email) => {
    await admin
      .post('/api/usuarios')
      .send({ nome: 'Recrutador Granular', email, senha: SENHA_PADRAO, tipos_permissao: ['recrutador'] })
      .expect(201);
    return logar(app, email);
  };

  describe('rotas', () => {
    it('cria, lista, busca e exclui; rota excluída deixa de existir para o RBAC', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const recrutador = await criarUsuarioLogado(app, 'recrutador');

      const criada = await criarRotaPainel(admin);
      const rotaId = criada.body.data._id;
      expect(criada.body.data).toMatchObject({ route: 'painel', active: true, get: true, post: false });

      const lista = await admin.get('/api/rotas?route=pain').expect(200);
      expect(lista.body.data.docs.map((r) => r._id)).toEqual([rotaId]);

      const lida = await admin.get(`/api/rotas/${rotaId}`).expect(200);
      expect(lida.body.data.route).toBe('painel');

      const barrado = await recrutador.get('/api/painel').expect(403);
      expect(barrado.body.error.code).toBe('FORBIDDEN');

      await admin.delete(`/api/rotas/${rotaId}`).expect(200);
      await admin.get(`/api/rotas/${rotaId}`).expect(404);
      await admin.delete(`/api/rotas/${rotaId}`).expect(404);

      const semRota = await recrutador.get('/api/painel').expect(404);
      expect(semRota.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('excluir uma rota do seed derruba o recurso para todos os papéis', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const candidato = await criarUsuarioLogado(app, 'candidato');
      const vagas = await admin.get('/api/rotas?route=vagas').expect(200);
      const [rota] = vagas.body.data.docs;

      await admin.delete(`/api/rotas/${rota._id}`).expect(200);

      const res = await candidato.get('/api/vagas').expect(404);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('recusa cadastro sem campos obrigatórios', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');

      await admin.post('/api/rotas').send({ domain: dominio }).expect(400);
      await admin.post('/api/rotas').send({ route: 'painel' }).expect(400);
      await admin.patch(`/api/rotas/${ID_INEXISTENTE}`).send({ get: true }).expect(404);
      await admin.patch(`/api/rotas/${ID_INEXISTENTE}`).send({ get: 'sim' }).expect(400);
    });
  });

  describe('grupos', () => {
    it('cria, lista, busca e edita grupo', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');

      const criado = await admin
        .post('/api/grupos')
        .send({ nome: 'auditores', descricao: 'Leitura de relatórios' })
        .expect(201);
      const grupoId = criado.body.data._id;
      expect(criado.body.data).toMatchObject({ nome: 'auditores', ativo: true, permissions: [] });

      const lista = await admin.get('/api/grupos?nome=audit').expect(200);
      expect(lista.body.data.docs.map((g) => g._id)).toEqual([grupoId]);

      await admin.patch(`/api/grupos/${grupoId}`).send({ descricao: 'Leitura e exportação' }).expect(200);
      const lido = await admin.get(`/api/grupos/${grupoId}`).expect(200);
      expect(lido.body.data.descricao).toBe('Leitura e exportação');
    });

    it('permissão do grupo libera a rota e a edição ou exclusão do grupo revoga na hora', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      await criarRotaPainel(admin);

      const grupo = await admin
        .post('/api/grupos')
        .send({
          nome: 'recrutador',
          descricao: 'Acesso ao painel',
          permissions: [{ route: 'painel', domain: dominio, active: true, get: true }],
        })
        .expect(201);
      const grupoId = grupo.body.data._id;

      const recrutador = await criarRecrutadorPeloAdmin(admin, 'granular@e2e.test');

      const liberado = await recrutador.get('/api/painel').expect(404);
      expect(liberado.body.error.code).toBe('NOT_FOUND');

      await admin
        .patch(`/api/grupos/${grupoId}`)
        .send({ permissions: [{ route: 'painel', domain: dominio, active: false, get: true }] })
        .expect(200);
      await recrutador.get('/api/painel').expect(403);

      await admin
        .patch(`/api/grupos/${grupoId}`)
        .send({ permissions: [{ route: 'painel', domain: dominio, active: true, get: true }] })
        .expect(200);
      await recrutador.get('/api/painel').expect(404);

      await admin.delete(`/api/grupos/${grupoId}`).expect(200);
      await admin.get(`/api/grupos/${grupoId}`).expect(404);
      await recrutador.get('/api/painel').expect(403);
    });

    it('grupo desativado não concede permissão, e reativado volta a conceder', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      await criarRotaPainel(admin);
      const grupo = await admin
        .post('/api/grupos')
        .send({
          nome: 'recrutador',
          descricao: 'Acesso ao painel',
          ativo: false,
          permissions: [{ route: 'painel', domain: dominio, active: true, get: true }],
        })
        .expect(201);

      const recrutador = await criarRecrutadorPeloAdmin(admin, 'inativo@e2e.test');
      await recrutador.get('/api/painel').expect(403);

      await admin.patch(`/api/grupos/${grupo.body.data._id}`).send({ ativo: true }).expect(200);
      await recrutador.get('/api/painel').expect(404);
    });

    it('política de papel prevalece sobre a permissão do grupo', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      await admin
        .post('/api/grupos')
        .send({
          nome: 'recrutador',
          descricao: 'Tentativa de abrir configuração',
          permissions: [{ route: 'configuracao-integracao', domain: dominio, active: true, get: true }],
        })
        .expect(201);

      const recrutador = await criarRecrutadorPeloAdmin(admin, 'politica@e2e.test');

      const res = await recrutador.get('/api/configuracao-integracao').expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('recusa cadastro inválido e grupo inexistente', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');

      await admin.post('/api/grupos').send({ descricao: 'Sem nome' }).expect(400);
      await admin.post('/api/grupos').send({ nome: 'sem-descricao' }).expect(400);
      await admin.patch(`/api/grupos/${ID_INEXISTENTE}`).send({}).expect(400);
      await admin.patch(`/api/grupos/${ID_INEXISTENTE}`).send({ descricao: 'x' }).expect(404);
      await admin.delete(`/api/grupos/${ID_INEXISTENTE}`).expect(404);
    });

    it('recusa permissão repetida e nome já usado sem cair em erro interno', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const permissao = { route: 'painel', domain: dominio, active: true, get: true };

      const repetida = await admin
        .post('/api/grupos')
        .send({ nome: 'repetido', descricao: 'x', permissions: [permissao, permissao] })
        .expect(400);
      expect(repetida.body.error.code).toBe('VALIDATION_ERROR');

      const grupo = await admin.post('/api/grupos').send({ nome: 'unico', descricao: 'x' }).expect(201);
      await admin
        .patch(`/api/grupos/${grupo.body.data._id}`)
        .send({ permissions: [permissao, permissao] })
        .expect(400);

      const duplicado = await admin.post('/api/grupos').send({ nome: 'unico', descricao: 'y' }).expect(409);
      expect(duplicado.body.error.code).toBe('CONFLICT');
    });
  });

  it('id fora do formato responde 400, não 500', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');

    for (const url of ['/api/grupos/xyz', '/api/rotas/xyz']) {
      const res = await admin.get(url).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    await admin.patch('/api/rotas/xyz').send({ get: true }).expect(400);
    await admin.delete('/api/grupos/xyz').expect(400);
  });

  it('rota repetida (route + domain) responde 409, não 500', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    await criarRotaPainel(admin);

    const res = await admin.post('/api/rotas').send({ route: 'painel', domain: dominio }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('nada disso é alcançável sem sessão', async () => {
    await request(app).post('/api/grupos').send({ nome: 'x', descricao: 'x' }).expect(401);
    await request(app).delete(`/api/rotas/${ID_INEXISTENTE}`).expect(401);
  });
});
