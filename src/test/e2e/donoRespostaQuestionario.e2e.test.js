import RespostaQuestionario from '../../models/RespostaQuestionario.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { configurarIA, restaurarIA } from './setup/iaFalsa.js';
import { publicarVaga, registrarCandidato } from './setup/cenarios.js';

// O RBAC libera as rotas de resposta de questionario por papel. Sem a guarda
// de dono no RespostaQuestionarioService, um candidato inscrito na mesma vaga
// iniciava, respondia, finalizava (disparando a triagem) e lia a resposta de
// outro so trocando o usuarioId do corpo ou o :id da URL.
describe('E2E — resposta de questionário pertence a quem está logado', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  // Vitima e atacante inscritos na mesma vaga; a vitima ja iniciou o questionario.
  const montarCenario = async () => {
    configurarIA();
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);

    const vitima = await registrarCandidato(app, { email: 'vitima@e2e.test', nome: 'Vítima' });
    const atacante = await registrarCandidato(app, { email: 'atacante@e2e.test', nome: 'Atacante' });

    for (const candidato of [vitima, atacante]) {
      await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
    }

    const iniciada = await vitima
      .post('/api/resposta-questionario/iniciar')
      .send({ questionarioId: vaga.questionarioId, usuarioId: vitima.id })
      .expect(201);

    return { vaga, vitima, atacante, respostaDaVitimaId: iniciada.body.data.id };
  };

  it('candidato não inicia questionário em nome de outro', async () => {
    const { vaga, vitima, atacante } = await montarCenario();

    const res = await atacante
      .post('/api/resposta-questionario/iniciar')
      .send({ questionarioId: vaga.questionarioId, usuarioId: vitima.id });

    expect(res.status).toBe(403);
  });

  it('candidato não responde a resposta de questionário de outro', async () => {
    const { vaga, atacante, respostaDaVitimaId } = await montarCenario();

    const res = await atacante
      .post(`/api/resposta-questionario/${respostaDaVitimaId}/responder`)
      .send({ respostas: [{ perguntaId: vaga.perguntaId, textoResposta: 'Resposta forjada pelo atacante.' }] });

    expect(res.status).toBe(403);
  });

  it('candidato não finaliza a resposta de questionário de outro', async () => {
    const { atacante, respostaDaVitimaId } = await montarCenario();

    const res = await atacante.patch(`/api/resposta-questionario/${respostaDaVitimaId}/finalizar`);

    expect(res.status).toBe(403);
    const resposta = await RespostaQuestionario.findOne({ id: respostaDaVitimaId }).lean();
    expect(resposta.status).toBe('em_andamento');
  });

  it('candidato não lê a resposta de questionário de outro', async () => {
    const { atacante, respostaDaVitimaId } = await montarCenario();

    const res = await atacante.get(`/api/resposta-questionario/${respostaDaVitimaId}`);

    expect(res.status).toBe(403);
  });

  it('dono continua respondendo e finalizando a própria resposta', async () => {
    const { vaga, vitima, respostaDaVitimaId } = await montarCenario();

    await vitima
      .post(`/api/resposta-questionario/${respostaDaVitimaId}/responder`)
      .send({ respostas: [{ perguntaId: vaga.perguntaId, textoResposta: 'Minha resposta.' }] })
      .expect(200);
    await vitima.get(`/api/resposta-questionario/${respostaDaVitimaId}`).expect(200);
    await vitima.patch(`/api/resposta-questionario/${respostaDaVitimaId}/finalizar`).expect(200);
  });

  it('administrador segue com acesso à resposta de qualquer candidato', async () => {
    const { respostaDaVitimaId } = await montarCenario();
    const admin = await criarUsuarioLogado(app, 'administrador');

    await admin.get(`/api/resposta-questionario/${respostaDaVitimaId}`).expect(200);
  });
});
