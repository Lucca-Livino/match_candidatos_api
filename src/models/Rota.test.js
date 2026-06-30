import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import Rota from './Rota.js';

describe('Rota model', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await Rota.init();
  });
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('normaliza route para lowercase e exige route+domain unico', async () => {
    await Rota.create({ route: 'Vagas', domain: 'localhost', active: true, get: true });
    const found = await Rota.findOne({ route: 'vagas', domain: 'localhost' });
    expect(found).not.toBeNull();

    await expect(
      Rota.create({ route: 'vagas', domain: 'localhost' }),
    ).rejects.toThrow();
  });
});
