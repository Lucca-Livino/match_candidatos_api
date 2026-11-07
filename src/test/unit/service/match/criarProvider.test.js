import { criarProvider } from '../../../../service/match/criarProvider.js';
import GeminiProvider from '../../../../service/match/GeminiProvider.js';

describe('criarProvider', () => {
  it('cria o GeminiProvider para "gemini"', () => {
    const provider = criarProvider('gemini');

    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.nome).toBe('gemini');
  });

  it('cria uma instância nova a cada chamada', () => {
    expect(criarProvider('gemini')).not.toBe(criarProvider('gemini'));
  });

  it.each(['openai', '', undefined])('recusa provedor desconhecido %p', (nome) => {
    expect(() => criarProvider(nome)).toThrow(
      expect.objectContaining({ statusCode: 500, code: 'AI_PROVIDER_UNKNOWN' }),
    );
  });
});
