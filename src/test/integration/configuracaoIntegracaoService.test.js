import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import ConfiguracaoIntegracaoService from '../../service/ConfiguracaoIntegracaoService.js';

describe('ConfiguracaoIntegracaoService', () => {
  const service = new ConfiguracaoIntegracaoService();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('nunca devolve o valor das chaves de API', async () => {
    process.env.GEMINI_API_KEY = 'AIza-secreto';
    const config = await service.obter();
    expect(config.chavesConfiguradas).toEqual({ gemini: true });
    expect(JSON.stringify(config)).not.toContain('AIza-secreto');
  });

  it('indica chave ausente', async () => {
    delete process.env.GEMINI_API_KEY;
    const config = await service.obter();
    expect(config.chavesConfiguradas).toEqual({ gemini: false });
  });

  it('rejeita limiar fora da faixa 0..1', async () => {
    await expect(
      service.atualizar({ limiteCompatibilidade: 1.5 }, 'user-suporte'),
    ).rejects.toThrow('limiteCompatibilidade deve estar entre 0 e 1.');
  });

  it('rejeita provedor desconhecido', async () => {
    await expect(service.atualizar({ provedor: 'openai' }, 'user-suporte')).rejects.toThrow(
      'provedor inválido.',
    );
  });

  it('rejeita temperatura fora da faixa 0..1', async () => {
    await expect(service.atualizar({ temperatura: 2 }, 'user-suporte')).rejects.toThrow(
      'temperatura deve estar entre 0 e 1.',
    );
  });

  it('aceita reordenar a cascata', async () => {
    const atualizada = await service.atualizar(
      { cascata: ['gemini-3.1-flash', 'gemini-3.1-flash-lite'] },
      'user-suporte',
    );
    expect(atualizada.cascata).toEqual(['gemini-3.1-flash', 'gemini-3.1-flash-lite']);
  });

  it('rejeita cascata vazia', async () => {
    await expect(service.atualizar({ cascata: [] }, 'user-suporte')).rejects.toThrow(
      'cascata precisa de pelo menos um modelo.',
    );
  });

  it('rejeita cascata com modelo repetido', async () => {
    await expect(
      service.atualizar(
        { cascata: ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite'] },
        'user-suporte',
      ),
    ).rejects.toThrow('cascata não pode repetir modelo.');
  });

  it('atualiza limiar valido', async () => {
    const atualizada = await service.atualizar({ limiteCompatibilidade: 0.65 }, 'user-suporte');
    expect(atualizada.limiteCompatibilidade).toBe(0.65);
  });
});
