import GrupoRepository from '../repository/GrupoRepository.js';
import { validateCreateGrupo, validatePatchGrupo } from '../utils/validators/grupoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';
import AppError from '../utils/helpers/AppError.js';

class GrupoController {
  constructor(repository = new GrupoRepository()) {
    this.repository = repository;
  }

  async listar(req, res) {
    const data = await this.repository.listarPaginado(req.query);
    return sendSuccess(res, data, 200, 'Grupos listados com sucesso.');
  }

  async buscarPorId(req, res) {
    const data = await this.repository.buscarPorId(req.params.id);
    if (!data) throw new AppError('Grupo nao encontrado.', 404, 'NOT_FOUND');
    return sendSuccess(res, data, 200, 'Grupo encontrado com sucesso.');
  }

  async criar(req, res) {
    const payload = validateCreateGrupo(req.body);
    const data = await this.repository.criar(payload);
    return sendSuccess(res, data, 201, 'Grupo criado com sucesso.');
  }

  async atualizar(req, res) {
    const payload = validatePatchGrupo(req.body);
    const data = await this.repository.atualizar(req.params.id, payload);
    if (!data) throw new AppError('Grupo nao encontrado.', 404, 'NOT_FOUND');
    return sendSuccess(res, data, 200, 'Grupo atualizado com sucesso.');
  }

  async deletar(req, res) {
    const data = await this.repository.deletar(req.params.id);
    if (!data) throw new AppError('Grupo nao encontrado.', 404, 'NOT_FOUND');
    return sendSuccess(res, { id: req.params.id, deletado: true }, 200, 'Grupo excluido com sucesso.');
  }
}

export default GrupoController;
