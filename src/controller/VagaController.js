import VagaService from '../service/VagaService.js';
import {
  validateCreateVaga,
  validateListVagaQuery,
  validatePatchVaga,
} from '../utils/validators/vagaValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class VagaController {
  constructor(service = new VagaService()) {
    this.service = service;
  }

  async listar(req, res) {
    const query = validateListVagaQuery(req.query);
    const data = await this.service.listar(query);
    return sendSuccess(res, data, 200, 'Vagas listadas com sucesso.');
  }

  async listarPorId(req, res) {
    const data = await this.service.buscarPorId(req.params.id);
    return sendSuccess(res, data, 200, 'Vaga encontrada com sucesso.');
  }

  async criar(req, res) {
    const payload = validateCreateVaga(req.body);
    const data = await this.service.criar(payload);
    return sendSuccess(res, data, 201, 'Vaga criada com sucesso.');
  }

  async atualizar(req, res) {
    const payload = validatePatchVaga(req.body);
    const data = await this.service.atualizar(req.params.id, payload);
    return sendSuccess(res, data, 200, 'Vaga atualizada com sucesso.');
  }

  async deletar(req, res) {
    const data = await this.service.deletar(req.params.id);
    return sendSuccess(res, data, 200, 'Vaga excluida com sucesso.');
  }
}

export default VagaController;