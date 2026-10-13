import CertificacaoRepository from '../repository/CertificacaoRepository.js';
import CatalogoService from './CatalogoService.js';
import AppError from '../utils/helpers/AppError.js';

class CertificacaoService {
  constructor(certificacaoRepository = new CertificacaoRepository(), catalogoService = new CatalogoService()) {
    this.certificacaoRepository = certificacaoRepository;
    this.catalogoService = catalogoService;
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
    await this.catalogoService.garantirReferencias([
      { tipo: 'certificacao', id: payload.itemId, campo: 'itemId' },
    ]);

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
      throw new AppError('Certificação não encontrada.', 404, 'NOT_FOUND');
    }

    await this.catalogoService.garantirReferencias([
      { tipo: 'certificacao', id: payload.itemId, campo: 'itemId' },
    ]);

    // O texto do combobox e o nome do item: texto novo sem id vira texto livre,
    // e o vinculo antigo nao pode continuar valendo.
    if (Object.hasOwn(payload, 'nome') && !Object.hasOwn(payload, 'itemId')) {
      payload = { ...payload, itemId: null };
    }

    const updated = await this.certificacaoRepository.atualizarPorUsuarioEId(usuarioId, id, payload);
    return this.withCertificacaoExpirada(updated);
  }

  async deletarCertificacao(usuarioId, id) {
    const removed = await this.certificacaoRepository.deletarPorUsuarioEId(usuarioId, id);
    if (!removed) {
      throw new AppError('Certificação não encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default CertificacaoService;
