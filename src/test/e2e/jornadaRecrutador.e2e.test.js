import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { configurarIA, restaurarIA } from './setup/iaFalsa.js';
import {
  CRITERIO_NODE,
  publicarVaga,
  registrarCandidato,
  montarCurriculo,
  candidatarEResponder,
  aguardarAvaliacao,
} from './setup/cenarios.js';

// Jornada do recrutador: monta a vaga e o questionario, ativa, acompanha a
// fila de candidatos, decide e consulta os relatorios.
describe('E2E — jornada do recrutador', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  it('monta vaga com questionário de múltipla escolha, reordena perguntas e ativa', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');

    const vaga = await recrutador
      .post('/api/vagas')
      .send({
        area: 'TI',
        titulo: 'Analista de Dados',
        descricao: 'Vaga para análise de dados com SQL e Python.',
        criterio_vaga: [CRITERIO_NODE],
      })
      .expect(201);
    const vagaId = vaga.body.data._id;
    expect(vaga.body.data.status).toBe('pausada');

    // Sem questionario ativo a vaga nao pode ser ativada.
    const semQuestionario = await recrutador.patch(`/api/vagas/${vagaId}`).send({ status: 'ativa' }).expect(400);
    expect(semQuestionario.body.error.code).toBe('BUSINESS_RULE_ERROR');

    const questionario = await recrutador
      .post('/api/questionario')
      .send({ vagaId, criadoPor: recrutador.id, titulo: 'Triagem de dados' })
      .expect(201);
    const questionarioId = questionario.body.data.id;

    const p1 = await recrutador
      .post('/api/pergunta')
      .send({ questionarioId, enunciado: 'Qual linguagem você mais usa?', tipoResposta: 'multipla_escolha', peso: 1, ordem: 1 })
      .expect(201);
    const p2 = await recrutador
      .post('/api/pergunta')
      .send({ questionarioId, enunciado: 'Descreva um projeto seu.', tipoResposta: 'dissertativa', peso: 1, ordem: 2 })
      .expect(201);
    const perguntaId = p1.body.data.id;

    await recrutador.post(`/api/pergunta/${perguntaId}/opcao`).send({ texto: 'Python', ordem: 1 }).expect(201);
    await recrutador.post(`/api/pergunta/${perguntaId}/opcao`).send({ texto: 'SQL', ordem: 2 }).expect(201);

    await recrutador
      .patch('/api/pergunta/reordenar')
      .send({
        questionarioId,
        perguntas: [
          { id: p2.body.data.id, ordem: 1 },
          { id: perguntaId, ordem: 2 },
        ],
      })
      .expect(200);

    const perguntas = await recrutador.get(`/api/pergunta?questionarioId=${questionarioId}`).expect(200);
    const ordenadas = [...perguntas.body.data].sort((a, b) => a.ordem - b.ordem);
    expect(ordenadas.map((p) => p.id)).toEqual([p2.body.data.id, perguntaId]);

    const ativada = await recrutador.patch(`/api/vagas/${vagaId}`).send({ status: 'ativa' }).expect(200);
    expect(ativada.body.data.status).toBe('ativa');

    await recrutador.patch(`/api/vagas/${vagaId}`).send({ status: 'arquivada' }).expect(200);
    // Arquivada e estado final.
    await recrutador.patch(`/api/vagas/${vagaId}`).send({ status: 'ativa' }).expect(400);
  });

  it('acompanha a fila, abre a ficha, decide a candidatura e consulta relatórios', async () => {
    configurarIA({ aderencia: 0.9 });
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);

    const candidato = await registrarCandidato(app);
    await montarCurriculo(candidato);
    await candidatarEResponder(candidato, vaga);
    await aguardarAvaliacao(candidato.id, vaga.vagaId);

    // Fila do recrutador: identifica o candidato e nao expoe a triagem.
    const fila = await recrutador.get(`/api/vagas/${vaga.vagaId}/candidaturas`).expect(200);
    expect(fila.body.data).toHaveLength(1);
    const [item] = fila.body.data;
    expect(item.candidato.email).toBe(candidato.email);
    expect(item.status).toBe('em_analise');
    expect(item.movidoPor).not.toBe('ia');
    expect(item).not.toHaveProperty('scoreIA');
    expect(item).not.toHaveProperty('limiteAplicado');

    // Curriculo do candidato: o recrutador le, mas nao edita.
    await recrutador.get(`/api/usuarios/${candidato.id}/habilidade`).expect(200);
    await recrutador
      .post(`/api/usuarios/${candidato.id}/habilidade`)
      .send({ habilidade: 'Java', nivel: 'basico' })
      .expect(403);

    const ficha = await recrutador.get(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/ficha`).expect(200);
    expect(ficha.body.data.candidato.email).toBe(candidato.email);
    expect(JSON.stringify(ficha.body.data)).not.toContain('scoreIA');

    const status = (novo) =>
      recrutador.patch(`/api/usuarios/${candidato.id}/candidatura/${vaga.vagaId}/status`).send({ status: novo });

    await status('aprovado').expect(200);
    // Reabertura para corrigir a decisao, depois reprovacao.
    await status('em_analise').expect(200);
    await status('reprovado').expect(200);
    const invalida = await status('inscrito').expect(400);
    expect(invalida.body.error.code).toBe('BUSINESS_RULE_ERROR');

    const relatorioVaga = await recrutador.get(`/api/vagas/${vaga.vagaId}/relatorio`).expect(200);
    expect(relatorioVaga.body.data.vaga.id).toBe(vaga.vagaId);
    expect(relatorioVaga.body.data.candidaturas.total).toBe(1);
    expect(relatorioVaga.body.data.candidaturas.porStatus.reprovado).toBe(1);

    const geral = await recrutador.get('/api/vagas/relatorio').expect(200);
    expect(geral.body.data.vagas.total).toBe(1);
    expect(geral.body.data.candidaturas.total).toBe(1);
  });
});
