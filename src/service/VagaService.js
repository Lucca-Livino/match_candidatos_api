import mongoose from 'mongoose';
import VagaRepository from '../repository/VagaRepository.js';
import QuestionarioRepository from '../repository/QuestionarioRepository.js';
import Candidatura from '../models/Candidatura.js';
import CatalogoService from './CatalogoService.js';
import { TIPO_CATALOGO_POR_CRITERIO } from '../models/ItemCatalogo.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

const ROTULO_STATUS = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  arquivada: 'Encerrada',
};
const rotuloStatus = (status) => ROTULO_STATUS[status] ?? status;

class VagaService {
  constructor(
    repository = new VagaRepository(),
    questionarioRepository = new QuestionarioRepository(),
    candidaturaModel = Candidatura,
    catalogoService = new CatalogoService(),
  ) {
    this.repository = repository;
    this.questionarioRepository = questionarioRepository;
    this.Candidatura = candidaturaModel;
    this.catalogoService = catalogoService;
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
      throw new AppError('ID de vaga inválido.', 400, 'VALIDATION_ERROR');
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
        `Não é possível mover a vaga de ${rotuloStatus(statusAtual)} para ${rotuloStatus(novoStatus)}.`,
        400,
        'BUSINESS_RULE_ERROR',
      );
    }
  }

  async garantirQuestionarioAtivo(vagaId) {
    const questionarios = await this.questionarioRepository.listar({ vagaId, ativo: 1 });
    if (!questionarios.length) {
      throw new AppError(
        'Vaga só pode ser ativada com um questionário ativo.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }
  }

  async listar(query) {
    const result = await this.repository.listarPaginado(query);
    const totais = await this.contarCandidaturas(result.docs.map((item) => String(item._id)));

    return {
      ...result,
      docs: result.docs.map((item) => ({
        ...this.sanitize(item),
        totalCandidatos: totais.get(String(item._id)) ?? 0,
      })),
    };
  }

  // Candidaturas de todas as vagas da pagina numa agregacao so, para nao
  // emitir uma contagem por card.
  async contarCandidaturas(vagaIds) {
    if (vagaIds.length === 0) return new Map();

    const grupos = await this.Candidatura.aggregate([
      { $match: { vagaId: { $in: vagaIds } } },
      { $group: { _id: '$vagaId', total: { $sum: 1 } } },
    ]);

    return new Map(grupos.map(({ _id, total }) => [_id, total]));
  }

  async buscarPorId(id) {
    this.ensureObjectId(id);

    const vaga = await this.repository.buscarPorId(id);
    if (!vaga) {
      throw new AppError('Vaga não encontrada.', 404, 'NOT_FOUND');
    }

    return this.sanitize(vaga);
  }

  async garantirRequisitos(criterios = []) {
    const refs = criterios.flatMap((c, i) => {
      if (!c.requisito) return [];
      const tipo = TIPO_CATALOGO_POR_CRITERIO[c.tipo_criterio];
      const campo = c.tipo_criterio === 'formacao' || c.tipo_criterio === 'experiencia' ? 'areaId' : 'itemId';
      return [{ tipo, id: c.requisito[campo], campo: `criterio_vaga[${i}].requisito.${campo}` }];
    });
    await this.catalogoService.garantirReferencias(refs);
  }

  async criar(payload) {
    await this.garantirRequisitos(payload.criterio_vaga);
    const created = await this.repository.criar(payload);

    // Vaga criada ja ativa precisa do questionario; sem ele, candidaturas
    // nunca seriam avaliadas (o gatilho e a finalizacao do questionario).
    if (payload.status === 'ativa') {
      await this.garantirQuestionarioAtivo(String(created._id));
    }

    return this.sanitize(created.toObject());
  }

  async atualizar(id, payload) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Vaga não encontrada.', 404, 'NOT_FOUND');
    }

    this.ensureStatusTransition(existente.status, payload.status);

    if (payload.criterio_vaga) {
      await this.garantirRequisitos(payload.criterio_vaga);
    }

    if (payload.status === 'ativa') {
      await this.garantirQuestionarioAtivo(id);
    }

    const atualizado = await this.repository.atualizar(id, payload);
    return this.sanitize(atualizado);
  }

  async deletar(id) {
    this.ensureObjectId(id);

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new AppError('Vaga não encontrada.', 404, 'NOT_FOUND');
    }

    await this.repository.deletar(id);

    return {
      id,
      deletado: true,
    };
  }
}

export default VagaService;