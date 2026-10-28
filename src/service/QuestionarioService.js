import VagaRepository from '../repository/VagaRepository.js';
import QuestionarioRepository from '../repository/QuestionarioRepository.js';
import PerguntaRepository from '../repository/PerguntaRepository.js';
import RespostaQuestionarioRepository from '../repository/RespostaQuestionarioRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

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
    return sanitizeDoc(doc);
  }

  async garantirVagaExiste(vagaId) {
    const vaga = await this.vagaRepository.buscarPorId(vagaId);
    if (!vaga) {
      throw new AppError('Vaga informada não foi encontrada.', 404, 'NOT_FOUND');
    }
  }

  async garantirQuestionarioExiste(id) {
    const questionario = await this.repository.buscarPorId(id);
    if (!questionario) {
      throw new AppError('Questionário não encontrado.', 404, 'NOT_FOUND');
    }

    return questionario;
  }

  // Sem gabarito, a opcao sai sem `correta`: o candidato responde pela mesma
  // rota que o recrutador usa no editor e nao pode receber a resposta certa.
  montarPerguntasComOpcoes(perguntas, opcoes, { comGabarito = true } = {}) {
    const camposOcultos = comGabarito ? [] : ['correta'];
    const opcoesPorPerguntaId = opcoes.reduce((acc, item) => {
      if (!acc[item.perguntaId]) {
        acc[item.perguntaId] = [];
      }
      acc[item.perguntaId].push(sanitizeDoc(item, camposOcultos));
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

  async garantirNaoSustentaVagaAtiva(questionario) {
    if (questionario.ativo !== 1) return;

    const vaga = await this.vagaRepository.buscarPorId(questionario.vagaId);
    if (vaga?.status !== 'ativa') return;

    const ativos = await this.repository.listar({ vagaId: questionario.vagaId, ativo: 1 });
    if (ativos.some((item) => item.id !== questionario.id)) return;

    throw new AppError(
      'Este é o único questionário ativo de uma vaga ativa. Pause a vaga antes de alterá-lo.',
      400,
      'BUSINESS_RULE_ERROR',
    );
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

  async buscarPorIdComPerguntas(id, { comGabarito = true } = {}) {
    const questionario = await this.garantirQuestionarioExiste(id);
    const perguntas = await this.perguntaRepository.listarPorQuestionarioId(questionario.id);

    const opcoes = perguntas.length
      ? await this.perguntaRepository.listarOpcoesPorPerguntaIds(perguntas.map((item) => item.id))
      : [];

    return {
      ...this.sanitize(questionario),
      perguntas: this.montarPerguntasComOpcoes(perguntas, opcoes, { comGabarito }),
    };
  }

  async atualizar(id, payload) {
    const existente = await this.garantirQuestionarioExiste(id);

    if (payload.vagaId && payload.vagaId !== existente.vagaId) {
      await this.garantirVagaExiste(payload.vagaId);
      await this.garantirNaoSustentaVagaAtiva(existente);
    }

    const updated = await this.repository.atualizarPorId(id, payload);
    return this.sanitize(updated);
  }

  async atualizarAtivo(id, ativo) {
    const existente = await this.garantirQuestionarioExiste(id);
    if (ativo === 0) {
      await this.garantirNaoSustentaVagaAtiva(existente);
    }

    const updated = await this.repository.atualizarPorId(id, { ativo });
    return this.sanitize(updated);
  }

  async garantirSemRespostas(id) {
    const totalRespostas = await this.respostaQuestionarioRepository.contarRespostasPorQuestionario(id);
    if (totalRespostas > 0) {
      throw new AppError(
        'Não é permitido excluir questionário com respostas vinculadas.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }
  }

  async deletar(id) {
    const existente = await this.garantirQuestionarioExiste(id);

    await this.garantirSemRespostas(id);
    await this.garantirNaoSustentaVagaAtiva(existente);

    await this.excluirComPerguntas(id);

    return {
      id,
      deletado: true,
    };
  }

  async excluirComPerguntas(id) {
    const perguntas = await this.perguntaRepository.listarPorQuestionarioId(id);
    if (perguntas.length) {
      await this.perguntaRepository.deletarOpcoesPorPerguntaIds(perguntas.map((item) => item.id));
      await this.perguntaRepository.deletarPorQuestionarioId(id);
    }

    await this.repository.deletarPorId(id);
  }
}

export default QuestionarioService;
