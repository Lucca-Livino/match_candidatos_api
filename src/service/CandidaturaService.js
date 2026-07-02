import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class CandidaturaService {
  constructor(candidaturaRepository = new CandidaturaRepository()) {
    this.candidaturaRepository = candidaturaRepository;
  }

  sanitize(doc) {
    return sanitizeDoc(doc);
  }

  validarTransicaoStatus(statusAtual, novoStatus) {
    const fluxo = {
      inscrito: ['em_analise'],
      em_analise: ['aprovado', 'reprovado'],
      aprovado: [],
      reprovado: [],
    };

    const permitidos = fluxo[statusAtual] || [];
    if (!permitidos.includes(novoStatus)) {
      throw new AppError(
        `Transicao de status invalida: ${statusAtual} -> ${novoStatus}.`,
        400,
        'BUSINESS_RULE_ERROR',
      );
    }
  }

  async criarCandidatura(usuarioId, payload) {
    const jaExiste = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, payload.vagaId);
    if (jaExiste) {
      throw new AppError('Usuario ja esta inscrito nesta vaga.', 409, 'CONFLICT');
    }

    const created = await this.candidaturaRepository.criar({
      ...payload,
      usuarioId,
      status: 'inscrito',
    });

    return this.sanitize(created.toObject());
  }

  async listarCandidatura(usuarioId) {
    const list = await this.candidaturaRepository.listarPorUsuarioId(usuarioId);
    return list.map((item) => this.sanitize(item));
  }

  async detalharCandidatura(usuarioId, vagaId) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.sanitize(candidatura);
  }

  async atualizarStatusCandidatura(usuarioId, vagaId, payload) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    this.validarTransicaoStatus(candidatura.status, payload.status);

    const updated = await this.candidaturaRepository.atualizarPorUsuarioEVaga(
      usuarioId,
      vagaId,
      payload,
    );
    return this.sanitize(updated);
  }

  async cancelarCandidatura(usuarioId, vagaId) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    if (!['inscrito', 'em_analise'].includes(candidatura.status)) {
      throw new AppError(
        'Cancelamento permitido apenas para candidaturas inscrito ou em_analise.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    await this.candidaturaRepository.deletarPorUsuarioEVaga(usuarioId, vagaId);

    return {
      vagaId,
      cancelada: true,
    };
  }
}

export default CandidaturaService;
