import Candidatura from '../models/Candidatura.js';

class CandidaturaRepository {
  async criar(payload) {
    return Candidatura.create(payload);
  }

  async listarPorUsuarioId(usuarioId) {
    return Candidatura.find({ usuarioId }).sort({ criadoEm: -1 }).lean();
  }

  // Ordem neutra e deliberada: ordenar por score reintroduziria o vies de
  // ancoragem que a triagem sem ranking existe para evitar.
  async listarPorVagaId(vagaId) {
    return Candidatura.find({ vagaId }).sort({ criadoEm: 1 }).lean();
  }

  // Visao do suporte: todas as candidaturas, COM os campos de auditoria da IA.
  // Ordenada por avaliadoEm decrescente (as pendentes, com avaliadoEm null,
  // vao para o fim). Aqui o ranking nao e problema: o suporte acompanha o
  // comportamento do modelo, nao decide sobre pessoas.
  async listarParaAuditoria({ apenasPendentes = false, vagaId = null } = {}) {
    const filtro = {};
    if (apenasPendentes) filtro.avaliadoEm = null;
    if (vagaId) filtro.vagaId = vagaId;

    return Candidatura.find(filtro).sort({ avaliadoEm: -1, criadoEm: -1 }).lean();
  }

  async buscarPorUsuarioEVaga(usuarioId, vagaId) {
    return Candidatura.findOne({ usuarioId, vagaId }).lean();
  }

  async buscarPorId(id) {
    return Candidatura.findOne({ id }).lean();
  }

  async atualizarPorUsuarioEVaga(usuarioId, vagaId, payload) {
    return Candidatura.findOneAndUpdate({ usuarioId, vagaId }, payload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  }

  async deletarPorUsuarioEVaga(usuarioId, vagaId) {
    return Candidatura.findOneAndDelete({ usuarioId, vagaId }).lean();
  }
}

export default CandidaturaRepository;
