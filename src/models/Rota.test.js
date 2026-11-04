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

describe('Rota model sem banco', () => {
  const preSave = (doc) => Rota.schema.s.hooks.execPre('save', doc, []);

  it('aplica os padrões e exige domain', () => {
    const rota = new Rota({ route: '  Vagas  ' });

    expect(rota.route).toBe('vagas');
    expect(rota.active).toBe(false);
    expect(Object.keys(rota.validateSync().errors)).toEqual(['domain']);
  });

  it('o pre-save mantém route em minúsculas', async () => {
    const rota = new Rota({ route: 'Vagas', domain: 'localhost' });

    await preSave(rota);
    expect(rota.route).toBe('vagas');
  });

  it('o pre-save tolera rota sem route', async () => {
    const rota = new Rota({ domain: 'localhost' });

    await preSave(rota);
    expect(rota.route).toBeUndefined();
  });
});
