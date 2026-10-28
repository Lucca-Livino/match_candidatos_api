import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { configurarIA, restaurarIA } from './setup/iaFalsa.js';
import {
  publicarVaga,
  registrarCandidato,
  montarCurriculo,
  candidatarEResponder,
  aguardarAvaliacao,
} from './setup/cenarios.js';

// Jornada completa do candidato contra o app real: registro publico, login no
// better-auth, curriculo, candidatura, questionario e a triagem por IA que o
// finalizar dispara. So a chamada ao Gemini e simulada.
describe('E2E — jornada do candidato', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  const prepararCandidatura = async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    expect(candidato.me.tipos_permissao).toEqual(['candidato']);
    return { vaga, candidato };
  };

  it('candidatura compatível é promovida para em análise pela triagem', async () => {
    const ia = configurarIA({ aderencia: 0.9 });
    const { vaga, candidato } = await prepararCandidatura();

    await montarCurriculo(candidato);
    const habilidades = await candidato.get(`/api/usuarios/${candidato.id}/habilidade`).expect(200);
    expect(habilidades.body.data).toHaveLength(1);

    const vagas = await candidato.get('/api/vagas').expect(200);
    expect(JSON.stringify(vagas.body.data)).toContain(vaga.vagaId);

    await candidatarEResponder(candidato, vaga);
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(ia).toHaveBeenCalledTimes(1);
    expect(avaliada.scoreIA).toBe(0.9);
    expect(avaliada.compativel).toBe(1);
    expect(avaliada.status).toBe('em_analise');

    // O candidato ve a mudanca de status, mas nunca a nota da triagem.
    const minha = await candidato.get(`/api/usuarios/${candidato.id}/candidatura/${vaga.vagaId}`).expect(200);
    expect(minha.body.data.status).toBe('em_analise');
    expect(minha.body.data).not.toHaveProperty('scoreIA');
    expect(minha.body.data).not.toHaveProperty('limiteAplicado');
  });

  it('candidatura abaixo do limite fica como inscrita e marcada incompatível', async () => {
    configurarIA({ aderencia: 0.3 });
    const { vaga, candidato } = await prepararCandidatura();

    await montarCurriculo(candidato);
    await candidatarEResponder(candidato, vaga);
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(avaliada.scoreIA).toBe(0.3);
    expect(avaliada.compativel).toBe(0);
    expect(avaliada.status).toBe('inscrito');
  });

  it('candidato cancela a própria candidatura enquanto está inscrito', async () => {
    configurarIA();
    const { vaga, candidato } = await prepararCandidatura();

    await candidato.post(`/api/usuarios/${candidato.id}/candidatura`).send({ vagaId: vaga.vagaId }).expect(201);
    await candidato.delete(`/api/usuarios/${candidato.id}/candidatura/${vaga.vagaId}`).expect(200);

    const lista = await candidato.get(`/api/usuarios/${candidato.id}/candidatura`).expect(200);
    expect(lista.body.data).toHaveLength(0);
  });
});
