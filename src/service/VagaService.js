import mongoose from 'mongoose';
import VagaRepository from '../repository/VagaRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class VagaService {
  constructor(repository = new VagaRepository()) {
    this.repository = repository;
  }

  sanitize(vaga) {
    const sanitized = sanitizeDoc(vaga);
    if (!sanitized) return null;

    if (Array.isArray(sanitized.criterio_vaga)) {
      sanitized.criterio_vaga = sanitized.criterio_vaga.map((criterio) => sanitizeDoc(criterio));
    }

    return sanitized;
  }

  ensureObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de vaga invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  ensureStatusTransition(statusAtual, novoStatus) {
    if (!novoStatus) {
      return;
    }

    const transicoesPermitidas = {
      ativa: ['ativa', 'pausada', 'arquivada'],
      pausada: ['ativa', 'pausada', 'arquivada'],
      arquivada: ['arquivada'],
    };

    const permitidos = transicoesPermitidas[statusAtual] || [];
    if (!permitidos.includes(novoStatus)) {
      throw new AppError(
        `Transicao de status invalida: ${statusAtual} -> ${novoStatus}.`,
        400,
        'BUSINESS_RULE_ERROR',
      );
    }
  }

  async listar(query) {
    const result = await this.repository.listarPaginado(query);

    return {
      ...result,
      docs: result.docs.map((item) => this.sanitize(item)),
    };
  }

  async buscarPorId(id) {
    this.ensureObjectId(id);

    const vaga = await this.repository.buscarPorId(id);
    if (!vaga) {
      throw new AppError('Vaga nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.sanitize(vaga);
  }

  async criar(payload) {
    const created = await this.repository.criar(payload);
    return this.sanitize(created.toObject());
  }

  async atualizar(id, payload) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Vaga nao encontrada.', 404, 'NOT_FOUND');
    }

    this.ensureStatusTransition(existente.status, payload.status);

    const atualizado = await this.repository.atualizar(id, payload);
    return this.sanitize(atualizado);
  }

  async deletar(id) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Vaga nao encontrada.', 404, 'NOT_FOUND');
    }

    await this.repository.deletar(id);

    return {
      id,
      deletado: true,
    };
  }
}

export default VagaService;