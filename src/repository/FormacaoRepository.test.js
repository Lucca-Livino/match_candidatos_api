import FormacaoRepository from './FormacaoRepository.js';
import Formacao from '../models/Formacao.js';

const consulta = (resultado) => {
  const q = { sort: jest.fn(), lean: jest.fn().mockResolvedValue(resultado) };
  q.sort.mockReturnValue(q);
  return q;
};

describe('FormacaoRepository', () => {
  const repo = new FormacaoRepository();

  afterEach(() => jest.restoreAllMocks());

  it('cria com o payload recebido', async () => {
    jest.spyOn(Formacao, 'create').mockResolvedValue({ id: 'x1' });

    await expect(repo.criar({ usuarioId: 'u1' })).resolves.toEqual({ id: 'x1' });
    expect(Formacao.create).toHaveBeenCalledWith({ usuarioId: 'u1' });
  });

  it('lista do usuário com a ordenação esperada', async () => {
    const q = consulta([{ id: 'x1' }]);
    jest.spyOn(Formacao, 'find').mockReturnValue(q);

    await expect(repo.listarPorUsuarioId('u1')).resolves.toEqual([{ id: 'x1' }]);
    expect(Formacao.find).toHaveBeenCalledWith({ usuarioId: 'u1' });
    expect(q.sort).toHaveBeenCalledWith({ anoInicio: -1 });
  });

  it.each([
    ['por usuário e id', 'buscarPorUsuarioEId', ['u1', 'x1'], { usuarioId: 'u1', id: 'x1' }],
    ['por id', 'buscarPorId', ['x1'], { id: 'x1' }],
  ])('busca %s', async (_, metodo, args, filtro) => {
    jest.spyOn(Formacao, 'findOne').mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo[metodo](...args)).resolves.toEqual({ id: 'x1' });
    expect(Formacao.findOne).toHaveBeenCalledWith(filtro);
  });

  it('atualiza restrito ao usuário, devolvendo o documento novo e validando', async () => {
    jest.spyOn(Formacao, 'findOneAndUpdate').mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo.atualizarPorUsuarioEId('u1', 'x1', { a: 1 })).resolves.toEqual({ id: 'x1' });
    expect(Formacao.findOneAndUpdate).toHaveBeenCalledWith(
      { usuarioId: 'u1', id: 'x1' },
      { a: 1 },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('deleta restrito ao usuário', async () => {
    jest.spyOn(Formacao, 'findOneAndDelete').mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo.deletarPorUsuarioEId('u1', 'x1')).resolves.toEqual({ id: 'x1' });
    expect(Formacao.findOneAndDelete).toHaveBeenCalledWith({ usuarioId: 'u1', id: 'x1' });
  });
});
