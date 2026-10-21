import HabilidadeRepository from '../repository/HabilidadeRepository.js';
import CatalogoService from './CatalogoService.js';
import AppError from '../utils/helpers/AppError.js';

class HabilidadeService {
  constructor(habilidadeRepository = new HabilidadeRepository(), catalogoService = new CatalogoService()) {
    this.habilidadeRepository = habilidadeRepository;
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

  async criarHabilidade(usuarioId, payload) {
    await this.catalogoService.garantirReferencias([
      { tipo: 'habilidade', id: payload.itemId, campo: 'itemId' },
    ]);

    const created = await this.habilidadeRepository.criar({
      ...payload,
      usuarioId,
    });

    return this.sanitize(created.toObject());
  }

  async listarHabilidade(usuarioId) {
    const list = await this.habilidadeRepository.listarPorUsuarioId(usuarioId);
    return list.map((item) => this.sanitize(item));
  }

  async atualizarHabilidade(usuarioId, id, payload) {
    const existente = await this.habilidadeRepository.buscarPorUsuarioEId(usuarioId, id);
    if (!existente) {
      throw new AppError('Habilidade não encontrada.', 404, 'NOT_FOUND');
    }

    await this.catalogoService.garantirReferencias([
      { tipo: 'habilidade', id: payload.itemId, campo: 'itemId' },
    ]);

    // O texto do combobox e o nome do item: texto novo sem id vira texto livre,
    // e o vinculo antigo nao pode continuar valendo.
    if (Object.hasOwn(payload, 'habilidade') && !Object.hasOwn(payload, 'itemId')) {
      payload = { ...payload, itemId: null };
    }

    const updated = await this.habilidadeRepository.atualizarPorUsuarioEId(usuarioId, id, payload);
    return this.sanitize(updated);
  }

  async deletarHabilidade(usuarioId, id) {
    const removed = await this.habilidadeRepository.deletarPorUsuarioEId(usuarioId, id);
    if (!removed) {
      throw new AppError('Habilidade não encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default HabilidadeService;
