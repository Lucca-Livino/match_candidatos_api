import RespostaQuestionarioService from '../service/RespostaQuestionarioService.js';
import {
  validateIniciarRespostaQuestionario,
  validateResponderQuestionario,
} from '../utils/validators/respostaQuestionarioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';
import { conduzProcesso } from '../utils/helpers/papeis.js';

// Quem esta logado, para o service conferir o dono da resposta.
const solicitanteDe = (req) => ({ id: req.user_id, tipos_permissao: req.user?.tipos_permissao ?? [] });

class RespostaQuestionarioController {
  constructor(service = new RespostaQuestionarioService()) {
    this.service = service;
  }

  async iniciar(req, res, next) {
    try {
      const payload = validateIniciarRespostaQuestionario(req.body);
      const data = await this.service.iniciar(payload, solicitanteDe(req));
      return sendSuccess(res, data, 201, 'Resposta de questionário iniciada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async responder(req, res, next) {
    try {
      const payload = validateResponderQuestionario(req.body);
      const data = await this.service.responder(req.params.id, payload, solicitanteDe(req));
      return sendSuccess(res, data, 200, 'Respostas registradas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async finalizar(req, res, next) {
    try {
      const data = await this.service.finalizar(req.params.id, solicitanteDe(req));
      return sendSuccess(res, data, 200, 'Questionário finalizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarCompleta(req.params.id, solicitanteDe(req), {
        comGabarito: conduzProcesso(req),
      });
      return sendSuccess(res, data, 200, 'Resposta de questionário encontrada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default RespostaQuestionarioController;
