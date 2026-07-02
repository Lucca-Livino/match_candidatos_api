import Rota from '../models/Rota.js';

class RotaRepository {
  async listarPaginado({ page = 1, limit = 10, route, domain } = {}) {
    const filter = {};
    if (route) filter.route = { $regex: route, $options: 'i' };
    if (domain) filter.domain = domain;
    return Rota.paginate(filter, { page, limit, sort: { route: 1 }, lean: true });
  }

  async buscarPorId(id) {
    return Rota.findById(id).lean();
  }

  async criar(payload) {
    return Rota.create(payload);
  }

  async atualizar(id, payload) {
    return Rota.findByIdAndUpdate(id, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletar(id) {
    return Rota.findByIdAndDelete(id).lean();
  }
}

export default RotaRepository;
