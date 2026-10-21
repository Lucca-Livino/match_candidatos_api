import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import AvaliacaoCandidaturaService from '../../service/AvaliacaoCandidaturaService.js';
import Candidatura from '../../models/Candidatura.js';

const PAYLOAD = {
  vaga: {
    titulo: 'Front-end',
    area: 'TI',
    descricao: 'Interfaces.',
    requisitos_gerais: '',
    criterios: [
      {
        id: 'crit-1',
        nome: 'React',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 60,
        obrigatorio: true,
        descricao: '',
      },
    ],
  },
  curriculo: {
    habilidades: [{ habilidade: 'React', nivel: 'avancado' }],
    formacoes: [],
    experiencias: [],
    certificacoes: [],
  },
  questionario: { titulo: 'Triagem', respostas: [] },
};

const fakes = ({ payload = PAYLOAD, score = 0.84, limite = 0.7, iaFalha = false } = {}) => ({
  payloadService: { montar: jest.fn().mockResolvedValue(payload) },
  matchIAService: {
    avaliar: iaFalha
      ? jest.fn().mockRejectedValue(new Error('down'))
      : jest.fn().mockResolvedValue({
          score,
          criterios: [],
          resumo: 'Perfil aderente.',
          // O modelo que DE FATO respondeu vem do proprio MatchIAService: com
          // cascata, o degrau que atendeu e decisao de runtime.
          modeloUsado: 'gemini-3.1-flash-lite',
        }),
  },
  configuracaoService: {
    obter: jest.fn().mockResolvedValue({
      limiteCompatibilidade: limite,
      provedor: 'gemini',
      cascata: ['gemini-3.1-flash-lite', 'gemini-3.1-flash'],
      temperatura: 0,
      ativo: true,
    }),
  },
});

describe('AvaliacaoCandidaturaService', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const montarService = (opts) => {
    const f = fakes(opts);
    return new AvaliacaoCandidaturaService(f.payloadService, f.matchIAService, f.configuracaoService);
  };

  it('marca compativel quando o score atinge o limiar', async () => {
    await Candidatura.create({ usuarioId: 'u1', vagaId: 'v1' });
    const service = montarService({ score: 0.84, limite: 0.7 });

    await service.avaliar('u1', 'v1');

    const doc = await Candidatura.findOne({ usuarioId: 'u1', vagaId: 'v1' }).lean();
    expect(doc.compativel).toBe(1);
    expect(doc.scoreIA).toBe(0.84);
    expect(doc.limiteAplicado).toBe(0.7);
    expect(doc.versaoModelo).toBe('gemini/gemini-3.1-flash-lite');
    expect(doc.avaliadoEm).toBeInstanceOf(Date);
    expect(doc.motivoIncompat_).toBe('');
  });

  it('passa a cascata inteira para o MatchIAService, nao um modelo', async () => {
    // Quem escolhe o degrau e a cascata, em runtime, pelo estado da cota.
    // Se o orquestrador mandasse um modelo unico, a cascata nao existiria.
    await Candidatura.create({ usuarioId: 'u6', vagaId: 'v6' });
    const f = fakes();
    const service = new AvaliacaoCandidaturaService(
      f.payloadService,
      f.matchIAService,
      f.configuracaoService,
    );

    await service.avaliar('u6', 'v6');

    expect(f.matchIAService.avaliar).toHaveBeenCalledWith(PAYLOAD, {
      provedor: 'gemini',
      cascata: ['gemini-3.1-flash-lite', 'gemini-3.1-flash'],
      temperatura: 0,
    });
  });

  it('marca incompativel quando o score fica abaixo do limiar', async () => {
    await Candidatura.create({ usuarioId: 'u2', vagaId: 'v2' });
    const service = montarService({ score: 0.42, limite: 0.7 });

    await service.avaliar('u2', 'v2');

    const doc = await Candidatura.findOne({ usuarioId: 'u2', vagaId: 'v2' }).lean();
    expect(doc.compativel).toBe(0);
    expect(doc.scoreIA).toBe(0.42);
    expect(doc.motivoIncompat_).toContain('abaixo do limiar');
  });

  it('reprova no gate sem chamar a IA quando falta criterio obrigatorio', async () => {
    await Candidatura.create({ usuarioId: 'u3', vagaId: 'v3' });
    const payloadSemReact = {
      ...PAYLOAD,
      curriculo: { habilidades: [], formacoes: [], experiencias: [], certificacoes: [] },
    };
    const f = fakes({ payload: payloadSemReact });
    const service = new AvaliacaoCandidaturaService(
      f.payloadService,
      f.matchIAService,
      f.configuracaoService,
    );

    await service.avaliar('u3', 'v3');

    expect(f.matchIAService.avaliar).not.toHaveBeenCalled();
    const doc = await Candidatura.findOne({ usuarioId: 'u3', vagaId: 'v3' }).lean();
    expect(doc.compativel).toBe(0);
    expect(doc.scoreIA).toBe(0);
    expect(doc.motivoIncompat_).toContain('React');
  });

  it('deixa a candidatura sem avaliacao quando a IA falha', async () => {
    await Candidatura.create({ usuarioId: 'u4', vagaId: 'v4' });
    const service = montarService({ iaFalha: true });

    await service.avaliar('u4', 'v4');

    const doc = await Candidatura.findOne({ usuarioId: 'u4', vagaId: 'v4' }).lean();
    expect(doc.avaliadoEm).toBeNull();
    expect(doc.scoreIA).toBeNull();
  });

  it('nao chama a IA quando a integracao esta desligada', async () => {
    await Candidatura.create({ usuarioId: 'u5', vagaId: 'v5' });
    const f = fakes();
    f.configuracaoService.obter.mockResolvedValue({
      limiteCompatibilidade: 0.7,
      provedor: 'gemini',
      cascata: ['gemini-3.1-flash-lite'],
      temperatura: 0,
      ativo: false,
    });
    const service = new AvaliacaoCandidaturaService(
      f.payloadService,
      f.matchIAService,
      f.configuracaoService,
    );

    await service.avaliar('u5', 'v5');

    expect(f.matchIAService.avaliar).not.toHaveBeenCalled();
    const doc = await Candidatura.findOne({ usuarioId: 'u5', vagaId: 'v5' }).lean();
    expect(doc.avaliadoEm).toBeNull();
  });
});
