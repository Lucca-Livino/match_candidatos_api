import { subirAmbiente, limparBanco, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';
import { simularGemini, respostaDoModelo, erro429, erroHttp, restaurarIA } from './setup/iaFalsa.js';
import {
  publicarVaga,
  registrarCandidato,
  montarCurriculo,
  candidatarEResponder,
  aguardarAvaliacao,
  aguardarDisparo,
} from './setup/cenarios.js';

const DEGRAU_1 = 'gemini-3.1-flash-lite';
const DEGRAU_2 = 'gemini-3.5-flash-lite';

describe('E2E — cascata de modelos e cota', () => {
  let app;

  beforeAll(async () => {
    app = await subirAmbiente();
  });
  beforeEach(() => {
    console.error.mockClear();
  });
  afterEach(async () => {
    restaurarIA();
    await limparBanco();
  });
  afterAll(derrubarAmbiente);

  const finalizarCandidatura = async () => {
    const recrutador = await criarUsuarioLogado(app, 'recrutador');
    const vaga = await publicarVaga(recrutador);
    const candidato = await registrarCandidato(app);
    await montarCurriculo(candidato);
    await candidatarEResponder(candidato, vaga);
    return { vaga, candidato };
  };

  const falhasRegistradas = () =>
    console.error.mock.calls.filter(([msg]) => msg === '[avaliacao] falha na IA').map(([, dados]) => dados);

  it('usa o primeiro degrau quando ele responde', async () => {
    const { chamadas } = simularGemini((modelo, tentativa, payload) => respostaDoModelo(payload, 0.9));
    const { vaga, candidato } = await finalizarCandidatura();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(chamadas).toEqual([DEGRAU_1]);
    expect(avaliada.versaoModelo).toBe(`gemini/${DEGRAU_1}`);
    expect(avaliada.status).toBe('em_analise');
  });

  it('cota diária esgotada no degrau 1 desce para o degrau 2 sem repetir', async () => {
    const { chamadas } = simularGemini((modelo, tentativa, payload) => {
      if (modelo === DEGRAU_1) throw erro429(modelo, 'dia');
      return respostaDoModelo(payload, 0.9);
    });
    const { vaga, candidato } = await finalizarCandidatura();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(chamadas).toEqual([DEGRAU_1, DEGRAU_2]);
    expect(avaliada.versaoModelo).toBe(`gemini/${DEGRAU_2}`);
    expect(avaliada.scoreIA).toBe(0.9);
  });

  it('limite por minuto espera e repete no mesmo degrau, sem descer', async () => {
    const { chamadas } = simularGemini((modelo, tentativa, payload) => {
      if (tentativa === 1) throw erro429(modelo, 'minuto');
      return respostaDoModelo(payload, 0.9);
    });
    const { vaga, candidato } = await finalizarCandidatura();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId, { tentativas: 100 });

    expect(chamadas).toEqual([DEGRAU_1, DEGRAU_1]);
    expect(avaliada.versaoModelo).toBe(`gemini/${DEGRAU_1}`);
  }, 15000);

  it('resposta fora do contrato desce de degrau', async () => {
    const { chamadas } = simularGemini((modelo, tentativa, payload) =>
      (modelo === DEGRAU_1 ? 'isto nao e JSON' : respostaDoModelo(payload, 0.8)));
    const { vaga, candidato } = await finalizarCandidatura();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(chamadas).toEqual([DEGRAU_1, DEGRAU_2]);
    expect(avaliada.versaoModelo).toBe(`gemini/${DEGRAU_2}`);
  });

  it('nota fora de 0 a 1 é recusada e o degrau seguinte avalia', async () => {
    const { chamadas } = simularGemini((modelo, tentativa, payload) =>
      respostaDoModelo(payload, modelo === DEGRAU_1 ? 1.5 : 0.8));
    const { vaga, candidato } = await finalizarCandidatura();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(chamadas).toEqual([DEGRAU_1, DEGRAU_2]);
    expect(avaliada.scoreIA).toBe(0.8);
  });

  it('erro determinístico não desce a cascata e deixa a candidatura pendente', async () => {
    const { espiao, chamadas } = simularGemini(() => {
      throw erroHttp(400, 'Invalid JSON payload received.');
    });
    await finalizarCandidatura();
    await aguardarDisparo(espiao);

    expect(chamadas).toEqual([DEGRAU_1]);
    const [falha] = falhasRegistradas();
    expect(falha.detalhes).toMatchObject({ motivo: 'erro deterministico', modelo: DEGRAU_1 });

    const suporte = await criarUsuarioLogado(app, 'suporte');
    const pendentes = await suporte.get('/api/avaliacoes?pendentes=true').expect(200);
    expect(pendentes.body.data).toHaveLength(1);
  });

  it('cascata esgotada deixa pendente, registra a trilha e o suporte reprocessa no dia seguinte', async () => {
    let cotaVoltou = false;
    const { espiao, chamadas } = simularGemini((modelo, tentativa, payload) => {
      if (!cotaVoltou) throw erro429(modelo, 'dia');
      return respostaDoModelo(payload, 0.9);
    });
    const { vaga, candidato } = await finalizarCandidatura();
    await aguardarDisparo(espiao, 2);

    expect(chamadas).toEqual([DEGRAU_1, DEGRAU_2]);
    const [falha] = falhasRegistradas();
    expect(falha.detalhes.causa).toBe('cascata esgotada');
    expect(falha.detalhes.trilha.esgotados.map((e) => [e.modelo, e.motivo])).toEqual([
      [DEGRAU_1, 'cota diaria (RPD) esgotada'],
      [DEGRAU_2, 'cota diaria (RPD) esgotada'],
    ]);

    const suporte = await criarUsuarioLogado(app, 'suporte');
    const reavaliar = () => suporte.post(`/api/vagas/${vaga.vagaId}/candidaturas/${candidato.id}/reavaliar`);
    const indisponivel = await reavaliar().expect(503);
    expect(indisponivel.body.error.code).toBe('AI_UNAVAILABLE');

    cotaVoltou = true;
    await reavaliar().expect(200);
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);
    expect(avaliada.versaoModelo).toBe(`gemini/${DEGRAU_1}`);
    expect(avaliada.status).toBe('em_analise');
  });

  it('segue a ordem de cascata configurada pelo suporte', async () => {
    const { chamadas } = simularGemini((modelo, tentativa, payload) => {
      if (modelo === DEGRAU_2) throw erro429(modelo, 'dia');
      return respostaDoModelo(payload, 0.9);
    });
    const suporte = await criarUsuarioLogado(app, 'suporte');
    await suporte.patch('/api/configuracao-integracao').send({ cascata: [DEGRAU_2, DEGRAU_1] }).expect(200);

    const { vaga, candidato } = await finalizarCandidatura();
    const avaliada = await aguardarAvaliacao(candidato.id, vaga.vagaId);

    expect(chamadas).toEqual([DEGRAU_2, DEGRAU_1]);
    expect(avaliada.versaoModelo).toBe(`gemini/${DEGRAU_1}`);
  });
});
