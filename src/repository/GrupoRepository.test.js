import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import GrupoRepository from './GrupoRepository.js';

describe('GrupoRepository', () => {
  const repo = new GrupoRepository();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('cria e atualiza grupo', async () => {
    const g = await repo.criar({ nome: 'teste', descricao: 'd', permissions: [] });
    const up = await repo.atualizar(g._id, { descricao: 'nova' });
    expect(up.descricao).toBe('nova');
  });
});
