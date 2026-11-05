import request from 'supertest';
import { subirAmbiente, limparBanco, derrubarAmbiente, convitesEnviados } from './setup/ambiente.js';
import { criarUsuarioLogado, logar } from './setup/usuarios.js';

// Conta interna por convite: o admin convida, o token chega por e-mail (aqui
// capturado), a pessoa define a senha em /usuarios/ativar e so entao entra.
describe('E2E — convite de conta interna', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const SENHA_NOVA = 'NovaSenha@456';

  const convidar = async (admin, email = 'recrutadora@e2e.test') => {
    const res = await admin
      .post('/api/usuarios/convite')
      .send({ nome: 'Recrutadora Convidada', email, papel: 'recrutador' })
      .expect(201);
    return { usuarioId: String(res.body.data._id), email };
  };

  const ultimoToken = () => convitesEnviados.at(-1).token;

  it('convidado ativa a conta, entra e navega com o papel recebido', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const { email } = await convidar(admin);

    expect(convitesEnviados).toHaveLength(1);
    expect(convitesEnviados[0]).toMatchObject({ email, papel: 'recrutador' });

    await request(app).post('/api/usuarios/ativar').send({ token: ultimoToken(), senha: SENHA_NOVA }).expect(200);

    const recrutadora = await logar(app, email, SENHA_NOVA);
    const me = await recrutadora.get('/api/me').expect(200);
    expect(me.body.data.tipos_permissao).toEqual(['recrutador']);
    await recrutadora.get('/api/vagas').expect(200);
  });

  it('token é de uso único: segunda ativação falha', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    await convidar(admin);
    const token = ultimoToken();

    await request(app).post('/api/usuarios/ativar').send({ token, senha: SENHA_NOVA }).expect(200);
    const repetida = await request(app).post('/api/usuarios/ativar').send({ token, senha: SENHA_NOVA });

    expect(repetida.status).toBe(400);
  });

  it('token inválido é recusado', async () => {
    const res = await request(app).post('/api/usuarios/ativar').send({ token: 'token-que-nao-existe', senha: SENHA_NOVA });
    expect(res.status).toBe(400);
  });

  it('reenviar convite gera token novo e invalida o anterior', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const { usuarioId } = await convidar(admin);
    const tokenAntigo = ultimoToken();

    await admin.post(`/api/usuarios/${usuarioId}/reenviar-convite`).expect(200);
    const tokenNovo = ultimoToken();
    expect(tokenNovo).not.toBe(tokenAntigo);

    await request(app).post('/api/usuarios/ativar').send({ token: tokenAntigo, senha: SENHA_NOVA }).expect(400);
    await request(app).post('/api/usuarios/ativar').send({ token: tokenNovo, senha: SENHA_NOVA }).expect(200);
  });

  it('reenviar convite para conta já ativada responde CONTA_JA_ATIVADA', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const { usuarioId } = await convidar(admin);
    await request(app).post('/api/usuarios/ativar').send({ token: ultimoToken(), senha: SENHA_NOVA }).expect(200);

    const res = await admin.post(`/api/usuarios/${usuarioId}/reenviar-convite`).expect(400);
    expect(res.body.error.code).toBe('CONTA_JA_ATIVADA');
  });

  it('convidado não consegue entrar antes de ativar a conta', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const { email } = await convidar(admin);

    // A senha da conta pendente e aleatoria: nenhuma senha conhecida funciona.
    const res = await request(app).post('/api/auth/sign-in/email').send({ email, password: SENHA_NOVA });
    expect(res.status).not.toBe(200);
  });
});
