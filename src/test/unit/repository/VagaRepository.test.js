import VagaRepository from '../../../repository/VagaRepository.js';
import Vaga from '../../../models/Vaga.js';

const opcoes = (page, limit) => ({ page, limit, sort: { createdAt: -1 }, lean: true, leanWithId: true });

describe('VagaRepository', () => {
  const repo = new VagaRepository();

  beforeEach(() => jest.spyOn(Vaga, 'paginate').mockResolvedValue({ docs: [] }));
  afterEach(() => jest.restoreAllMocks());

  it('sem argumentos pagina tudo na primeira página de 10, mais recentes primeiro', async () => {
    await expect(repo.listarPaginado()).resolves.toEqual({ docs: [] });
    expect(Vaga.paginate).toHaveBeenCalledWith({}, opcoes(1, 10));
  });

  it('aplica todos os filtros e a paginação informada', async () => {
    await repo.listarPaginado({ page: 3, limit: 20, titulo: 'dev', area: 'TI', status: 'ativa', tipo_criterio: 'habilidade' });

    expect(Vaga.paginate).toHaveBeenCalledWith(
      {
        titulo: { $regex: 'dev', $options: 'i' },
        area: 'TI',
        status: 'ativa',
        'criterio_vaga.tipo_criterio': 'habilidade',
      },
      opcoes(3, 20),
    );
  });

  it('busca o título como texto literal', async () => {
    await repo.listarPaginado({ titulo: 'c++ (a+)+' });

    expect(Vaga.paginate).toHaveBeenCalledWith(
      { titulo: { $regex: 'c\\+\\+ \\(a\\+\\)\\+', $options: 'i' } },
      opcoes(1, 10),
    );
  });

  it('criar repassa o payload', async () => {
    jest.spyOn(Vaga, 'create').mockResolvedValue({ _id: 'v1' });

    await expect(repo.criar({ titulo: 'Dev' })).resolves.toEqual({ _id: 'v1' });
    expect(Vaga.create).toHaveBeenCalledWith({ titulo: 'Dev' });
  });

  it.each([
    ['buscarPorId', 'findById', ['v1'], ['v1']],
    [
      'atualizar',
      'findByIdAndUpdate',
      ['v1', { status: 'pausada' }],
      ['v1', { status: 'pausada' }, { returnDocument: 'after', runValidators: true }],
    ],
    ['deletar', 'findByIdAndDelete', ['v1'], ['v1']],
  ])('%s usa %s com os argumentos esperados', async (metodo, estatico, args, esperado) => {
    jest.spyOn(Vaga, estatico).mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'v1' }) });

    await expect(repo[metodo](...args)).resolves.toEqual({ _id: 'v1' });
    expect(Vaga[estatico]).toHaveBeenCalledWith(...esperado);
  });
});
