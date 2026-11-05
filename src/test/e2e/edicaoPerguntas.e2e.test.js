import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { publicarVaga, registrarCandidato } from './setup/cenarios.js';

describe('E2E — edição de perguntas e opções', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  const criarMultiplaEscolha = async (recrutador, questionarioId, ordem = 2) => {
    const pergunta = await recrutador
      .post('/api/pergunta')
      .send({ questionarioId, enunciado: 'Qual banco você mais usa?', tipoResposta: 'multipla_escolha', peso: 1, ordem })
      .expect(201);
    const perguntaId = pergunta.body.data.id;

    const postgres = await recrutador
      .post(`/api/pergunta/${perguntaId}/opcao`)
      .send({ texto: 'PostgreSQL', ordem: 1, correta: 1 })
      .expect(201);
    const mongo = await recrutador
      .post(`/api/pergunta/${perguntaId}/opcao`)
      .send({ texto: 'MongoDB', ordem: 2 })
      .expect(201);

    return { perguntaId, postgresId: postgres.body.data.id, mongoId: mongo.body.data.id };
  };

  it('edita a pergunta e lê de volta com as opções em ordem', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const { questionarioId } = await publicarVaga(recrutador, { ativar: false });
    const { perguntaId } = await criarMultiplaEscolha(recrutador, questionarioId);

    await recrutador
      .put(`/api/pergunta/${perguntaId}`)
      .send({ enunciado: 'Qual banco de dados você mais usa?', peso: 2 })
      .expect(200);

    const lida = await recrutador.get(`/api/pergunta/${perguntaId}`).expect(200);
    expect(lida.body.data.enunciado).toBe('Qual banco de dados você mais usa?');
    expect(lida.body.data.peso).toBe(2);
    expect(lida.body.data.opcaoResposta.map((o) => o.texto)).toEqual(['PostgreSQL', 'MongoDB']);
  });

  it('recusa ordem já usada por outra pergunta e edição vazia', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const { questionarioId, perguntaId: primeira } = await publicarVaga(recrutador, { ativar: false });
    const { perguntaId } = await criarMultiplaEscolha(recrutador, questionarioId);

    const conflito = await recrutador.put(`/api/pergunta/${perguntaId}`).send({ ordem: 1 }).expect(400);
    expect(conflito.body.error.code).toBe('BUSINESS_RULE_ERROR');

    await recrutador.put(`/api/pergunta/${perguntaId}`).send({}).expect(400);
    await recrutador.put(`/api/pergunta/${primeira}`).send({ ordem: 1 }).expect(200);
  });

  it('pergunta que vira dissertativa perde as opções', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const { questionarioId } = await publicarVaga(recrutador, { ativar: false });
    const { perguntaId } = await criarMultiplaEscolha(recrutador, questionarioId);

    const editada = await recrutador
      .put(`/api/pergunta/${perguntaId}`)
      .send({ tipoResposta: 'dissertativa' })
      .expect(200);
    expect(editada.body.data.opcaoResposta).toEqual([]);

    await recrutador.put(`/api/pergunta/${perguntaId}`).send({ tipoResposta: 'multipla_escolha' }).expect(200);
    const lida = await recrutador.get(`/api/pergunta/${perguntaId}`).expect(200);
    expect(lida.body.data.opcaoResposta).toEqual([]);
  });

  it('edita e remove opções, com uma só correta por pergunta', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const { questionarioId } = await publicarVaga(recrutador, { ativar: false });
    const { perguntaId, postgresId, mongoId } = await criarMultiplaEscolha(recrutador, questionarioId);
    const opcao = (id) => `/api/pergunta/${perguntaId}/opcao/${id}`;

    const duasCorretas = await recrutador.put(opcao(mongoId)).send({ correta: 1 }).expect(400);
    expect(duasCorretas.body.error.code).toBe('BUSINESS_RULE_ERROR');
    await recrutador.put(opcao(mongoId)).send({ ordem: 1 }).expect(400);

    await recrutador.put(opcao(postgresId)).send({ correta: 0 }).expect(200);
    const marcada = await recrutador.put(opcao(mongoId)).send({ correta: 1, texto: 'MongoDB Atlas' }).expect(200);
    expect(marcada.body.data).toMatchObject({ texto: 'MongoDB Atlas', correta: 1 });

    await recrutador.delete(opcao(postgresId)).expect(200);
    await recrutador.delete(opcao(postgresId)).expect(404);
    await recrutador.put(opcao(postgresId)).send({ texto: 'Fantasma' }).expect(404);

    const lida = await recrutador.get(`/api/pergunta/${perguntaId}`).expect(200);
    expect(lida.body.data.opcaoResposta.map((o) => o.id)).toEqual([mongoId]);
  });

  it('sem resposta, remove a pergunta junto com as opções', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const { perguntaId } = await criarMultiplaEscolha(recrutador, vaga.questionarioId);

    await recrutador.delete(`/api/pergunta/${perguntaId}`).expect(200);
    await recrutador.get(`/api/pergunta/${perguntaId}`).expect(404);

    const restantes = await recrutador.get(`/api/pergunta?questionarioId=${vaga.questionarioId}`).expect(200);
    expect(restantes.body.data.map((p) => p.id)).toEqual([vaga.perguntaId]);
  });

  it('questionário com resposta trava perguntas e opções, mas não título e instruções', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const { perguntaId: semResposta, mongoId } = await criarMultiplaEscolha(recrutador, vaga.questionarioId);

    const candidato = await registrarCandidato(app);
    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
    const iniciada = await candidato
      .post('/api/resposta-questionario/iniciar')
      .send({ questionarioId: vaga.questionarioId, usuarioId: candidato.id })
      .expect(201);
    await candidato
      .post(`/api/resposta-questionario/${iniciada.body.data.id}/responder`)
      .send({ respostas: [{ perguntaId: vaga.perguntaId, textoResposta: 'Resposta parcial.' }] })
      .expect(200);

    const respondida = await recrutador.delete(`/api/pergunta/${vaga.perguntaId}`).expect(400);
    expect(respondida.body.error.code).toBe('BUSINESS_RULE_ERROR');

    await recrutador.delete(`/api/pergunta/${semResposta}`).expect(400);
    await recrutador.put(`/api/pergunta/${semResposta}`).send({ enunciado: 'Mudou o sentido?' }).expect(400);
    await recrutador.delete(`/api/pergunta/${semResposta}/opcao/${mongoId}`).expect(400);
    await recrutador
      .post('/api/pergunta')
      .send({ questionarioId: vaga.questionarioId, enunciado: 'Pergunta nova?', tipoResposta: 'dissertativa', peso: 1, ordem: 3 })
      .expect(400);

    const editor = await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(200);
    expect(editor.body.data.respondido).toBe(true);
    await recrutador.put(`/api/questionario/${vaga.questionarioId}`).send({ titulo: 'Título revisado' }).expect(200);

    const restantes = await recrutador.get(`/api/pergunta?questionarioId=${vaga.questionarioId}`).expect(200);
    expect(restantes.body.data.map((p) => p.id)).toEqual([vaga.perguntaId, semResposta]);
  });
});
