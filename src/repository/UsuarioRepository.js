import Usuario from '../models/Usuario.js';

class UsuarioRepository {
  async listarPaginado({ page = 1, limit = 10, email, nome, status_ativo } = {}) {
    const filter = {};

    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    if (nome) {
      filter.nome = { $regex: nome, $options: 'i' };
    }

    if (typeof status_ativo === 'boolean') {
      filter.status_ativo = status_ativo;
    }

    return Usuario.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true,
      leanWithId: true,
    });
  }

  async buscarPorId(id) {
    return Usuario.findById(id).lean();
  }

  async buscarPorEmail(email) {
    return Usuario.findOne({ email }).lean();
  }

  async criar(payload) {
    return Usuario.create(payload);
  }

  async atualizar(id, payload) {
    return Usuario.findByIdAndUpdate(id, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async atualizarPorEmail(email, payload) {
    return Usuario.findOneAndUpdate({ email }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletar(id) {
    return Usuario.findByIdAndDelete(id).lean();
  }
}

export default UsuarioRepository;
