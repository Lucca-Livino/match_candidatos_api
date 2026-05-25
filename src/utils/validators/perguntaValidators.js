import { TIPOS_RESPOSTA_PERGUNTA } from '../../models/Pergunta.js';
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

const normalizePeso = (value) => {
  const peso = Number(value);
  if (!Number.isFinite(peso) || peso < 0) {
    throw new AppError('peso deve ser um numero maior ou igual a 0.', 400, 'VALIDATION_ERROR');
  }
  return peso;
};

const normalizeOrdem = (value, fieldName = 'ordem') => {
  const ordem = Number.parseInt(value, 10);
  if (Number.isNaN(ordem) || ordem < 1) {
    throw new AppError(`${fieldName} deve ser um inteiro maior ou igual a 1.`, 400, 'VALIDATION_ERROR');
  }
  return ordem;
};

const normalizeTipoResposta = (value) => {
  const tipoResposta = String(value || '').trim().toLowerCase();

  if (!TIPOS_RESPOSTA_PERGUNTA.includes(tipoResposta)) {
    throw new AppError('tipoResposta invalido.', 400, 'VALIDATION_ERROR', {
      allowed: TIPOS_RESPOSTA_PERGUNTA,
    });
  }

  return tipoResposta;
};

export const validateCreatePergunta = (payload) => {
  ensureObject(payload);

  const questionarioId = String(payload.questionarioId || '').trim();
  const enunciado = String(payload.enunciado || '').trim();

  if (!questionarioId) {
    throw new AppError('questionarioId e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  if (enunciado.length < 3) {
    throw new AppError('enunciado e obrigatorio e deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
  }

  return {
    questionarioId,
    enunciado,
    tipoResposta: normalizeTipoResposta(payload.tipoResposta),
    peso: normalizePeso(payload.peso),
    obrigatoria: Object.hasOwn(payload, 'obrigatoria')
      ? normalizeBinaryNumber(payload.obrigatoria, 'obrigatoria')
      : 1,
    ordem: normalizeOrdem(payload.ordem),
  };
};

export const validateUpdatePergunta = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'enunciado')) {
    const enunciado = String(payload.enunciado || '').trim();
    if (enunciado.length < 3) {
      throw new AppError('enunciado deve ter ao menos 3 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.enunciado = enunciado;
  }

  if (Object.hasOwn(payload, 'tipoResposta')) {
    normalized.tipoResposta = normalizeTipoResposta(payload.tipoResposta);
  }

  if (Object.hasOwn(payload, 'peso')) {
    normalized.peso = normalizePeso(payload.peso);
  }

  if (Object.hasOwn(payload, 'obrigatoria')) {
    normalized.obrigatoria = normalizeBinaryNumber(payload.obrigatoria, 'obrigatoria');
  }

  if (Object.hasOwn(payload, 'ordem')) {
    normalized.ordem = normalizeOrdem(payload.ordem);
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo valido para atualizacao.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateOpcaoResposta = (payload) => {
  ensureObject(payload);

  const texto = String(payload.texto || '').trim();
  if (!texto) {
    throw new AppError('texto e obrigatorio para a opcao de resposta.', 400, 'VALIDATION_ERROR');
  }

  return {
    texto,
    correta: Object.hasOwn(payload, 'correta') ? normalizeBinaryNumber(payload.correta, 'correta') : 0,
    ordem: normalizeOrdem(payload.ordem),
  };
};

export const validateUpdateOpcaoResposta = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'texto')) {
    const texto = String(payload.texto || '').trim();
    if (!texto) {
      throw new AppError('texto nao pode ser vazio.', 400, 'VALIDATION_ERROR');
    }
    normalized.texto = texto;
  }

  if (Object.hasOwn(payload, 'correta')) {
    normalized.correta = normalizeBinaryNumber(payload.correta, 'correta');
  }

  if (Object.hasOwn(payload, 'ordem')) {
    normalized.ordem = normalizeOrdem(payload.ordem);
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo valido para atualizacao.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateListPerguntaQuery = (query = {}) => {
  const questionarioId = String(query.questionarioId || '').trim();
  if (!questionarioId) {
    throw new AppError('questionarioId e obrigatorio na query.', 400, 'VALIDATION_ERROR');
  }

  return { questionarioId };
};

export const validateReorderPerguntas = (payload) => {
  const payloadEmArray = Array.isArray(payload);

  if (!payloadEmArray) {
    ensureObject(payload);
  }

  const perguntasInput = payloadEmArray ? payload : payload.perguntas;

  if (!Array.isArray(perguntasInput) || perguntasInput.length === 0) {
    throw new AppError('perguntas deve ser um array nao vazio.', 400, 'VALIDATION_ERROR');
  }

  const perguntas = perguntasInput.map((item, index) => {
    ensureObject(item);

    const id = String(item.id || '').trim();
    if (!id) {
      throw new AppError(`perguntas[${index}].id e obrigatorio.`, 400, 'VALIDATION_ERROR');
    }

    return {
      id,
      ordem: normalizeOrdem(item.ordem, `perguntas[${index}].ordem`),
    };
  });

  const ids = perguntas.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new AppError('Nao e permitido repetir id na reordenacao.', 400, 'VALIDATION_ERROR');
  }

  const ordens = perguntas.map((item) => item.ordem);
  if (new Set(ordens).size !== ordens.length) {
    throw new AppError('Nao e permitido repetir ordem na reordenacao.', 400, 'VALIDATION_ERROR');
  }

  const questionarioId = payloadEmArray ? '' : String(payload.questionarioId || '').trim();

  return {
    questionarioId,
    perguntas,
  };
};
