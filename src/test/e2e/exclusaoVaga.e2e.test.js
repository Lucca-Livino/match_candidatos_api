import Candidatura from '../../models/Candidatura.js';
import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { publicarVaga, registrarCandidato } from './setup/cenarios.js';

describe('E2E — exclusão de vaga', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(limparBanco);
  afterAll(derrubarAmbiente);

  it('vaga sem candidatos sai com o questionário e as perguntas', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);

    const res = await recrutador.delete(`/api/vagas/${vaga.vagaId}`).expect(200);
    expect(res.body.data).toEqual({ id: vaga.vagaId, deletado: true });

    await recrutador.get(`/api/vagas/${vaga.vagaId}`).expect(404);
    await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(404);
    await recrutador.get(`/api/pergunta/${vaga.perguntaId}`).expect(404);

    const listagem = await recrutador.get('/api/vagas').expect(200);
    expect(JSON.stringify(listagem.body.data)).not.toContain(vaga.vagaId);
  });

  it('não exclui vaga com candidatura e deixa tudo como estava', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);

    const res = await recrutador.delete(`/api/vagas/${vaga.vagaId}`).expect(400);
    expect(res.body.error.code).toBe('BUSINESS_RULE_ERROR');

    await recrutador.get(`/api/vagas/${vaga.vagaId}`).expect(200);
    await recrutador.get(`/api/questionario/${vaga.questionarioId}`).expect(200);
    await candidato.get(`/api/usuarios/${candidato.id}/candidatura/${vaga.vagaId}`).expect(200);

    await recrutador.patch(`/api/vagas/${vaga.vagaId}`).send({ status: 'arquivada' }).expect(200);
  });

  it('resposta sobrevive ao cancelamento da candidatura e também impede a exclusão', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
    await candidato
      .post('/api/resposta-questionario/iniciar')
      .send({ questionarioId: vaga.questionarioId, usuarioId: candidato.id })
      .expect(201);
    await candidato.delete(`/api/usuarios/${candidato.id}/candidatura/${vaga.vagaId}`).expect(200);
    expect(await Candidatura.countDocuments({ vagaId: vaga.vagaId })).toBe(0);

    await recrutador.delete(`/api/vagas/${vaga.vagaId}`).expect(400);
    await recrutador.get(`/api/vagas/${vaga.vagaId}`).expect(200);
  });

  it('recusa id inválido e vaga já excluída', async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador, { ativar: false });

    const invalido = await recrutador.delete('/api/vagas/nao-e-objectid').expect(400);
    expect(invalido.body.error.code).toBe('VALIDATION_ERROR');

    await recrutador.delete(`/api/vagas/${vaga.vagaId}`).expect(200);
    await recrutador.delete(`/api/vagas/${vaga.vagaId}`).expect(404);
  });
});
