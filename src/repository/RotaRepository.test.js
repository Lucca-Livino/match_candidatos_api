import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import RotaRepository from './RotaRepository.js';
import Rota from '../models/Rota.js';

describe('RotaRepository com o modelo simulado', () => {
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

  it('criar repassa o payload', async () => {
    jest.spyOn(Rota, 'create').mockResolvedValue({ _id: 'r1' });

    await expect(repo.criar({ route: 'vaga' })).resolves.toEqual({ _id: 'r1' });
    expect(Rota.create).toHaveBeenCalledWith({ route: 'vaga' });
  });

  it.each([
    ['buscarPorId', 'findById', ['r1'], ['r1']],
    [
      'atualizar',
      'findByIdAndUpdate',
      ['r1', { active: false }],
      ['r1', { active: false }, { returnDocument: 'after', runValidators: true }],
    ],
    ['deletar', 'findByIdAndDelete', ['r1'], ['r1']],
  ])('%s usa %s com os argumentos esperados', async (metodo, estatico, args, esperado) => {
    jest.spyOn(Rota, estatico).mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'r1' }) });

    await expect(repo[metodo](...args)).resolves.toEqual({ _id: 'r1' });
    expect(Rota[estatico]).toHaveBeenCalledWith(...esperado);
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
