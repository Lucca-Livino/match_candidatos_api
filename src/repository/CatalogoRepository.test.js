import CatalogoRepository from './CatalogoRepository.js';
import ItemCatalogo from '../models/ItemCatalogo.js';

const consulta = (resultado) => {
  const q = { sort: jest.fn(), limit: jest.fn(), lean: jest.fn().mockResolvedValue(resultado) };
  q.sort.mockReturnValue(q);
  q.limit.mockReturnValue(q);
  return q;
};

describe('CatalogoRepository', () => {
  const repo = new CatalogoRepository();

  afterEach(() => jest.restoreAllMocks());

  it('busca ativos do tipo, por nome e com limite, sem filtrar chaves quando não há prefixo', async () => {
    const q = consulta([{ id: 'i1' }]);
    jest.spyOn(ItemCatalogo, 'find').mockReturnValue(q);

    await expect(repo.buscarAtivos({ tipo: 'habilidade', limit: 5 })).resolves.toEqual([{ id: 'i1' }]);
    expect(ItemCatalogo.find).toHaveBeenCalledWith({ tipo: 'habilidade', ativo: true });
    expect(q.sort).toHaveBeenCalledWith({ nome: 1 });
    expect(q.limit).toHaveBeenCalledWith(5);
  });

  it.each([
    ['react', '^react'],
    ['c++', '^c\\+\\+'],
    ['node.js (v20)', '^node\\.js \\(v20\\)'],
  ])('prefixo %s filtra chaves pelo início, escapando metacaracteres', async (prefixo, regex) => {
    jest.spyOn(ItemCatalogo, 'find').mockReturnValue(consulta([]));

    await repo.buscarAtivos({ tipo: 'habilidade', prefixo, limit: 5 });

    expect(ItemCatalogo.find).toHaveBeenCalledWith({ tipo: 'habilidade', ativo: true, chaves: { $regex: regex } });
  });
});
