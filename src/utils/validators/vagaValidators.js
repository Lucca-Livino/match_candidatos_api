import { AREAS_VAGA, STATUS_VAGA, TIPOS_CRITERIO_VAGA } from '../../models/Vaga.js';
import { NIVEIS_HABILIDADE } from '../../models/Habilidade.js';
import { GRAUS_ACADEMICOS } from '../../models/Formacao.js';
import AppError from '../helpers/AppError.js';

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload inválido.', 400, code);
  }
};

const normalizeArea = (area) => {
  const normalizedArea = String(area || '')
    .trim()
    .toUpperCase();

  if (!AREAS_VAGA.includes(normalizedArea)) {
    throw new AppError('área inválida.', 400, 'VALIDATION_ERROR', {
      allowed: AREAS_VAGA,
    });
  }

  return normalizedArea;
};

// Requisito verificavel do criterio obrigatorio, conferido pelo gate contra o
// catalogo. So existe em criterio obrigatorio: nos demais, quem julga e a IA.
 const normalizeRequisito = (tipo, requisito, index) => {
  const campo = `criterio_vaga[${index}].requisito`;
  if (!requisito || typeof requisito !== 'object' || Array.isArray(requisito)) {
    throw new AppError(`${campo} é obrigatório para critério obrigatório.`, 400, 'VALIDATION_ERROR');
  }
  const texto = (v) => (v === null || typeof v === 'undefined' ? '' : String(v).trim());
  const exigirId = (nome) => {
    const valor = texto(requisito[nome]);
    if (!valor) throw new AppError(`${campo}.${nome} é obrigatório.`, 400, 'VALIDATION_ERROR');
    return valor;
  };

  if (tipo === 'skill_tecnica') {
    const normalizado = { itemId: exigirId('itemId') };
    if (texto(requisito.nivelMinimo)) {
      if (!NIVEIS_HABILIDADE.includes(requisito.nivelMinimo)) {
        throw new AppError(`${campo}.nivelMinimo inválido.`, 400, 'VALIDATION_ERROR', { allowed: NIVEIS_HABILIDADE });
      }
      normalizado.nivelMinimo = requisito.nivelMinimo;
    }
    return normalizado;
  }

  if (tipo === 'formacao') {
    if (!GRAUS_ACADEMICOS.includes(requisito.grauMinimo)) {
      throw new AppError(`${campo}.grauMinimo inválido.`, 400, 'VALIDATION_ERROR', { allowed: GRAUS_ACADEMICOS });
    }
    if (typeof requisito.aceitaCursando !== 'undefined' && typeof requisito.aceitaCursando !== 'boolean') {
      throw new AppError(`${campo}.aceitaCursando deve ser booleano.`, 400, 'VALIDATION_ERROR');
    }
    return {
      grauMinimo: requisito.grauMinimo,
      areaId: texto(requisito.areaId) || null,
      aceitaCursando: requisito.aceitaCursando === true,
    };
  }

  if (tipo === 'experiencia') {
    const bruto = requisito.mesesMinimos;
    const presente = typeof bruto !== 'undefined';
    if (presente && typeof bruto !== 'number' && !(typeof bruto === 'string' && /^\d+$/.test(bruto.trim()))) {
      throw new AppError(`${campo}.mesesMinimos inválido.`, 400, 'VALIDATION_ERROR');
    }
    const meses = presente ? Number(bruto) : 0;
    if (!Number.isInteger(meses) || meses < 0 || meses > 600) {
      throw new AppError(`${campo}.mesesMinimos inválido.`, 400, 'VALIDATION_ERROR');
    }
    return { areaId: exigirId('areaId'), mesesMinimos: meses };
  }

  return { itemId: exigirId('itemId') };
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
      throw new AppError(`criterio_vaga[${index}].tipo_criterio inválido.`, 400, 'VALIDATION_ERROR', {
        allowed: TIPOS_CRITERIO_VAGA,
      });
    }

    const peso_percentual = Number(item.peso_percentual);
    if (!Number.isFinite(peso_percentual) || peso_percentual <= 0 || peso_percentual > 100) {
      throw new AppError(
        `criterio_vaga[${index}].peso_percentual deve ser número entre 1 e 100.`,
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

    if (criterio.obrigatorio) {
      criterio.requisito = normalizeRequisito(tipo_criterio, item.requisito, index);
    }

    return criterio;
  });

  const somaPesos = normalized.reduce((acc, item) => acc + item.peso_percentual, 0);
  if (somaPesos > 100) {
    throw new AppError('A soma de peso_percentual em criterio_vaga não pode ultrapassar 100.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateVaga = (payload) => {
  ensureObject(payload);

  const titulo = String(payload.titulo || '').trim();
  const descricao = String(payload.descricao || '').trim();

  if (titulo.length < 3) {
    throw new AppError('título é obrigatório e deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
  }

  if (descricao.length < 10) {
    throw new AppError('descrição é obrigatória e deve ter ao menos 10 caracteres.', 400, 'VALIDATION_ERROR');
  }

  const requisitos_gerais = Object.hasOwn(payload, 'requisitos_gerais')
    ? String(payload.requisitos_gerais || '').trim()
    : '';

  return {
    area: normalizeArea(payload.area),
    titulo,
    descricao,
    requisitos_gerais,
    // Toda vaga nasce pausada. A ativacao e um passo separado (PATCH), onde o
    // VagaService exige um questionario ativo — sem ele as candidaturas nunca
    // seriam avaliadas. O status enviado pelo cliente na criacao e ignorado.
    status: 'pausada',
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
      throw new AppError('título deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.titulo = titulo;
  }

  if (Object.hasOwn(payload, 'descricao')) {
    const descricao = String(payload.descricao || '').trim();
    if (descricao.length < 10) {
      throw new AppError('descrição deve ter ao menos 10 caracteres.', 400, 'VALIDATION_ERROR');
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
      throw new AppError('status inválido.', 400, 'VALIDATION_ERROR', { allowed: STATUS_VAGA });
    }

    normalized.status = status;
  }

  if (Object.hasOwn(payload, 'criterio_vaga')) {
    normalized.criterio_vaga = normalizeCriterios(payload.criterio_vaga);
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Nenhum campo válido foi informado para atualização.', 400, 'VALIDATION_ERROR');
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