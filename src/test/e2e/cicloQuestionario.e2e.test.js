import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { publicarVaga, registrarCandidato } from './setup/cenarios.js';

describe('E2E — ciclo de vida do questionário', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const iniciar = (candidato, questionarioId) =>
    candidato.post('/api/resposta-questionario/iniciar').send({ questionarioId, usuarioId: candidato.id });

  it('lista por vaga e por situação e edita título e instruções', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { ativar: false });
    const outra = await publicarVaga(recrutador, { ativar: false });

    const daVaga = await recrutador.get(`/api/questionario?vagaId=${vaga.vagaId}`).expect(200);
    expect(daVaga.body.data.map((q) => q.id)).toEqual([vaga.questionarioId]);

    await recrutador.patch(`/api/questionario/${outra.questionarioId}/ativo`).send({ ativo: 0 }).expect(200);
    const inativos = await recrutador.get('/api/questionario?ativo=0').expect(200);
    expect(inativos.body.data.map((q) => q.id)).toEqual([outra.questionarioId]);

    const editado = await recrutador
      .put(`/api/questionario/${vaga.questionarioId}`)
      .send({ titulo: 'Triagem revisada', instrucoes: 'Responda com exemplos reais.' })
      .expect(200);
    expect(editado.body.data.titulo).toBe('Triagem revisada');

    const lido = await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(200);
    expect(lido.body.data.instrucoes).toBe('Responda com exemplos reais.');
    expect(lido.body.data.perguntas).toHaveLength(1);
  });

  it('recusa edição inválida e vaga inexistente', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { ativar: false });
    const url = `/api/questionario/${vaga.questionarioId}`;

    const curto = await recrutador.put(url).send({ titulo: 'ab' }).expect(400);
    expect(curto.body.error.code).toBe('VALIDATION_ERROR');
    await recrutador.put(url).send({}).expect(400);
    await recrutador.put(url).send({ vagaId: '000000000000000000000000' }).expect(404);
    await recrutador.patch(`${url}/ativo`).send({ ativo: 2 }).expect(400);
    await recrutador.put('/api/questionario/inexistente').send({ titulo: 'Qualquer' }).expect(404);
  });

  it('único questionário ativo de vaga ativa não é desativado, excluído nem movido', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const outra = await publicarVaga(recrutador, { ativar: false });
    const url = `/api/questionario/${vaga.questionarioId}`;

    const desativar = await recrutador.patch(`${url}/ativo`).send({ ativo: 0 }).expect(400);
    expect(desativar.body.error.code).toBe('BUSINESS_RULE_ERROR');
    await recrutador.delete(url).expect(400);
    await recrutador.put(url).send({ vagaId: outra.vagaId }).expect(400);
    await recrutador.put(url).send({ titulo: 'Triagem revisada' }).expect(200);

    await recrutador
      .post('/api/questionario')
      .send({ vagaId: vaga.vagaId, criadoPor: recrutador.id, titulo: 'Triagem reserva' })
      .expect(201);
    await recrutador.patch(`${url}/ativo`).send({ ativo: 0 }).expect(200);
  });

  it('questionário desativado com a vaga pausada bloqueia o candidato e a reativação; reativado, libera', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);

    await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'pausada' }).expect(200);
    await recrutador.patch(`/api/questionario/${vaga.questionarioId}/ativo`).send({ ativo: 0 }).expect(200);

    const bloqueado = await iniciar(candidato, vaga.questionarioId).expect(400);
    expect(bloqueado.body.error.code).toBe('BUSINESS_RULE_ERROR');

    await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'ativa' }).expect(400);

    await recrutador.patch(`/api/questionario/${vaga.questionarioId}/ativo`).send({ ativo: 1 }).expect(200);
    await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'ativa' }).expect(200);
    await iniciar(candidato, vaga.questionarioId).expect(201);
  });

  it('não exclui questionário já respondido', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
    await iniciar(candidato, vaga.questionarioId).expect(201);

    const res = await recrutador.delete(`/api/questionario/${vaga.questionarioId}`).expect(400);
    expect(res.body.error.code).toBe('BUSINESS_RULE_ERROR');

    await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(200);
  });

  it('exclui questionário sem respostas junto com as perguntas, e a vaga não volta ao ar', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { ativar: false });

    const res = await recrutador.delete(`/api/questionario/${vaga.questionarioId}`).expect(200);
    expect(res.body.data).toEqual({ id: vaga.questionarioId, deletado: true });

    await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(404);
    await recrutador.get(`/api/pergunta/${vaga.perguntaId}`).expect(404);
    await recrutador.delete(`/api/questionario/${vaga.questionarioId}`).expect(404);

    const ativar = await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'ativa' }).expect(400);
    expect(ativar.body.error.code).toBe('BUSINESS_RULE_ERROR');
  });
});
