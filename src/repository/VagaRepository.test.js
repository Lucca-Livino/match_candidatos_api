import VagaRepository from './VagaRepository.js';
import Vaga from '../models/Vaga.js';

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
});
