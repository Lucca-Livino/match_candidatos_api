import CandidaturaService from '../service/CandidaturaService.js';
import {
  validateCreateCandidatura,
  validateUpdateStatusCandidatura,
} from '../utils/validators/candidaturaValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class CandidaturaController {
  constructor(service = new CandidaturaService()) {
    this.service = service;
  }

  async criarCandidatura(req, res, next) {
    try {
      const payload = validateCreateCandidatura(req.body);
      const data = await this.service.criarCandidatura(req.params.id, payload);
      return sendSuccess(res, data, 201, 'Candidatura criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listarCandidatura(req, res, next) {
    try {
      const data = await this.service.listarCandidatura(req.params.id);
      return sendSuccess(res, data, 200, 'Candidaturas listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async detalharCandidatura(req, res, next) {
    try {
      const data = await this.service.detalharCandidatura(req.params.id, req.params.vagaId);
      return sendSuccess(res, data, 200, 'Candidatura detalhada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarStatusCandidatura(req, res, next) {
    try {
      const payload = validateUpdateStatusCandidatura(req.body);
      const data = await this.service.atualizarStatusCandidatura(
        req.params.id,
        req.params.vagaId,
        payload,
      );
      return sendSuccess(res, data, 200, 'Status da candidatura atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  // Listagem da vaga: :id e a vaga, nao o usuario (nas rotas de /usuarios o
  // :id e o usuario). Trocar os dois devolveria lista vazia em silencio.
  async listarPorVaga(req, res, next) {
    try {
      const data = await this.service.listarPorVaga(req.params.id);
      return sendSuccess(res, data, 200, 'Candidaturas da vaga listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  // Rota do suporte: unica que devolve os campos de auditoria da IA.
  async listarParaAuditoria(req, res, next) {
    try {
      const data = await this.service.listarParaAuditoria({
        apenasPendentes: req.query.pendentes === 'true',
        vagaId: req.query.vagaId || null,
      });
      return sendSuccess(res, data, 200, 'Avaliacoes listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async reavaliarCandidatura(req, res, next) {
    try {
      const data = await this.service.reavaliarCandidatura(req.params.usuarioId, req.params.id);
      return sendSuccess(res, data, 200, 'Candidatura reavaliada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async cancelarCandidatura(req, res, next) {
    try {
      const data = await this.service.cancelarCandidatura(req.params.id, req.params.vagaId);
      return sendSuccess(res, data, 200, 'Candidatura cancelada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default CandidaturaController;