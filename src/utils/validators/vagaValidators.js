import { AREAS_VAGA, STATUS_VAGA, TIPOS_CRITERIO_VAGA } from '../../models/Vaga.js';
import AppError from '../helpers/AppError.js';

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};

const normalizeArea = (area) => {
  const normalizedArea = String(area || '')
    .trim()
    .toUpperCase();

  if (!AREAS_VAGA.includes(normalizedArea)) {
    throw new AppError('area invalida.', 400, 'VALIDATION_ERROR', {
      allowed: AREAS_VAGA,
    });
  }

  return normalizedArea;
};

const normalizeCriterios = (criterios) => {
  if (typeof criterios === 'undefined') {
    return [];
  }

  if (!Array.isArray(criterios)) {
    throw new AppError('criterio_vaga deve ser um array.', 400, 'VALIDATION_ERROR');
  }

  const normalized = criterios.map((item, index) => {
    ensureObject(item, 'VALIDATION_ERROR');

    const nome = String(item.nome || '').trim();
    if (nome.length < 2) {
      throw new AppError(`criterio_vaga[${index}].nome deve ter ao menos 2 caracteres.`, 400, 'VALIDATION_ERROR');
    }

    const tipo_criterio = String(item.tipo_criterio || '')
      .trim()
      .toLowerCase();

    if (!TIPOS_CRITERIO_VAGA.includes(tipo_criterio)) {
      throw new AppError(`criterio_vaga[${index}].tipo_criterio invalido.`, 400, 'VALIDATION_ERROR', {
        allowed: TIPOS_CRITERIO_VAGA,
      });
    }

    const peso_percentual = Number(item.peso_percentual);
    if (!Number.isFinite(peso_percentual) || peso_percentual <= 0 || peso_percentual > 100) {
      throw new AppError(
        `criterio_vaga[${index}].peso_percentual deve ser numero entre 1 e 100.`,
        400,
        'VALIDATION_ERROR',
      );
    }

    if (Object.hasOwn(item, 'obrigatorio') && typeof item.obrigatorio !== 'boolean') {
      throw new AppError(`criterio_vaga[${index}].obrigatorio deve ser booleano.`, 400, 'VALIDATION_ERROR');
    }

    const criterio = {
      nome,
      tipo_criterio,
      peso_percentual,
      obrigatorio: typeof item.obrigatorio === 'boolean' ? item.obrigatorio : false,
    };

    if (Object.hasOwn(item, 'descricao')) {
      criterio.descricao = String(item.descricao || '').trim();
    }

    return criterio;
  });

  const somaPesos = normalized.reduce((acc, item) => acc + item.peso_percentual, 0);
  if (somaPesos > 100) {
    throw new AppError('A soma de peso_percentual em criterio_vaga nao pode ultrapassar 100.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateVaga = (payload) => {
  ensureObject(payload);

  const titulo = String(payload.titulo || '').trim();
  const descricao = String(payload.descricao || '').trim();

  if (titulo.length < 3) {
    throw new AppError('titulo e obrigatorio e deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
  }

  if (descricao.length < 10) {
    throw new AppError('descricao e obrigatoria e deve ter ao menos 10 caracteres.', 400, 'VALIDATION_ERROR');
  }

  if (Object.hasOwn(payload, 'status') && String(payload.status).trim().toLowerCase() !== 'ativa') {
    throw new AppError('Toda nova vaga deve iniciar com status ativa.', 400, 'VALIDATION_ERROR');
  }

  const requisitos_gerais = Object.hasOwn(payload, 'requisitos_gerais')
    ? String(payload.requisitos_gerais || '').trim()
    : '';

  return {
    area: normalizeArea(payload.area),
    titulo,
    descricao,
    requisitos_gerais,
    status: 'ativa',
    criterio_vaga: normalizeCriterios(payload.criterio_vaga),
  };
};

export const validatePatchVaga = (payload) => {
  ensureObject(payload);

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  const normalized = {};

  if (Object.hasOwn(payload, 'area')) {
    normalized.area = normalizeArea(payload.area);
  }

  if (Object.hasOwn(payload, 'titulo')) {
    const titulo = String(payload.titulo || '').trim();
    if (titulo.length < 3) {
      throw new AppError('titulo deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.titulo = titulo;
  }

  if (Object.hasOwn(payload, 'descricao')) {
    const descricao = String(payload.descricao || '').trim();
    if (descricao.length < 10) {
      throw new AppError('descricao deve ter ao menos 10 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.descricao = descricao;
  }

  if (Object.hasOwn(payload, 'requisitos_gerais')) {
    normalized.requisitos_gerais = String(payload.requisitos_gerais || '').trim();
  }

  if (Object.hasOwn(payload, 'status')) {
    const status = String(payload.status || '')
      .trim()
      .toLowerCase();

    if (!STATUS_VAGA.includes(status)) {
      throw new AppError('status invalido.', 400, 'VALIDATION_ERROR', { allowed: STATUS_VAGA });
    }

    normalized.status = status;
  }

  if (Object.hasOwn(payload, 'criterio_vaga')) {
    normalized.criterio_vaga = normalizeCriterios(payload.criterio_vaga);
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Nenhum campo valido foi informado para atualizacao.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateListVagaQuery = (query = {}) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  const areaQuery = query.area ? String(query.area).trim().toUpperCase() : undefined;
  const statusQuery = query.status ? String(query.status).trim().toLowerCase() : undefined;
  const tipoCriterioQuery = query.tipo_criterio ? String(query.tipo_criterio).trim().toLowerCase() : undefined;

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit,
    titulo: query.titulo ? String(query.titulo).trim() : undefined,
    area: areaQuery && AREAS_VAGA.includes(areaQuery) ? areaQuery : undefined,
    status: statusQuery && STATUS_VAGA.includes(statusQuery) ? statusQuery : undefined,
    tipo_criterio:
      tipoCriterioQuery && TIPOS_CRITERIO_VAGA.includes(tipoCriterioQuery) ? tipoCriterioQuery : undefined,
  };
};