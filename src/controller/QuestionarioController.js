import QuestionarioService from '../service/QuestionarioService.js';
import {
  validateCreateQuestionario,
  validateListQuestionarioQuery,
  validatePatchQuestionarioAtivo,
  validateUpdateQuestionario,
} from '../utils/validators/questionarioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class QuestionarioController {
  constructor(service = new QuestionarioService()) {
    this.service = service;
  }

  async criar(req, res, next) {
    try {
      const payload = validateCreateQuestionario(req.body);
      const data = await this.service.criar(payload);
      return sendSuccess(res, data, 201, 'Questionario criado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const query = validateListQuestionarioQuery(req.query);
      const data = await this.service.listar(query);
      return sendSuccess(res, data, 200, 'Questionarios listados com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarPorIdComPerguntas(req.params.id);
      return sendSuccess(res, data, 200, 'Questionario encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const payload = validateUpdateQuestionario(req.body);
      const data = await this.service.atualizar(req.params.id, payload);
      return sendSuccess(res, data, 200, 'Questionario atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarAtivo(req, res, next) {
    try {
      const payload = validatePatchQuestionarioAtivo(req.body);
      const data = await this.service.atualizarAtivo(req.params.id, payload.ativo);
      return sendSuccess(res, data, 200, 'Status ativo do questionario atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletar(req, res, next) {
    try {
      const data = await this.service.deletar(req.params.id);
      return sendSuccess(res, data, 200, 'Questionario excluido com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default QuestionarioController;
