import UsuarioService from '../service/UsuarioService.js';
import ConviteService from '../service/ConviteService.js';
import {
  validateCreateUsuario,
  validatePatchUsuario,
  validateListQuery,
  validateConvite,
  validateAtivacao,
  validateStatus,
} from '../utils/validators/usuarioValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';

class UsuarioController {
  constructor(service = new UsuarioService(), conviteService = new ConviteService()) {
    this.service = service;
    this.conviteService = conviteService;
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

  async convidar(req, res) {
    const payload = validateConvite(req.body);
    const data = await this.conviteService.convidar(payload);
    return sendSuccess(res, data, 201, 'Convite enviado com sucesso.');
  }

  async reenviarConvite(req, res) {
    const data = await this.conviteService.reenviar(req.params.id);
    return sendSuccess(res, data, 200, 'Convite reenviado com sucesso.');
  }

  // Publica: quem chega aqui ainda nao tem sessao. O token do e-mail e a unica
  // credencial, e ele e de uso unico.
  async ativarConta(req, res) {
    const payload = validateAtivacao(req.body);
    const data = await this.conviteService.ativar(payload);
    return sendSuccess(res, data, 200, 'Conta ativada com sucesso. Voce ja pode entrar.');
  }

  async alterarStatus(req, res) {
    const payload = validateStatus(req.body);
    const data = await this.service.alterarStatus(req.params.id, payload, req.user_id);
    return sendSuccess(res, data, 200, payload.status_ativo ? 'Conta reativada.' : 'Conta desativada.');
  }

  async atualizar(req, res) {
    const payload = validatePatchUsuario(req.body);
    const data = await this.service.atualizar(req.params.id, payload);
    return sendSuccess(res, data, 200, 'Usuario atualizado com sucesso.');
  }

  // Autoexclusao: o alvo vem da sessao (`req.user_id`), nunca da URL, para que
  // nao exista caminho em que um id de path decida de quem e a conta apagada.
  async excluirPropriaConta(req, res) {
    const data = await this.service.excluirPropriaConta(req.user_id, {
      emailConfirmacao: req.body?.emailConfirmacao,
    });
    return sendSuccess(res, data, 200, 'Conta excluida com sucesso.');
  }

  async deletar(req, res) {
    const data = await this.service.deletar(req.params.id);
    return sendSuccess(res, data, 200, 'Usuario excluido com sucesso.');
  }
}

export default UsuarioController;
