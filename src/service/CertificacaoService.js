import CandidatoRepository from '../repository/CandidatoRepository.js';
import CertificacaoRepository from '../repository/CertificacaoRepository.js';
import AppError from '../utils/helpers/AppError.js';

class CertificacaoService {
  constructor(
    certificacaoRepository = new CertificacaoRepository(),
    candidatoRepository = new CandidatoRepository(),
  ) {
    this.certificacaoRepository = certificacaoRepository;
    this.candidatoRepository = candidatoRepository;
  }

  sanitize(doc) {
    if (!doc) {
      return null;
    }

    const sanitized = { ...doc };
    delete sanitized.__v;
    return sanitized;
  }

  withCertificacaoExpirada(certificacao) {
    const now = new Date();
    const dataExpiracao = certificacao.dataExpiracao ? new Date(certificacao.dataExpiracao) : null;

    return {
      ...this.sanitize(certificacao),
      expirada: Boolean(dataExpiracao && dataExpiracao < now),
    };
  }

  async garantirCandidatoExiste(candidatoId) {
    const candidato = await this.candidatoRepository.buscarCandidatoPorId(candidatoId);
    if (!candidato) {
      throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
    }

    return candidato;
  }

  async criarCertificacao(candidatoId, payload) {
    await this.garantirCandidatoExiste(candidatoId);

    const created = await this.certificacaoRepository.criar({
      ...payload,
      candidatoId,
    });

    return this.withCertificacaoExpirada(created.toObject());
  }

  async listarCertificacao(candidatoId) {
    await this.garantirCandidatoExiste(candidatoId);

    const list = await this.certificacaoRepository.listarPorCandidatoId(candidatoId);
    return list.map((item) => this.withCertificacaoExpirada(item));
  }

  async atualizarCertificacao(candidatoId, id, payload) {
    await this.garantirCandidatoExiste(candidatoId);

    const existente = await this.certificacaoRepository.buscarPorCandidatoEId(candidatoId, id);
    if (!existente) {
      throw new AppError('Certificacao nao encontrada.', 404, 'NOT_FOUND');
    }

    const updated = await this.certificacaoRepository.atualizarPorCandidatoEId(candidatoId, id, payload);
    return this.withCertificacaoExpirada(updated);
  }

  async deletarCertificacao(candidatoId, id) {
    await this.garantirCandidatoExiste(candidatoId);

    const removed = await this.certificacaoRepository.deletarPorCandidatoEId(candidatoId, id);
    if (!removed) {
      throw new AppError('Certificacao nao encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default CertificacaoService;
