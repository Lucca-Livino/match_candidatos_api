import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import ItemCatalogo, { calcularChaves } from './ItemCatalogo.js';

describe('ItemCatalogo', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('calcula chaves de nome e sinonimos sem repetir', () => {
    expect(calcularChaves('Node.js', ['NodeJS', 'node js', 'Node'])).toEqual(['nodejs', 'node']);
  });

  it('grava chaves ao criar', async () => {
    const item = await ItemCatalogo.create({ tipo: 'habilidade', nome: 'JavaScript', sinonimos: ['JS'] });
    expect(item.chaves).toEqual(['javascript', 'js']);
    expect(item.ativo).toBe(true);
  });

  it('recusa sinonimo repetido entre itens do mesmo tipo', async () => {
    await ItemCatalogo.init();
    await ItemCatalogo.create({ tipo: 'habilidade', nome: 'JavaScript', sinonimos: ['JS'] });
    await expect(
      ItemCatalogo.create({ tipo: 'habilidade', nome: 'JScript', sinonimos: ['js'] }),
    ).rejects.toThrow();
  });

  it('aceita a mesma chave em tipos diferentes', async () => {
    await ItemCatalogo.init();
    await ItemCatalogo.create({ tipo: 'habilidade', nome: 'Vendas' });
    await expect(ItemCatalogo.create({ tipo: 'area_atuacao', nome: 'Vendas' })).resolves.toBeTruthy();
  });
});
