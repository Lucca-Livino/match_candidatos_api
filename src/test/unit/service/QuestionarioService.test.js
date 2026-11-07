import QuestionarioService from '../../../service/QuestionarioService.js';
import AppError from '../../../utils/helpers/AppError.js';

jest.mock('../../../repository/VagaRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../repository/QuestionarioRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../repository/PerguntaRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../repository/RespostaQuestionarioRepository.js', () => ({ __esModule: true, default: jest.fn() }));

const questionarioAtivo = { id: 'q1', vagaId: 'v1', titulo: 'Teste', ativo: 1, __v: 0 };

const montarService = () => {
  const repository = {
    buscarPorId: jest.fn().mockResolvedValue(questionarioAtivo),
    listar: jest.fn().mockResolvedValue([]),
    criar: jest.fn(async (dados) => ({ id: 'q-novo', ...dados, __v: 0 })),
    atualizarPorId: jest.fn(async (id, dados) => ({ ...questionarioAtivo, ...dados, id })),
    deletarPorId: jest.fn().mockResolvedValue({}),
  };
  const perguntaRepository = {
    listarPorQuestionarioId: jest.fn().mockResolvedValue([]),
    listarOpcoesPorPerguntaIds: jest.fn().mockResolvedValue([]),
    deletarOpcoesPorPerguntaIds: jest.fn().mockResolvedValue({}),
    deletarPorQuestionarioId: jest.fn().mockResolvedValue({}),
  };
  const respostaQuestionarioRepository = { contarRespostasPorQuestionario: jest.fn().mockResolvedValue(0) };
  const vagaRepository = { buscarPorId: jest.fn().mockResolvedValue({ id: 'v1', status: 'pausada' }) };

  const service = new QuestionarioService(repository, perguntaRepository, respostaQuestionarioRepository, vagaRepository);
  return { service, repository, perguntaRepository, respostaQuestionarioRepository, vagaRepository };
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

const vagaNaoEncontrada = { message: 'Vaga informada não foi encontrada.', statusCode: 404, code: 'NOT_FOUND' };
const questionarioNaoEncontrado = { message: 'Questionário não encontrado.', statusCode: 404, code: 'NOT_FOUND' };
const sustentaVagaAtiva = {
  message: 'Este é o único questionário ativo de uma vaga ativa. Pause a vaga antes de alterá-lo.',
  statusCode: 400,
  code: 'BUSINESS_RULE_ERROR',
};
const possuiRespostas = {
  message: 'Não é permitido excluir questionário com respostas vinculadas.',
  statusCode: 400,
  code: 'BUSINESS_RULE_ERROR',
};

describe('QuestionarioService', () => {
  describe('construtor', () => {
    it('instancia os repositórios padrão quando nada é injetado', () => {
      const service = new QuestionarioService();
      expect(service.repository).toBeDefined();
      expect(service.perguntaRepository).toBeDefined();
      expect(service.respostaQuestionarioRepository).toBeDefined();
      expect(service.vagaRepository).toBeDefined();
    });
  });

  describe('sanitize', () => {
    it('remove __v do documento', () => {
      const { service } = montarService();
      expect(service.sanitize({ id: 'q1', __v: 3 })).toEqual({ id: 'q1' });
    });
  });

  describe('criar', () => {
    it('cria o questionário quando a vaga existe', async () => {
      const { service, repository, vagaRepository } = montarService();
      const resultado = await service.criar({ vagaId: 'v1', titulo: 'Novo' });

      expect(vagaRepository.buscarPorId).toHaveBeenCalledWith('v1');
      expect(repository.criar).toHaveBeenCalledWith({ vagaId: 'v1', titulo: 'Novo' });
      expect(resultado).toEqual({ id: 'q-novo', vagaId: 'v1', titulo: 'Novo' });
    });

    it('recusa vaga inexistente sem criar', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.criar({ vagaId: 'v9' }), vagaNaoEncontrada);
      expect(repository.criar).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('repassa a consulta e sanitiza cada item', async () => {
      const { service, repository } = montarService();
      repository.listar.mockResolvedValue([{ id: 'q1', __v: 0 }, { id: 'q2', __v: 1 }]);

      const resultado = await service.listar({ vagaId: 'v1' });

      expect(repository.listar).toHaveBeenCalledWith({ vagaId: 'v1' });
      expect(resultado).toEqual([{ id: 'q1' }, { id: 'q2' }]);
    });
  });

  describe('montarPerguntasComOpcoes', () => {
    const perguntas = [
      { id: 'p2', ordem: 2, tipoResposta: 'dissertativa', __v: 0 },
      { id: 'p1', ordem: 1, tipoResposta: 'multipla_escolha', __v: 0 },
      { id: 'p3', ordem: 3, tipoResposta: 'verdadeiro_falso' },
    ];
    const opcoes = [
      { id: 'o2', perguntaId: 'p1', ordem: 2, correta: 0, __v: 0 },
      { id: 'o1', perguntaId: 'p1', ordem: 1, correta: 1, __v: 0 },
      { id: 'o3', perguntaId: 'p2', ordem: 1, correta: 0 },
    ];

    it('ordena perguntas e opções, zera opções de dissertativa e mantém o gabarito por padrão', () => {
      const { service } = montarService();
      const resultado = service.montarPerguntasComOpcoes(perguntas, opcoes);

      expect(resultado.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
      expect(resultado[0].opcaoResposta).toEqual([
        { id: 'o1', perguntaId: 'p1', ordem: 1, correta: 1 },
        { id: 'o2', perguntaId: 'p1', ordem: 2, correta: 0 },
      ]);
      expect(resultado[1]).toEqual({ id: 'p2', ordem: 2, tipoResposta: 'dissertativa', opcaoResposta: [] });
      expect(resultado[2].opcaoResposta).toEqual([]);
    });

    it('oculta o campo correta quando comGabarito é falso', () => {
      const { service } = montarService();
      const [primeira] = service.montarPerguntasComOpcoes(perguntas, opcoes, { comGabarito: false });

      expect(primeira.opcaoResposta).toEqual([
        { id: 'o1', perguntaId: 'p1', ordem: 1 },
        { id: 'o2', perguntaId: 'p1', ordem: 2 },
      ]);
    });

    it('não altera a ordem do array de perguntas recebido', () => {
      const { service } = montarService();
      service.montarPerguntasComOpcoes(perguntas, opcoes);
      expect(perguntas.map((p) => p.id)).toEqual(['p2', 'p1', 'p3']);
    });
  });

  describe('buscarPorIdComPerguntas', () => {
    it('recusa questionário inexistente', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.buscarPorIdComPerguntas('q9'), questionarioNaoEncontrado);
    });

    it('não busca opções quando não há perguntas', async () => {
      const { service, perguntaRepository } = montarService();
      const resultado = await service.buscarPorIdComPerguntas('q1');

      expect(perguntaRepository.listarPorQuestionarioId).toHaveBeenCalledWith('q1');
      expect(perguntaRepository.listarOpcoesPorPerguntaIds).not.toHaveBeenCalled();
      expect(resultado).toEqual({ id: 'q1', vagaId: 'v1', titulo: 'Teste', ativo: 1, perguntas: [], respondido: false });
    });

    it('marca respondido para o editor e omite o campo na visão do candidato', async () => {
      const { service, respostaQuestionarioRepository } = montarService();
      respostaQuestionarioRepository.contarRespostasPorQuestionario.mockResolvedValue(3);

      const editor = await service.buscarPorIdComPerguntas('q1');
      const candidato = await service.buscarPorIdComPerguntas('q1', { comGabarito: false });

      expect(editor.respondido).toBe(true);
      expect(candidato).not.toHaveProperty('respondido');
    });

    it.each([
      ['com gabarito por padrão', undefined, { id: 'o1', perguntaId: 'p1', ordem: 1, correta: 1 }],
      ['sem gabarito quando pedido', { comGabarito: false }, { id: 'o1', perguntaId: 'p1', ordem: 1 }],
    ])('monta perguntas e opções %s', async (_, opcoesBusca, opcaoEsperada) => {
      const { service, perguntaRepository } = montarService();
      perguntaRepository.listarPorQuestionarioId.mockResolvedValue([
        { id: 'p1', ordem: 1, tipoResposta: 'multipla_escolha' },
      ]);
      perguntaRepository.listarOpcoesPorPerguntaIds.mockResolvedValue([
        { id: 'o1', perguntaId: 'p1', ordem: 1, correta: 1 },
      ]);

      const resultado = await service.buscarPorIdComPerguntas('q1', opcoesBusca);

      expect(perguntaRepository.listarOpcoesPorPerguntaIds).toHaveBeenCalledWith(['p1']);
      expect(resultado.perguntas[0].opcaoResposta).toEqual([opcaoEsperada]);
    });
  });

  describe('garantirNaoSustentaVagaAtiva', () => {
    it('libera questionário inativo sem consultar a vaga', async () => {
      const { service, vagaRepository } = montarService();
      await expect(service.garantirNaoSustentaVagaAtiva({ ...questionarioAtivo, ativo: 0 })).resolves.toBeUndefined();
      expect(vagaRepository.buscarPorId).not.toHaveBeenCalled();
    });

    it.each([
      ['a vaga não existe', null],
      ['a vaga está pausada', { id: 'v1', status: 'pausada' }],
    ])('libera quando %s', async (_, vaga) => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue(vaga);

      await expect(service.garantirNaoSustentaVagaAtiva(questionarioAtivo)).resolves.toBeUndefined();
      expect(repository.listar).not.toHaveBeenCalled();
    });

    it('libera quando a vaga ativa tem outro questionário ativo', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue({ id: 'v1', status: 'ativa' });
      repository.listar.mockResolvedValue([questionarioAtivo, { id: 'q2', ativo: 1 }]);

      await expect(service.garantirNaoSustentaVagaAtiva(questionarioAtivo)).resolves.toBeUndefined();
      expect(repository.listar).toHaveBeenCalledWith({ vagaId: 'v1', ativo: 1 });
    });

    it('bloqueia o único questionário ativo de uma vaga ativa', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue({ id: 'v1', status: 'ativa' });
      repository.listar.mockResolvedValue([questionarioAtivo]);

      await esperarAppError(service.garantirNaoSustentaVagaAtiva(questionarioAtivo), sustentaVagaAtiva);
    });
  });

  describe('atualizar', () => {
    it('recusa questionário inexistente', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.atualizar('q9', { titulo: 'X' }), questionarioNaoEncontrado);
      expect(repository.atualizarPorId).not.toHaveBeenCalled();
    });

    it.each([
      ['sem vagaId', { titulo: 'Novo título' }],
      ['com a mesma vagaId', { vagaId: 'v1', titulo: 'Novo título' }],
    ])('atualiza %s sem revalidar a vaga', async (_, payload) => {
      const { service, repository, vagaRepository } = montarService();
      const resultado = await service.atualizar('q1', payload);

      expect(vagaRepository.buscarPorId).not.toHaveBeenCalled();
      expect(repository.atualizarPorId).toHaveBeenCalledWith('q1', payload);
      expect(resultado).toEqual({ ...questionarioAtivo, ...payload, __v: undefined });
    });

    it('troca de vaga quando a nova existe e a antiga não depende dele', async () => {
      const { service, repository, vagaRepository } = montarService();
      const resultado = await service.atualizar('q1', { vagaId: 'v2' });

      expect(vagaRepository.buscarPorId).toHaveBeenNthCalledWith(1, 'v2');
      expect(vagaRepository.buscarPorId).toHaveBeenNthCalledWith(2, 'v1');
      expect(repository.atualizarPorId).toHaveBeenCalledWith('q1', { vagaId: 'v2' });
      expect(resultado.vagaId).toBe('v2');
    });

    it('recusa troca para vaga inexistente', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.atualizar('q1', { vagaId: 'v9' }), vagaNaoEncontrada);
      expect(repository.atualizarPorId).not.toHaveBeenCalled();
    });

    it('recusa troca de vaga do único questionário ativo de uma vaga ativa', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockImplementation(async (id) => ({ id, status: 'ativa' }));
      repository.listar.mockResolvedValue([questionarioAtivo]);

      await esperarAppError(service.atualizar('q1', { vagaId: 'v2' }), sustentaVagaAtiva);
      expect(repository.atualizarPorId).not.toHaveBeenCalled();
    });
  });

  describe('atualizarAtivo', () => {
    it('recusa questionário inexistente', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.atualizarAtivo('q9', 1), questionarioNaoEncontrado);
    });

    it('ativa sem checar a vaga', async () => {
      const { service, repository, vagaRepository } = montarService();
      const resultado = await service.atualizarAtivo('q1', 1);

      expect(vagaRepository.buscarPorId).not.toHaveBeenCalled();
      expect(repository.atualizarPorId).toHaveBeenCalledWith('q1', { ativo: 1 });
      expect(resultado.ativo).toBe(1);
    });

    it('desativa quando não sustenta vaga ativa', async () => {
      const { service, repository, vagaRepository } = montarService();
      const resultado = await service.atualizarAtivo('q1', 0);

      expect(vagaRepository.buscarPorId).toHaveBeenCalledWith('v1');
      expect(repository.atualizarPorId).toHaveBeenCalledWith('q1', { ativo: 0 });
      expect(resultado.ativo).toBe(0);
    });

    it('recusa desativar o único questionário ativo de uma vaga ativa', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue({ id: 'v1', status: 'ativa' });
      repository.listar.mockResolvedValue([questionarioAtivo]);

      await esperarAppError(service.atualizarAtivo('q1', 0), sustentaVagaAtiva);
      expect(repository.atualizarPorId).not.toHaveBeenCalled();
    });
  });

  describe('deletar', () => {
    it('recusa questionário inexistente', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.deletar('q9'), questionarioNaoEncontrado);
      expect(repository.deletarPorId).not.toHaveBeenCalled();
    });

    it('recusa questionário com respostas vinculadas', async () => {
      const { service, repository, respostaQuestionarioRepository } = montarService();
      respostaQuestionarioRepository.contarRespostasPorQuestionario.mockResolvedValue(2);

      await esperarAppError(service.deletar('q1'), possuiRespostas);
      expect(respostaQuestionarioRepository.contarRespostasPorQuestionario).toHaveBeenCalledWith('q1');
      expect(repository.deletarPorId).not.toHaveBeenCalled();
    });

    it('recusa o único questionário ativo de uma vaga ativa', async () => {
      const { service, repository, vagaRepository } = montarService();
      vagaRepository.buscarPorId.mockResolvedValue({ id: 'v1', status: 'ativa' });
      repository.listar.mockResolvedValue([questionarioAtivo]);

      await esperarAppError(service.deletar('q1'), sustentaVagaAtiva);
      expect(repository.deletarPorId).not.toHaveBeenCalled();
    });

    it('exclui opções, perguntas e o questionário', async () => {
      const { service, repository, perguntaRepository } = montarService();
      perguntaRepository.listarPorQuestionarioId.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const resultado = await service.deletar('q1');

      expect(perguntaRepository.deletarOpcoesPorPerguntaIds).toHaveBeenCalledWith(['p1', 'p2']);
      expect(perguntaRepository.deletarPorQuestionarioId).toHaveBeenCalledWith('q1');
      expect(repository.deletarPorId).toHaveBeenCalledWith('q1');
      expect(resultado).toEqual({ id: 'q1', deletado: true });
    });

    it('exclui questionário sem perguntas sem tocar nas opções', async () => {
      const { service, repository, perguntaRepository } = montarService();
      await service.deletar('q1');

      expect(perguntaRepository.deletarOpcoesPorPerguntaIds).not.toHaveBeenCalled();
      expect(perguntaRepository.deletarPorQuestionarioId).not.toHaveBeenCalled();
      expect(repository.deletarPorId).toHaveBeenCalledWith('q1');
    });
  });
});
