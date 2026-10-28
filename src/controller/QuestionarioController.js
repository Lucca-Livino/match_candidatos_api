import QuestionarioService from '../service/QuestionarioService.js';
import {
  validateCreateQuestionario,
  validateListQuestionarioQuery,
  validatePatchQuestionarioAtivo,
  validateUpdateQuestionario,
} from '../utils/validators/questionarioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';
import { conduzProcesso } from '../utils/helpers/papeis.js';

class QuestionarioController {
  constructor(service = new QuestionarioService()) {
    this.service = service;
  }

  async criar(req, res, next) {
    try {
      const payload = validateCreateQuestionario(req.body);
      const data = await this.service.criar(payload);
      return sendSuccess(res, data, 201, 'Questionário criado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const query = validateListQuestionarioQuery(req.query);
      const data = await this.service.listar(query);
      return sendSuccess(res, data, 200, 'Questionários listados com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarPorIdComPerguntas(req.params.id, { comGabarito: conduzProcesso(req) });
      return sendSuccess(res, data, 200, 'Questionário encontrado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const payload = validateUpdateQuestionario(req.body);
      const data = await this.service.atualizar(req.params.id, payload);
      return sendSuccess(res, data, 200, 'Questionário atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarAtivo(req, res, next) {
    try {
      const payload = validatePatchQuestionarioAtivo(req.body);
      const data = await this.service.atualizarAtivo(req.params.id, payload.ativo);
      return sendSuccess(res, data, 200, 'Status ativo do questionário atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletar(req, res, next) {
    try {
      const data = await this.service.deletar(req.params.id);
      return sendSuccess(res, data, 200, 'Questionário excluído com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default QuestionarioController;
