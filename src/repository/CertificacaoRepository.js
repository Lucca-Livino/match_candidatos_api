import Certificacao from '../models/Certificacao.js';

class CertificacaoRepository {
  async criar(payload) {
    return Certificacao.create(payload);
  }

  async listarPorUsuarioId(usuarioId) {
    return Certificacao.find({ usuarioId }).sort({ dataEmissao: -1 }).lean();
  }

  async buscarPorUsuarioEId(usuarioId, id) {
    return Certificacao.findOne({ usuarioId, id }).lean();
  }

  async buscarPorId(id) {
    return Certificacao.findOne({ id }).lean();
  }

  async atualizarPorUsuarioEId(usuarioId, id, payload) {
    return Certificacao.findOneAndUpdate({ usuarioId, id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorUsuarioEId(usuarioId, id) {
    return Certificacao.findOneAndDelete({ usuarioId, id }).lean();
  }
}

export default CertificacaoRepository;
