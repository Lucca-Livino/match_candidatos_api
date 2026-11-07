import AvaliacaoProvider from '../../../../service/match/AvaliacaoProvider.js';
import AppError from '../../../../utils/helpers/AppError.js';

class ProviderIncompleto extends AvaliacaoProvider {}

class ProviderCompleto extends AvaliacaoProvider {
  get nome() {
    return 'completo';
  }

  async gerarAvaliacao() {
    return { criterios: [], resumo: 'ok' };
  }
}

describe('AvaliacaoProvider', () => {
  it.each([
    ['a própria base', AvaliacaoProvider, 'AvaliacaoProvider'],
    ['uma subclasse incompleta', ProviderIncompleto, 'ProviderIncompleto'],
  ])('getter nome lança AI_PROVIDER_INVALID em %s', (_, Classe, nomeClasse) => {
    const provider = new Classe();

    expect(() => provider.nome).toThrow(AppError);
    expect(() => provider.nome).toThrow(
      expect.objectContaining({
        message: `${nomeClasse}: getter 'nome' nao implementado.`,
        statusCode: 500,
        code: 'AI_PROVIDER_INVALID',
      }),
    );
  });

  it.each([
    ['a própria base', AvaliacaoProvider, 'AvaliacaoProvider'],
    ['uma subclasse incompleta', ProviderIncompleto, 'ProviderIncompleto'],
  ])('gerarAvaliacao rejeita com AI_PROVIDER_INVALID em %s', async (_, Classe, nomeClasse) => {
    await expect(new Classe().gerarAvaliacao({}, { modelo: 'm', temperatura: 0 })).rejects.toEqual(
      expect.objectContaining({
        constructor: AppError,
        message: `${nomeClasse}: gerarAvaliacao nao implementado.`,
        statusCode: 500,
        code: 'AI_PROVIDER_INVALID',
      }),
    );
  });

  it('subclasse que implementa o contrato não lança', async () => {
    const provider = new ProviderCompleto();

    expect(provider.nome).toBe('completo');
    await expect(provider.gerarAvaliacao({}, { modelo: 'm', temperatura: 0 })).resolves.toEqual({
      criterios: [],
      resumo: 'ok',
    });
  });
});
