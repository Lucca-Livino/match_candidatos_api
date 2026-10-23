import request from 'supertest';
import Candidatura from '../../../models/Candidatura.js';
import { aguardar } from './ambiente.js';
import { logar } from './usuarios.js';

// Passos de negocio reaproveitados pelas jornadas. Todos passam pela API.

export const CRITERIO_NODE = { nome: 'Node.js', tipo_criterio: 'skill_tecnica', peso_percentual: 100 };

// Vaga com um questionario ativo de uma pergunta dissertativa. Nasce pausada;
// `ativar: true` faz o PATCH que o VagaService so aceita com questionario ativo.
export const publicarVaga = async (recrutador, { ativar = true, criterios = [CRITERIO_NODE] } = {}) => {
  const vaga = await recrutador
    .post('/api/vagas')
    .send({
      area: 'TI',
      titulo: 'Desenvolvedor Node.js',
      descricao: 'Vaga para desenvolvimento de APIs em Node.js.',
      criterio_vaga: criterios,
    })
    .expect(201);
  const vagaId = vaga.body.data._id;

  const questionario = await recrutador
    .post('/api/questionario')
    .send({ vagaId, criadoPor: recrutador.id, titulo: 'Triagem inicial' })
    .expect(201);
  const questionarioId = questionario.body.data.id;

  const pergunta = await recrutador
    .post('/api/pergunta')
    .send({
      questionarioId,
      enunciado: 'Conte sua experiência com Node.js.',
      tipoResposta: 'dissertativa',
      peso: 1,
      ordem: 1,
    })
    .expect(201);

  if (ativar) {
    await recrutador.patch(`/api/vagas/${vagaId}`).send({ status: 'ativa' }).expect(200);
  }

  return { vagaId, questionarioId, perguntaId: pergunta.body.data.id };
};

// Registro publico + login: o mesmo caminho que o front usa.
export const registrarCandidato = async (app, { email = 'candidata@e2e.test', nome = 'Candidata E2E' } = {}) => {
  const senha = 'SenhaForte@123';

  await request(app).post('/api/usuarios/registro').send({ nome, email, senha }).expect(201);

  const candidato = await logar(app, email, senha);
  const me = await candidato.get('/api/me').expect(200);

  return { ...candidato, id: me.body.data.id, email, me: me.body.data };
};

export const montarCurriculo = async (candidato) => {
  await candidato
    .post(`/api/usuarios/${candidato.id}/formacao`)
    .send({
      instituicao: 'Universidade E2E',
      curso: 'Ciência da Computação',
      grau: 'graduacao',
      situacao: 'concluido',
      anoInicio: 2018,
      anoConclusao: 2022,
    })
    .expect(201);
  await candidato
    .post(`/api/usuarios/${candidato.id}/experiencia`)
    .send({
      empresa: 'Empresa E2E',
      cargo: 'Desenvolvedora Back-end',
      dataInicio: '2022-01-01',
      descricaoAtivida_: 'APIs REST em Node.js.',
    })
    .expect(201);
  await candidato
    .post(`/api/usuarios/${candidato.id}/habilidade`)
    .send({ habilidade: 'Node.js', nivel: 'avancado' })
    .expect(201);
  await candidato
    .post(`/api/usuarios/${candidato.id}/certificacao`)
    .send({ nome: 'Certificação Node.js', emissor: 'OpenJS', dataEmissao: '2023-05-01' })
    .expect(201);
};

// Candidatura + questionario respondido e finalizado. O finalizar dispara a
// triagem por IA em segundo plano.
export const candidatarEResponder = async (candidato, { vagaId, questionarioId, perguntaId }) => {
  await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId }).expect(201);

  const iniciada = await candidato
    .post('/api/resposta-questionario/iniciar')
    .send({ questionarioId, usuarioId: candidato.id })
    .expect(201);
  const respostaId = iniciada.body.data.id;

  await candidato
    .post(`/api/resposta-questionario/${respostaId}/responder`)
    .send({ respostas: [{ perguntaId, textoResposta: 'Três anos construindo APIs em Node.js.' }] })
    .expect(200);

  const finalizada = await candidato.patch(`/api/resposta-questionario/${respostaId}/finalizar`).expect(200);

  return { respostaId, finalizada: finalizada.body.data };
};

export const aguardarAvaliacao = (usuarioId, vagaId) =>
  aguardar(() => Candidatura.findOne({ usuarioId, vagaId, avaliadoEm: { $ne: null } }).lean());

// Espera o disparo da triagem terminar mesmo quando ela nao grava nada (IA
// fora do ar ou kill switch), para o teste nao sair com a promise pendente.
export const aguardarDisparo = (espiao, chamadas = 1) => aguardar(() => espiao.mock.calls.length >= chamadas);
