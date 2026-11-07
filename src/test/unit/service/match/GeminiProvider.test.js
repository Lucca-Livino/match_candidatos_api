import GeminiProvider, { traduzirErro } from '../../../../service/match/GeminiProvider.js';
import { RUBRICA, SCHEMA_AVALIACAO, montarMensagem } from '../../../../service/match/promptAvaliacao.js';
import {
  ErroDeIAPermanente,
  ErroDeIARecuperavel,
  ErroDeCotaDiaria,
  ErroDeRespostaInvalida,
} from '../../../../utils/helpers/errosIA.js';

const payload = { dataReferencia: '2026-11-02', vaga: {}, curriculo: {}, questionario: [] };
const opcoes = { modelo: 'gemini-teste', temperatura: 0.2 };
const avaliacao = { criterios: [{ criterioId: 'c1', aderencia: 0.8, evidencia: 'React', atendido: true }], resumo: 'ok' };

const clienteQue = (...respostas) => {
  const generateContent = jest.fn();
  for (const r of respostas) {
    if (r instanceof Error) generateContent.mockRejectedValueOnce(r);
    else generateContent.mockResolvedValueOnce(r);
  }
  return { models: { generateContent } };
};

const erroHttp = (status, extra = {}) => Object.assign(new Error(`HTTP ${status}`), { status, ...extra });

describe('GeminiProvider', () => {
  it('se identifica como gemini', () => {
    expect(new GeminiProvider(clienteQue()).nome).toBe('gemini');
  });

  it('envia modelo, mensagem, rubrica, temperatura e schema JSON ao SDK', async () => {
    const cliente = clienteQue({ text: JSON.stringify(avaliacao) });

    await new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes);

    expect(cliente.models.generateContent).toHaveBeenCalledWith({
      model: 'gemini-teste',
      contents: montarMensagem(payload),
      config: {
        systemInstruction: RUBRICA,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA_AVALIACAO,
      },
    });
  });

  it('devolve a avaliação validada, aceitando cerca de markdown', async () => {
    const cliente = clienteQue({ text: '```json\n' + JSON.stringify(avaliacao) + '\n```' });

    await expect(new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes)).resolves.toEqual({ ...avaliacao, tentativaManipulacao: false });
  });

  it('JSON quebrado vira ErroDeRespostaInvalida com o modelo', async () => {
    const cliente = clienteQue({ text: '{"criterios": [' });

    await expect(new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes)).rejects.toEqual(
      expect.objectContaining({ constructor: ErroDeRespostaInvalida, message: 'json_invalido', modelo: 'gemini-teste' }),
    );
  });

  it('resposta fora do contrato sobe como ErroDeRespostaInvalida', async () => {
    const cliente = clienteQue({ text: JSON.stringify({ resumo: 'sem critérios' }) });

    await expect(new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes)).rejects.toBeInstanceOf(
      ErroDeRespostaInvalida,
    );
  });

  it('erro determinístico (400) vira ErroDeIAPermanente sem nova tentativa', async () => {
    const cliente = clienteQue(erroHttp(400));

    await expect(new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes)).rejects.toBeInstanceOf(ErroDeIAPermanente);
    expect(cliente.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('cota diária esgotada vira ErroDeCotaDiaria sem nova tentativa', async () => {
    const rpd = erroHttp(429, { error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDay' }] }] } });
    const cliente = clienteQue(rpd);

    await expect(new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes)).rejects.toEqual(
      expect.objectContaining({ constructor: ErroDeCotaDiaria, modelo: 'gemini-teste' }),
    );
    expect(cliente.models.generateContent).toHaveBeenCalledTimes(1);
  });

  describe('erros transitórios', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('repete depois de um 503 e devolve a avaliação', async () => {
      const cliente = clienteQue(erroHttp(503), { text: JSON.stringify(avaliacao) });

      const promessa = new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes);
      await jest.runAllTimersAsync();

      await expect(promessa).resolves.toEqual({ ...avaliacao, tentativaManipulacao: false });
      expect(cliente.models.generateContent).toHaveBeenCalledTimes(2);
    });

    it('esgotadas as tentativas, vira ErroDeIARecuperavel', async () => {
      const cliente = clienteQue(erroHttp(503), erroHttp(503), erroHttp(503), erroHttp(503));

      const promessa = new GeminiProvider(cliente).gerarAvaliacao(payload, opcoes);
      const verificacao = expect(promessa).rejects.toEqual(
        expect.objectContaining({ constructor: ErroDeIARecuperavel, modelo: 'gemini-teste' }),
      );
      await jest.runAllTimersAsync();

      await verificacao;
      expect(cliente.models.generateContent).toHaveBeenCalledTimes(4);
    });
  });

  it('não retipa erro que já é do domínio', () => {
    const erro = new ErroDeCotaDiaria(new Error('429'), 'gemini-teste');

    expect(traduzirErro(erro, 'gemini-teste')).toBe(erro);
  });
});
