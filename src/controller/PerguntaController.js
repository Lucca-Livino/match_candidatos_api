import PerguntaService from '../service/PerguntaService.js';
import {
  validateCreateOpcaoResposta,
  validateCreatePergunta,
  validateListPerguntaQuery,
  validateReorderPerguntas,
  validateUpdateOpcaoResposta,
  validateUpdatePergunta,
} from '../utils/validators/perguntaValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class PerguntaController {
  constructor(service = new PerguntaService()) {
    this.service = service;
  }

  async criar(req, res, next) {
    try {
      const payload = validateCreatePergunta(req.body);
      const data = await this.service.criar(payload);
      return sendSuccess(res, data, 201, 'Pergunta criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const query = validateListPerguntaQuery(req.query);
      const data = await this.service.listar(query.questionarioId);
      return sendSuccess(res, data, 200, 'Perguntas listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const data = await this.service.buscarPorId(req.params.id);
      return sendSuccess(res, data, 200, 'Pergunta encontrada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const payload = validateUpdatePergunta(req.body);
      const data = await this.service.atualizar(req.params.id, payload);
      return sendSuccess(res, data, 200, 'Pergunta atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletar(req, res, next) {
    try {
      const data = await this.service.deletar(req.params.id);
      return sendSuccess(res, data, 200, 'Pergunta excluida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async adicionarOpcao(req, res, next) {
    try {
      const payload = validateCreateOpcaoResposta(req.body);
      const data = await this.service.adicionarOpcao(req.params.id, payload);
      return sendSuccess(res, data, 201, 'Opcao de resposta criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarOpcao(req, res, next) {
    try {
      const payload = validateUpdateOpcaoResposta(req.body);
      const data = await this.service.atualizarOpcao(req.params.id, req.params.opcaoId, payload);
      return sendSuccess(res, data, 200, 'Opcao de resposta atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async removerOpcao(req, res, next) {
    try {
      const data = await this.service.removerOpcao(req.params.id, req.params.opcaoId);
      return sendSuccess(res, data, 200, 'Opcao de resposta removida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async reordenar(req, res, next) {
    try {
      const payload = validateReorderPerguntas(req.body);
      const data = await this.service.reordenar(payload);
      return sendSuccess(res, data, 200, 'Perguntas reordenadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default PerguntaController;
