import PerguntaService from './PerguntaService.js';
import AppError from '../utils/helpers/AppError.js';

jest.mock('../repository/PerguntaRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../repository/QuestionarioRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../repository/RespostaQuestionarioRepository.js', () => ({ __esModule: true, default: jest.fn() }));

const perguntaMultipla = { id: 'p1', questionarioId: 'q1', tipoResposta: 'multipla_escolha', ordem: 1, __v: 0 };
const perguntaVF = { id: 'p2', questionarioId: 'q1', tipoResposta: 'verdadeiro_falso', ordem: 2 };
const perguntaDissertativa = { id: 'p3', questionarioId: 'q1', tipoResposta: 'dissertativa', ordem: 3 };

const opcao = (id, perguntaId, ordem, correta = 0) => ({ id, perguntaId, texto: id, ordem, correta, __v: 0 });

const montarService = () => {
  const repository = {
    buscarPorId: jest.fn().mockResolvedValue(perguntaMultipla),
    buscarPorIds: jest.fn().mockResolvedValue([]),
    listarPorQuestionarioId: jest.fn().mockResolvedValue([]),
    listarOpcoesPorPerguntaId: jest.fn().mockResolvedValue([]),
    listarOpcoesPorPerguntaIds: jest.fn().mockResolvedValue([]),
    criar: jest.fn(async (dados) => ({ id: 'p-nova', ...dados, __v: 0 })),
    atualizarPorId: jest.fn(async (id, dados) => ({ ...perguntaMultipla, ...dados, id })),
    deletarPorId: jest.fn().mockResolvedValue({}),
    deletarOpcoesPorPerguntaId: jest.fn().mockResolvedValue({}),
    buscarOpcaoPorId: jest.fn().mockResolvedValue(null),
    criarOpcao: jest.fn(async (dados) => ({ id: 'o-nova', ...dados, __v: 0 })),
    atualizarOpcao: jest.fn(async (perguntaId, opcaoId, dados) => ({ id: opcaoId, perguntaId, ...dados, __v: 0 })),
    deletarOpcao: jest.fn().mockResolvedValue({}),
    reordenar: jest.fn().mockResolvedValue({}),
  };
  const questionarioRepository = { buscarPorId: jest.fn().mockResolvedValue({ id: 'q1' }) };
  const respostaQuestionarioRepository = {
    contarRespostasPorPergunta: jest.fn().mockResolvedValue(0),
    contarRespostasPorQuestionario: jest.fn().mockResolvedValue(0),
  };

  const service = new PerguntaService(repository, questionarioRepository, respostaQuestionarioRepository);
  return { service, repository, questionarioRepository, respostaQuestionarioRepository };
};

const esperarAppError = async (promessa, { message, statusCode, code }) => {
  const erro = await promessa.then(
    () => {
      throw new Error('era esperado AppError');
    },
    (e) => e,
  );
  expect(erro).toBeInstanceOf(AppError);
  expect(erro.message).toBe(message);
  expect(erro.statusCode).toBe(statusCode);
  expect(erro.code).toBe(code);
};

const questionarioNaoEncontrado = { message: 'Questionário não encontrado.', statusCode: 404, code: 'NOT_FOUND' };
const perguntaNaoEncontrada = { message: 'Pergunta não encontrada.', statusCode: 404, code: 'NOT_FOUND' };
const opcaoNaoEncontrada = { message: 'Opção de resposta não encontrada.', statusCode: 404, code: 'NOT_FOUND' };
const dissertativaSemOpcoes = {
  message: 'Perguntas dissertativas não aceitam opções de resposta.',
  statusCode: 400,
  code: 'BUSINESS_RULE_ERROR',
};
const jaPossuiCorreta = {
  message: 'A pergunta já possui uma opção marcada como correta.',
  statusCode: 400,
  code: 'BUSINESS_RULE_ERROR',
};
const ordemOpcaoEmUso = {
  message: 'Já existe opção de resposta com a ordem informada.',
  statusCode: 400,
  code: 'BUSINESS_RULE_ERROR',
};

describe('PerguntaService', () => {
  describe('questionário já respondido', () => {
    const travado = {
      message: 'Questionário já respondido por candidatos: perguntas e opções não podem mais ser alteradas.',
      statusCode: 400,
      code: 'BUSINESS_RULE_ERROR',
    };

    it.each([
      ['criar', (s) => s.criar({ questionarioId: 'q1', enunciado: 'Nova?', ordem: 9 }), 'criar'],
      ['atualizar', (s) => s.atualizar('p1', { enunciado: 'Outra?' }), 'atualizarPorId'],
      ['deletar', (s) => s.deletar('p1'), 'deletarPorId'],
      ['adicionarOpcao', (s) => s.adicionarOpcao('p1', { texto: 'Nova', ordem: 9 }), 'criarOpcao'],
      ['atualizarOpcao', (s) => s.atualizarOpcao('p1', 'o1', { texto: 'Outro' }), 'atualizarOpcao'],
      ['removerOpcao', (s) => s.removerOpcao('p1', 'o1'), 'deletarOpcao'],
    ])('%s é recusado e não grava nada', async (_, acao, escrita) => {
      const { service, repository, respostaQuestionarioRepository } = montarService();
      respostaQuestionarioRepository.contarRespostasPorQuestionario.mockResolvedValue(1);
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o1', 'p1', 1));

      await esperarAppError(acao(service), travado);
      expect(respostaQuestionarioRepository.contarRespostasPorQuestionario).toHaveBeenCalledWith('q1');
      expect(repository[escrita]).not.toHaveBeenCalled();
    });

    it('reordenar é recusado e não grava nada', async () => {
      const { service, repository, respostaQuestionarioRepository } = montarService();
      respostaQuestionarioRepository.contarRespostasPorQuestionario.mockResolvedValue(1);
      repository.buscarPorIds.mockResolvedValue([perguntaMultipla, perguntaVF]);

      await esperarAppError(
        service.reordenar({ questionarioId: 'q1', perguntas: [{ id: 'p2', ordem: 1 }, { id: 'p1', ordem: 2 }] }),
        travado,
      );
      expect(repository.reordenar).not.toHaveBeenCalled();
    });
  });

  describe('sanitize', () => {
    it('devolve null para documento ausente', () => {
      expect(new PerguntaService({}, {}, {}).sanitize(null)).toBeNull();
    });

    it('usa toObject quando disponível e remove __v', () => {
      const doc = { toObject: () => ({ id: 'p1', __v: 3 }) };

      expect(new PerguntaService({}, {}, {}).sanitize(doc)).toEqual({ id: 'p1' });
    });
  });

  describe('criar', () => {
    it('cria a pergunta e devolve com as opções ordenadas', async () => {
      const { service, repository, questionarioRepository } = montarService();
      repository.listarPorQuestionarioId.mockResolvedValue([perguntaVF]);
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('b', 'p-nova', 2), opcao('a', 'p-nova', 1)]);
      const payload = { questionarioId: 'q1', enunciado: 'Qual?', tipoResposta: 'multipla_escolha', ordem: 1 };

      const resultado = await service.criar(payload);

      expect(questionarioRepository.buscarPorId).toHaveBeenCalledWith('q1');
      expect(repository.criar).toHaveBeenCalledWith(payload);
      expect(repository.listarOpcoesPorPerguntaId).toHaveBeenCalledWith('p-nova');
      expect(resultado).toEqual({
        id: 'p-nova',
        ...payload,
        opcaoResposta: [
          { id: 'a', perguntaId: 'p-nova', texto: 'a', ordem: 1, correta: 0 },
          { id: 'b', perguntaId: 'p-nova', texto: 'b', ordem: 2, correta: 0 },
        ],
      });
    });

    it('devolve dissertativa sempre sem opções', async () => {
      const { service, repository } = montarService();
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('a', 'p-nova', 1)]);

      const resultado = await service.criar({ questionarioId: 'q1', tipoResposta: 'dissertativa', ordem: 1 });

      expect(resultado.opcaoResposta).toEqual([]);
    });

    it('lança 404 quando o questionário não existe', async () => {
      const { service, questionarioRepository, repository } = montarService();
      questionarioRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.criar({ questionarioId: 'q-x', ordem: 1 }), questionarioNaoEncontrado);
      expect(repository.criar).not.toHaveBeenCalled();
    });

    it('não permite duas perguntas com a mesma ordem no questionário', async () => {
      const { service, repository } = montarService();
      repository.listarPorQuestionarioId.mockResolvedValue([perguntaMultipla]);

      await esperarAppError(service.criar({ questionarioId: 'q1', ordem: 1 }), {
        message: 'Já existe pergunta com a ordem informada neste questionário.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.listarPorQuestionarioId).toHaveBeenCalledWith('q1');
      expect(repository.criar).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('agrupa as opções por pergunta, ordenadas, e zera as da dissertativa', async () => {
      const { service, repository } = montarService();
      repository.listarPorQuestionarioId.mockResolvedValue([perguntaMultipla, perguntaVF, perguntaDissertativa]);
      repository.listarOpcoesPorPerguntaIds.mockResolvedValue([
        opcao('o2', 'p1', 2),
        opcao('vf', 'p2', 1),
        opcao('o1', 'p1', 1, 1),
        opcao('orfa', 'p3', 1),
      ]);

      const resultado = await service.listar('q1');

      expect(repository.listarOpcoesPorPerguntaIds).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
      expect(resultado.map((item) => item.id)).toEqual(['p1', 'p2', 'p3']);
      expect(resultado[0]).not.toHaveProperty('__v');
      expect(resultado[0].opcaoResposta.map((item) => item.id)).toEqual(['o1', 'o2']);
      expect(resultado[0].opcaoResposta[0]).toEqual({ id: 'o1', perguntaId: 'p1', texto: 'o1', ordem: 1, correta: 1 });
      expect(resultado[1].opcaoResposta.map((item) => item.id)).toEqual(['vf']);
      expect(resultado[2].opcaoResposta).toEqual([]);
    });

    it('devolve lista vazia sem buscar opções quando não há perguntas', async () => {
      const { service, repository } = montarService();

      expect(await service.listar('q1')).toEqual([]);
      expect(repository.listarOpcoesPorPerguntaIds).not.toHaveBeenCalled();
    });

    it('devolve opções vazias para objetiva ainda sem opções', async () => {
      const { service, repository } = montarService();
      repository.listarPorQuestionarioId.mockResolvedValue([perguntaMultipla]);

      const [pergunta] = await service.listar('q1');

      expect(pergunta.opcaoResposta).toEqual([]);
    });

    it('lança 404 quando o questionário não existe', async () => {
      const { service, questionarioRepository } = montarService();
      questionarioRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.listar('q-x'), questionarioNaoEncontrado);
    });
  });

  describe('buscarPorId', () => {
    it('devolve a pergunta com suas opções', async () => {
      const { service, repository } = montarService();
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1)]);

      const resultado = await service.buscarPorId('p1');

      expect(repository.buscarPorId).toHaveBeenCalledWith('p1');
      expect(resultado).toMatchObject({ id: 'p1', opcaoResposta: [{ id: 'o1' }] });
      expect(resultado).not.toHaveProperty('__v');
    });

    it('lança 404 quando a pergunta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.buscarPorId('x'), perguntaNaoEncontrada);
    });
  });

  describe('atualizar', () => {
    it('atualiza sem checar ordem quando ela não muda', async () => {
      const { service, repository } = montarService();

      const resultado = await service.atualizar('p1', { enunciado: 'Novo', ordem: 1 });

      expect(repository.listarPorQuestionarioId).not.toHaveBeenCalled();
      expect(repository.atualizarPorId).toHaveBeenCalledWith('p1', { enunciado: 'Novo', ordem: 1 });
      expect(repository.deletarOpcoesPorPerguntaId).not.toHaveBeenCalled();
      expect(resultado).toMatchObject({ id: 'p1', enunciado: 'Novo', opcaoResposta: [] });
    });

    it('permite mudar para ordem livre, ignorando a própria pergunta', async () => {
      const { service, repository } = montarService();
      repository.listarPorQuestionarioId.mockResolvedValue([perguntaMultipla, perguntaVF]);

      await service.atualizar('p1', { ordem: 5 });

      expect(repository.listarPorQuestionarioId).toHaveBeenCalledWith('q1');
      expect(repository.atualizarPorId).toHaveBeenCalledWith('p1', { ordem: 5 });
    });

    it('não permite mudar para ordem ocupada por outra pergunta', async () => {
      const { service, repository } = montarService();
      repository.listarPorQuestionarioId.mockResolvedValue([perguntaMultipla, perguntaVF]);

      await esperarAppError(service.atualizar('p1', { ordem: 2 }), {
        message: 'Já existe pergunta com a ordem informada neste questionário.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.atualizarPorId).not.toHaveBeenCalled();
    });

    it('apaga as opções quando a pergunta vira dissertativa', async () => {
      const { service, repository } = montarService();
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1)]);

      const resultado = await service.atualizar('p1', { tipoResposta: 'dissertativa' });

      expect(repository.deletarOpcoesPorPerguntaId).toHaveBeenCalledWith('p1');
      expect(resultado.opcaoResposta).toEqual([]);
    });

    it('lança 404 quando a pergunta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.atualizar('x', {}), perguntaNaoEncontrada);
      expect(repository.atualizarPorId).not.toHaveBeenCalled();
    });
  });

  describe('deletar', () => {
    it('apaga opções e pergunta quando não há respostas vinculadas', async () => {
      const { service, repository, respostaQuestionarioRepository } = montarService();

      const resultado = await service.deletar('p1');

      expect(respostaQuestionarioRepository.contarRespostasPorPergunta).toHaveBeenCalledWith('p1');
      expect(repository.deletarOpcoesPorPerguntaId).toHaveBeenCalledWith('p1');
      expect(repository.deletarPorId).toHaveBeenCalledWith('p1');
      expect(resultado).toEqual({ id: 'p1', deletado: true });
    });

    it('não permite excluir pergunta com respostas vinculadas', async () => {
      const { service, repository, respostaQuestionarioRepository } = montarService();
      respostaQuestionarioRepository.contarRespostasPorPergunta.mockResolvedValue(3);

      await esperarAppError(service.deletar('p1'), {
        message: 'Não é permitido excluir pergunta com respostas vinculadas.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.deletarOpcoesPorPerguntaId).not.toHaveBeenCalled();
      expect(repository.deletarPorId).not.toHaveBeenCalled();
    });

    it('lança 404 quando a pergunta não existe', async () => {
      const { service, repository, respostaQuestionarioRepository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.deletar('x'), perguntaNaoEncontrada);
      expect(respostaQuestionarioRepository.contarRespostasPorPergunta).not.toHaveBeenCalled();
    });
  });

  describe('validarApenasUmaOpcaoCorreta', () => {
    const { service } = montarService();

    it('ignora a validação quando a opção não é marcada como correta', () => {
      expect(() => service.validarApenasUmaOpcaoCorreta(perguntaDissertativa, [opcao('o1', 'p3', 1, 1)], 0)).not.toThrow();
      expect(() => service.validarApenasUmaOpcaoCorreta(perguntaMultipla, [opcao('o1', 'p1', 1, 1)], undefined)).not.toThrow();
    });

    it('aceita correta como número ou string "1"', () => {
      const opcoes = [opcao('o1', 'p1', 1, 1)];

      expect(() => service.validarApenasUmaOpcaoCorreta(perguntaMultipla, opcoes, 1)).toThrow(jaPossuiCorreta.message);
      expect(() => service.validarApenasUmaOpcaoCorreta(perguntaMultipla, opcoes, '1')).toThrow(jaPossuiCorreta.message);
    });

    it('rejeita gabarito em pergunta dissertativa', () => {
      expect(() => service.validarApenasUmaOpcaoCorreta(perguntaDissertativa, [], 1)).toThrow(dissertativaSemOpcoes.message);
    });

    it('permite manter a própria opção como correta ao atualizá-la', () => {
      expect(() => service.validarApenasUmaOpcaoCorreta(perguntaMultipla, [opcao('o1', 'p1', 1, 1)], 1, 'o1')).not.toThrow();
    });
  });

  describe('adicionarOpcao', () => {
    it('cria a opção vinculada à pergunta', async () => {
      const { service, repository } = montarService();
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1, 0)]);

      const resultado = await service.adicionarOpcao('p1', { texto: 'Nova', ordem: 2, correta: 1 });

      expect(repository.listarOpcoesPorPerguntaId).toHaveBeenCalledWith('p1');
      expect(repository.criarOpcao).toHaveBeenCalledWith({ texto: 'Nova', ordem: 2, correta: 1, perguntaId: 'p1' });
      expect(resultado).toEqual({ id: 'o-nova', texto: 'Nova', ordem: 2, correta: 1, perguntaId: 'p1' });
    });

    it('usa o id da pergunta encontrada, não um perguntaId do payload', async () => {
      const { service, repository } = montarService();

      await service.adicionarOpcao('p1', { texto: 'X', ordem: 1, perguntaId: 'p-intrusa' });

      expect(repository.criarOpcao).toHaveBeenCalledWith(expect.objectContaining({ perguntaId: 'p1' }));
    });

    it('aceita opções em pergunta de verdadeiro ou falso', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(perguntaVF);

      await service.adicionarOpcao('p2', { texto: 'Verdadeiro', ordem: 1, correta: 1 });

      expect(repository.criarOpcao).toHaveBeenCalledWith({ texto: 'Verdadeiro', ordem: 1, correta: 1, perguntaId: 'p2' });
    });

    it('não aceita opção em pergunta dissertativa', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(perguntaDissertativa);

      await esperarAppError(service.adicionarOpcao('p3', { texto: 'X', ordem: 1 }), dissertativaSemOpcoes);
      expect(repository.criarOpcao).not.toHaveBeenCalled();
    });

    it('não aceita segunda opção correta', async () => {
      const { service, repository } = montarService();
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1, 1)]);

      await esperarAppError(service.adicionarOpcao('p1', { texto: 'X', ordem: 2, correta: 1 }), jaPossuiCorreta);
      expect(repository.criarOpcao).not.toHaveBeenCalled();
    });

    it('não aceita ordem repetida entre as opções', async () => {
      const { service, repository } = montarService();
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1)]);

      await esperarAppError(service.adicionarOpcao('p1', { texto: 'X', ordem: 1, correta: 0 }), ordemOpcaoEmUso);
      expect(repository.criarOpcao).not.toHaveBeenCalled();
    });

    it('lança 404 quando a pergunta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.adicionarOpcao('x', { ordem: 1 }), perguntaNaoEncontrada);
    });
  });

  describe('atualizarOpcao', () => {
    it('atualiza a opção existente', async () => {
      const { service, repository } = montarService();
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o1', 'p1', 1));
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1), opcao('o2', 'p1', 2)]);

      const resultado = await service.atualizarOpcao('p1', 'o1', { texto: 'Editada' });

      expect(repository.buscarOpcaoPorId).toHaveBeenCalledWith('p1', 'o1');
      expect(repository.atualizarOpcao).toHaveBeenCalledWith('p1', 'o1', { texto: 'Editada' });
      expect(resultado).toEqual({ id: 'o1', perguntaId: 'p1', texto: 'Editada' });
    });

    it('permite manter a mesma ordem e marcar como correta a própria opção', async () => {
      const { service, repository } = montarService();
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o1', 'p1', 1, 1));
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1, 1), opcao('o2', 'p1', 2)]);

      await service.atualizarOpcao('p1', 'o1', { ordem: 1, correta: 1 });

      expect(repository.atualizarOpcao).toHaveBeenCalledWith('p1', 'o1', { ordem: 1, correta: 1 });
    });

    it('troca o gabarito desmarcando sem validar outra correta', async () => {
      const { service, repository } = montarService();
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o2', 'p1', 2));
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1, 1), opcao('o2', 'p1', 2)]);

      await service.atualizarOpcao('p1', 'o2', { correta: 0 });

      expect(repository.atualizarOpcao).toHaveBeenCalledWith('p1', 'o2', { correta: 0 });
    });

    it('não permite marcar como correta quando outra opção já é a correta', async () => {
      const { service, repository } = montarService();
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o2', 'p1', 2));
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1, 1), opcao('o2', 'p1', 2)]);

      await esperarAppError(service.atualizarOpcao('p1', 'o2', { correta: 1 }), jaPossuiCorreta);
      expect(repository.atualizarOpcao).not.toHaveBeenCalled();
    });

    it('não permite mudar para ordem de outra opção', async () => {
      const { service, repository } = montarService();
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o2', 'p1', 2));
      repository.listarOpcoesPorPerguntaId.mockResolvedValue([opcao('o1', 'p1', 1), opcao('o2', 'p1', 2)]);

      await esperarAppError(service.atualizarOpcao('p1', 'o2', { ordem: 1 }), ordemOpcaoEmUso);
      expect(repository.atualizarOpcao).not.toHaveBeenCalled();
    });

    it('não aceita opção em pergunta dissertativa', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(perguntaDissertativa);

      await esperarAppError(service.atualizarOpcao('p3', 'o1', {}), dissertativaSemOpcoes);
      expect(repository.buscarOpcaoPorId).not.toHaveBeenCalled();
    });

    it('lança 404 quando a opção não existe na pergunta', async () => {
      const { service, repository } = montarService();

      await esperarAppError(service.atualizarOpcao('p1', 'o-x', {}), opcaoNaoEncontrada);
      expect(repository.atualizarOpcao).not.toHaveBeenCalled();
    });

    it('lança 404 quando a pergunta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.atualizarOpcao('x', 'o1', {}), perguntaNaoEncontrada);
    });
  });

  describe('removerOpcao', () => {
    it('remove a opção da pergunta', async () => {
      const { service, repository } = montarService();
      repository.buscarOpcaoPorId.mockResolvedValue(opcao('o1', 'p1', 1));

      const resultado = await service.removerOpcao('p1', 'o1');

      expect(repository.buscarOpcaoPorId).toHaveBeenCalledWith('p1', 'o1');
      expect(repository.deletarOpcao).toHaveBeenCalledWith('p1', 'o1');
      expect(resultado).toEqual({ id: 'o1', deletado: true });
    });

    it('lança 404 quando a opção não existe', async () => {
      const { service, repository } = montarService();

      await esperarAppError(service.removerOpcao('p1', 'o-x'), opcaoNaoEncontrada);
      expect(repository.deletarOpcao).not.toHaveBeenCalled();
    });

    it('lança 404 quando a pergunta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.removerOpcao('x', 'o1'), perguntaNaoEncontrada);
    });
  });

  describe('reordenar', () => {
    const atuais = [
      { id: 'p1', questionarioId: 'q1', ordem: 1 },
      { id: 'p2', questionarioId: 'q1', ordem: 2 },
    ];
    const novaOrdem = [
      { id: 'p1', ordem: 2 },
      { id: 'p2', ordem: 1 },
    ];

    const prepararReordenar = () => {
      const contexto = montarService();
      contexto.repository.buscarPorIds.mockResolvedValue(atuais);
      contexto.repository.listarPorQuestionarioId
        .mockResolvedValueOnce(atuais)
        .mockResolvedValueOnce([
          { id: 'p2', questionarioId: 'q1', ordem: 1, __v: 0 },
          { id: 'p1', questionarioId: 'q1', ordem: 2, __v: 0 },
        ]);
      return contexto;
    };

    it('passa por ordens temporárias antes da final para não violar a chave única', async () => {
      const { service, repository, questionarioRepository } = prepararReordenar();

      const resultado = await service.reordenar({ questionarioId: 'q1', perguntas: novaOrdem });

      expect(repository.buscarPorIds).toHaveBeenCalledWith(['p1', 'p2']);
      expect(questionarioRepository.buscarPorId).toHaveBeenCalledWith('q1');
      expect(repository.reordenar).toHaveBeenCalledTimes(2);
      expect(repository.reordenar).toHaveBeenNthCalledWith(1, 'q1', [
        { id: 'p1', ordem: 100000 },
        { id: 'p2', ordem: 100001 },
      ]);
      expect(repository.reordenar).toHaveBeenNthCalledWith(2, 'q1', novaOrdem);
      expect(resultado).toEqual([
        { id: 'p2', questionarioId: 'q1', ordem: 1 },
        { id: 'p1', questionarioId: 'q1', ordem: 2 },
      ]);
    });

    it('deduz o questionário pelas perguntas quando o payload não informa', async () => {
      const { service, repository } = prepararReordenar();

      await service.reordenar({ perguntas: novaOrdem });

      expect(repository.listarPorQuestionarioId).toHaveBeenCalledWith('q1');
      expect(repository.reordenar).toHaveBeenNthCalledWith(2, 'q1', novaOrdem);
    });

    it('lança 404 quando alguma pergunta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue([atuais[0]]);

      await esperarAppError(service.reordenar({ questionarioId: 'q1', perguntas: novaOrdem }), {
        message: 'Uma ou mais perguntas não foram encontradas.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(repository.reordenar).not.toHaveBeenCalled();
    });

    it('não permite misturar perguntas de questionários diferentes', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue([atuais[0], { id: 'p2', questionarioId: 'q2', ordem: 1 }]);

      await esperarAppError(service.reordenar({ perguntas: novaOrdem }), {
        message: 'Não é permitido reordenar perguntas de questionários diferentes.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
    });

    it('não permite reordenar perguntas de outro questionário que o informado', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue(atuais);

      await esperarAppError(service.reordenar({ questionarioId: 'q2', perguntas: novaOrdem }), {
        message: 'Não é permitido reordenar perguntas de questionários diferentes.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.reordenar).not.toHaveBeenCalled();
    });

    it('lança 404 quando o questionário não existe', async () => {
      const { service, repository, questionarioRepository } = montarService();
      repository.buscarPorIds.mockResolvedValue(atuais);
      questionarioRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.reordenar({ questionarioId: 'q1', perguntas: novaOrdem }), questionarioNaoEncontrado);
      expect(repository.reordenar).not.toHaveBeenCalled();
    });

    it('exige que todas as perguntas do questionário sejam informadas', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue(atuais);
      repository.listarPorQuestionarioId.mockResolvedValue([...atuais, { id: 'p3', questionarioId: 'q1', ordem: 3 }]);

      await esperarAppError(service.reordenar({ questionarioId: 'q1', perguntas: novaOrdem }), {
        message: 'Para reordenar, informe todas as perguntas do questionário.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.reordenar).not.toHaveBeenCalled();
    });

    it('rejeita pergunta que não está entre as atuais do questionário', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue(atuais);
      repository.listarPorQuestionarioId.mockResolvedValue([atuais[0], { id: 'p9', questionarioId: 'q1', ordem: 2 }]);

      await esperarAppError(service.reordenar({ questionarioId: 'q1', perguntas: novaOrdem }), {
        message: 'Uma ou mais perguntas não pertencem ao questionário informado.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.reordenar).not.toHaveBeenCalled();
    });
  });
});
