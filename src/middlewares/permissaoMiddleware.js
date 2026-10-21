import PermissaoService from '../service/PermissaoService.js';
import AppError from '../utils/helpers/AppError.js';

const DOMINIO_PADRAO = process.env.PERMISSION_DOMAIN || 'localhost';

const MENSAGENS = {
  ROUTE_NOT_FOUND: 'Rota não encontrada.',
  ROUTE_DISABLED: 'Rota indisponível.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  METHOD_NOT_ALLOWED: 'Método não permitido.',
  FORBIDDEN: 'Acesso negado. Você não tem permissão para realizar esta ação.',
};

export function permissaoMiddleware(service = new PermissaoService()) {
  return async (req, res, next) => {
    try {
      const resultado = await service.verificarPermissao({
        usuarioId: req.user_id,
        caminho: req.path,
        metodoHttp: req.method,
        dominio: DOMINIO_PADRAO,
      });

      if (resultado.ok) return next();

      return next(
        new AppError(
          MENSAGENS[resultado.code] || MENSAGENS.FORBIDDEN,
          resultado.status || 403,
          resultado.code || 'FORBIDDEN',
        ),
      );
    } catch (error) {
      return next(error);
    }
  };
}
