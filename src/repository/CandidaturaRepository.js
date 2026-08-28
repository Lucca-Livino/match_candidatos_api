import Candidatura from '../models/Candidatura.js';

class CandidaturaRepository {
  async criar(payload) {
    return Candidatura.create(payload);
  }

  async listarPorUsuarioId(usuarioId) {
    return Candidatura.find({ usuarioId }).sort({ criadoEm: -1 }).lean();
  }

  // Ordem neutra e deliberada: ordenar por score reintroduziria o vies de
  // ancoragem que a triagem sem ranking existe para evitar.
  async listarPorVagaId(vagaId) {
    return Candidatura.find({ vagaId }).sort({ criadoEm: 1 }).lean();
  }

  async buscarPorUsuarioEVaga(usuarioId, vagaId) {
    return Candidatura.findOne({ usuarioId, vagaId }).lean();
  }

  async buscarPorId(id) {
    return Candidatura.findOne({ id }).lean();
  }

  async atualizarPorUsuarioEVaga(usuarioId, vagaId, payload) {
    return Candidatura.findOneAndUpdate({ usuarioId, vagaId }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorUsuarioEVaga(usuarioId, vagaId) {
    return Candidatura.findOneAndDelete({ usuarioId, vagaId }).lean();
  }
}

export default CandidaturaRepository;
