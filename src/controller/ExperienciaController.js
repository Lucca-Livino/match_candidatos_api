import ExperienciaService from '../service/ExperienciaService.js';
import {
  validateCreateExperiencia,
  validateUpdateExperiencia,
} from '../utils/validators/candidatoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class ExperienciaController {
  constructor(service = new ExperienciaService()) {
    this.service = service;
  }

  async criarExperiencia(req, res, next) {
    try {
      const payload = validateCreateExperiencia(req.body);
      const data = await this.service.criarExperiencia(req.params.id, payload);
      return sendSuccess(res, data, 201, 'Experiencia criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listarExperiencia(req, res, next) {
    try {
      const data = await this.service.listarExperiencia(req.params.id);
      return sendSuccess(res, data, 200, 'Experiencias listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarExperiencia(req, res, next) {
    try {
      const payload = validateUpdateExperiencia(req.body);
      const data = await this.service.atualizarExperiencia(req.params.id, req.params.experienciaId, payload);
      return sendSuccess(res, data, 200, 'Experiencia atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletarExperiencia(req, res, next) {
    try {
      const data = await this.service.deletarExperiencia(req.params.id, req.params.experienciaId);
      return sendSuccess(res, data, 200, 'Experiencia removida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default ExperienciaController;
