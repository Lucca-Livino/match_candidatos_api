import FormacaoRepository from '../repository/FormacaoRepository.js';
import AppError from '../utils/helpers/AppError.js';

class FormacaoService {
  constructor(formacaoRepository = new FormacaoRepository()) {
    this.formacaoRepository = formacaoRepository;
  }

  sanitize(doc) {
    if (!doc) {
      return null;
    }

    const sanitized = { ...doc };
    delete sanitized.__v;
    return sanitized;
  }

  async criarFormacao(usuarioId, payload) {
    const created = await this.formacaoRepository.criar({
      ...payload,
      usuarioId,
    });

    return this.sanitize(created.toObject());
  }

  async listarFormacao(usuarioId) {
    const list = await this.formacaoRepository.listarPorUsuarioId(usuarioId);
    return list.map((item) => this.sanitize(item));
  }

  async atualizarFormacao(usuarioId, id, payload) {
    const existente = await this.formacaoRepository.buscarPorUsuarioEId(usuarioId, id);
    if (!existente) {
      throw new AppError('Formacao nao encontrada.', 404, 'NOT_FOUND');
    }

    const anoInicio = payload.anoInicio ?? existente.anoInicio;
    const anoConclusao = Object.hasOwn(payload, 'anoConclusao') ? payload.anoConclusao : existente.anoConclusao;

    if (Number.isInteger(anoConclusao) && anoConclusao < anoInicio) {
      throw new AppError('anoConclusao nao pode ser menor que anoInicio.', 400, 'VALIDATION_ERROR');
    }

    const updated = await this.formacaoRepository.atualizarPorUsuarioEId(usuarioId, id, payload);
    return this.sanitize(updated);
  }

  async deletarFormacao(usuarioId, id) {
    const removed = await this.formacaoRepository.deletarPorUsuarioEId(usuarioId, id);
    if (!removed) {
      throw new AppError('Formacao nao encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default FormacaoService;
