import RespostaQuestionarioService from '../service/RespostaQuestionarioService.js';
import {
  validateIniciarRespostaQuestionario,
  validateResponderQuestionario,
} from '../utils/validators/respostaQuestionarioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class RespostaQuestionarioController {
  constructor(service = new RespostaQuestionarioService()) {
    this.service = service;
  }

  async iniciar(req, res, next) {
    try {
      const payload = validateIniciarRespostaQuestionario(req.body);
      const data = await this.service.iniciar(payload);
      return sendSuccess(res, data, 201, 'Resposta de questionario iniciada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async responder(req, res, next) {
    try {
      const payload = validateResponderQuestionario(req.body);
      const data = await this.service.responder(req.params.id, payload);
      return sendSuccess(res, data, 200, 'Respostas registradas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async finalizar(req, res, next) {
    try {
      const data = await this.service.finalizar(req.params.id);
      return sendSuccess(res, data, 200, 'Questionario finalizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarCompleta(req.params.id);
      return sendSuccess(res, data, 200, 'Resposta de questionario encontrada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default RespostaQuestionarioController;
