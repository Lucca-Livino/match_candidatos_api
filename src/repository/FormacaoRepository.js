import Formacao from '../models/Formacao.js';

class FormacaoRepository {
  async criar(payload) {
    return Formacao.create(payload);
  }

  async listarPorCandidatoId(candidatoId) {
    return Formacao.find({ candidatoId }).sort({ anoInicio: -1 }).lean();
  }

  async buscarPorCandidatoEId(candidatoId, id) {
    return Formacao.findOne({ candidatoId, id }).lean();
  }

  async buscarPorId(id) {
    return Formacao.findOne({ id }).lean();
  }

  async atualizarPorCandidatoEId(candidatoId, id, payload) {
    return Formacao.findOneAndUpdate({ candidatoId, id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorCandidatoEId(candidatoId, id) {
    return Formacao .findOneAndDelete({ candidatoId, id }).lean();
  }
}

export default FormacaoRepository;
