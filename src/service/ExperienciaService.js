import ExperienciaRepository from '../repository/ExperienciaRepository.js';
import AppError from '../utils/helpers/AppError.js';

class ExperienciaService {
  constructor(experienciaRepository = new ExperienciaRepository()) {
    this.experienciaRepository = experienciaRepository;
  }

  sanitize(doc) {
    if (!doc) {
      return null;
    }

    const sanitized = { ...doc };
    delete sanitized.__v;
    return sanitized;
  }

  calcularMesesDuracao(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = dataFim ? new Date(dataFim) : new Date();

    if (fim < inicio) {
      throw new AppError('dataFim nao pode ser anterior a dataInicio.', 400, 'VALIDATION_ERROR');
    }

    let meses = (fim.getFullYear() - inicio.getFullYear()) * 12;
    meses += fim.getMonth() - inicio.getMonth();

    if (fim.getDate() < inicio.getDate()) {
      meses -= 1;
    }

    return Math.max(0, meses);
  }

  async criarExperiencia(usuarioId, payload) {
    const mesesDuracao = this.calcularMesesDuracao(payload.dataInicio, payload.dataFim);

    const created = await this.experienciaRepository.criar({
      ...payload,
      usuarioId,
      mesesDuracao,
    });

    return this.sanitize(created.toObject());
  }

  async listarExperiencia(usuarioId) {
    const list = await this.experienciaRepository.listarPorUsuarioId(usuarioId);
    return list.map((item) => this.sanitize(item));
  }

  async atualizarExperiencia(usuarioId, id, payload) {
    const existente = await this.experienciaRepository.buscarPorUsuarioEId(usuarioId, id);
    if (!existente) {
      throw new AppError('Experiencia nao encontrada.', 404, 'NOT_FOUND');
    }

    const dataInicio = payload.dataInicio || existente.dataInicio;
    const dataFim = Object.hasOwn(payload, 'dataFim') ? payload.dataFim : existente.dataFim;

    const mesesDuracao = this.calcularMesesDuracao(dataInicio, dataFim);

    const updated = await this.experienciaRepository.atualizarPorUsuarioEId(usuarioId, id, {
      ...payload,
      mesesDuracao,
    });

    return this.sanitize(updated);
  }

  async deletarExperiencia(usuarioId, id) {
    const removed = await this.experienciaRepository.deletarPorUsuarioEId(usuarioId, id);
    if (!removed) {
      throw new AppError('Experiencia nao encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default ExperienciaService;
