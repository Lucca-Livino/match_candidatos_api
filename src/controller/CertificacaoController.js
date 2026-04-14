import CertificacaoService from '../service/CertificacaoService.js';
import {
  validateCreateCertificacao,
  validateUpdateCertificacao,
} from '../utils/validators/candidatoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class CertificacaoController {
  constructor(service = new CertificacaoService()) {
    this.service = service;
  }

  async criarCertificacao(req, res, next) {
    try {
      const payload = validateCreateCertificacao(req.body);
      const data = await this.service.criarCertificacao(req.params.candidatoId, payload);
      return sendSuccess(res, data, 201, 'Certificacao criada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async listarCertificacao(req, res, next) {
    try {
      const data = await this.service.listarCertificacao(req.params.candidatoId);
      return sendSuccess(res, data, 200, 'Certificacoes listadas com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizarCertificacao(req, res, next) {
    try {
      const payload = validateUpdateCertificacao(req.body);
      const data = await this.service.atualizarCertificacao(req.params.candidatoId, req.params.id, payload);
      return sendSuccess(res, data, 200, 'Certificacao atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async deletarCertificacao(req, res, next) {
    try {
      const data = await this.service.deletarCertificacao(req.params.candidatoId, req.params.id);
      return sendSuccess(res, data, 200, 'Certificacao removida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default CertificacaoController;
