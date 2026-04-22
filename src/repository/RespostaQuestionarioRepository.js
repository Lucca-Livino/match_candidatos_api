import RespostaQuestionario from '../models/RespostaQuestionario.js';
import RespostaPergunta from '../models/RespostaPergunta.js';
import RespostaOpcaoSelecionada from '../models/RespostaOpcaoSelecionada.js';

class RespostaQuestionarioRepository {
  async criarRespostaQuestionario(payload) {
    return RespostaQuestionario.create(payload);
  }

  async buscarRespostaQuestionarioPorId(id) {
    return RespostaQuestionario.findOne({ id }).lean();
  }

  async buscarRespostaEmAndamento(questionarioId, candidatoId) {
    return RespostaQuestionario.findOne({
      questionarioId,
      candidatoId,
      status: 'em_andamento',
    }).lean();
  }

  async atualizarRespostaQuestionario(id, payload) {
    return RespostaQuestionario.findOneAndUpdate({ id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async contarRespostasPorQuestionario(questionarioId) {
    return RespostaQuestionario.countDocuments({ questionarioId });
  }

  async contarRespostasPorPergunta(perguntaId) {
    return RespostaPergunta.countDocuments({ perguntaId });
  }

  async listarRespostasPerguntaPorRespostaQuestionId(respostaQuestionId) {
    return RespostaPergunta.find({ respostaQuestionId }).lean();
  }

  async buscarRespostaPergunta(respostaQuestionId, perguntaId) {
    return RespostaPergunta.findOne({ respostaQuestionId, perguntaId }).lean();
  }

  async criarRespostaPergunta(payload) {
    return RespostaPergunta.create(payload);
  }

  async atualizarRespostaPergunta(id, payload) {
    return RespostaPergunta.findOneAndUpdate({ id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarOpcoesSelecionadasPorRespostaPerguntaId(respostaPerguntaId) {
    return RespostaOpcaoSelecionada.deleteMany({ respostaPergunta_: respostaPerguntaId });
  }

  async criarRespostasOpcaoSelecionada(payload = []) {
    if (!payload.length) {
      return [];
    }

    return RespostaOpcaoSelecionada.insertMany(payload);
  }

  async listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds(respostaPerguntaIds = []) {
    return RespostaOpcaoSelecionada.find({ respostaPergunta_: { $in: respostaPerguntaIds } }).lean();
  }
}

export default RespostaQuestionarioRepository;
