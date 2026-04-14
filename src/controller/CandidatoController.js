import CandidatoService from '../service/CandidatoService.js';
import {
  validateCreateCandidato,
  validateUpdateCandidato,
  validateListCandidatoQuery,
} from '../utils/validators/candidatoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class CandidatoController {
  constructor(service = new CandidatoService()) {
    this.service = service;
  }

  async listar(req, res, next) {
    try {
      const query = validateListCandidatoQuery(req.query);
      const data = await this.service.listar(query);
      return sendSuccess(res, data, 200, 'Candidatos listados com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarPorId(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorFormacaoId(req, res, next) {
    try {
      const data = await this.service.buscarPorFormacaoId(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorExperienciaId(req, res, next) {
    try {
      const data = await this.service.buscarPorExperienciaId(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorHabilidadeId(req, res, next) {
    try {
      const data = await this.service.buscarPorHabilidadeId(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorCertificacaoId(req, res, next) {
    try {
      const data = await this.service.buscarPorCertificacaoId(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorCandidaturaId(req, res, next) {
    try {
      const data = await this.service.buscarPorCandidaturaId(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async criar(req, res, next) {
    try {
      const payload = validateCreateCandidato(req.body);
      const data = await this.service.criar(payload);
      return sendSuccess(res, data, 201, 'Candidato criado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const payload = validateUpdateCandidato(req.body);
      const data = await this.service.atualizar(req.params.id, payload);
      return sendSuccess(res, data, 200, 'Candidato atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletar(req, res, next) {
    try {
      const data = await this.service.deletar(req.params.id);
      return sendSuccess(res, data, 200, 'Candidato excluido com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default CandidatoController;
