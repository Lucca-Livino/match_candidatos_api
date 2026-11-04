import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import ConfiguracaoIntegracaoRepository from '../../repository/ConfiguracaoIntegracaoRepository.js';

describe('ConfiguracaoIntegracaoRepository', () => {
  const repo = new ConfiguracaoIntegracaoRepository();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('cria a configuracao padrao quando nao existe', async () => {
    const config = await repo.obterOuCriar();
    expect(config.limiteCompatibilidade).toBe(0.7);
    expect(config.provedor).toBe('gemini');
    expect(config.temperatura).toBe(0);
    expect(config.ativo).toBe(true);
    expect(Array.isArray(config.cascata)).toBe(true);
    expect(config.cascata.length).toBeGreaterThanOrEqual(1);
  });

  it('preserva a ORDEM dos degraus da cascata', async () => {
    await repo.obterOuCriar();
    const atualizada = await repo.atualizar({ cascata: ['modelo-b', 'modelo-a'] }, 'user-suporte');
    expect(atualizada.cascata).toEqual(['modelo-b', 'modelo-a']);
  });

  it('rejeita cascata com modelo repetido', async () => {
    await repo.obterOuCriar();
    await expect(repo.atualizar({ cascata: ['x', 'x'] }, 'user-suporte')).rejects.toThrow();
  });

  it('reaproveita a mesma configuracao em chamadas seguintes', async () => {
    const primeira = await repo.obterOuCriar();
    const segunda = await repo.obterOuCriar();
    expect(segunda.id).toBe(primeira.id);
  });

  it('atualiza o limiar e registra o autor', async () => {
    await repo.obterOuCriar();
    const atualizada = await repo.atualizar({ limiteCompatibilidade: 0.8 }, 'user-suporte');
    expect(atualizada.limiteCompatibilidade).toBe(0.8);
    expect(atualizada.atualizadoPor).toBe('user-suporte');
  });
});
