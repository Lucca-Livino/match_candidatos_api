import HabilidadeService from '../service/HabilidadeService.js';
import {
  validateCreateHabilidade,
  validateUpdateHabilidade,
} from '../utils/validators/candidatoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class HabilidadeController {
  constructor(service = new HabilidadeService()) {
    this.service = service;
  }

  async criarHabilidade(req, res, next) {
    try {
      const payload = validateCreateHabilidade(req.body);
      const data = await this.service.criarHabilidade(req.params.id, payload);
      return sendSuccess(res, data, 201, 'Habilidade criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listarHabilidade(req, res, next) {
    try {
      const data = await this.service.listarHabilidade(req.params.id);
      return sendSuccess(res, data, 200, 'Habilidades listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarHabilidade(req, res, next) {
    try {
      const payload = validateUpdateHabilidade(req.body);
      const data = await this.service.atualizarHabilidade(req.params.id, req.params.habilidadeId, payload);
      return sendSuccess(res, data, 200, 'Habilidade atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletarHabilidade(req, res, next) {
    try {
      const data = await this.service.deletarHabilidade(req.params.id, req.params.habilidadeId);
      return sendSuccess(res, data, 200, 'Habilidade removida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default HabilidadeController;
