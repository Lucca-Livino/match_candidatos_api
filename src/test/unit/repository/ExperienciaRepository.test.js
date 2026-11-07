import ExperienciaRepository from '../../../repository/ExperienciaRepository.js';
import Experiencia from '../../../models/Experiencia.js';

const consulta = (resultado) => {
  const q = { sort: jest.fn(), lean: jest.fn().mockResolvedValue(resultado) };
  q.sort.mockReturnValue(q);
  return q;
};

describe('ExperienciaRepository', () => {
  const repo = new ExperienciaRepository();

  afterEach(() => jest.restoreAllMocks());

  it('cria com o payload recebido', async () => {
    jest.spyOn(Experiencia, 'create').mockResolvedValue({ id: 'x1' });

    await expect(repo.criar({ usuarioId: 'u1' })).resolves.toEqual({ id: 'x1' });
    expect(Experiencia.create).toHaveBeenCalledWith({ usuarioId: 'u1' });
  });

  it('lista do usuário com a ordenação esperada', async () => {
    const q = consulta([{ id: 'x1' }]);
    jest.spyOn(Experiencia, 'find').mockReturnValue(q);

    await expect(repo.listarPorUsuarioId('u1')).resolves.toEqual([{ id: 'x1' }]);
    expect(Experiencia.find).toHaveBeenCalledWith({ usuarioId: 'u1' });
    expect(q.sort).toHaveBeenCalledWith({ dataInicio: -1 });
  });

  it.each([
    ['por usuário e id', 'buscarPorUsuarioEId', ['u1', 'x1'], { usuarioId: 'u1', id: 'x1' }],
    ['por id', 'buscarPorId', ['x1'], { id: 'x1' }],
  ])('busca %s', async (_, metodo, args, filtro) => {
    jest.spyOn(Experiencia, 'findOne').mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo[metodo](...args)).resolves.toEqual({ id: 'x1' });
    expect(Experiencia.findOne).toHaveBeenCalledWith(filtro);
  });

  it('atualiza restrito ao usuário, devolvendo o documento novo e validando', async () => {
    jest.spyOn(Experiencia, 'findOneAndUpdate').mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo.atualizarPorUsuarioEId('u1', 'x1', { a: 1 })).resolves.toEqual({ id: 'x1' });
    expect(Experiencia.findOneAndUpdate).toHaveBeenCalledWith(
      { usuarioId: 'u1', id: 'x1' },
      { a: 1 },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('deleta restrito ao usuário', async () => {
    jest.spyOn(Experiencia, 'findOneAndDelete').mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo.deletarPorUsuarioEId('u1', 'x1')).resolves.toEqual({ id: 'x1' });
    expect(Experiencia.findOneAndDelete).toHaveBeenCalledWith({ usuarioId: 'u1', id: 'x1' });
  });
});
