import RespostaQuestionarioService from '../../../service/RespostaQuestionarioService.js';
import AppError from '../../../utils/helpers/AppError.js';

jest.mock('../../../repository/QuestionarioRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../repository/PerguntaRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../repository/RespostaQuestionarioRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../repository/CandidaturaRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../service/AvaliacaoCandidaturaService.js', () => ({ __esModule: true, default: jest.fn() }));

const candidato = { id: 'u1', tipos_permissao: ['candidato'] };
const outroCandidato = { id: 'u2', tipos_permissao: ['candidato'] };
const administrador = { id: 'adm', tipos_permissao: ['administrador'] };

const questionarioAtivo = { id: 'q1', vagaId: 'v1', titulo: 'Questionário', ativo: 1, __v: 0 };
const respostaEmAndamento = { id: 'rq1', questionarioId: 'q1', usuarioId: 'u1', status: 'em_andamento', __v: 0 };

const perguntaMultipla = { id: 'p1', questionarioId: 'q1', tipoResposta: 'multipla_escolha', obrigatoria: 1, ordem: 2 };
const perguntaVF = { id: 'p2', questionarioId: 'q1', tipoResposta: 'verdadeiro_falso', obrigatoria: 0, ordem: 3 };
const perguntaDissertativa = { id: 'p3', questionarioId: 'q1', tipoResposta: 'dissertativa', obrigatoria: 1, ordem: 1 };

const criarRepository = () => ({
  buscarRespostaQuestionarioPorId: jest.fn().mockResolvedValue(respostaEmAndamento),
  buscarRespostaEmAndamento: jest.fn().mockResolvedValue(null),
  buscarFinalizadaDesde: jest.fn().mockResolvedValue(null),
  criarRespostaQuestionario: jest.fn(async (dados) => ({ id: 'rq-novo', ...dados, __v: 0 })),
  atualizarRespostaQuestionario: jest.fn(async (id, dados) => ({ ...respostaEmAndamento, ...dados, id })),
  buscarRespostaPergunta: jest.fn().mockResolvedValue(null),
  criarRespostaPergunta: jest.fn(async (dados) => ({ id: `rp-${dados.perguntaId}`, ...dados, __v: 0 })),
  atualizarRespostaPergunta: jest.fn(async (id, dados) => ({ id, ...dados, __v: 0 })),
  deletarOpcoesSelecionadasPorRespostaPerguntaId: jest.fn().mockResolvedValue({}),
  criarRespostasOpcaoSelecionada: jest.fn().mockResolvedValue([]),
  listarRespostasPerguntaPorRespostaQuestionId: jest.fn().mockResolvedValue([]),
  listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds: jest.fn().mockResolvedValue([]),
});

const montarService = () => {
  const repository = criarRepository();
  const questionarioRepository = { buscarPorId: jest.fn().mockResolvedValue(questionarioAtivo) };
  const perguntaRepository = {
    listarPorQuestionarioId: jest.fn().mockResolvedValue([perguntaMultipla, perguntaVF, perguntaDissertativa]),
    buscarOpcaoPorIds: jest.fn().mockResolvedValue([]),
    listarOpcoesPorPerguntaIds: jest.fn().mockResolvedValue([]),
  };
  const candidaturaRepository = { buscarPorUsuarioEVaga: jest.fn().mockResolvedValue({ id: 'c1' }) };
  const avaliacaoCandidaturaService = { avaliar: jest.fn().mockResolvedValue({}) };

  const service = new RespostaQuestionarioService(
    repository,
    questionarioRepository,
    perguntaRepository,
    candidaturaRepository,
    avaliacaoCandidaturaService,
  );

  return { service, repository, questionarioRepository, perguntaRepository, candidaturaRepository, avaliacaoCandidaturaService };
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

const acessoNegado = {
  message: 'Acesso negado. Você não tem permissão para realizar esta ação.',
  statusCode: 403,
  code: 'FORBIDDEN',
};

describe('RespostaQuestionarioService', () => {
  describe('garantirDono', () => {
    it('não confere nada quando não há solicitante (chamada interna)', () => {
      const { service } = montarService();

      expect(() => service.garantirDono('u1', undefined)).not.toThrow();
    });

    it('libera o administrador para qualquer resposta', () => {
      const { service } = montarService();

      expect(() => service.garantirDono('u1', administrador)).not.toThrow();
    });

    it('libera o dono comparando ids como string', () => {
      const { service } = montarService();

      expect(() => service.garantirDono({ toString: () => 'u1' }, candidato)).not.toThrow();
    });

    it('bloqueia o candidato que não é dono com 403', () => {
      const { service } = montarService();

      try {
        service.garantirDono('u1', outroCandidato);
        throw new Error('deveria ter lançado');
      } catch (erro) {
        expect(erro).toBeInstanceOf(AppError);
        expect(erro.message).toBe(acessoNegado.message);
        expect(erro.statusCode).toBe(403);
        expect(erro.code).toBe('FORBIDDEN');
      }
    });

    it('bloqueia solicitante sem tipos_permissao que não é dono', () => {
      const { service } = montarService();

      expect(() => service.garantirDono('u1', { id: 'u9' })).toThrow(AppError);
    });
  });

  describe('iniciar', () => {
    const payload = { questionarioId: 'q1', usuarioId: 'u1' };

    it('cria uma resposta em andamento quando não existe outra', async () => {
      const { service, repository, candidaturaRepository } = montarService();

      const resultado = await service.iniciar(payload, candidato);

      expect(candidaturaRepository.buscarPorUsuarioEVaga).toHaveBeenCalledWith('u1', 'v1');
      expect(repository.buscarRespostaEmAndamento).toHaveBeenCalledWith('q1', 'u1');
      expect(repository.criarRespostaQuestionario).toHaveBeenCalledWith({
        questionarioId: 'q1',
        usuarioId: 'u1',
        status: 'em_andamento',
        iniciadoEm: expect.any(Date),
        criadoEm: expect.any(Date),
        finalizadoEm: null,
      });
      expect(resultado).toMatchObject({ id: 'rq-novo', status: 'em_andamento' });
      expect(resultado).not.toHaveProperty('__v');
    });

    it('devolve a resposta em andamento existente sem criar outra (idempotente)', async () => {
      const { service, repository } = montarService();
      repository.buscarRespostaEmAndamento.mockResolvedValue(respostaEmAndamento);

      const resultado = await service.iniciar(payload, candidato);

      expect(repository.criarRespostaQuestionario).not.toHaveBeenCalled();
      expect(resultado).toEqual({ id: 'rq1', questionarioId: 'q1', usuarioId: 'u1', status: 'em_andamento' });
    });

    it('impede o candidato de iniciar em nome de outro usuário antes de consultar o banco', async () => {
      const { service, questionarioRepository } = montarService();

      await esperarAppError(service.iniciar(payload, outroCandidato), acessoNegado);
      expect(questionarioRepository.buscarPorId).not.toHaveBeenCalled();
    });

    it('permite ao administrador iniciar em nome do candidato', async () => {
      const { service, repository } = montarService();

      await service.iniciar(payload, administrador);

      expect(repository.criarRespostaQuestionario).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 'u1' }));
    });

    it('lança 404 quando o questionário não existe', async () => {
      const { service, questionarioRepository } = montarService();
      questionarioRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.iniciar(payload, candidato), {
        message: 'Questionário não encontrado.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('não permite iniciar questionário inativo', async () => {
      const { service, questionarioRepository, repository } = montarService();
      questionarioRepository.buscarPorId.mockResolvedValue({ ...questionarioAtivo, ativo: 0 });

      await esperarAppError(service.iniciar(payload, candidato), {
        message: 'Não é permitido iniciar questionário inativo.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.criarRespostaQuestionario).not.toHaveBeenCalled();
    });

    it('exige candidatura à vaga do questionário', async () => {
      const { service, candidaturaRepository, repository } = montarService();
      candidaturaRepository.buscarPorUsuarioEVaga.mockResolvedValue(null);

      await esperarAppError(service.iniciar(payload, candidato), {
        message: 'É necessário se candidatar à vaga antes de responder ao questionário.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.buscarRespostaEmAndamento).not.toHaveBeenCalled();
      expect(repository.criarRespostaQuestionario).not.toHaveBeenCalled();
    });

    it('recusa com 409 quando o questionário já foi finalizado para esta candidatura', async () => {
      const { service, candidaturaRepository, repository } = montarService();
      const criadoEm = new Date('2026-11-01T10:00:00Z');
      candidaturaRepository.buscarPorUsuarioEVaga.mockResolvedValue({ id: 'c1', criadoEm });
      repository.buscarFinalizadaDesde.mockResolvedValue({ id: 'rq-antiga', status: 'finalizado' });

      await esperarAppError(service.iniciar(payload, candidato), {
        message: 'O questionário desta candidatura já foi respondido.',
        statusCode: 409,
        code: 'CONFLICT',
      });
      expect(repository.buscarFinalizadaDesde).toHaveBeenCalledWith('q1', 'u1', criadoEm);
      expect(repository.criarRespostaQuestionario).not.toHaveBeenCalled();
    });
  });

  describe('responder', () => {
    it('cria resposta de múltipla escolha e grava a opção selecionada', async () => {
      const { service, repository, perguntaRepository } = montarService();
      perguntaRepository.buscarOpcaoPorIds.mockResolvedValue([{ id: 'o1', perguntaId: 'p1' }]);

      const resultado = await service.responder('rq1', { respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o1'] }] }, candidato);

      expect(perguntaRepository.listarPorQuestionarioId).toHaveBeenCalledWith('q1');
      expect(perguntaRepository.buscarOpcaoPorIds).toHaveBeenCalledWith(['o1']);
      expect(repository.buscarRespostaPergunta).toHaveBeenCalledWith('rq1', 'p1');
      expect(repository.criarRespostaPergunta).toHaveBeenCalledWith({
        respostaQuestionId: 'rq1',
        perguntaId: 'p1',
        textoResposta: '',
        criadoEm: expect.any(Date),
      });
      expect(repository.deletarOpcoesSelecionadasPorRespostaPerguntaId).toHaveBeenCalledWith('rp-p1');
      expect(repository.criarRespostasOpcaoSelecionada).toHaveBeenCalledWith([
        { respostaPergunta_: 'rp-p1', opcaoRespostaId: 'o1' },
      ]);
      expect(resultado).toEqual({
        respostaQuestionarioId: 'rq1',
        respostas: [{ id: 'rp-p1', respostaQuestionId: 'rq1', perguntaId: 'p1', textoResposta: '', criadoEm: expect.any(Date) }],
      });
    });

    it('aceita resposta de verdadeiro ou falso com uma opção', async () => {
      const { service, repository, perguntaRepository } = montarService();
      perguntaRepository.buscarOpcaoPorIds.mockResolvedValue([{ id: 'verdadeiro', perguntaId: 'p2' }]);

      await service.responder('rq1', { respostas: [{ perguntaId: 'p2', opcaoRespostaIds: ['verdadeiro'] }] }, candidato);

      expect(repository.criarRespostasOpcaoSelecionada).toHaveBeenCalledWith([
        { respostaPergunta_: 'rp-p2', opcaoRespostaId: 'verdadeiro' },
      ]);
    });

    it('aceita objetiva não obrigatória sem opção, limpando seleções anteriores', async () => {
      const { service, repository, perguntaRepository } = montarService();

      await service.responder('rq1', { respostas: [{ perguntaId: 'p2' }] }, candidato);

      expect(perguntaRepository.buscarOpcaoPorIds).not.toHaveBeenCalled();
      expect(repository.deletarOpcoesSelecionadasPorRespostaPerguntaId).toHaveBeenCalledWith('rp-p2');
      expect(repository.criarRespostasOpcaoSelecionada).not.toHaveBeenCalled();
    });

    it('grava o texto da dissertativa sem criar opções selecionadas', async () => {
      const { service, repository } = montarService();

      const resultado = await service.responder(
        'rq1',
        { respostas: [{ perguntaId: 'p3', textoResposta: 'Trabalhei com React por 3 anos.' }] },
        candidato,
      );

      expect(repository.criarRespostaPergunta).toHaveBeenCalledWith(
        expect.objectContaining({ perguntaId: 'p3', textoResposta: 'Trabalhei com React por 3 anos.' }),
      );
      expect(repository.criarRespostasOpcaoSelecionada).not.toHaveBeenCalled();
      expect(resultado.respostas).toHaveLength(1);
    });

    it('atualiza a resposta existente e substitui a opção selecionada', async () => {
      const { service, repository, perguntaRepository } = montarService();
      repository.buscarRespostaPergunta.mockResolvedValue({ id: 'rp-antiga', perguntaId: 'p1' });
      perguntaRepository.buscarOpcaoPorIds.mockResolvedValue([{ id: 'o2', perguntaId: 'p1' }]);

      const resultado = await service.responder('rq1', { respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o2'] }] }, candidato);

      expect(repository.criarRespostaPergunta).not.toHaveBeenCalled();
      expect(repository.atualizarRespostaPergunta).toHaveBeenCalledWith('rp-antiga', { textoResposta: '' });
      expect(repository.deletarOpcoesSelecionadasPorRespostaPerguntaId).toHaveBeenCalledWith('rp-antiga');
      expect(repository.criarRespostasOpcaoSelecionada).toHaveBeenCalledWith([
        { respostaPergunta_: 'rp-antiga', opcaoRespostaId: 'o2' },
      ]);
      expect(resultado.respostas[0]).toEqual({ id: 'rp-antiga', textoResposta: '' });
    });

    it('processa várias respostas na ordem do payload', async () => {
      const { service, perguntaRepository } = montarService();
      perguntaRepository.buscarOpcaoPorIds.mockResolvedValue([{ id: 'o1', perguntaId: 'p1' }]);

      const resultado = await service.responder(
        'rq1',
        {
          respostas: [
            { perguntaId: 'p3', textoResposta: 'texto' },
            { perguntaId: 'p1', opcaoRespostaIds: ['o1'] },
          ],
        },
        candidato,
      );

      expect(resultado.respostas.map((item) => item.perguntaId)).toEqual(['p3', 'p1']);
    });

    it('lança 404 quando a resposta de questionário não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarRespostaQuestionarioPorId.mockResolvedValue(null);

      await esperarAppError(service.responder('x', { respostas: [] }, candidato), {
        message: 'Resposta de questionário não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('impede responder resposta de outro candidato', async () => {
      const { service, perguntaRepository } = montarService();

      await esperarAppError(service.responder('rq1', { respostas: [] }, outroCandidato), acessoNegado);
      expect(perguntaRepository.listarPorQuestionarioId).not.toHaveBeenCalled();
    });

    it('não aceita respostas em questionário já finalizado', async () => {
      const { service, repository } = montarService();
      repository.buscarRespostaQuestionarioPorId.mockResolvedValue({ ...respostaEmAndamento, status: 'finalizado' });

      await esperarAppError(service.responder('rq1', { respostas: [] }, candidato), {
        message: 'Este questionário já foi finalizado e não aceita novas respostas.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
    });

    it('rejeita pergunta que não pertence ao questionário', async () => {
      const { service, repository } = montarService();

      await esperarAppError(service.responder('rq1', { respostas: [{ perguntaId: 'p-estranha' }] }, candidato), {
        message: 'Pergunta p-estranha não pertence ao questionário informado.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(repository.criarRespostaPergunta).not.toHaveBeenCalled();
    });

    it('resposta inválida no fim do lote não deixa as anteriores gravadas', async () => {
      const { service, repository } = montarService();

      await esperarAppError(
        service.responder(
          'rq1',
          { respostas: [{ perguntaId: 'p3', textoResposta: 'ok' }, { perguntaId: 'p-estranha' }] },
          candidato,
        ),
        { message: 'Pergunta p-estranha não pertence ao questionário informado.', statusCode: 400, code: 'VALIDATION_ERROR' },
      );
      expect(repository.buscarRespostaPergunta).not.toHaveBeenCalled();
      expect(repository.criarRespostaPergunta).not.toHaveBeenCalled();
      expect(repository.atualizarRespostaPergunta).not.toHaveBeenCalled();
      expect(repository.deletarOpcoesSelecionadasPorRespostaPerguntaId).not.toHaveBeenCalled();
    });

    it('rejeita opção de resposta em pergunta dissertativa', async () => {
      const { service } = montarService();

      await esperarAppError(
        service.responder('rq1', { respostas: [{ perguntaId: 'p3', textoResposta: 'x', opcaoRespostaIds: ['o1'] }] }, candidato),
        { message: 'Pergunta dissertativa não aceita opção de resposta.', statusCode: 400, code: 'VALIDATION_ERROR' },
      );
    });

    it('exige texto na dissertativa obrigatória', async () => {
      const { service } = montarService();

      await esperarAppError(service.responder('rq1', { respostas: [{ perguntaId: 'p3', textoResposta: '' }] }, candidato), {
        message: 'A pergunta p3 é obrigatória e exige texto de resposta.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('aceita dissertativa não obrigatória sem texto, gravando string vazia', async () => {
      const { service, repository, perguntaRepository } = montarService();
      perguntaRepository.listarPorQuestionarioId.mockResolvedValue([{ ...perguntaDissertativa, obrigatoria: 0 }]);

      await service.responder('rq1', { respostas: [{ perguntaId: 'p3' }] }, candidato);

      expect(repository.criarRespostaPergunta).toHaveBeenCalledWith(expect.objectContaining({ textoResposta: '' }));
    });

    it('rejeita mais de uma opção em pergunta objetiva', async () => {
      const { service, perguntaRepository } = montarService();

      await esperarAppError(service.responder('rq1', { respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o1', 'o2'] }] }, candidato), {
        message: 'Esta versão aceita apenas uma opção selecionada por pergunta objetiva.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(perguntaRepository.buscarOpcaoPorIds).not.toHaveBeenCalled();
    });

    it('exige opção selecionada na objetiva obrigatória', async () => {
      const { service } = montarService();

      await esperarAppError(service.responder('rq1', { respostas: [{ perguntaId: 'p1', opcaoRespostaIds: [] }] }, candidato), {
        message: 'A pergunta p1 é obrigatória e exige opção selecionada.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('rejeita opção de resposta inexistente', async () => {
      const { service, perguntaRepository } = montarService();
      perguntaRepository.buscarOpcaoPorIds.mockResolvedValue([]);

      await esperarAppError(service.responder('rq1', { respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o-fantasma'] }] }, candidato), {
        message: 'Uma ou mais opções de resposta informadas não existem.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('rejeita opção que pertence a outra pergunta', async () => {
      const { service, perguntaRepository, repository } = montarService();
      perguntaRepository.buscarOpcaoPorIds.mockResolvedValue([{ id: 'o9', perguntaId: 'p2' }]);

      await esperarAppError(service.responder('rq1', { respostas: [{ perguntaId: 'p1', opcaoRespostaIds: ['o9'] }] }, candidato), {
        message: 'Opção de resposta não pertence à pergunta informada.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(repository.criarRespostaPergunta).not.toHaveBeenCalled();
    });
  });

  describe('finalizar', () => {
    it('marca como finalizado, dispara a avaliação da candidatura e devolve a resposta', async () => {
      const { service, repository, avaliacaoCandidaturaService } = montarService();

      const resultado = await service.finalizar('rq1', candidato);
      await service.avaliacaoEmAndamento;

      expect(repository.atualizarRespostaQuestionario).toHaveBeenCalledWith('rq1', {
        status: 'finalizado',
        finalizadoEm: expect.any(Date),
      });
      expect(avaliacaoCandidaturaService.avaliar).toHaveBeenCalledWith('u1', 'v1');
      expect(resultado).toMatchObject({ id: 'rq1', status: 'finalizado' });
      expect(resultado).not.toHaveProperty('__v');
    });

    it('não espera a avaliação terminar para responder', async () => {
      const { service, avaliacaoCandidaturaService } = montarService();
      let concluirAvaliacao;
      avaliacaoCandidaturaService.avaliar.mockReturnValue(new Promise((resolve) => { concluirAvaliacao = resolve; }));

      const resultado = await service.finalizar('rq1', candidato);

      expect(resultado.status).toBe('finalizado');
      expect(service.avaliacaoEmAndamento).toBeInstanceOf(Promise);
      concluirAvaliacao();
      await service.avaliacaoEmAndamento;
    });

    it('registra a falha da avaliação sem rejeitar a promise exposta', async () => {
      const { service, avaliacaoCandidaturaService } = montarService();
      avaliacaoCandidaturaService.avaliar.mockRejectedValue(new Error('IA fora do ar'));
      console.error.mockClear();

      await service.finalizar('rq1', candidato);

      await expect(service.avaliacaoEmAndamento).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('[avaliacao] disparo falhou', {
        usuarioId: 'u1',
        vagaId: 'v1',
        erro: 'IA fora do ar',
      });
    });

    it('lança 404 quando a resposta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarRespostaQuestionarioPorId.mockResolvedValue(null);

      await esperarAppError(service.finalizar('x', candidato), {
        message: 'Resposta de questionário não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('impede finalizar resposta de outro candidato', async () => {
      const { service, repository, avaliacaoCandidaturaService } = montarService();

      await esperarAppError(service.finalizar('rq1', outroCandidato), acessoNegado);
      expect(repository.atualizarRespostaQuestionario).not.toHaveBeenCalled();
      expect(avaliacaoCandidaturaService.avaliar).not.toHaveBeenCalled();
    });

    it('não finaliza duas vezes nem dispara nova avaliação', async () => {
      const { service, repository, avaliacaoCandidaturaService } = montarService();
      repository.buscarRespostaQuestionarioPorId.mockResolvedValue({ ...respostaEmAndamento, status: 'finalizado' });

      await esperarAppError(service.finalizar('rq1', candidato), {
        message: 'A resposta já foi finalizada.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repository.atualizarRespostaQuestionario).not.toHaveBeenCalled();
      expect(avaliacaoCandidaturaService.avaliar).not.toHaveBeenCalled();
    });

    it('lança 404 sem disparar avaliação quando o questionário sumiu', async () => {
      const { service, questionarioRepository, avaliacaoCandidaturaService } = montarService();
      questionarioRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.finalizar('rq1', candidato), {
        message: 'Questionário não encontrado.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(avaliacaoCandidaturaService.avaliar).not.toHaveBeenCalled();
    });
  });

  describe('buscarCompleta', () => {
    const opcoes = [
      { id: 'o2', perguntaId: 'p1', texto: 'B', ordem: 2, correta: 0, __v: 0 },
      { id: 'o1', perguntaId: 'p1', texto: 'A', ordem: 1, correta: 1, __v: 0 },
      { id: 'vf-f', perguntaId: 'p2', texto: 'Falso', ordem: 2, correta: 1 },
      { id: 'vf-v', perguntaId: 'p2', texto: 'Verdadeiro', ordem: 1, correta: 0 },
    ];
    const respostasPergunta = [
      { id: 'rp1', perguntaId: 'p1', textoResposta: '', __v: 0 },
      { id: 'rp3', perguntaId: 'p3', textoResposta: 'Minha resposta' },
    ];

    const prepararCompleta = () => {
      const contexto = montarService();
      contexto.perguntaRepository.listarOpcoesPorPerguntaIds.mockResolvedValue(opcoes);
      contexto.repository.listarRespostasPerguntaPorRespostaQuestionId.mockResolvedValue(respostasPergunta);
      contexto.repository.listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds.mockResolvedValue([
        { respostaPergunta_: 'rp1', opcaoRespostaId: 'o1' },
      ]);
      return contexto;
    };

    it('monta perguntas por ordem, com opções ordenadas e a resposta de cada uma', async () => {
      const { service, perguntaRepository, repository } = prepararCompleta();

      const resultado = await service.buscarCompleta('rq1', candidato);

      expect(perguntaRepository.listarOpcoesPorPerguntaIds).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
      expect(repository.listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds).toHaveBeenCalledWith(['rp1', 'rp3']);
      expect(resultado).toMatchObject({ id: 'rq1', status: 'em_andamento', questionario: { id: 'q1', vagaId: 'v1' } });
      expect(resultado).not.toHaveProperty('__v');
      expect(resultado.questionario).not.toHaveProperty('__v');

      const [dissertativa, multipla, vf] = resultado.questionario.perguntas;
      expect([dissertativa.id, multipla.id, vf.id]).toEqual(['p3', 'p1', 'p2']);

      expect(dissertativa.opcaoResposta).toEqual([]);
      expect(dissertativa.resposta).toEqual({ id: 'rp3', perguntaId: 'p3', textoResposta: 'Minha resposta', opcaoRespostaIds: [] });

      expect(multipla.opcaoResposta.map((item) => item.id)).toEqual(['o1', 'o2']);
      expect(multipla.opcaoResposta[0]).toEqual({ id: 'o1', perguntaId: 'p1', texto: 'A', ordem: 1, correta: 1 });
      expect(multipla.resposta).toEqual({ id: 'rp1', perguntaId: 'p1', textoResposta: '', opcaoRespostaIds: ['o1'] });

      expect(vf.opcaoResposta.map((item) => item.id)).toEqual(['vf-v', 'vf-f']);
      expect(vf.resposta).toBeNull();
    });

    it('esconde o gabarito (campo correta) quando pedido sem gabarito', async () => {
      const { service } = prepararCompleta();

      const resultado = await service.buscarCompleta('rq1', candidato, { comGabarito: false });

      const opcoesDevolvidas = resultado.questionario.perguntas.flatMap((item) => item.opcaoResposta);
      expect(opcoesDevolvidas).toHaveLength(4);
      for (const opcao of opcoesDevolvidas) {
        expect(opcao).not.toHaveProperty('correta');
      }
    });

    it('não consulta opções nem seleções quando não há perguntas nem respostas', async () => {
      const { service, perguntaRepository, repository } = montarService();
      perguntaRepository.listarPorQuestionarioId.mockResolvedValue([]);

      const resultado = await service.buscarCompleta('rq1', candidato);

      expect(perguntaRepository.listarOpcoesPorPerguntaIds).not.toHaveBeenCalled();
      expect(repository.listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds).not.toHaveBeenCalled();
      expect(resultado.questionario.perguntas).toEqual([]);
    });

    it('impede consultar a resposta de outro candidato', async () => {
      const { service, questionarioRepository } = montarService();

      await esperarAppError(service.buscarCompleta('rq1', outroCandidato), acessoNegado);
      expect(questionarioRepository.buscarPorId).not.toHaveBeenCalled();
    });

    it('lança 404 quando a resposta não existe', async () => {
      const { service, repository } = montarService();
      repository.buscarRespostaQuestionarioPorId.mockResolvedValue(null);

      await esperarAppError(service.buscarCompleta('x', candidato), {
        message: 'Resposta de questionário não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('lança 404 quando o questionário da resposta não existe', async () => {
      const { service, questionarioRepository } = montarService();
      questionarioRepository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.buscarCompleta('rq1', administrador), {
        message: 'Questionário não encontrado.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
