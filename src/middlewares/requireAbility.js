import { defineAbilityFor } from '../casl/casl-ability.factory.js';
import AppError from '../utils/helpers/AppError.js';

/**
 * Middleware de autorização baseado em CASL.
 *
 * Retorna um middleware Express que verifica se o usuário autenticado
 * possui a habilidade (action + subject) necessária para acessar a rota.
 *
 * Deve ser usado APÓS o authMiddleware, pois depende de `req.user`.
 *
 * @param {string} action  - Ação CASL: 'create' | 'read' | 'update' | 'delete' | 'manage'
 * @param {string} subject - Sujeito CASL: 'Candidato' | 'Vaga' | 'Questionario' | 'Pergunta' | 'RespostaQuestionario' | 'Usuario'
 * @returns {Function} 
 *
 * @example
 * router.post('/vagas', requireAbility('create', 'Vaga'), (req, res, next) => { ... });
 */
export function requireAbility(action, subject) {
  return (req, res, next) => {
    const ability = defineAbilityFor(req.user);

    if (!ability.can(action, subject)) {
      return next(
        new AppError(
          'Acesso negado. Voce nao tem permissao para realizar esta acao.',
          403,
          'FORBIDDEN',
        ),
      );
    }

    return next();
  };
}
