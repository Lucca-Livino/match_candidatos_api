import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { configurarIA, derrubarIA, restaurarIA } from './setup/iaFalsa.js';
import {
  publicarVaga,
  registrarCandidato,
  montarCurriculo,
  candidatarEResponder,
  aguardarAvaliacao,
  aguardarDisparo,
} from './setup/cenarios.js';

// Jornada do suporte: calibra a integracao, audita a triagem (unico papel que
// ve o score) e reprocessa o que ficou pendente quando a IA falhou.
describe('E2E — jornada do suporte', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  const prepararCandidaturaFinalizada = async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await montarCurriculo(candidato);
    await candidatarEResponder(candidato, vaga);
    return { recrutador, vaga, candidato };
  };

  it('ajusta o limite de compatibilidade e a triagem passa a usar o novo valor', async () => {
    configurarIA({ aderencia: 0.6 });
    const suporte = await criarUsuarioLogado(app, 'suporte');

    const config = await suporte.get('/api/configuracao-integracao').expect(200);
    expect(config.body.data.limiteCompatibilidade).toBe(0.7);
    // A chave nunca sai da API, so o indicador de que esta configurada.
    expect(config.body.data.chavesConfiguradas).toEqual({ gemini: true });

    await suporte.patch('/api/configuracao-integracao').send({ limiteCompatibilidade: 0.5 }).expect(200);

    const { vaga, candidato } = await prepararCandidaturaFinalizada();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(avaliada.limiteAplicado).toBe(0.5);
    expect(avaliada.compativel).toBe(1);
    expect(avaliada.status).toBe('em_analise');
  });

  it('audita a triagem: /avaliacoes expõe score e limite aplicado', async () => {
    configurarIA({ aderencia: 0.8 });
    const suporte = await criarUsuarioLogado(app, 'suporte');
    const { vaga, candidato } = await prepararCandidaturaFinalizada();
    await aguardarAvaliacao(candidato.id, vaga.vagaId);

    const auditoria = await suporte.get('/api/avaliacoes').expect(200);
    expect(auditoria.body.data).toHaveLength(1);
    expect(auditoria.body.data[0]).toMatchObject({ scoreIA: 0.8, limiteAplicado: 0.7 });
  });

  it('IA fora do ar deixa a candidatura pendente e o suporte reprocessa', async () => {
    const iaFora = derrubarIA();
    const suporte = await criarUsuarioLogado(app, 'suporte');
    const { vaga, candidato } = await prepararCandidaturaFinalizada();
    await aguardarDisparo(iaFora);

    const pendentes = await suporte.get('/api/avaliacoes?pendentes=true').expect(200);
    expect(pendentes.body.data).toHaveLength(1);
    expect(pendentes.body.data[0].avaliadoEm ?? null).toBeNull();

    // Reprocessar com a IA ainda fora devolve 503, sem mexer na candidatura.
    const indisponivel = await suporte
      .post(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/reavaliar`)
      .expect(503);
    expect(indisponivel.body.error.code).toBe('AI_UNAVAILABLE');

    restaurarIA();
    configurarIA({ aderencia: 0.9 });

    await suporte.post(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/reavaliar`).expect(200);

    const restantes = await suporte.get('/api/avaliacoes?pendentes=true').expect(200);
    expect(restantes.body.data).toHaveLength(0);
  });

  it('kill switch: com a integração desativada nada é avaliado', async () => {
    const ia = configurarIA();
    const suporte = await criarUsuarioLogado(app, 'suporte');
    await suporte.patch('/api/configuracao-integracao').send({ ativo: false }).expect(200);

    await prepararCandidaturaFinalizada();
    // Da tempo ao disparo em segundo plano antes de conferir.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(ia).not.toHaveBeenCalled();
    const pendentes = await suporte.get('/api/avaliacoes?pendentes=true').expect(200);
    expect(pendentes.body.data).toHaveLength(1);
  });
});
