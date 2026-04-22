import VagaRepository from '../repository/VagaRepository.js';
import QuestionarioRepository from '../repository/QuestionarioRepository.js';
import PerguntaRepository from '../repository/PerguntaRepository.js';
import RespostaQuestionarioRepository from '../repository/RespostaQuestionarioRepository.js';
import AppError from '../utils/helpers/AppError.js';

class QuestionarioService {
  constructor(
    repository = new QuestionarioRepository(),
    perguntaRepository = new PerguntaRepository(),
    respostaQuestionarioRepository = new RespostaQuestionarioRepository(),
    vagaRepository = new VagaRepository(),
  ) {
    this.repository = repository;
    this.perguntaRepository = perguntaRepository;
    this.respostaQuestionarioRepository = respostaQuestionarioRepository;
    this.vagaRepository = vagaRepository;
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

  async garantirVagaExiste(vagaId) {
    const vaga = await this.vagaRepository.buscarPorId(vagaId);
    if (!vaga) {
      throw new AppError('Vaga informada nao foi encontrada.', 404, 'NOT_FOUND');
    }
  }

  async garantirQuestionarioExiste(id) {
    const questionario = await this.repository.buscarPorId(id);
    if (!questionario) {
      throw new AppError('Questionario nao encontrado.', 404, 'NOT_FOUND');
    }

    return questionario;
  }

  montarPerguntasComOpcoes(perguntas, opcoes) {
    const opcoesPorPerguntaId = opcoes.reduce((acc, item) => {
      if (!acc[item.perguntaId]) {
        acc[item.perguntaId] = [];
      }
      acc[item.perguntaId].push(this.sanitize(item));
      return acc;
    }, {});

    return perguntas
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((pergunta) => ({
        ...this.sanitize(pergunta),
        opcaoResposta:
          pergunta.tipoResposta === 'dissertativa'
            ? []
            : (opcoesPorPerguntaId[pergunta.id] || []).sort((a, b) => a.ordem - b.ordem),
      }));
  }

  async criar(payload) {
    await this.garantirVagaExiste(payload.vagaId);

    const created = await this.repository.criar(payload);
    return this.sanitize(created);
  }

  async listar(query) {
    const list = await this.repository.listar(query);
    return list.map((item) => this.sanitize(item));
  }

  async buscarPorIdComPerguntas(id) {
    const questionario = await this.garantirQuestionarioExiste(id);
    const perguntas = await this.perguntaRepository.listarPorQuestionarioId(questionario.id);

    const opcoes = perguntas.length
      ? await this.perguntaRepository.listarOpcoesPorPerguntaIds(perguntas.map((item) => item.id))
      : [];

    return {
      ...this.sanitize(questionario),
      perguntas: this.montarPerguntasComOpcoes(perguntas, opcoes),
    };
  }

  async atualizar(id, payload) {
    const existente = await this.garantirQuestionarioExiste(id);

    if (payload.vagaId && payload.vagaId !== existente.vagaId) {
      await this.garantirVagaExiste(payload.vagaId);
    }

    const updated = await this.repository.atualizarPorId(id, payload);
    return this.sanitize(updated);
  }

  async atualizarAtivo(id, ativo) {
    await this.garantirQuestionarioExiste(id);
    const updated = await this.repository.atualizarPorId(id, { ativo });
    return this.sanitize(updated);
  }

  async deletar(id) {
    await this.garantirQuestionarioExiste(id);

    const totalRespostas = await this.respostaQuestionarioRepository.contarRespostasPorQuestionario(id);
    if (totalRespostas > 0) {
      throw new AppError(
        'Nao e permitido excluir questionario com respostas vinculadas.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    const perguntas = await this.perguntaRepository.listarPorQuestionarioId(id);
    if (perguntas.length) {
      await this.perguntaRepository.deletarOpcoesPorPerguntaIds(perguntas.map((item) => item.id));
      await this.perguntaRepository.deletarPorQuestionarioId(id);
    }

    await this.repository.deletarPorId(id);

    return {
      id,
      deletado: true,
    };
  }
}

export default QuestionarioService;
