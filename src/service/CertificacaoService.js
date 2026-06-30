import CertificacaoRepository from '../repository/CertificacaoRepository.js';
import AppError from '../utils/helpers/AppError.js';

class CertificacaoService {
  constructor(certificacaoRepository = new CertificacaoRepository()) {
    this.certificacaoRepository = certificacaoRepository;
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

  async criarCertificacao(usuarioId, payload) {
    const created = await this.certificacaoRepository.criar({
      ...payload,
      usuarioId,
    });

    return this.withCertificacaoExpirada(created.toObject());
  }

  async listarCertificacao(usuarioId) {
    const list = await this.certificacaoRepository.listarPorUsuarioId(usuarioId);
    return list.map((item) => this.withCertificacaoExpirada(item));
  }

  async atualizarCertificacao(usuarioId, id, payload) {
    const existente = await this.certificacaoRepository.buscarPorUsuarioEId(usuarioId, id);
    if (!existente) {
      throw new AppError('Certificacao nao encontrada.', 404, 'NOT_FOUND');
    }

    const updated = await this.certificacaoRepository.atualizarPorUsuarioEId(usuarioId, id, payload);
    return this.withCertificacaoExpirada(updated);
  }

  async deletarCertificacao(usuarioId, id) {
    const removed = await this.certificacaoRepository.deletarPorUsuarioEId(usuarioId, id);
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
