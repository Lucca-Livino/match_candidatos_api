import PerguntaRepository from './PerguntaRepository.js';
import Pergunta from '../models/Pergunta.js';
import OpcaoResposta from '../models/OpcaoResposta.js';

const consulta = (resultado) => {
  const q = { sort: jest.fn(), lean: jest.fn().mockResolvedValue(resultado) };
  q.sort.mockReturnValue(q);
  return q;
};

describe('PerguntaRepository', () => {
  const repo = new PerguntaRepository();

  afterEach(() => jest.restoreAllMocks());

  it('lista perguntas do questionário por ordem e data de criação', async () => {
    const q = consulta([{ id: 'p1' }]);
    jest.spyOn(Pergunta, 'find').mockReturnValue(q);

    await expect(repo.listarPorQuestionarioId('q1')).resolves.toEqual([{ id: 'p1' }]);
    expect(Pergunta.find).toHaveBeenCalledWith({ questionarioId: 'q1' });
    expect(q.sort).toHaveBeenCalledWith({ ordem: 1, criadoEm: 1 });
  });

  it.each([
    ['com ids', ['p1', 'p2'], ['p1', 'p2']],
    ['sem ids', undefined, []],
  ])('busca perguntas por ids (%s)', async (_, ids, esperado) => {
    jest.spyOn(Pergunta, 'find').mockReturnValue(consulta([]));

    await repo.buscarPorIds(ids);

    expect(Pergunta.find).toHaveBeenCalledWith({ id: { $in: esperado } });
  });

  it('atualiza pergunta devolvendo o documento novo e validando', async () => {
    jest.spyOn(Pergunta, 'findOneAndUpdate').mockReturnValue(consulta({ id: 'p1', texto: 'novo' }));

    await expect(repo.atualizarPorId('p1', { texto: 'novo' })).resolves.toEqual({ id: 'p1', texto: 'novo' });
    expect(Pergunta.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'p1' },
      { texto: 'novo' },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it.each([
    ['lista vazia', []],
    ['sem itens', undefined],
  ])('reordenar com %s não escreve no banco', async (_, itens) => {
    const bulkWrite = jest.spyOn(Pergunta, 'bulkWrite').mockResolvedValue({});

    await expect(repo.reordenar('q1', itens)).resolves.toBeUndefined();
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it('reordenar envia um updateOne por item, restrito ao questionário e em ordem', async () => {
    const bulkWrite = jest.spyOn(Pergunta, 'bulkWrite').mockResolvedValue({});

    await repo.reordenar('q1', [{ id: 'p1', ordem: 2 }, { id: 'p2', ordem: 1 }]);

    expect(bulkWrite).toHaveBeenCalledWith(
      [
        { updateOne: { filter: { id: 'p1', questionarioId: 'q1' }, update: { ordem: 2 } } },
        { updateOne: { filter: { id: 'p2', questionarioId: 'q1' }, update: { ordem: 1 } } },
      ],
      { ordered: true },
    );
  });

  it.each([
    ['com ids', ['p1'], ['p1']],
    ['sem ids', undefined, []],
  ])('lista opções de várias perguntas ordenadas (%s)', async (_, ids, esperado) => {
    const q = consulta([]);
    jest.spyOn(OpcaoResposta, 'find').mockReturnValue(q);

    await repo.listarOpcoesPorPerguntaIds(ids);

    expect(OpcaoResposta.find).toHaveBeenCalledWith({ perguntaId: { $in: esperado } });
    expect(q.sort).toHaveBeenCalledWith({ ordem: 1, _id: 1 });
  });

  it.each([
    ['com ids', ['o1'], ['o1']],
    ['sem ids', undefined, []],
  ])('busca opções por ids (%s)', async (_, ids, esperado) => {
    jest.spyOn(OpcaoResposta, 'find').mockReturnValue(consulta([]));

    await repo.buscarOpcaoPorIds(ids);

    expect(OpcaoResposta.find).toHaveBeenCalledWith({ id: { $in: esperado } });
  });

  it('busca opção restrita à pergunta', async () => {
    jest.spyOn(OpcaoResposta, 'findOne').mockReturnValue(consulta({ id: 'o1' }));

    await expect(repo.buscarOpcaoPorId('p1', 'o1')).resolves.toEqual({ id: 'o1' });
    expect(OpcaoResposta.findOne).toHaveBeenCalledWith({ id: 'o1', perguntaId: 'p1' });
  });

  it.each([
    ['com ids', ['p1'], ['p1']],
    ['sem ids', undefined, []],
  ])('apaga opções de várias perguntas (%s)', async (_, ids, esperado) => {
    jest.spyOn(OpcaoResposta, 'deleteMany').mockResolvedValue({ deletedCount: 0 });

    await repo.deletarOpcoesPorPerguntaIds(ids);

    expect(OpcaoResposta.deleteMany).toHaveBeenCalledWith({ perguntaId: { $in: esperado } });
  });

  it.each([
    ['criar', Pergunta],
    ['criarOpcao', OpcaoResposta],
  ])('%s cria com o payload', async (metodo, modelo) => {
    jest.spyOn(modelo, 'create').mockResolvedValue({ id: 'x1' });

    await expect(repo[metodo]({ texto: 'a' })).resolves.toEqual({ id: 'x1' });
    expect(modelo.create).toHaveBeenCalledWith({ texto: 'a' });
  });

  it.each([
    ['buscarPorId', Pergunta, 'findOne', ['p1'], [{ id: 'p1' }]],
    ['deletarPorId', Pergunta, 'findOneAndDelete', ['p1'], [{ id: 'p1' }]],
    [
      'atualizarOpcao',
      OpcaoResposta,
      'findOneAndUpdate',
      ['p1', 'o1', { texto: 'b' }],
      [{ id: 'o1', perguntaId: 'p1' }, { texto: 'b' }, { returnDocument: 'after', runValidators: true }],
    ],
    ['deletarOpcao', OpcaoResposta, 'findOneAndDelete', ['p1', 'o1'], [{ id: 'o1', perguntaId: 'p1' }]],
  ])('%s usa o método do modelo com os argumentos esperados', async (metodo, modelo, estatico, args, esperado) => {
    jest.spyOn(modelo, estatico).mockReturnValue(consulta({ id: 'x1' }));

    await expect(repo[metodo](...args)).resolves.toEqual({ id: 'x1' });
    expect(modelo[estatico]).toHaveBeenCalledWith(...esperado);
  });

  it.each([
    ['deletarPorQuestionarioId', Pergunta, 'q1', { questionarioId: 'q1' }],
    ['deletarOpcoesPorPerguntaId', OpcaoResposta, 'p1', { perguntaId: 'p1' }],
  ])('%s apaga em lote pelo pai', async (metodo, modelo, arg, filtro) => {
    jest.spyOn(modelo, 'deleteMany').mockResolvedValue({ deletedCount: 2 });

    await expect(repo[metodo](arg)).resolves.toEqual({ deletedCount: 2 });
    expect(modelo.deleteMany).toHaveBeenCalledWith(filtro);
  });

  it('lista opções da pergunta por ordem e _id', async () => {
    const q = consulta([{ id: 'o1' }]);
    jest.spyOn(OpcaoResposta, 'find').mockReturnValue(q);

    await expect(repo.listarOpcoesPorPerguntaId('p1')).resolves.toEqual([{ id: 'o1' }]);
    expect(OpcaoResposta.find).toHaveBeenCalledWith({ perguntaId: 'p1' });
    expect(q.sort).toHaveBeenCalledWith({ ordem: 1, _id: 1 });
  });
});
