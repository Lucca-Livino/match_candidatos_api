import MatchIAService from './MatchIAService.js';
import { criarProvider } from './match/criarProvider.js';
import AppError from '../utils/helpers/AppError.js';
import {
  ErroDeIAPermanente,
  ErroDeIARecuperavel,
  ErroDeCotaDiaria,
  ErroDeRespostaInvalida,
} from '../utils/helpers/errosIA.js';

jest.mock('./match/criarProvider.js', () => ({ __esModule: true, criarProvider: jest.fn() }));

const AGORA = new Date('2026-11-02T12:00:00.000Z');
const payload = { vaga: { criterios: [] }, curriculo: {} };
const avaliacao = { criterios: [{ criterioId: 'c1', aderencia: 0.9 }], resumo: 'ok' };
const opcoes = { provedor: 'gemini', cascata: ['modelo-a', 'modelo-b', 'modelo-c'], temperatura: 0.2 };

const providerQue = (...respostas) => {
  const gerarAvaliacao = jest.fn();
  for (const r of respostas) {
    if (r instanceof Error) gerarAvaliacao.mockRejectedValueOnce(r);
    else gerarAvaliacao.mockResolvedValueOnce(r);
  }
  return { gerarAvaliacao };
};

describe('MatchIAService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AGORA.getTime());
    criarProvider.mockReset();
  });

  afterEach(() => jest.useRealTimers());

  it('usa o provider injetado sem consultar a fábrica', async () => {
    const provider = providerQue(avaliacao);

    const resultado = await new MatchIAService(provider).avaliar(payload, opcoes);

    expect(criarProvider).not.toHaveBeenCalled();
    expect(provider.gerarAvaliacao).toHaveBeenCalledTimes(1);
    expect(provider.gerarAvaliacao).toHaveBeenCalledWith(payload, { modelo: 'modelo-a', temperatura: 0.2 });
    expect(resultado).toEqual({ ...avaliacao, modeloUsado: 'modelo-a', degrausEsgotados: [] });
  });

  it('sem provider injetado, resolve pela fábrica com o nome do provedor', async () => {
    const provider = providerQue(avaliacao);
    criarProvider.mockReturnValue(provider);

    const resultado = await new MatchIAService().avaliar(payload, opcoes);

    expect(criarProvider).toHaveBeenCalledWith('gemini');
    expect(resultado.modeloUsado).toBe('modelo-a');
  });

  it.each([
    ['cota diária', new ErroDeCotaDiaria(null, 'modelo-a'), 'cota diaria (RPD) esgotada'],
    ['resposta inválida', new ErroDeRespostaInvalida('json_invalido'), 'json_invalido'],
    ['tentativas esgotadas', new ErroDeIARecuperavel('falha', { motivo: 'tentativas esgotadas' }), 'tentativas esgotadas'],
  ])('erro recuperável (%s) desce para o próximo degrau', async (_, erro, motivo) => {
    const provider = providerQue(erro, avaliacao);

    const resultado = await new MatchIAService(provider).avaliar(payload, opcoes);

    expect(provider.gerarAvaliacao).toHaveBeenNthCalledWith(2, payload, { modelo: 'modelo-b', temperatura: 0.2 });
    expect(resultado).toEqual({
      ...avaliacao,
      modeloUsado: 'modelo-b',
      degrausEsgotados: [{ modelo: 'modelo-a', motivo, em: AGORA.toISOString() }],
    });
  });

  it.each([
    ['permanente', new ErroDeIAPermanente('bad request', { motivo: 'requisição inválida' }), 'requisição inválida'],
    ['inesperado', new TypeError('x is undefined'), 'erro nao tratado pela estrategia'],
  ])('erro %s aborta com AI_UNAVAILABLE sem descer', async (_, erro, motivo) => {
    const provider = providerQue(erro, avaliacao);

    const promessa = new MatchIAService(provider).avaliar(payload, opcoes);

    await expect(promessa).rejects.toBeInstanceOf(AppError);
    await expect(promessa).rejects.toEqual(
      expect.objectContaining({
        message: 'Avaliação por IA indisponível.',
        statusCode: 503,
        code: 'AI_UNAVAILABLE',
        details: { causa: erro.message, motivo, modelo: 'modelo-a' },
      }),
    );
    expect(provider.gerarAvaliacao).toHaveBeenCalledTimes(1);
  });

  it('erro permanente depois de descer informa o degrau em que ocorreu', async () => {
    const provider = providerQue(new ErroDeCotaDiaria(null), new ErroDeIAPermanente('negado'));

    await expect(new MatchIAService(provider).avaliar(payload, opcoes)).rejects.toEqual(
      expect.objectContaining({ details: expect.objectContaining({ modelo: 'modelo-b' }) }),
    );
  });

  it('cascata esgotada aborta com a trilha completa', async () => {
    const provider = providerQue(
      new ErroDeCotaDiaria(null),
      new ErroDeRespostaInvalida('json_invalido'),
      new ErroDeCotaDiaria(null),
    );

    const promessa = new MatchIAService(provider).avaliar(payload, opcoes);

    await expect(promessa).rejects.toEqual(
      expect.objectContaining({
        statusCode: 503,
        code: 'AI_UNAVAILABLE',
        details: {
          causa: 'cascata esgotada',
          trilha: {
            usados: ['modelo-a', 'modelo-b', 'modelo-c'],
            esgotados: [
              { modelo: 'modelo-a', motivo: 'cota diaria (RPD) esgotada', em: AGORA.toISOString() },
              { modelo: 'modelo-b', motivo: 'json_invalido', em: AGORA.toISOString() },
              { modelo: 'modelo-c', motivo: 'cota diaria (RPD) esgotada', em: AGORA.toISOString() },
            ],
          },
        },
      }),
    );
    expect(provider.gerarAvaliacao).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['vazia', []],
    ['ausente', undefined],
  ])('cascata %s lança AI_CASCADE_EMPTY sem chamar o provider', async (_, cascata) => {
    const provider = providerQue(avaliacao);

    await expect(new MatchIAService(provider).avaliar(payload, { ...opcoes, cascata })).rejects.toEqual(
      expect.objectContaining({ code: 'AI_CASCADE_EMPTY', statusCode: 500 }),
    );
    expect(provider.gerarAvaliacao).not.toHaveBeenCalled();
  });
});
