import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import ItemCatalogo from '../../models/ItemCatalogo.js';
import CatalogoService from '../../service/CatalogoService.js';

describe('CatalogoService', () => {
  const service = new CatalogoService();
  beforeAll(async () => { await connectTestDatabase(); await ItemCatalogo.init(); });
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('busca por tipo e prefixo de chave, so ativos', async () => {
    await service.criar({ tipo: 'habilidade', nome: 'PostgreSQL', sinonimos: ['Postgres'], implica: [] });
    const inativo = await service.criar({ tipo: 'habilidade', nome: 'Pascal', sinonimos: [], implica: [] });
    await service.atualizar(inativo.id, { ativo: false });
    await service.criar({ tipo: 'area_curso', nome: 'Pedagogia', sinonimos: [], implica: [] });

    const r = await service.buscar({ tipo: 'habilidade', q: 'pos', limit: 20 });
    expect(r.map((i) => i.nome)).toEqual(['PostgreSQL']);
    const todos = await service.buscar({ tipo: 'habilidade', q: '', limit: 20 });
    expect(todos.map((i) => i.nome)).toEqual(['PostgreSQL']);
  });

  it('recusa implica para si, outro tipo ou id inexistente', async () => {
    const sql = await service.criar({ tipo: 'habilidade', nome: 'SQL', sinonimos: [], implica: [] });
    const area = await service.criar({ tipo: 'area_curso', nome: 'Computacao', sinonimos: [], implica: [] });
    await expect(service.atualizar(sql.id, { implica: [sql.id] })).rejects.toThrow('implica não pode conter o próprio item.');
    await expect(service.criar({ tipo: 'habilidade', nome: 'PG', sinonimos: [], implica: [area.id] })).rejects.toThrow('implica aponta para item inexistente ou de outro tipo.');
    await expect(service.criar({ tipo: 'habilidade', nome: 'PG', sinonimos: [], implica: ['x'] })).rejects.toThrow('implica aponta para item inexistente ou de outro tipo.');
  });

  it('traduz sinonimo duplicado em 409', async () => {
    await service.criar({ tipo: 'habilidade', nome: 'JavaScript', sinonimos: ['JS'], implica: [] });
    await expect(service.criar({ tipo: 'habilidade', nome: 'JScript', sinonimos: ['js'], implica: [] }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('atualizar recalcula as chaves', async () => {
    const js = await service.criar({ tipo: 'habilidade', nome: 'JavaScript', sinonimos: [], implica: [] });
    const atualizado = await service.atualizar(js.id, { sinonimos: ['ECMAScript'] });
    expect(atualizado.chaves).toEqual(['javascript', 'ecmascript']);
  });

  it('carregarIndice inclui inativos', async () => {
    const p = await service.criar({ tipo: 'habilidade', nome: 'Pascal', sinonimos: [], implica: [] });
    await service.atualizar(p.id, { ativo: false });
    const indice = await service.carregarIndice();
    expect(indice.porId.has(p.id)).toBe(true);
  });

  it('garantirReferencias aceita id certo e recusa tipo errado', async () => {
    const sql = await service.criar({ tipo: 'habilidade', nome: 'SQL', sinonimos: [], implica: [] });
    await expect(service.garantirReferencias([{ tipo: 'habilidade', id: sql.id, campo: 'itemId' }])).resolves.toBeUndefined();
    await expect(service.garantirReferencias([{ tipo: 'area_curso', id: sql.id, campo: 'criterio_vaga[0].requisito.areaId' }]))
      .rejects.toThrow('criterio_vaga[0].requisito.areaId não corresponde a item do catálogo do tipo area_curso.');
  });

  it('atualizar devolve 404 se o item some entre a busca e o update', async () => {
    const fake = new CatalogoService({
      buscarPorId: async () => ({ id: 'x', tipo: 'habilidade', nome: 'SQL', sinonimos: [] }),
      atualizar: async () => null,
    });
    await expect(fake.atualizar('x', { ativo: false })).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
