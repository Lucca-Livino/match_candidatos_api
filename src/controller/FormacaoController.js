import FormacaoService from '../service/FormacaoService.js';
import {
  validateCreateFormacao,
  validateUpdateFormacao,
} from '../utils/validators/candidatoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class FormacaoController {
  constructor(service = new FormacaoService()) {
    this.service = service;
  }

  async criarFormacao(req, res, next) {
    try {
      const payload = validateCreateFormacao(req.body);
      const data = await this.service.criarFormacao(req.params.id, payload);
      return sendSuccess(res, data, 201, 'Formacao criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listarFormacao(req, res, next) {
    try {
      const data = await this.service.listarFormacao(req.params.id);
      return sendSuccess(res, data, 200, 'Formacoes listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarFormacao(req, res, next) {
    try {
      const payload = validateUpdateFormacao(req.body);
      const data = await this.service.atualizarFormacao(req.params.id, req.params.formacaoId, payload);
      return sendSuccess(res, data, 200, 'Formacao atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletarFormacao(req, res, next) {
    try {
      const data = await this.service.deletarFormacao(req.params.id, req.params.formacaoId);
      return sendSuccess(res, data, 200, 'Formacao removida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default FormacaoController;
