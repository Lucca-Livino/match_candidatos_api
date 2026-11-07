import CatalogoRepository from '../../../repository/CatalogoRepository.js';
import ItemCatalogo from '../../../models/ItemCatalogo.js';

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

  it('cria o item com o payload', async () => {
    jest.spyOn(ItemCatalogo, 'create').mockResolvedValue({ id: 'i1' });

    await expect(repo.criar({ nome: 'React' })).resolves.toEqual({ id: 'i1' });
    expect(ItemCatalogo.create).toHaveBeenCalledWith({ nome: 'React' });
  });

  it.each([
    ['buscarPorId', 'findOne', ['i1'], [{ id: 'i1' }]],
    ['buscarPorIds', 'find', [['i1', 'i2']], [{ id: { $in: ['i1', 'i2'] } }]],
    ['listarTodos', 'find', [], [{}]],
    [
      'atualizar',
      'findOneAndUpdate',
      ['i1', { ativo: false }],
      [{ id: 'i1' }, { ativo: false }, { returnDocument: 'after', runValidators: true }],
    ],
  ])('%s usa %s com os argumentos esperados', async (metodo, estatico, args, esperado) => {
    jest.spyOn(ItemCatalogo, estatico).mockReturnValue(consulta({ id: 'i1' }));

    await expect(repo[metodo](...args)).resolves.toEqual({ id: 'i1' });
    expect(ItemCatalogo[estatico]).toHaveBeenCalledWith(...esperado);
  });

  it('lista o tipo inteiro, inativos inclusive, por nome', async () => {
    const q = consulta([{ id: 'i1' }]);
    jest.spyOn(ItemCatalogo, 'find').mockReturnValue(q);

    await expect(repo.listarPorTipo('habilidade')).resolves.toEqual([{ id: 'i1' }]);
    expect(ItemCatalogo.find).toHaveBeenCalledWith({ tipo: 'habilidade' });
    expect(q.sort).toHaveBeenCalledWith({ nome: 1 });
  });
});
