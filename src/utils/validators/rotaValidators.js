import AppError from '../helpers/AppError.js';

const CAMPOS_BOOLEANOS = ['active', 'get', 'post', 'put', 'patch', 'delete'];

export function validateCreateRota(body = {}) {
  if (!body.route || typeof body.route !== 'string') {
    throw new AppError('Campo route é obrigatório.', 400, 'VALIDATION_ERROR');
  }
  if (!body.domain || typeof body.domain !== 'string') {
    throw new AppError('Campo domain é obrigatório.', 400, 'VALIDATION_ERROR');
  }

  const saida = { route: body.route, domain: body.domain };
  for (const campo of CAMPOS_BOOLEANOS) {
    if (typeof body[campo] === 'boolean') saida[campo] = body[campo];
  }
  return saida;
}

export function validatePatchRota(body = {}) {
  const saida = {};
  if (typeof body.route === 'string') saida.route = body.route;
  if (typeof body.domain === 'string') saida.domain = body.domain;
  for (const campo of CAMPOS_BOOLEANOS) {
    if (typeof body[campo] === 'boolean') saida[campo] = body[campo];
  }
  if (Object.keys(saida).length === 0) {
    throw new AppError('Nenhum campo válido para atualizar.', 400, 'VALIDATION_ERROR');
  }
  return saida;
}
