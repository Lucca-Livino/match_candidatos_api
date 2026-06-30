import Grupo from '../models/Grupo.js';

class GrupoRepository {
  async listarPaginado({ page = 1, limit = 10, nome } = {}) {
    const filter = {};
    if (nome) filter.nome = { $regex: nome, $options: 'i' };
    return Grupo.paginate(filter, { page, limit, sort: { nome: 1 }, lean: true });
  }

  async buscarPorId(id) {
    return Grupo.findById(id).lean();
  }

  async criar(payload) {
    return Grupo.create(payload);
  }

  async atualizar(id, payload) {
    const doc = await Grupo.findById(id);
    if (!doc) return null;
    Object.assign(doc, payload);
    await doc.save();
    return doc.toObject();
  }

  async deletar(id) {
    return Grupo.findByIdAndDelete(id).lean();
  }
}

export default GrupoRepository;
