import AppError from '../helpers/AppError.js';

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};

const normalizeBinaryNumber = (value, fieldName) => {
  const parsed = Number(value);
  if (![0, 1].includes(parsed)) {
    throw new AppError(`${fieldName} deve ser 0 ou 1.`, 400, 'VALIDATION_ERROR');
  }
  return parsed;
};

export const validateCreateQuestionario = (payload) => {
  ensureObject(payload);

  const vagaId = String(payload.vagaId || '').trim();
  const criadoPor = String(payload.criadoPor || '').trim();
  const titulo = String(payload.titulo || '').trim();
  const instrucoes = Object.hasOwn(payload, 'instrucoes') ? String(payload.instrucoes || '').trim() : '';
  const ativo = Object.hasOwn(payload, 'ativo') ? normalizeBinaryNumber(payload.ativo, 'ativo') : 1;

  if (!vagaId) {
    throw new AppError('vagaId e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  if (!criadoPor) {
    throw new AppError('criadoPor e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  if (titulo.length < 3) {
    throw new AppError('titulo e obrigatorio e deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
  }

  return {
    vagaId,
    criadoPor,
    titulo,
    instrucoes,
    ativo,
  };
};

export const validateUpdateQuestionario = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'vagaId')) {
    const vagaId = String(payload.vagaId || '').trim();
    if (!vagaId) {
      throw new AppError('vagaId nao pode ser vazio.', 400, 'VALIDATION_ERROR');
    }
    normalized.vagaId = vagaId;
  }

  if (Object.hasOwn(payload, 'criadoPor')) {
    const criadoPor = String(payload.criadoPor || '').trim();
    if (!criadoPor) {
      throw new AppError('criadoPor nao pode ser vazio.', 400, 'VALIDATION_ERROR');
    }
    normalized.criadoPor = criadoPor;
  }

  if (Object.hasOwn(payload, 'titulo')) {
    const titulo = String(payload.titulo || '').trim();
    if (titulo.length < 3) {
      throw new AppError('titulo deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.titulo = titulo;
  }

  if (Object.hasOwn(payload, 'instrucoes')) {
    normalized.instrucoes = String(payload.instrucoes || '').trim();
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo valido para atualizacao.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validatePatchQuestionarioAtivo = (payload) => {
  ensureObject(payload);

  if (!Object.hasOwn(payload, 'ativo')) {
    throw new AppError('ativo e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  return {
    ativo: normalizeBinaryNumber(payload.ativo, 'ativo'),
  };
};

export const validateListQuestionarioQuery = (query = {}) => {
  const ativoRaw = Object.hasOwn(query, 'ativo') ? Number(query.ativo) : undefined;

  return {
    vagaId: query.vagaId ? String(query.vagaId).trim() : undefined,
    ativo: [0, 1].includes(ativoRaw) ? ativoRaw : undefined,
  };
};
