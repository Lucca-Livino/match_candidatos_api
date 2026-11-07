import AvaliacaoCandidaturaService, { SEM_CRITERIOS } from '../../../service/AvaliacaoCandidaturaService.js';
import AvaliacaoPayloadService from '../../../service/AvaliacaoPayloadService.js';
import MatchIAService from '../../../service/MatchIAService.js';
import ConfiguracaoIntegracaoService from '../../../service/ConfiguracaoIntegracaoService.js';
import CandidaturaRepository from '../../../repository/CandidaturaRepository.js';
import { avaliarObrigatorios } from '../../../utils/helpers/gateObrigatorios.js';
import { montarIndice } from '../../../utils/helpers/indiceCatalogo.js';
import { detectarInjecao } from '../../../utils/helpers/detectarInjecao.js';

jest.mock('../../../service/AvaliacaoPayloadService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ padrao: 'payload' })),
}));
jest.mock('../../../service/MatchIAService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ padrao: 'match' })),
}));
jest.mock('../../../service/ConfiguracaoIntegracaoService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ padrao: 'configuracao' })),
}));
jest.mock('../../../repository/CandidaturaRepository.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ padrao: 'candidatura' })),
}));
jest.mock('../../../utils/helpers/gateObrigatorios.js', () => ({ __esModule: true, avaliarObrigatorios: jest.fn() }));
jest.mock('../../../utils/helpers/indiceCatalogo.js', () => ({ __esModule: true, montarIndice: jest.fn() }));
jest.mock('../../../utils/helpers/detectarInjecao.js', () => ({ __esModule: true, detectarInjecao: jest.fn() }));

const AGORA = new Date('2026-11-02T12:00:00.000Z');
const USUARIO_ID = 'usuario-1';
const VAGA_ID = 'vaga-1';

const configBase = {
  ativo: true,
  provedor: 'gemini',
  cascata: ['modelo-a', 'modelo-b'],
  temperatura: 0.2,
  limiteCompatibilidade: 0.6,
};

const criterios = [
  { id: 'c1', nome: 'React', peso_percentual: 60, obrigatorio: true },
  { id: 'c2', nome: 'Inglês', peso_percentual: 40, obrigatorio: false },
];

const verificacao = { criterios: ['obrigatorio'], curriculo: { habilidades: [] }, indice: { porId: new Map() } };

const montarPayload = (extra = {}) => ({ vaga: { criterios }, curriculo: {}, verificacao, ...extra });

const resultadoIA = (aderencias, extra = {}) => ({
  criterios: [
    { criterioId: 'c1', aderencia: aderencias[0], evidencia: 'Usa React', atendido: true },
    { criterioId: 'c2', aderencia: aderencias[1], evidencia: 'Fluente', atendido: true },
  ],
  resumo: 'Resumo da IA',
  modeloUsado: 'modelo-b',
  ...extra,
});

const criarService = ({ config = configBase, payload = montarPayload(), resultado, erroIA, atual } = {}) => {
  const payloadService = { montar: jest.fn().mockResolvedValue(payload) };
  const matchIAService = {
    avaliar: erroIA ? jest.fn().mockRejectedValue(erroIA) : jest.fn().mockResolvedValue(resultado),
  };
  const configuracaoService = { obter: jest.fn().mockResolvedValue(config) };
  const candidaturaRepository = {
    atualizarPorUsuarioEVaga: jest.fn().mockImplementation(async (u, v, dados) => ({ salvo: true, ...dados })),
    buscarPorUsuarioEVaga: jest.fn().mockResolvedValue(atual),
  };
  const service = new AvaliacaoCandidaturaService(
    payloadService,
    matchIAService,
    configuracaoService,
    candidaturaRepository,
  );
  return { service, payloadService, matchIAService, configuracaoService, candidaturaRepository };
};

const dadosPersistidos = (candidaturaRepository) => candidaturaRepository.atualizarPorUsuarioEVaga.mock.calls[0][2];

describe('AvaliacaoCandidaturaService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AGORA.getTime());
    avaliarObrigatorios.mockReset().mockReturnValue({ aprovado: true, motivos: [] });
    montarIndice.mockReset().mockReturnValue({ indiceVazio: true });
    detectarInjecao.mockReset().mockReturnValue([]);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('SEM_CRITERIOS é um marcador congelado', () => {
    expect(SEM_CRITERIOS).toEqual({ semCriterios: true });
    expect(Object.isFrozen(SEM_CRITERIOS)).toBe(true);
  });

  it('sem argumentos, instancia as dependências padrão', () => {
    const service = new AvaliacaoCandidaturaService();

    expect(AvaliacaoPayloadService).toHaveBeenCalled();
    expect(MatchIAService).toHaveBeenCalled();
    expect(ConfiguracaoIntegracaoService).toHaveBeenCalled();
    expect(CandidaturaRepository).toHaveBeenCalled();
    expect(service.payloadService).toEqual({ padrao: 'payload' });
    expect(service.matchIAService).toEqual({ padrao: 'match' });
    expect(service.configuracaoService).toEqual({ padrao: 'configuracao' });
    expect(service.candidaturaRepository).toEqual({ padrao: 'candidatura' });
  });

  it('persistir delega ao repositório por usuário e vaga', async () => {
    const { service, candidaturaRepository } = criarService();

    await expect(service.persistir(USUARIO_ID, VAGA_ID, { scoreIA: 1 })).resolves.toEqual({ salvo: true, scoreIA: 1 });
    expect(candidaturaRepository.atualizarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID, { scoreIA: 1 });
  });

  describe('promoverSeCompativel', () => {
    it('reprovada não promove nem consulta a candidatura', async () => {
      const { service, candidaturaRepository } = criarService({ atual: { status: 'inscrito' } });

      await expect(service.promoverSeCompativel(USUARIO_ID, VAGA_ID, false)).resolves.toEqual({});
      expect(candidaturaRepository.buscarPorUsuarioEVaga).not.toHaveBeenCalled();
    });

    it.each([
      ['candidatura inexistente', null],
      ['status em_analise', { status: 'em_analise' }],
      ['status aprovado', { status: 'aprovado' }],
      ['status reprovado', { status: 'reprovado' }],
    ])('aprovada com %s não promove', async (_, atual) => {
      const { service } = criarService({ atual });

      await expect(service.promoverSeCompativel(USUARIO_ID, VAGA_ID, true)).resolves.toEqual({});
    });

    it('aprovada com status inscrito promove para em_analise pela IA', async () => {
      const { service, candidaturaRepository } = criarService({ atual: { status: 'inscrito' } });

      await expect(service.promoverSeCompativel(USUARIO_ID, VAGA_ID, true)).resolves.toEqual({
        status: 'em_analise',
        movidoPor: 'ia',
      });
      expect(candidaturaRepository.buscarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
    });
  });

  describe('avaliar', () => {
    it('kill switch desligado devolve null sem montar payload nem gravar', async () => {
      const { service, payloadService, matchIAService, candidaturaRepository } = criarService({
        config: { ...configBase, ativo: false },
      });

      await expect(service.avaliar(USUARIO_ID, VAGA_ID)).resolves.toBeNull();
      expect(payloadService.montar).not.toHaveBeenCalled();
      expect(matchIAService.avaliar).not.toHaveBeenCalled();
      expect(candidaturaRepository.atualizarPorUsuarioEVaga).not.toHaveBeenCalled();
    });

    it('vaga sem critérios devolve SEM_CRITERIOS sem gate, IA nem gravação', async () => {
      const { service, payloadService, matchIAService, candidaturaRepository } = criarService({
        payload: montarPayload({ vaga: { criterios: [] } }),
      });

      await expect(service.avaliar(USUARIO_ID, VAGA_ID)).resolves.toBe(SEM_CRITERIOS);
      expect(payloadService.montar).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(avaliarObrigatorios).not.toHaveBeenCalled();
      expect(matchIAService.avaliar).not.toHaveBeenCalled();
      expect(candidaturaRepository.atualizarPorUsuarioEVaga).not.toHaveBeenCalled();
    });

    it('confere o gate com a verificação do payload', async () => {
      const { service } = criarService({ resultado: resultadoIA([1, 1]), atual: { status: 'em_analise' } });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(avaliarObrigatorios).toHaveBeenCalledWith(verificacao.criterios, verificacao.curriculo, verificacao.indice);
      expect(montarIndice).not.toHaveBeenCalled();
    });

    it('payload sem verificação passa pelo gate vazio e segue para a IA', async () => {
      const { service, matchIAService } = criarService({
        payload: montarPayload({ verificacao: undefined }),
        resultado: resultadoIA([1, 1]),
        atual: { status: 'em_analise' },
      });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(montarIndice).toHaveBeenCalledWith([]);
      expect(avaliarObrigatorios).toHaveBeenCalledWith([], {}, { indiceVazio: true });
      expect(matchIAService.avaliar).toHaveBeenCalled();
    });

    describe('gate de obrigatórios reprovado', () => {
      it('grava reprovação sem chamar a IA nem promover', async () => {
        avaliarObrigatorios.mockReturnValue({
          aprovado: false,
          motivos: ['React: não encontrado no perfil.', 'Inglês: nível mínimo avançado, declarado básico.'],
        });
        const { service, matchIAService, candidaturaRepository } = criarService();

        const retorno = await service.avaliar(USUARIO_ID, VAGA_ID);

        expect(matchIAService.avaliar).not.toHaveBeenCalled();
        expect(candidaturaRepository.buscarPorUsuarioEVaga).not.toHaveBeenCalled();
        expect(candidaturaRepository.atualizarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID, {
          compativel: 0,
          scoreIA: 0,
          limiteAplicado: 0.6,
          versaoModelo: null,
          avaliadoEm: AGORA,
          justificativa:
            'Reprovado pela verificação automática de requisitos obrigatórios, sem consulta ao modelo de IA. '
            + 'React: não encontrado no perfil. Inglês: nível mínimo avançado, declarado básico.',
          motivoIncompat_:
            'Requisito obrigatório não atendido: React: não encontrado no perfil. '
            + 'Inglês: nível mínimo avançado, declarado básico.',
          criteriosAvaliados: [],
          suspeitaInjecao: { detectada: false, origens: [], trechos: [] },
        });
        expect(dadosPersistidos(candidaturaRepository)).not.toHaveProperty('movidoPor');
        expect(retorno).toEqual(expect.objectContaining({ salvo: true, compativel: 0 }));
      });

      it('trunca justificativa em 4000 e motivo em 500 caracteres', async () => {
        avaliarObrigatorios.mockReturnValue({ aprovado: false, motivos: ['x'.repeat(5000)] });
        const { service, candidaturaRepository } = criarService();

        await service.avaliar(USUARIO_ID, VAGA_ID);

        const dados = dadosPersistidos(candidaturaRepository);
        expect(dados.justificativa).toHaveLength(4000);
        expect(dados.motivoIncompat_).toHaveLength(500);
        expect(dados.motivoIncompat_.startsWith('Requisito obrigatório não atendido: x')).toBe(true);
      });
    });

    describe('falha na IA', () => {
      it.each([
        ['com detalhes', { causa: 'cascata esgotada' }, { causa: 'cascata esgotada' }],
        ['sem detalhes', undefined, null],
      ])('erro %s devolve null, registra o log e não grava', async (_, details, detalhesLog) => {
        const erro = Object.assign(new Error('Avaliação por IA indisponível.'), { details });
        const { service, candidaturaRepository } = criarService({ erroIA: erro });

        await expect(service.avaliar(USUARIO_ID, VAGA_ID)).resolves.toBeNull();
        expect(console.error).toHaveBeenCalledWith('[avaliacao] falha na IA', {
          usuarioId: USUARIO_ID,
          vagaId: VAGA_ID,
          erro: 'Avaliação por IA indisponível.',
          detalhes: detalhesLog,
        });
        expect(candidaturaRepository.atualizarPorUsuarioEVaga).not.toHaveBeenCalled();
      });
    });

    it('chama a IA com provedor, cascata e temperatura da configuração', async () => {
      const payload = montarPayload();
      const { service, matchIAService } = criarService({ payload, resultado: resultadoIA([1, 1]), atual: null });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(matchIAService.avaliar).toHaveBeenCalledWith(payload, {
        provedor: 'gemini',
        cascata: ['modelo-a', 'modelo-b'],
        temperatura: 0.2,
      });
    });

    it('score acima do limiar com status inscrito grava compatível e promove pela IA', async () => {
      const { service, candidaturaRepository } = criarService({
        resultado: resultadoIA([0.9, 0.5]),
        atual: { status: 'inscrito' },
      });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(candidaturaRepository.atualizarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID, {
        compativel: 1,
        scoreIA: 0.74,
        limiteAplicado: 0.6,
        versaoModelo: 'gemini/modelo-b',
        avaliadoEm: AGORA,
        justificativa: 'Resumo da IA',
        criteriosAvaliados: [
          {
            criterioId: 'c1',
            nome: 'React',
            peso: 60,
            obrigatorio: true,
            aderencia: 0.9,
            evidencia: 'Usa React',
            atendido: true,
            omitido: false,
          },
          {
            criterioId: 'c2',
            nome: 'Inglês',
            peso: 40,
            obrigatorio: false,
            aderencia: 0.5,
            evidencia: 'Fluente',
            atendido: true,
            omitido: false,
          },
        ],
        motivoIncompat_: '',
        suspeitaInjecao: { detectada: false, origens: [], trechos: [] },
        movidoPor: 'ia',
        status: 'em_analise',
      });
    });

    it('score igual ao limiar conta como compatível', async () => {
      const { service, candidaturaRepository } = criarService({
        resultado: resultadoIA([0.6, 0.6]),
        atual: { status: 'em_analise' },
      });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      const dados = dadosPersistidos(candidaturaRepository);
      expect(dados).toEqual(expect.objectContaining({ compativel: 1, scoreIA: 0.6, motivoIncompat_: '' }));
    });

    it('compatível fora de inscrito grava sem alterar status', async () => {
      const { service, candidaturaRepository } = criarService({
        resultado: resultadoIA([1, 1]),
        atual: { status: 'aprovado' },
      });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      const dados = dadosPersistidos(candidaturaRepository);
      expect(dados.compativel).toBe(1);
      expect(dados).not.toHaveProperty('movidoPor');
      expect(dados).not.toHaveProperty('status');
    });

    it('score abaixo do limiar grava incompatível sem consultar promoção', async () => {
      const { service, candidaturaRepository } = criarService({
        resultado: resultadoIA([0.5, 0.2]),
        atual: { status: 'inscrito' },
      });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(candidaturaRepository.buscarPorUsuarioEVaga).not.toHaveBeenCalled();
      const dados = dadosPersistidos(candidaturaRepository);
      expect(dados).toEqual(
        expect.objectContaining({
          compativel: 0,
          scoreIA: 0.38,
          motivoIncompat_: 'Compatibilidade abaixo do limiar definido para a triagem automática.',
        }),
      );
      expect(dados).not.toHaveProperty('status');
      expect(dados).not.toHaveProperty('movidoPor');
    });

    it('trunca a evidência de cada critério em 2000 caracteres', async () => {
      const resultado = resultadoIA([1, 1]);
      resultado.criterios[0].evidencia = 'e'.repeat(3000);
      const { service, candidaturaRepository } = criarService({ resultado, atual: null });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      const [c1, c2] = dadosPersistidos(candidaturaRepository).criteriosAvaliados;
      expect(c1.evidencia).toHaveLength(2000);
      expect(c2.evidencia).toBe('Fluente');
    });

    it('critério omitido pela IA entra com aderência 0 e evidência vazia', async () => {
      const resultado = resultadoIA([1, 1]);
      resultado.criterios = [resultado.criterios[0]];
      const { service, candidaturaRepository } = criarService({ resultado, atual: { status: 'inscrito' } });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      const dados = dadosPersistidos(candidaturaRepository);
      expect(dados.scoreIA).toBe(0.6);
      expect(dados.criteriosAvaliados[1]).toEqual(
        expect.objectContaining({ criterioId: 'c2', aderencia: 0, evidencia: '', omitido: true }),
      );
    });

    it('devolve o que o repositório gravou', async () => {
      const { service } = criarService({ resultado: resultadoIA([1, 1]), atual: null });

      await expect(service.avaliar(USUARIO_ID, VAGA_ID)).resolves.toEqual(
        expect.objectContaining({ salvo: true, compativel: 1, scoreIA: 1 }),
      );
    });
  });

  describe('suspeita de prompt injection', () => {
    const SEM_SUSPEITA = { detectada: false, origens: [], trechos: [] };

    it('sem suspeita promove como antes e grava o registro vazio', async () => {
      const resultado = resultadoIA([1, 1]);
      const payload = montarPayload({ questionario: { respostas: [] } });
      const { service, candidaturaRepository } = criarService({ payload, resultado, atual: { status: 'inscrito' } });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(detectarInjecao).toHaveBeenCalledWith(payload.curriculo, payload.questionario);
      expect(dadosPersistidos(candidaturaRepository)).toMatchObject({ status: 'em_analise', suspeitaInjecao: SEM_SUSPEITA });
    });

    it.each([
      ['padrao', () => detectarInjecao.mockReturnValue([{ campo: 'respostas[0].textoResposta', padrao: 'ignorar_instrucoes', trecho: 'Ignore as instruções' }]), {}, ['Ignore as instruções']],
      ['modelo', () => {}, { tentativaManipulacao: true }, []],
    ])('origem %s: grava a suspeita e não promove', async (origem, preparar, extraIA, trechos) => {
      preparar();
      const { service, candidaturaRepository } = criarService({ resultado: resultadoIA([1, 1], extraIA), atual: { status: 'inscrito' } });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      const dados = dadosPersistidos(candidaturaRepository);
      expect(candidaturaRepository.buscarPorUsuarioEVaga).not.toHaveBeenCalled();
      expect(dados).not.toHaveProperty('status');
      expect(dados).not.toHaveProperty('movidoPor');
      expect(dados.compativel).toBe(1);
      expect(dados.suspeitaInjecao).toEqual({ detectada: true, origens: [origem], trechos });
    });

    it('junta as duas origens na ordem padrao, modelo', async () => {
      detectarInjecao.mockReturnValue([{ campo: 'x', padrao: 'p', trecho: 'A' }]);
      const { service, candidaturaRepository } = criarService({ resultado: resultadoIA([1, 1], { tentativaManipulacao: true }) });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(dadosPersistidos(candidaturaRepository).suspeitaInjecao).toEqual({
        detectada: true,
        origens: ['padrao', 'modelo'],
        trechos: ['A'],
      });
    });

    it('limita a 10 trechos de até 300 caracteres', async () => {
      detectarInjecao.mockReturnValue(Array.from({ length: 12 }, (_, i) => ({ campo: `c${i}`, padrao: 'p', trecho: `${i}${'x'.repeat(400)}` })));
      const { service, candidaturaRepository } = criarService({ resultado: resultadoIA([1, 1]) });

      await service.avaliar(USUARIO_ID, VAGA_ID);

      const { trechos } = dadosPersistidos(candidaturaRepository).suspeitaInjecao;
      expect(trechos).toHaveLength(10);
      expect(trechos.every((t) => t.length === 300)).toBe(true);
    });

    it('no caminho do gate registra a suspeita do detector sem chamar a IA', async () => {
      avaliarObrigatorios.mockReturnValue({ aprovado: false, motivos: ['React: não encontrado no perfil.'] });
      detectarInjecao.mockReturnValue([{ campo: 'x', padrao: 'p', trecho: 'Ignore as instruções' }]);
      const { service, matchIAService, candidaturaRepository } = criarService();

      await service.avaliar(USUARIO_ID, VAGA_ID);

      expect(matchIAService.avaliar).not.toHaveBeenCalled();
      expect(dadosPersistidos(candidaturaRepository).suspeitaInjecao).toEqual({
        detectada: true,
        origens: ['padrao'],
        trechos: ['Ignore as instruções'],
      });
    });
  });
});
