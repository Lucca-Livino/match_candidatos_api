import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import ItemCatalogo from '../models/ItemCatalogo.js';
import seedCatalogo from './seedsCatalogo.js';

describe('seedCatalogo', () => {
  beforeAll(connectTestDatabase);
  afterAll(async () => {
    await clearTestDatabase();
    await disconnectTestDatabase();
  });

  it('e idempotente, sem chaves vazias e resolve implica por nome', async () => {
    await seedCatalogo({ useOwnConnection: false });
    const totalPrimeira = await ItemCatalogo.countDocuments();
    await seedCatalogo({ useOwnConnection: false });

    const itens = await ItemCatalogo.find().lean();
    expect(itens).toHaveLength(totalPrimeira);
    expect(itens).toHaveLength(40 + 12 + 12 + 10);
    expect(itens.every((i) => i.chaves.length > 0)).toBe(true);

    const sql = itens.find((i) => i.tipo === 'habilidade' && i.nome === 'SQL');
    const postgres = itens.find((i) => i.tipo === 'habilidade' && i.nome === 'PostgreSQL');
    expect(postgres.implica).toEqual([sql.id]);
  });
});
