import UsuarioService from '../service/UsuarioService.js';
import {
  validateCreateUsuario,
  validatePatchUsuario,
  validateListQuery,
} from '../utils/validators/usuarioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class UsuarioController {
  constructor(service = new UsuarioService()) {
    this.service = service;
  }

  async listar(req, res) {
    const query = validateListQuery(req.query);
    const data = await this.service.listar(query, req.user?.tipos_permissao ?? []);
    return sendSuccess(res, data, 200, 'Usuarios listados com sucesso.');
  }

  async listarPorId(req, res) {
    const data = await this.service.buscarPorId(req.params.id);
    return sendSuccess(res, data, 200, 'Usuario encontrado com sucesso.');
  }

  async registrar(req, res) {
    const { nome, email, senha } = req.body;
    const data = await this.service.registrarCandidato({ nome, email, senha });
    return sendSuccess(res, data, 201, 'Candidato registrado com sucesso.');
  }

  async criar(req, res) {
    const payload = validateCreateUsuario(req.body);
    const data = await this.service.criar(payload);
    return sendSuccess(res, data, 201, 'Usuario criado com sucesso.');
  }

  async atualizar(req, res) {
    const payload = validatePatchUsuario(req.body);
    const data = await this.service.atualizar(req.params.id, payload);
    return sendSuccess(res, data, 200, 'Usuario atualizado com sucesso.');
  }

  async deletar(req, res) {
    const data = await this.service.deletar(req.params.id);
    return sendSuccess(res, data, 200, 'Usuario excluido com sucesso.');
  }
}

export default UsuarioController;
