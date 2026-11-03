import RespostaQuestionarioRepository from './RespostaQuestionarioRepository.js';
import RespostaQuestionario from '../models/RespostaQuestionario.js';
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
});
