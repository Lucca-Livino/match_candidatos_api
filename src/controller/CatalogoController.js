import CatalogoService from '../service/CatalogoService.js';
import {
  validateBuscaCatalogo,
  validateCreateItemCatalogo,
  validateUpdateItemCatalogo,
} from '../utils/validators/catalogoValidators.js';
import { sendSuccess } from '../utils/helpers/http.js';
import AppError from '../utils/helpers/AppError.js';

class CatalogoController {
  constructor(service = new CatalogoService()) {
    this.service = service;
  }

  async buscar(req, res, next) {
    try {
      const busca = validateBuscaCatalogo(req.query);
      // `todos` traz os inativos: so a tela de administracao do catalogo usa.
      // O GET e aberto a todos os papeis, entao a checagem fica aqui.
      if (busca.todos) {
        if (!req.user?.tipos_permissao?.includes('administrador')) {
          throw new AppError('Apenas o administrador lista itens inativos.', 403, 'FORBIDDEN');
        }
        const data = await this.service.listarPorTipo(busca.tipo);
        return sendSuccess(res, data, 200, 'Itens do catálogo listados com sucesso.');
      }
      const data = await this.service.buscar(busca);
      return sendSuccess(res, data, 200, 'Itens do catálogo listados com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async criar(req, res, next) {
    try {
      const data = await this.service.criar(validateCreateItemCatalogo(req.body));
      return sendSuccess(res, data, 201, 'Item do catálogo criado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const data = await this.service.atualizar(req.params.id, validateUpdateItemCatalogo(req.body));
      return sendSuccess(res, data, 200, 'Item do catálogo atualizado com sucesso.');
    } catch (error) {
      return next(error);
    }
  }
}

export default CatalogoController;
