import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import RotaRepository from './RotaRepository.js';

describe('RotaRepository', () => {
  const repo = new RotaRepository();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('cria e busca rota', async () => {
    const r = await repo.criar({ route: 'teste', domain: 'localhost', active: true, get: true });
    const found = await repo.buscarPorId(r._id);
    expect(found.route).toBe('teste');
  });
});
