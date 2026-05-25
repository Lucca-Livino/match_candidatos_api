import Pergunta from '../models/Pergunta.js';
import OpcaoResposta from '../models/OpcaoResposta.js';

class PerguntaRepository {
  async criar(payload) {
    return Pergunta.create(payload);
  }

  async listarPorQuestionarioId(questionarioId) {
    return Pergunta.find({ questionarioId }).sort({ ordem: 1, criadoEm: 1 }).lean();
  }

  async buscarPorId(id) {
    return Pergunta.findOne({ id }).lean();
  }

  async buscarPorIds(ids = []) {
    return Pergunta.find({ id: { $in: ids } }).lean();
  }

  async atualizarPorId(id, payload) {
    return Pergunta.findOneAndUpdate({ id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorId(id) {
    return Pergunta.findOneAndDelete({ id }).lean();
  }

  async deletarPorQuestionarioId(questionarioId) {
    return Pergunta.deleteMany({ questionarioId });
  }

  async reordenar(questionarioId, itens = []) {
    if (!itens.length) {
      return;
    }

    await Pergunta.bulkWrite(
      itens.map((item) => ({
        updateOne: {
          filter: { id: item.id, questionarioId },
          update: { ordem: item.ordem },
        },
      })),
      { ordered: true },
    );
  }

  async criarOpcao(payload) {
    return OpcaoResposta.create(payload);
  }

  async listarOpcoesPorPerguntaId(perguntaId) {
    return OpcaoResposta.find({ perguntaId }).sort({ ordem: 1, _id: 1 }).lean();
  }

  async listarOpcoesPorPerguntaIds(perguntaIds = []) {
    return OpcaoResposta.find({ perguntaId: { $in: perguntaIds } }).sort({ ordem: 1, _id: 1 }).lean();
  }

  async buscarOpcaoPorId(perguntaId, opcaoId) {
    return OpcaoResposta.findOne({ id: opcaoId, perguntaId }).lean();
  }

  async buscarOpcaoPorIds(opcaoIds = []) {
    return OpcaoResposta.find({ id: { $in: opcaoIds } }).lean();
  }

  async atualizarOpcao(perguntaId, opcaoId, payload) {
    return OpcaoResposta.findOneAndUpdate({ id: opcaoId, perguntaId }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarOpcao(perguntaId, opcaoId) {
    return OpcaoResposta.findOneAndDelete({ id: opcaoId, perguntaId }).lean();
  }

  async deletarOpcoesPorPerguntaId(perguntaId) {
    return OpcaoResposta.deleteMany({ perguntaId });
  }

  async deletarOpcoesPorPerguntaIds(perguntaIds = []) {
    return OpcaoResposta.deleteMany({ perguntaId: { $in: perguntaIds } });
  }
}

export default PerguntaRepository;
