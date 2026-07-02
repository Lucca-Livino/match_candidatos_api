import Formacao from '../models/Formacao.js';

class FormacaoRepository {
  async criar(payload) {
    return Formacao.create(payload);
  }

  async listarPorUsuarioId(usuarioId) {
    return Formacao.find({ usuarioId }).sort({ anoInicio: -1 }).lean();
  }

  async buscarPorUsuarioEId(usuarioId, id) {
    return Formacao.findOne({ usuarioId, id }).lean();
  }

  async buscarPorId(id) {
    return Formacao.findOne({ id }).lean();
  }

  async atualizarPorUsuarioEId(usuarioId, id, payload) {
    return Formacao.findOneAndUpdate({ usuarioId, id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorUsuarioEId(usuarioId, id) {
    return Formacao.findOneAndDelete({ usuarioId, id }).lean();
  }
}

export default FormacaoRepository;
