import mongoose from 'mongoose';
import UsuarioRepository from '../repository/UsuarioRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { hashPassword } from '../utils/password.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class UsuarioService {
  constructor(repository = new UsuarioRepository()) {
    this.repository = repository;
  }

  sanitize(usuario) {
    return sanitizeDoc(usuario, ['senha']);
  }

  ensureObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de usuario invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  async withHashedPassword(payload) {
    if (!Object.hasOwn(payload, 'senha')) {
      return payload;
    }

    return {
      ...payload,
      senha: await hashPassword(payload.senha),
    };
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

    const usuario = await this.repository.buscarPorId(id);
    if (!usuario) {
      throw new AppError('Usuario nao encontrado.', 404, 'NOT_FOUND');
    }

    return this.sanitize(usuario);
  }

  async criar(payload) {
    const jaExiste = await this.repository.buscarPorEmail(payload.email);
    if (jaExiste) {
      throw new AppError('Ja existe usuario com este email.', 409, 'CONFLICT');
    }

    const payloadComHash = await this.withHashedPassword(payload);
    const created = await this.repository.criar(payloadComHash);
    return this.sanitize(created.toObject());
  }

  async atualizar(id, payload) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Usuario nao encontrado.', 404, 'NOT_FOUND');
    }

    if (payload.email && payload.email !== existente.email) {
      const usuarioEmail = await this.repository.buscarPorEmail(payload.email);
      if (usuarioEmail && String(usuarioEmail._id) !== String(id)) {
        throw new AppError('Ja existe usuario com este email.', 409, 'CONFLICT');
      }
    }

    const payloadComHash = await this.withHashedPassword(payload);
    const atualizado = await this.repository.atualizar(id, payloadComHash);
    return this.sanitize(atualizado);
  }

  async deletar(id) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Usuario nao encontrado.', 404, 'NOT_FOUND');
    }

    await this.repository.deletar(id);

    return {
      id,
      deletado: true,
    };
  }
}

export default UsuarioService;
