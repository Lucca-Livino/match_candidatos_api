import Habilidade from '../models/Habilidade.js';

class HabilidadeRepository {
  async criar(payload) {
    return Habilidade.create(payload);
  }

  async listarPorUsuarioId(usuarioId) {
    return Habilidade.find({ usuarioId }).sort({ habilidade: 1 }).lean();
  }

  async buscarPorUsuarioEId(usuarioId, id) {
    return Habilidade.findOne({ usuarioId, id }).lean();
  }

  async buscarPorId(id) {
    return Habilidade.findOne({ id }).lean();
  }

  async atualizarPorUsuarioEId(usuarioId, id, payload) {
    return Habilidade.findOneAndUpdate({ usuarioId, id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorUsuarioEId(usuarioId, id) {
    return Habilidade.findOneAndDelete({ usuarioId, id }).lean();
  }
}

export default HabilidadeRepository;
