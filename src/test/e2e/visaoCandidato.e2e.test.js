import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { publicarVaga, registrarCandidato } from './setup/cenarios.js';

// O que o candidato enxerga e onde consegue se inscrever: o questionario sem
// gabarito e so vagas ativas.
describe('E2E — visão do candidato', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  // Questionario com uma pergunta de multipla escolha e uma opcao correta.
  const publicarComGabarito = async (recrutador) => {
    const vaga = await publicarVaga(recrutador);
    const pergunta = await recrutador
      .post('/api/pergunta')
      .send({
        questionarioId: vaga.questionarioId,
        enunciado: 'Qual o runtime do Node.js?',
        tipoResposta: 'multipla_escolha',
        peso: 1,
        ordem: 2,
      })
      .expect(201);
    const perguntaId = pergunta.body.data.id;
    await recrutador.post(`/api/pergunta/${perguntaId}/opcao`).send({ texto: 'V8', correta: 1, ordem: 1 }).expect(201);
    await recrutador.post(`/api/pergunta/${perguntaId}/opcao`).send({ texto: 'JVM', correta: 0, ordem: 2 }).expect(201);
    return vaga;
  };

  const opcoesDe = (questionario) => questionario.perguntas.flatMap((p) => p.opcaoResposta ?? []);

  describe('gabarito do questionário', () => {
    it('candidato não recebe qual opção é a correta', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarComGabarito(recrutador);
      const candidato = await registrarCandidato(app);

      const res = await candidato.get(`/api/questionario/${vaga.questionarioId}`).expect(200);

      const opcoes = opcoesDe(res.body.data);
      expect(opcoes).toHaveLength(2);
      for (const opcao of opcoes) expect(opcao).not.toHaveProperty('correta');
    });

    // A resposta em andamento devolve as perguntas com as opcoes. Se o
    // gabarito viesse junto, bastava iniciar, consultar e so entao responder.
    it('candidato não recebe o gabarito ao consultar a própria resposta', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarComGabarito(recrutador);
      const candidato = await registrarCandidato(app);
      await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
      const iniciada = await candidato
        .post('/api/resposta-questionario/iniciar')
        .send({ questionarioId: vaga.questionarioId, usuarioId: candidato.id })
        .expect(201);

      const res = await candidato.get(`/api/resposta-questionario/${iniciada.body.data.id}`).expect(200);

      const opcoes = opcoesDe(res.body.data.questionario);
      expect(opcoes).toHaveLength(2);
      for (const opcao of opcoes) expect(opcao).not.toHaveProperty('correta');
    });

    it('administrador vê o gabarito ao consultar a resposta de um candidato', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarComGabarito(recrutador);
      const candidato = await registrarCandidato(app);
      await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
      const iniciada = await candidato
        .post('/api/resposta-questionario/iniciar')
        .send({ questionarioId: vaga.questionarioId, usuarioId: candidato.id })
        .expect(201);
      const admin = await criarUsuarioLogado(app, 'administrador');

      const res = await admin.get(`/api/resposta-questionario/${iniciada.body.data.id}`).expect(200);

      expect(opcoesDe(res.body.data.questionario).map((o) => o.correta)).toEqual([1, 0]);
    });

    it('recrutador continua vendo o gabarito', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarComGabarito(recrutador);

      const res = await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(200);

      expect(opcoesDe(res.body.data).map((o) => o.correta)).toEqual([1, 0]);
    });
  });

  describe('vagas fora do ar', () => {
    it.each([['pausada'], ['arquivada']])('candidato não se inscreve em vaga %s', async (status) => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarVaga(recrutador);
      await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status }).expect(200);
      const candidato = await registrarCandidato(app);

      const res = await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId });

      expect(res.status).toBe(400);
    });

    it('candidato não se inscreve em vaga inexistente', async () => {
      const candidato = await registrarCandidato(app);

      const res = await candidato
        .post(`/api/usuarios/${candidato.id}/candidatura`)
        .send({ vagaId: '000000000000000000000000' });

      expect(res.status).toBe(404);
    });

    it('listagem do candidato só traz vagas ativas, mesmo pedindo outro status', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const ativa = await publicarVaga(recrutador);
      const pausada = await publicarVaga(recrutador, { ativar: false });
      const candidato = await registrarCandidato(app);

      for (const url of ['/api/vagas', '/api/vagas?status=pausada']) {
        const res = await candidato.get(url).expect(200);
        const ids = res.body.data.docs.map((v) => String(v._id));
        expect(ids).toContain(ativa.vagaId);
        expect(ids).not.toContain(pausada.vagaId);
      }
    });

    it('candidato não abre pelo id uma vaga fora do ar a que não se candidatou', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const pausada = await publicarVaga(recrutador, { ativar: false });
      const candidato = await registrarCandidato(app);

      await candidato.get(`/api/vagas/${pausada.vagaId}`).expect(404);
    });

    // As telas de "minhas candidaturas" buscam a vaga pelo id: pausar a vaga
    // depois da inscricao nao pode quebrar o acompanhamento do candidato.
    it('candidato inscrito continua abrindo a vaga depois de pausada', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const vaga = await publicarVaga(recrutador);
      const candidato = await registrarCandidato(app);
      await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);

      await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'pausada' }).expect(200);

      const res = await candidato.get(`/api/vagas/${vaga.vagaId}`).expect(200);
      expect(res.body.data.status).toBe('pausada');
    });

    it('recrutador continua listando vagas pausadas', async () => {
      const recrutador = await criarUsuarioLogado(app, 'recrutador');
      const pausada = await publicarVaga(recrutador, { ativar: false });

      const res = await recrutador.get('/api/vagas').expect(200);

      expect(res.body.data.docs.map((v) => String(v._id))).toContain(pausada.vagaId);
    });
  });
});
