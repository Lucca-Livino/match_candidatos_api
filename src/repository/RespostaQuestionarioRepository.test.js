import RespostaQuestionarioRepository from './RespostaQuestionarioRepository.js';
import RespostaQuestionario from '../models/RespostaQuestionario.js';
import RespostaPergunta from '../models/RespostaPergunta.js';
import RespostaOpcaoSelecionada from '../models/RespostaOpcaoSelecionada.js';

const consulta = (resultado) => ({ lean: jest.fn().mockResolvedValue(resultado) });

describe('RespostaQuestionarioRepository', () => {
  const repo = new RespostaQuestionarioRepository();

  afterEach(() => jest.restoreAllMocks());

  it('busca a resposta em andamento do usuário no questionário', async () => {
    jest.spyOn(RespostaQuestionario, 'findOne').mockReturnValue(consulta({ id: 'r1' }));

    await expect(repo.buscarRespostaEmAndamento('q1', 'u1')).resolves.toEqual({ id: 'r1' });
    expect(RespostaQuestionario.findOne).toHaveBeenCalledWith({
      questionarioId: 'q1',
      usuarioId: 'u1',
      status: 'em_andamento',
    });
  });

  it.each([
    ['lista vazia', []],
    ['sem payload', undefined],
  ])('criar opções selecionadas com %s devolve [] sem inserir', async (_, payload) => {
    const insertMany = jest.spyOn(RespostaOpcaoSelecionada, 'insertMany');

    await expect(repo.criarRespostasOpcaoSelecionada(payload)).resolves.toEqual([]);
    expect(insertMany).not.toHaveBeenCalled();
  });

  it('criar opções selecionadas insere o lote', async () => {
    const payload = [{ respostaPergunta_: 'rp1', opcaoRespostaId: 'o1' }];
    jest.spyOn(RespostaOpcaoSelecionada, 'insertMany').mockResolvedValue(payload);

    await expect(repo.criarRespostasOpcaoSelecionada(payload)).resolves.toBe(payload);
    expect(RespostaOpcaoSelecionada.insertMany).toHaveBeenCalledWith(payload);
  });

  it.each([
    ['com ids', ['rp1'], ['rp1']],
    ['sem ids', undefined, []],
  ])('lista opções selecionadas por respostas de pergunta (%s)', async (_, ids, esperado) => {
    jest.spyOn(RespostaOpcaoSelecionada, 'find').mockReturnValue(consulta([]));

    await repo.listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds(ids);

    expect(RespostaOpcaoSelecionada.find).toHaveBeenCalledWith({ respostaPergunta_: { $in: esperado } });
  });

  it.each([
    ['criarRespostaQuestionario', RespostaQuestionario],
    ['criarRespostaPergunta', RespostaPergunta],
  ])('%s cria com o payload', async (metodo, modelo) => {
    jest.spyOn(modelo, 'create').mockResolvedValue({ id: 'x1' });

    await expect(repo[metodo]({ a: 1 })).resolves.toEqual({ id: 'x1' });
    expect(modelo.create).toHaveBeenCalledWith({ a: 1 });
  });

  it.each([
    ['buscarRespostaQuestionarioPorId', RespostaQuestionario, 'findOne', ['r1'], [{ id: 'r1' }]],
    [
      'atualizarRespostaQuestionario',
      RespostaQuestionario,
      'findOneAndUpdate',
      ['r1', { status: 'finalizado' }],
      [{ id: 'r1' }, { status: 'finalizado' }, { returnDocument: 'after', runValidators: true }],
    ],
    ['listarRespostasPerguntaPorRespostaQuestionId', RespostaPergunta, 'find', ['r1'], [{ respostaQuestionId: 'r1' }]],
    ['buscarRespostaPergunta', RespostaPergunta, 'findOne', ['r1', 'p1'], [{ respostaQuestionId: 'r1', perguntaId: 'p1' }]],
    [
      'atualizarRespostaPergunta',
      RespostaPergunta,
      'findOneAndUpdate',
      ['rp1', { valor: 'x' }],
      [{ id: 'rp1' }, { valor: 'x' }, { returnDocument: 'after', runValidators: true }],
    ],
  ])('%s usa o método do modelo com os argumentos esperados', async (metodo, modelo, estatico, args, esperado) => {
    jest.spyOn(modelo, estatico).mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo[metodo](...args)).resolves.toEqual({ id: 'x1' });
    expect(modelo[estatico]).toHaveBeenCalledWith(...esperado);
  });

  it.each([
    ['contarRespostasPorQuestionario', RespostaQuestionario, 'q1', { questionarioId: 'q1' }],
    ['contarRespostasPorPergunta', RespostaPergunta, 'p1', { perguntaId: 'p1' }],
  ])('%s conta pelo filtro esperado', async (metodo, modelo, arg, filtro) => {
    jest.spyOn(modelo, 'countDocuments').mockResolvedValue(3);

    await expect(repo[metodo](arg)).resolves.toBe(3);
    expect(modelo.countDocuments).toHaveBeenCalledWith(filtro);
  });

  it('apaga as opções selecionadas da resposta de pergunta', async () => {
    jest.spyOn(RespostaOpcaoSelecionada, 'deleteMany').mockResolvedValue({ deletedCount: 1 });

    await expect(repo.deletarOpcoesSelecionadasPorRespostaPerguntaId('rp1')).resolves.toEqual({ deletedCount: 1 });
    expect(RespostaOpcaoSelecionada.deleteMany).toHaveBeenCalledWith({ respostaPergunta_: 'rp1' });
  });
});
