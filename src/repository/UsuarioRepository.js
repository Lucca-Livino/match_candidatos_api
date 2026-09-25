import Usuario from '../models/Usuario.js';

class UsuarioRepository {
  async listarPaginado({ page = 1, limit = 10, email, nome, status_ativo, papel } = {}) {
    // Conta autoexcluida nunca aparece em listagem: o documento so sobrevive
    // para manter o historico de candidaturas coerente.
    const filter = { deletadoEm: null };

    if (papel) {
      filter.tipos_permissao = papel;
    }

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

  // Sobrescreve os dados pessoais no lugar de remover o documento. 
  async anonimizar(id, { nome, email, deletadoEm }) {
    return Usuario.findByIdAndUpdate(
      id,
      {
        $set: {
          nome,
          email,
          senha: null,
          telefone: '',
          linkedin: '',
          cidade: '',
          status_ativo: false,
          groups: [],
          permissions: [],
          deletadoEm,
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();
  }

  async contarAdministradoresAtivos() {
    return Usuario.countDocuments({
      tipos_permissao: 'administrador',
      status_ativo: true,
      deletadoEm: null,
    });
  }
}

export default UsuarioRepository;
