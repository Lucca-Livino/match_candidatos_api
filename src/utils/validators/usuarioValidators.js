import { TIPOS_PERMISSAO } from '../../models/Usuario.js';
import AppError from '../helpers/AppError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};

export const normalizeRoles = (roles) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new AppError('tipos_permissao deve ser um array nao vazio.', 400, 'VALIDATION_ERROR');
  }

  const normalized = [...new Set(roles.map((role) => String(role).trim().toLowerCase()))];
  const invalid = normalized.filter((role) => !TIPOS_PERMISSAO.includes(role));

  if (invalid.length > 0) {
    throw new AppError(
      `Papeis invalidos: ${invalid.join(', ')}.`,
      400,
      'VALIDATION_ERROR',
      { allowed: TIPOS_PERMISSAO },
    );
  }

  return normalized;
};

export const validateCreateUsuario = (payload) => {
  ensureObject(payload);

  const nome = String(payload.nome || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const status_ativo = payload.status_ativo;

  if (nome.length < 2) {
    throw new AppError('nome e obrigatorio e deve ter ao menos 2 caracteres.', 400, 'VALIDATION_ERROR');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError('email invalido.', 400, 'VALIDATION_ERROR');
  }

  if (typeof status_ativo !== 'undefined' && typeof status_ativo !== 'boolean') {
    throw new AppError('status_ativo deve ser booleano.', 400, 'VALIDATION_ERROR');
  }

  return {
    nome,
    email,
    tipos_permissao: normalizeRoles(payload.tipos_permissao),
    status_ativo: typeof status_ativo === 'boolean' ? status_ativo : true,
  };
};

export const validatePatchUsuario = (payload) => {
  ensureObject(payload);

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  const normalized = {};

  if (Object.hasOwn(payload, 'nome')) {
    const nome = String(payload.nome || '').trim();
    if (nome.length < 2) {
      throw new AppError('nome deve ter ao menos 2 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.nome = nome;
  }

  if (Object.hasOwn(payload, 'email')) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('email invalido.', 400, 'VALIDATION_ERROR');
    }
    normalized.email = email;
  }

  if (Object.hasOwn(payload, 'tipos_permissao')) {
    normalized.tipos_permissao = normalizeRoles(payload.tipos_permissao);
  }

  if (Object.hasOwn(payload, 'status_ativo')) {
    if (typeof payload.status_ativo !== 'boolean') {
      throw new AppError('status_ativo deve ser booleano.', 400, 'VALIDATION_ERROR');
    }
    normalized.status_ativo = payload.status_ativo;
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Nenhum campo valido foi informado para atualizacao.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateListQuery = (query = {}) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit,
    email: query.email ? String(query.email).trim() : undefined,
    nome: query.nome ? String(query.nome).trim() : undefined,
    status_ativo:
      typeof query.status_ativo === 'string'
        ? query.status_ativo.toLowerCase() === 'true'
          ? true
          : query.status_ativo.toLowerCase() === 'false'
            ? false
            : undefined
        : undefined,
  };
};
