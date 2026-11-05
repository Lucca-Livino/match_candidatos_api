import mongoose from 'mongoose';
import request from 'supertest';
import Usuario from '../../models/Usuario.js';
import Formacao from '../../models/Formacao.js';
import Experiencia from '../../models/Experiencia.js';
import Habilidade from '../../models/Habilidade.js';
import Certificacao from '../../models/Certificacao.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado, logar } from './setup/usuarios.js';
import { configurarIA, restaurarIA } from './setup/iaFalsa.js';
import {
  publicarVaga,
  registrarCandidato,
  montarCurriculo,
  candidatarEResponder,
  aguardarAvaliacao,
} from './setup/cenarios.js';

const EMAIL = 'fulana@e2e.test';
const NOME = 'Fulana de Tal';
const SENHA = 'SenhaForte@123';

describe('E2E — exclusão da própria conta (LGPD)', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  const candidataComCurriculo = async () => {
    const candidata = await registrarCandidato(app, { email: EMAIL, nome: NOME });
    await candidata.patch(`/api/usuarios/${candidata.id}`).send({ telefone: '69999990000', cidade: 'Vilhena' }).expect(200);
    await montarCurriculo(candidata);
    return candidata;
  };

  const itensDoCurriculo = async (usuarioId) => {
    const contagens = await Promise.all(
      [Formacao, Experiencia, Habilidade, Certificacao].map((modelo) => modelo.countDocuments({ usuarioId: String(usuarioId) })),
    );
    return contagens.reduce((soma, n) => soma + n, 0);
  };

  const acessosDe = async (usuarioId) => {
    const filtro = { userId: { $in: [String(usuarioId), new mongoose.Types.ObjectId(String(usuarioId))] } };
    const { db } = mongoose.connection;
    return {
      sessoes: await db.collection('session').countDocuments(filtro),
      credenciais: await db.collection('account').countDocuments(filtro),
    };
  };

  const excluir = (cliente, emailConfirmacao) => cliente.delete('/api/usuarios/me').send({ emailConfirmacao });

  it('exige o e-mail da conta como confirmação e não toca em nada quando ele falta ou não confere', async () => {
    const candidata = await candidataComCurriculo();

    const semEmail = await candidata.delete('/api/usuarios/me').send({}).expect(400);
    expect(semEmail.body.error.code).toBe('VALIDATION_ERROR');
    const errado = await excluir(candidata, 'outra@e2e.test').expect(400);
    expect(errado.body.error.code).toBe('CONFIRMACAO_INVALIDA');

    const me = await candidata.get('/api/me').expect(200);
    expect(me.body.data.email).toBe(EMAIL);
    expect((await Usuario.findById(candidata.id).lean()).nome).toBe(NOME);
    expect(await itensDoCurriculo(candidata.id)).toBe(4);
    await logar(app, EMAIL, SENHA);
  });

  it('aceita a confirmação com caixa e espaços diferentes', async () => {
    const candidata = await candidataComCurriculo();
    await excluir(candidata, `  ${EMAIL.toUpperCase()} `).expect(200);
    await candidata.get('/api/me').expect(401);
  });

  it('anonimiza a conta, apaga o currículo e remove credencial e sessões', async () => {
    const candidata = await candidataComCurriculo();
    const res = await excluir(candidata, EMAIL).expect(200);
    expect(res.body.data).toEqual({ id: candidata.id, deletado: true });

    const documento = await Usuario.findById(candidata.id).lean();
    expect(documento).toMatchObject({
      nome: 'Conta excluída',
      email: `excluido+${candidata.id}@conta-removida.invalido`,
      telefone: '',
      cidade: '',
      status_ativo: false,
    });
    expect(documento.deletadoEm).toBeInstanceOf(Date);
    const bruto = JSON.stringify(documento);
    for (const dado of [NOME, EMAIL, '69999990000', 'Vilhena']) expect(bruto).not.toContain(dado);

    expect(await itensDoCurriculo(candidata.id)).toBe(0);
    expect(await acessosDe(candidata.id)).toEqual({ sessoes: 0, credenciais: 0 });

    const login = await request(app).post('/api/auth/sign-in/email').send({ email: EMAIL, password: SENHA });
    expect(login.status).not.toBe(200);
  });

  it('recrutador continua vendo a candidatura, mas sem identificação nem currículo', async () => {
    configurarIA({ aderencia: 0.9 });
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidata = await candidataComCurriculo();
    await candidatarEResponder(candidata, vaga);
    await aguardarAvaliacao(candidata.id, vaga.vagaId);

    await excluir(candidata, EMAIL).expect(200);

    const fila = await recrutador.get(`/api/vagas/${vaga.vagaId}/candidaturas`).expect(200);
    expect(fila.body.data).toHaveLength(1);
    expect(fila.body.data[0].candidato).toMatchObject({ nome: 'Conta excluída', telefone: '', cidade: '' });
    expect(JSON.stringify(fila.body.data)).not.toContain(EMAIL);

    const ficha = await recrutador.get(`/api/vagas/${vaga.vagaId}/candidaturas/${candidata.id}/ficha`).expect(200);
    expect(ficha.body.data.curriculo).toEqual({ habilidades: [], formacoes: [], experiencias: [], certificacoes: [] });
    expect(JSON.stringify(ficha.body.data)).not.toContain(NOME);
  });

  it('o e-mail fica livre para uma conta nova, que nasce sem o currículo antigo', async () => {
    const antiga = await candidataComCurriculo();
    await excluir(antiga, EMAIL).expect(200);

    const nova = await registrarCandidato(app, { email: EMAIL, nome: NOME });
    expect(nova.id).not.toBe(antiga.id);
    const habilidades = await nova.get(`/api/usuarios/${nova.id}/habilidade`).expect(200);
    expect(habilidades.body.data).toEqual([]);
  });

  it('o único administrador ativo não exclui a própria conta', async () => {
    const admin = await criarUsuarioLogado(app, 'administrador');
    const me = await admin.get('/api/me').expect(200);

    const bloqueado = await excluir(admin, me.body.data.email).expect(409);
    expect(bloqueado.body.error.code).toBe('ULTIMO_ADMINISTRADOR');
    await admin.get('/api/me').expect(200);

    await criarUsuarioLogado(app, 'administrador');
    await excluir(admin, me.body.data.email).expect(200);
    await admin.get('/api/me').expect(401);
  });
});
