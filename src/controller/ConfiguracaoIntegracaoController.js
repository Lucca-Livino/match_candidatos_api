import ConfiguracaoIntegracaoService from '../service/ConfiguracaoIntegracaoService.js';
import { sendSuccess } from '../utils/helpers/http.js';

class ConfiguracaoIntegracaoController {
  constructor(service = new ConfiguracaoIntegracaoService()) {
    this.service = service;
  }

  async obter(req, res, next) {
    try {
      const data = await this.service.obter();
      return sendSuccess(res, data, 200, 'Configuracao obtida com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const data = await this.service.atualizar(req.body, String(req.user_id));
      return sendSuccess(res, data, 200, 'Configuracao atualizada com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default ConfiguracaoIntegracaoController;
