import request from 'supertest';
import UsuarioService from '../../../service/UsuarioService.js';

export const SENHA_PADRAO = 'SenhaForte@123';

let sequencia = 0;

// Cliente HTTP que reenvia o cookie de sessao do better-auth em toda chamada.
export const clienteAutenticado = (app, cookie) => {
  const comSessao = (metodo) => (url) => request(app)[metodo](url).set('Cookie', cookie);
  return {
    cookie,
    get: comSessao('get'),
    post: comSessao('post'),
    put: comSessao('put'),
    patch: comSessao('patch'),
    delete: comSessao('delete'),
  };
};

export const logar = async (app, email, senha = SENHA_PADRAO) => {
  const res = await request(app).post('/api/auth/sign-in/email').send({ email, password: senha });
  if (res.status !== 200) {
    throw new Error(`Login falhou para ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return clienteAutenticado(app, res.headers['set-cookie']);
};

// Provisiona pelo mesmo caminho da criacao administrativa (signUp do
// better-auth + papel no doc 'usuarios') e ja devolve a sessao.
export const criarUsuarioLogado = async (app, papel, dados = {}) => {
  sequencia += 1;
  const email = dados.email ?? `${papel}${sequencia}@e2e.test`;
  const usuario = await new UsuarioService().criar({
    nome: dados.nome ?? `${papel} e2e ${sequencia}`,
    email,
    senha: SENHA_PADRAO,
    tipos_permissao: [papel],
  });
  const cliente = await logar(app, email);
  return { ...cliente, id: String(usuario._id), email };
};
