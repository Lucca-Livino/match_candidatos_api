import QuestionarioRepository from '../../../repository/QuestionarioRepository.js';
import Questionario from '../../../models/Questionario.js';

const consulta = (resultado) => {
  const q = { sort: jest.fn(), lean: jest.fn().mockResolvedValue(resultado) };
  q.sort.mockReturnValue(q);
  return q;
};

describe('QuestionarioRepository', () => {
  const repo = new QuestionarioRepository();

  afterEach(() => jest.restoreAllMocks());

  it('cria com o payload recebido', async () => {
    jest.spyOn(Questionario, 'create').mockResolvedValue({ id: 'q1' });

    await expect(repo.criar({ titulo: 't' })).resolves.toEqual({ id: 'q1' });
    expect(Questionario.create).toHaveBeenCalledWith({ titulo: 't' });
  });

  it.each([
    ['sem filtros', undefined, {}],
    ['vazio', {}, {}],
    ['por vaga', { vagaId: 'v1' }, { vagaId: 'v1' }],
    ['por ativo numérico', { ativo: 0 }, { ativo: 0 }],
    ['ignorando ativo não numérico', { ativo: '1' }, {}],
    ['por vaga e ativo', { vagaId: 'v1', ativo: 1 }, { vagaId: 'v1', ativo: 1 }],
  ])('lista %s, mais recentes primeiro', async (_, filtros, esperado) => {
    const q = consulta([{ id: 'q1' }]);
    jest.spyOn(Questionario, 'find').mockReturnValue(q);

    await expect(repo.listar(filtros)).resolves.toEqual([{ id: 'q1' }]);
    expect(Questionario.find).toHaveBeenCalledWith(esperado);
    expect(q.sort).toHaveBeenCalledWith({ criadoEm: -1 });
  });

  it('busca por id', async () => {
    jest.spyOn(Questionario, 'findOne').mockReturnValue(consulta({ id: 'q1' }));

    await expect(repo.buscarPorId('q1')).resolves.toEqual({ id: 'q1' });
    expect(Questionario.findOne).toHaveBeenCalledWith({ id: 'q1' });
  });

  it('atualiza devolvendo o documento novo e validando', async () => {
    jest.spyOn(Questionario, 'findOneAndUpdate').mockReturnValue(consulta({ id: 'q1' }));

    await expect(repo.atualizarPorId('q1', { titulo: 'n' })).resolves.toEqual({ id: 'q1' });
    expect(Questionario.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'q1' },
      { titulo: 'n' },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('deleta por id', async () => {
    jest.spyOn(Questionario, 'findOneAndDelete').mockReturnValue(consulta({ id: 'q1' }));

    await expect(repo.deletarPorId('q1')).resolves.toEqual({ id: 'q1' });
    expect(Questionario.findOneAndDelete).toHaveBeenCalledWith({ id: 'q1' });
  });
});
