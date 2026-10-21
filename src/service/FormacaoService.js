import FormacaoRepository from '../repository/FormacaoRepository.js';
import CatalogoService from './CatalogoService.js';
import AppError from '../utils/helpers/AppError.js';
import { validarAnoConclusaoPorSituacao } from '../utils/validators/candidatoValidators.js';

class FormacaoService {
  constructor(formacaoRepository = new FormacaoRepository(), catalogoService = new CatalogoService()) {
    this.formacaoRepository = formacaoRepository;
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

  async criarFormacao(usuarioId, payload) {
    await this.catalogoService.garantirReferencias([
      { tipo: 'area_curso', id: payload.areaId, campo: 'areaId' },
    ]);

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
      throw new AppError('Formação não encontrada.', 404, 'NOT_FOUND');
    }

    await this.catalogoService.garantirReferencias([
      { tipo: 'area_curso', id: payload.areaId, campo: 'areaId' },
    ]);

    const anoInicio = payload.anoInicio ?? existente.anoInicio;
    const anoConclusao = Object.hasOwn(payload, 'anoConclusao') ? payload.anoConclusao : existente.anoConclusao;

    if (Number.isInteger(anoConclusao) && anoConclusao < anoInicio) {
      throw new AppError('anoConclusao não pode ser menor que anoInicio.', 400, 'VALIDATION_ERROR');
    }

    const situacao = payload.situacao ?? existente.situacao;
    validarAnoConclusaoPorSituacao(situacao, anoConclusao ?? null);

    const updated = await this.formacaoRepository.atualizarPorUsuarioEId(usuarioId, id, payload);
    return this.sanitize(updated);
  }

  async deletarFormacao(usuarioId, id) {
    const removed = await this.formacaoRepository.deletarPorUsuarioEId(usuarioId, id);
    if (!removed) {
      throw new AppError('Formação não encontrada.', 404, 'NOT_FOUND');
    }

    return {
      id,
      deletado: true,
    };
  }
}

export default FormacaoService;
