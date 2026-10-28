import request from 'supertest';
import Rota from '../../models/Rota.js';
import Usuario from '../../models/Usuario.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado, SENHA_PADRAO } from './setup/usuarios.js';
import { registrarCandidato } from './setup/cenarios.js';

// Primeira camada de seguranca: quem nao tem sessao valida nao passa, e as
// rotas publicas sao so as que o app.js declara (metodo + caminho).
describe('E2E — autenticação', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const ID_QUALQUER = '000000000000000000000000';

  describe('sem sessão', () => {
    it.each([
      ['get', '/api/me'],
      ['get', '/api/vagas'],
      ['post', '/api/vagas'],
      ['get', '/api/usuarios'],
      ['get', `/api/usuarios/${ID_QUALQUER}`],
      ['get', `/api/usuarios/${ID_QUALQUER}/candidatura`],
      ['get', '/api/questionario'],
      ['get', '/api/pergunta'],
      ['post', '/api/resposta-questionario/iniciar'],
      ['get', '/api/configuracao-integracao'],
      ['get', '/api/avaliacoes'],
      ['get', '/api/catalogo'],
      ['get', '/api/rotas'],
      ['get', '/api/grupos'],
      ['delete', '/api/usuarios/me'],
    ])('%s %s responde 401', async (metodo, url) => {
      const res = await request(app)[metodo](url);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    // Publico e o par metodo + caminho. Liberar so pelo caminho deixava estes
    // verbos chegarem sem sessao ao handler de /usuarios/:id.
    it.each([['get'], ['patch'], ['delete']])('%s /api/usuarios/registro não é público', async (metodo) => {
      const res = await request(app)[metodo]('/api/usuarios/registro').send({ nome: 'x' });
      expect(res.status).toBe(401);
    });

    it('POST /api/usuarios/registro e /api/usuarios/ativar são públicos', async () => {
      await request(app)
        .post('/api/usuarios/registro')
        .send({ nome: 'Pública', email: 'publica@e2e.test', senha: SENHA_PADRAO })
        .expect(201);

      const ativar = await request(app).post('/api/usuarios/ativar').send({});
      expect(ativar.status).not.toBe(401);
    });

    it('cookie de sessão forjado responde 401', async () => {
      const res = await request(app).get('/api/me').set('Cookie', 'better-auth.session_token=forjado.assinatura');
      expect(res.status).toBe(401);
    });
  });

  describe('com sessão', () => {
    it('login com senha errada não abre sessão', async () => {
      const { email } = await criarUsuarioLogado(app, 'candidato');
      const res = await request(app).post('/api/auth/sign-in/email').send({ email, password: 'SenhaErrada@1' });
      expect(res.status).toBe(401);
    });

    it('token bearer devolvido no login também autentica', async () => {
      const { email } = await criarUsuarioLogado(app, 'candidato');
      const login = await request(app).post('/api/auth/sign-in/email').send({ email, password: SENHA_PADRAO });
      const token = login.headers['set-auth-token'];
      expect(token).toBeTruthy();

      await request(app).get('/api/me').set('Authorization', `Bearer ${token}`).expect(200);
    });

    it('logout invalida a sessão', async () => {
      const usuario = await criarUsuarioLogado(app, 'candidato');
      await usuario.get('/api/me').expect(200);

      await usuario.post('/api/auth/sign-out').send({}).expect(200);

      await usuario.get('/api/me').expect(401);
    });

    it('desativar a conta pelo admin revoga as sessões abertas', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      await recrutador.get('/api/vagas').expect(200);

      await admin.patch(`/api/usuarios/${recrutador.id}/status`).send({ status_ativo: false }).expect(200);

      await recrutador.get('/api/vagas').expect(401);

      // O login seguinte e recusado ja com o motivo, em vez de abrir sessao.
      const login = await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: recrutador.email, password: SENHA_PADRAO });
      expect(login.status).toBe(403);
      expect(login.body.code).toBe('CONTA_DESATIVADA');
      expect(login.headers['set-cookie'] ?? []).not.toEqual(
        expect.arrayContaining([expect.stringContaining('session_token=')]),
      );
    });

    it('conta reativada volta a entrar', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const recrutador = await criarUsuarioLogado(app, 'recrutador');

      await admin.patch(`/api/usuarios/${recrutador.id}/status`).send({ status_ativo: false }).expect(200);
      await admin.patch(`/api/usuarios/${recrutador.id}/status`).send({ status_ativo: true }).expect(200);

      await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: recrutador.email, password: SENHA_PADRAO })
        .expect(200);
    });

    it('sessão residual de conta desativada é barrada com CONTA_DESATIVADA', async () => {
      // Desativacao por fora da rota de status (sem revogar a sessao): a
      // defesa do authMiddleware ainda precisa barrar.
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      await Usuario.updateOne({ _id: recrutador.id }, { status_ativo: false });

      const res = await recrutador.get('/api/vagas').expect(401);
      expect(res.body.code).toBe('CONTA_DESATIVADA');
    });

    it('conta excluída pelo próprio usuário perde o acesso', async () => {
      const candidato = await registrarCandidato(app);

      await candidato.delete('/api/usuarios/me').send({ emailConfirmacao: candidato.email }).expect(200);

      await candidato.get('/api/me').expect(401);
    });

    it('rota desativada no cadastro de rotas bloqueia todos os papéis', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const candidato = await criarUsuarioLogado(app, 'candidato');
      const rota = await Rota.findOne({ route: 'vagas' }).lean();

      await admin.patch(`/api/rotas/${rota._id}`).send({ get: false }).expect(200);

      const res = await candidato.get('/api/vagas').expect(403);
      expect(res.body.error.code).toBe('ROUTE_DISABLED');
    });

    it('caminho sem rota cadastrada responde 404', async () => {
      const admin = await criarUsuarioLogado(app, 'administrador');
      const res = await admin.get('/api/rota-inexistente').expect(404);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
