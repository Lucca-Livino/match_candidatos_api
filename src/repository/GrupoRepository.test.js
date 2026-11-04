import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../test/setup/db.js';
import GrupoRepository from './GrupoRepository.js';
import Grupo from '../models/Grupo.js';

describe('GrupoRepository', () => {
  const repo = new GrupoRepository();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('cria e atualiza grupo', async () => {
    const g = await repo.criar({ nome: 'teste', descricao: 'd', permissions: [] });
    const up = await repo.atualizar(g._id, { descricao: 'nova' });
    expect(up.descricao).toBe('nova');
  });
});

describe('GrupoRepository (unitário)', () => {
  const repo = new GrupoRepository();
  const consulta = (resultado) => ({ lean: jest.fn().mockResolvedValue(resultado) });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['com padrões', undefined, {}, 1, 10],
    ['filtrando por nome', { page: 2, limit: 5, nome: 'adm' }, { nome: { $regex: 'adm', $options: 'i' } }, 2, 5],
  ])('lista paginado %s', async (_, params, filtro, page, limit) => {
    jest.spyOn(Grupo, 'paginate').mockResolvedValue({ docs: [] });

    await expect(repo.listarPaginado(params)).resolves.toEqual({ docs: [] });
    expect(Grupo.paginate).toHaveBeenCalledWith(filtro, { page, limit, sort: { nome: 1 }, lean: true });
  });

  it('busca por id', async () => {
    jest.spyOn(Grupo, 'findById').mockReturnValue(consulta({ _id: 'g1' }));

    await expect(repo.buscarPorId('g1')).resolves.toEqual({ _id: 'g1' });
    expect(Grupo.findById).toHaveBeenCalledWith('g1');
  });

  it('cria com o payload recebido', async () => {
    jest.spyOn(Grupo, 'create').mockResolvedValue({ _id: 'g1' });

    await expect(repo.criar({ nome: 'n' })).resolves.toEqual({ _id: 'g1' });
    expect(Grupo.create).toHaveBeenCalledWith({ nome: 'n' });
  });

  it('atualizar devolve null quando o grupo não existe', async () => {
    jest.spyOn(Grupo, 'findById').mockResolvedValue(null);

    await expect(repo.atualizar('g1', { nome: 'n' })).resolves.toBeNull();
  });

  it('atualizar mescla o payload, salva e devolve objeto simples', async () => {
    const doc = { nome: 'a', save: jest.fn().mockResolvedValue(), toObject: jest.fn(function () { return { nome: this.nome }; }) };
    jest.spyOn(Grupo, 'findById').mockResolvedValue(doc);

    await expect(repo.atualizar('g1', { nome: 'b' })).resolves.toEqual({ nome: 'b' });
    expect(doc.save).toHaveBeenCalled();
  });

  it('deleta por id', async () => {
    jest.spyOn(Grupo, 'findByIdAndDelete').mockReturnValue(consulta({ _id: 'g1' }));

    await expect(repo.deletar('g1')).resolves.toEqual({ _id: 'g1' });
    expect(Grupo.findByIdAndDelete).toHaveBeenCalledWith('g1');
  });
});
