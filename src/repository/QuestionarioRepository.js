import Questionario from '../models/Questionario.js';

class QuestionarioRepository {
  async criar(payload) {
    return Questionario.create(payload);
  }

  async listar({ vagaId, ativo } = {}) {
    const filter = {};

    if (vagaId) {
      filter.vagaId = vagaId;
    }

    if (typeof ativo === 'number') {
      filter.ativo = ativo;
    }

    return Questionario.find(filter).sort({ criadoEm: -1 }).lean();
  }

  async buscarPorId(id) {
    return Questionario.findOne({ id }).lean();
  }

  async atualizarPorId(id, payload) {
    return Questionario.findOneAndUpdate({ id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorId(id) {
    return Questionario.findOneAndDelete({ id }).lean();
  }
}

export default QuestionarioRepository;
