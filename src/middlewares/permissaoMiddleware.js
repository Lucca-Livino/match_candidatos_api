import PermissaoService from '../service/PermissaoService.js';
import AppError from '../utils/helpers/AppError.js';

const DOMINIO_PADRAO = process.env.PERMISSION_DOMAIN || 'localhost';

const MENSAGENS = {
  ROUTE_NOT_FOUND: 'Rota nao encontrada.',
  ROUTE_DISABLED: 'Rota indisponivel.',
  USER_NOT_FOUND: 'Usuario nao encontrado.',
  METHOD_NOT_ALLOWED: 'Metodo nao permitido.',
  FORBIDDEN: 'Acesso negado. Voce nao tem permissao para realizar esta acao.',
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
