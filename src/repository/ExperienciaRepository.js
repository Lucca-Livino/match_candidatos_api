import Experiencia from '../models/Experiencia.js';

class ExperienciaRepository {
  async criar(payload) {
    return Experiencia.create(payload);
  }

  async listarPorUsuarioId(usuarioId) {
    return Experiencia.find({ usuarioId }).sort({ dataInicio: -1 }).lean();
  }

  async buscarPorUsuarioEId(usuarioId, id) {
    return Experiencia.findOne({ usuarioId, id }).lean();
  }

  async buscarPorId(id) {
    return Experiencia.findOne({ id }).lean();
  }

  async atualizarPorUsuarioEId(usuarioId, id, payload) {
    return Experiencia.findOneAndUpdate({ usuarioId, id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorUsuarioEId(usuarioId, id) {
    return Experiencia.findOneAndDelete({ usuarioId, id }).lean();
  }
}

export default ExperienciaRepository;
