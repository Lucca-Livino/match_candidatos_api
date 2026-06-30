import AppError from '../helpers/AppError.js';

export function validateCreateGrupo(body = {}) {
  if (!body.nome || typeof body.nome !== 'string') {
    throw new AppError('Campo nome e obrigatorio.', 400, 'VALIDATION_ERROR');
  }
  if (!body.descricao || typeof body.descricao !== 'string') {
    throw new AppError('Campo descricao e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  return {
    nome: body.nome,
    descricao: body.descricao,
    ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
  };
}

export function validatePatchGrupo(body = {}) {
  const out = {};
  if (typeof body.nome === 'string') out.nome = body.nome;
  if (typeof body.descricao === 'string') out.descricao = body.descricao;
  if (typeof body.ativo === 'boolean') out.ativo = body.ativo;
  if (Array.isArray(body.permissions)) out.permissions = body.permissions;
  if (Object.keys(out).length === 0) {
    throw new AppError('Nenhum campo valido para atualizar.', 400, 'VALIDATION_ERROR');
  }
  return out;
}
