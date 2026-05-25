import PerguntaRepository from '../repository/PerguntaRepository.js';
import QuestionarioRepository from '../repository/QuestionarioRepository.js';
import RespostaQuestionarioRepository from '../repository/RespostaQuestionarioRepository.js';
import AppError from '../utils/helpers/AppError.js';

class PerguntaService {
  constructor(
    repository = new PerguntaRepository(),
    questionarioRepository = new QuestionarioRepository(),
    respostaQuestionarioRepository = new RespostaQuestionarioRepository(),
  ) {
    this.repository = repository;
    this.questionarioRepository = questionarioRepository;
    this.respostaQuestionarioRepository = respostaQuestionarioRepository;
  }

  sanitize(doc) {
    if (!doc) {
      return null;
    }

    const raw = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
    const sanitized = { ...raw };
    delete sanitized.__v;
    return sanitized;
  }

  async garantirQuestionarioExiste(questionarioId) {
    const questionario = await this.questionarioRepository.buscarPorId(questionarioId);
    if (!questionario) {
      throw new AppError('Questionario nao encontrado.', 404, 'NOT_FOUND');
    }

    return questionario;
  }

  async garantirPerguntaExiste(id) {
    const pergunta = await this.repository.buscarPorId(id);
    if (!pergunta) {
      throw new AppError('Pergunta nao encontrada.', 404, 'NOT_FOUND');
    }

    return pergunta;
  }

  async garantirOrdemPerguntaDisponivel(questionarioId, ordem, perguntaIgnoradaId = null) {
    const perguntas = await this.repository.listarPorQuestionarioId(questionarioId);

    const ordemEmUso = perguntas.some((item) => item.ordem === ordem && item.id !== perguntaIgnoradaId);
    if (ordemEmUso) {
      throw new AppError('Ja existe pergunta com a ordem informada neste questionario.', 400, 'BUSINESS_RULE_ERROR');
    }
  }

  async montarPerguntaComOpcoes(pergunta) {
    const opcoes = await this.repository.listarOpcoesPorPerguntaId(pergunta.id);

    return {
      ...this.sanitize(pergunta),
      opcaoResposta:
        pergunta.tipoResposta === 'dissertativa'
          ? []
          : opcoes.map((item) => this.sanitize(item)).sort((a, b) => a.ordem - b.ordem),
    };
  }

  async criar(payload) {
    await this.garantirQuestionarioExiste(payload.questionarioId);
    await this.garantirOrdemPerguntaDisponivel(payload.questionarioId, payload.ordem);

    const created = await this.repository.criar(payload);
    return this.montarPerguntaComOpcoes(created);
  }

  async listar(questionarioId) {
    await this.garantirQuestionarioExiste(questionarioId);

    const perguntas = await this.repository.listarPorQuestionarioId(questionarioId);
    const opcoes = perguntas.length
      ? await this.repository.listarOpcoesPorPerguntaIds(perguntas.map((item) => item.id))
      : [];

    const opcoesPorPerguntaId = opcoes.reduce((acc, item) => {
      if (!acc[item.perguntaId]) {
        acc[item.perguntaId] = [];
      }
      acc[item.perguntaId].push(this.sanitize(item));
      return acc;
    }, {});

    return perguntas.map((pergunta) => ({
      ...this.sanitize(pergunta),
      opcaoResposta:
        pergunta.tipoResposta === 'dissertativa'
          ? []
          : (opcoesPorPerguntaId[pergunta.id] || []).sort((a, b) => a.ordem - b.ordem),
    }));
  }

  async buscarPorId(id) {
    const pergunta = await this.garantirPerguntaExiste(id);
    return this.montarPerguntaComOpcoes(pergunta);
  }

  async atualizar(id, payload) {
    const existente = await this.garantirPerguntaExiste(id);

    if (payload.ordem && payload.ordem !== existente.ordem) {
      await this.garantirOrdemPerguntaDisponivel(existente.questionarioId, payload.ordem, existente.id);
    }

    const updated = await this.repository.atualizarPorId(id, payload);

    if (updated.tipoResposta === 'dissertativa') {
      await this.repository.deletarOpcoesPorPerguntaId(updated.id);
    }

    return this.montarPerguntaComOpcoes(updated);
  }

  async deletar(id) {
    const pergunta = await this.garantirPerguntaExiste(id);

    const totalRespostas = await this.respostaQuestionarioRepository.contarRespostasPorPergunta(id);
    if (totalRespostas > 0) {
      throw new AppError(
        'Nao e permitido excluir pergunta com respostas vinculadas.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    await this.repository.deletarOpcoesPorPerguntaId(pergunta.id);
    await this.repository.deletarPorId(pergunta.id);

    return {
      id: pergunta.id,
      deletado: true,
    };
  }

  validarApenasUmaOpcaoCorreta(pergunta, opcoes, payloadCorreta, opcaoIgnoradaId = null) {
    if (![1, '1'].includes(payloadCorreta)) {
      return;
    }

    if (pergunta.tipoResposta === 'dissertativa') {
      throw new AppError('Perguntas dissertativas nao aceitam opcoes de resposta.', 400, 'BUSINESS_RULE_ERROR');
    }

    const existeCorreta = opcoes.some((item) => item.correta === 1 && item.id !== opcaoIgnoradaId);

    if (existeCorreta) {
      throw new AppError('A pergunta ja possui uma opcao marcada como correta.', 400, 'BUSINESS_RULE_ERROR');
    }
  }

  validarOrdemOpcaoDisponivel(opcoes, ordem, opcaoIgnoradaId = null) {
    const ordemEmUso = opcoes.some((item) => item.ordem === ordem && item.id !== opcaoIgnoradaId);
    if (ordemEmUso) {
      throw new AppError('Ja existe opcao de resposta com a ordem informada.', 400, 'BUSINESS_RULE_ERROR');
    }
  }

  async adicionarOpcao(perguntaId, payload) {
    const pergunta = await this.garantirPerguntaExiste(perguntaId);

    if (pergunta.tipoResposta === 'dissertativa') {
      throw new AppError('Perguntas dissertativas nao aceitam opcoes de resposta.', 400, 'BUSINESS_RULE_ERROR');
    }

    const opcoes = await this.repository.listarOpcoesPorPerguntaId(pergunta.id);

    this.validarApenasUmaOpcaoCorreta(pergunta, opcoes, payload.correta);
    this.validarOrdemOpcaoDisponivel(opcoes, payload.ordem);

    const created = await this.repository.criarOpcao({
      ...payload,
      perguntaId: pergunta.id,
    });

    return this.sanitize(created);
  }

  async atualizarOpcao(perguntaId, opcaoId, payload) {
    const pergunta = await this.garantirPerguntaExiste(perguntaId);

    if (pergunta.tipoResposta === 'dissertativa') {
      throw new AppError('Perguntas dissertativas nao aceitam opcoes de resposta.', 400, 'BUSINESS_RULE_ERROR');
    }

    const opcaoExistente = await this.repository.buscarOpcaoPorId(pergunta.id, opcaoId);
    if (!opcaoExistente) {
      throw new AppError('Opcao de resposta nao encontrada.', 404, 'NOT_FOUND');
    }

    const opcoes = await this.repository.listarOpcoesPorPerguntaId(pergunta.id);

    if (Object.hasOwn(payload, 'correta')) {
      this.validarApenasUmaOpcaoCorreta(pergunta, opcoes, payload.correta, opcaoExistente.id);
    }

    if (Object.hasOwn(payload, 'ordem')) {
      this.validarOrdemOpcaoDisponivel(opcoes, payload.ordem, opcaoExistente.id);
    }

    const updated = await this.repository.atualizarOpcao(pergunta.id, opcaoExistente.id, payload);
    return this.sanitize(updated);
  }

  async removerOpcao(perguntaId, opcaoId) {
    const pergunta = await this.garantirPerguntaExiste(perguntaId);

    const opcao = await this.repository.buscarOpcaoPorId(pergunta.id, opcaoId);
    if (!opcao) {
      throw new AppError('Opcao de resposta nao encontrada.', 404, 'NOT_FOUND');
    }

    await this.repository.deletarOpcao(pergunta.id, opcao.id);

    return {
      id: opcao.id,
      deletado: true,
    };
  }

  async reordenar(payload) {
    const idsPerguntas = payload.perguntas.map((item) => item.id);
    const perguntasDoPayload = await this.repository.buscarPorIds(idsPerguntas);

    if (perguntasDoPayload.length !== idsPerguntas.length) {
      throw new AppError('Uma ou mais perguntas nao foram encontradas.', 404, 'NOT_FOUND');
    }

    const questionarioIdResolvido = payload.questionarioId || perguntasDoPayload[0].questionarioId;

    const questionarioIds = new Set(perguntasDoPayload.map((item) => item.questionarioId));
    if (questionarioIds.size !== 1 || !questionarioIds.has(questionarioIdResolvido)) {
      throw new AppError(
        'Nao e permitido reordenar perguntas de questionarios diferentes.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    await this.garantirQuestionarioExiste(questionarioIdResolvido);

    const perguntasAtuais = await this.repository.listarPorQuestionarioId(questionarioIdResolvido);

    if (perguntasAtuais.length !== payload.perguntas.length) {
      throw new AppError(
        'Para reordenar, informe todas as perguntas do questionario.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    const idsAtuais = new Set(perguntasAtuais.map((item) => item.id));
    const idsPayload = new Set(payload.perguntas.map((item) => item.id));

    for (const id of idsPayload) {
      if (!idsAtuais.has(id)) {
        throw new AppError('Uma ou mais perguntas nao pertencem ao questionario informado.', 400, 'BUSINESS_RULE_ERROR');
      }
    }

    // Evita conflito de chave unica durante troca de ordens (ex.: 1 <-> 2).
    const ordemTemporaria = payload.perguntas.map((item, index) => ({
      id: item.id,
      ordem: 100000 + index,
    }));

    await this.repository.reordenar(questionarioIdResolvido, ordemTemporaria);
    await this.repository.reordenar(questionarioIdResolvido, payload.perguntas);

    const atualizado = await this.repository.listarPorQuestionarioId(questionarioIdResolvido);
    return atualizado.map((item) => this.sanitize(item));
  }
}

export default PerguntaService;
