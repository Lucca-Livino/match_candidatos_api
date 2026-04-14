import Candidato from '../models/Candidato.js';
import Formacao from '../models/Formacao.js';
import Experiencia from '../models/Experiencia.js';
import Habilidade from '../models/Habilidade.js';
import Certificacao from '../models/Certificacao.js';
import CandidatoVaga from '../models/CandidatoVaga.js';

class CandidatoRepository {
  async listarPaginado({ page = 1, limit = 10, cidade, estado, nome } = {}) {
    const filter = {};

    if (cidade) {
      filter.cidade = { $regex: cidade, $options: 'i' };
    }

    if (estado) {
      filter.estado = estado;
    }

    if (nome) {
      filter.nome = { $regex: nome, $options: 'i' };
    }

    return Candidato.paginate(filter, {
      page,
      limit,
      sort: { criadoEm: -1 },
      lean: true,
      leanWithId: true,
    });
  }

  async buscarCandidatoPorId(id) {
    return Candidato.findOne({ id }).lean();
  }

  async buscarCandidatoPorEmail(email) {
    return Candidato.findOne({ email }).lean();
  }

  async criarCandidato(payload) {
    return Candidato.create(payload);
  }

  async atualizarCandidato(id, payload) {
    return Candidato.findOneAndUpdate({ id }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarCandidato(id) {
    return Candidato.findOneAndDelete({ id }).lean();
  }

  async contarCandidaturasBloqueantes(candidatoId) {
    return CandidatoVaga.countDocuments({
      candidatoId,
      status: { $in: ['em_analise', 'aprovado'] },
    });
  }

  async removerRelacionamentosDoCandidato(candidatoId) {
    await Promise.all([
      Formacao.deleteMany({ candidatoId }),
      Experiencia.deleteMany({ candidatoId }),
      Habilidade.deleteMany({ candidatoId }),
      Certificacao.deleteMany({ candidatoId }),
      CandidatoVaga.deleteMany({ candidatoId }),
    ]);
  }
}

export default CandidatoRepository;
