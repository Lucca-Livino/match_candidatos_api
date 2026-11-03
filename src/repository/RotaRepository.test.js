import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import RotaRepository from './RotaRepository.js';
import Rota from '../models/Rota.js';

describe('RotaRepository.listarPaginado', () => {
  const repo = new RotaRepository();
  const opcoes = (page, limit) => ({ page, limit, sort: { route: 1 }, lean: true });

  beforeEach(() => jest.spyOn(Rota, 'paginate').mockResolvedValue({ docs: [] }));
  afterEach(() => jest.restoreAllMocks());

  it('sem argumentos pagina tudo na primeira página de 10, por rota', async () => {
    await expect(repo.listarPaginado()).resolves.toEqual({ docs: [] });
    expect(Rota.paginate).toHaveBeenCalledWith({}, opcoes(1, 10));
  });

  it('filtra rota por trecho sem caixa e domínio exato, com a paginação informada', async () => {
    await repo.listarPaginado({ page: 2, limit: 50, route: 'vaga.*', domain: 'localhost' });

    expect(Rota.paginate).toHaveBeenCalledWith(
      { route: { $regex: 'vaga\\.\\*', $options: 'i' }, domain: 'localhost' },
      opcoes(2, 50),
    );
  });
});

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
