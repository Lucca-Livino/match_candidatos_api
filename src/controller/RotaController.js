import RotaRepository from '../repository/RotaRepository.js';
import { validateCreateRota, validatePatchRota } from '../utils/validators/rotaValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';
import AppError from '../utils/helpers/AppError.js';

class RotaController {
  constructor(repository = new RotaRepository()) {
    this.repository = repository;
  }

  async listar(req, res) {
    const data = await this.repository.listarPaginado(req.query);
    return sendSuccess(res, data, 200, 'Rotas listadas com sucesso.');
  }

  async buscarPorId(req, res) {
    const data = await this.repository.buscarPorId(req.params.id);
    if (!data) throw new AppError('Rota nao encontrada.', 404, 'NOT_FOUND');
    return sendSuccess(res, data, 200, 'Rota encontrada com sucesso.');
  }

  async criar(req, res) {
    const payload = validateCreateRota(req.body);
    const data = await this.repository.criar(payload);
    return sendSuccess(res, data, 201, 'Rota criada com sucesso.');
  }

  async atualizar(req, res) {
    const payload = validatePatchRota(req.body);
    const data = await this.repository.atualizar(req.params.id, payload);
    if (!data) throw new AppError('Rota nao encontrada.', 404, 'NOT_FOUND');
    return sendSuccess(res, data, 200, 'Rota atualizada com sucesso.');
  }

  async deletar(req, res) {
    const data = await this.repository.deletar(req.params.id);
    if (!data) throw new AppError('Rota nao encontrada.', 404, 'NOT_FOUND');
    return sendSuccess(res, { id: req.params.id, deletado: true }, 200, 'Rota excluida com sucesso.');
  }
}

export default RotaController;
