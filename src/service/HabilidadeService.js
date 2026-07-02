import HabilidadeRepository from '../repository/HabilidadeRepository.js';
import AppError from '../utils/helpers/AppError.js';

class HabilidadeService {
  constructor(habilidadeRepository = new HabilidadeRepository()) {
    this.habilidadeRepository = habilidadeRepository;
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
      throw new AppError('Habilidade nao encontrada.', 404, 'NOT_FOUND');
    }

    const updated = await this.habilidadeRepository.atualizarPorUsuarioEId(usuarioId, id, payload);
    return this.sanitize(updated);
  }

  async deletarHabilidade(usuarioId, id) {
    const removed = await this.habilidadeRepository.deletarPorUsuarioEId(usuarioId, id);
    if (!removed) {
      throw new AppError('Habilidade nao encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default HabilidadeService;
