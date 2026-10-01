import RelatorioService from '../service/RelatorioService.js';
import { validatePeriodo } from '../utils/validators/relatorioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class RelatorioController {
  constructor(service = new RelatorioService()) {
    this.service = service;
  }

  async geral(req, res, next) {
    try {
      const periodo = validatePeriodo(req.query.periodo);
      const data = await this.service.geral(periodo);
      return sendSuccess(res, data, 200, 'Relatorio gerado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async porVaga(req, res, next) {
    try {
      const periodo = validatePeriodo(req.query.periodo);
      const data = await this.service.porVaga(req.params.id, periodo);
      return sendSuccess(res, data, 200, 'Relatorio da vaga gerado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default RelatorioController;
