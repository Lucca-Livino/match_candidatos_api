import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import AvaliacaoCandidaturaService from '../../service/AvaliacaoCandidaturaService.js';
import CandidaturaService from '../../service/CandidaturaService.js';
import Candidatura from '../../models/Candidatura.js';

// Dublês: a avaliação real depende de rede e de configuração no banco.
const configuracaoFake = (ativo = true) => ({
  obter: async () => ({
    ativo,
    provedor: 'gemini',
    cascata: ['modelo-a'],
    temperatura: 0,
    limiteCompatibilidade: 0.7,
  }),
});

const payloadFake = {
  montar: async () => ({
    vaga: { criterios: [] },
    curriculo: { habilidades: [], formacoes: [], experiencias: [], certificacoes: [] },
    questionario: { titulo: null, respostas: [] },
  }),
};

const iaFake = (score) => ({
  avaliar: async () => ({ score, resumo: 'analise de teste', modeloUsado: 'modelo-a' }),
});

const montarService = (score, ativo = true) =>
  new AvaliacaoCandidaturaService(payloadFake, iaFake(score), configuracaoFake(ativo));

describe('Pre-aprovacao: candidatura compativel entra em em_analise', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const semear = (status = 'inscrito') =>
    Candidatura.create({ usuarioId: 'u1', vagaId: 'v1', status });

  it('compativel e promovido para em_analise, com movidoPor = ia', async () => {
    await semear();
    await montarService(0.9).avaliar('u1', 'v1');

    const doc = await Candidatura.findOne({ usuarioId: 'u1', vagaId: 'v1' }).lean();
    expect(doc.status).toBe('em_analise');
    expect(doc.movidoPor).toBe('ia');
    expect(doc.compativel).toBe(1);
  });

  it('incompativel permanece em inscrito', async () => {
    await semear();
    await montarService(0.3).avaliar('u1', 'v1');

    const doc = await Candidatura.findOne({ usuarioId: 'u1', vagaId: 'v1' }).lean();
    expect(doc.status).toBe('inscrito');
    expect(doc.compativel).toBe(0);
  });

  // A decisao humana vale mais que a da IA: uma reavaliacao nao pode puxar de
  // volta quem o recrutador ja aprovou.
  it('nao regride status ja decidido pelo recrutador', async () => {
    await semear('aprovado');
    await montarService(0.9).avaliar('u1', 'v1');

    const doc = await Candidatura.findOne({ usuarioId: 'u1', vagaId: 'v1' }).lean();
    expect(doc.status).toBe('aprovado');
    expect(doc.movidoPor).toBe('sistema');
  });
});

describe('Visao do suporte vs visao do recrutador', () => {
  const service = new CandidaturaService();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const semear = () =>
    Candidatura.create([
      {
        usuarioId: 'u-avaliado',
        vagaId: 'v1',
        scoreIA: 0.82,
        limiteAplicado: 0.7,
        compativel: 1,
        versaoModelo: 'gemini/modelo-a',
        avaliadoEm: new Date(),
        justificativa: 'analise',
      },
      { usuarioId: 'u-pendente', vagaId: 'v1' },
    ]);

  it('o suporte enxerga score e limiar', async () => {
    await semear();
    const lista = await service.listarParaAuditoria();

    const avaliada = lista.find((c) => c.usuarioId === 'u-avaliado');
    expect(avaliada.scoreIA).toBe(0.82);
    expect(avaliada.limiteAplicado).toBe(0.7);
    expect(avaliada.versaoModelo).toBe('gemini/modelo-a');
  });

  it('o recrutador continua sem enxergar score', async () => {
    await semear();
    for (const item of await service.listarPorVaga('v1')) {
      expect(item.scoreIA).toBeUndefined();
      expect(item.limiteAplicado).toBeUndefined();
    }
  });

  it('filtra as pendentes para o suporte detectar falha da IA', async () => {
    await semear();
    const pendentes = await service.listarParaAuditoria({ apenasPendentes: true });

    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].usuarioId).toBe('u-pendente');
  });
});
