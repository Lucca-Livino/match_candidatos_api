import Vaga from '../models/Vaga.js';

class VagaRepository {
  async listarPaginado({ page = 1, limit = 10, titulo, area, status, tipo_criterio } = {}) {
    const filter = {};

    if (titulo) {
      filter.titulo = { $regex: titulo, $options: 'i' };
    }

    if (area) {
      filter.area = area;
    }

    if (status) {
      filter.status = status;
    }

    if (tipo_criterio) {
      filter['criterio_vaga.tipo_criterio'] = tipo_criterio;
    }

    return Vaga.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true,
      leanWithId: true,
    });
  }

  async buscarPorId(id) {
    return Vaga.findById(id).lean();
  }

  async criar(payload) {
    return Vaga.create(payload);
  }

  async atualizar(id, payload) {
    return Vaga.findByIdAndUpdate(id, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletar(id) {
    return Vaga.findByIdAndDelete(id).lean();
  }
}

export default VagaRepository;