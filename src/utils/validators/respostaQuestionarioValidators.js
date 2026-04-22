import AppError from '../helpers/AppError.js';

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};

const normalizeOpcaoIds = (payload) => {
  if (Object.hasOwn(payload, 'opcaoRespostaIds')) {
    if (!Array.isArray(payload.opcaoRespostaIds)) {
      throw new AppError('opcaoRespostaIds deve ser um array.', 400, 'VALIDATION_ERROR');
    }

    const normalized = payload.opcaoRespostaIds.map((id) => String(id || '').trim()).filter(Boolean);
    if (new Set(normalized).size !== normalized.length) {
      throw new AppError('opcaoRespostaIds nao pode conter ids duplicados.', 400, 'VALIDATION_ERROR');
    }

    return normalized;
  }

  if (Object.hasOwn(payload, 'opcaoRespostaId')) {
    const singleId = String(payload.opcaoRespostaId || '').trim();
    return singleId ? [singleId] : [];
  }

  return [];
};

export const validateIniciarRespostaQuestionario = (payload) => {
  ensureObject(payload);

  const questionarioId = String(payload.questionarioId || '').trim();
  const candidatoId = String(payload.candidatoId || '').trim();

  if (!questionarioId) {
    throw new AppError('questionarioId e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  if (!candidatoId) {
    throw new AppError('candidatoId e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  return {
    questionarioId,
    candidatoId,
  };
};

export const validateResponderQuestionario = (payload) => {
  ensureObject(payload);

  if (!Array.isArray(payload.respostas) || payload.respostas.length === 0) {
    throw new AppError('respostas deve ser um array nao vazio.', 400, 'VALIDATION_ERROR');
  }

  const respostas = payload.respostas.map((item, index) => {
    ensureObject(item);

    const perguntaId = String(item.perguntaId || '').trim();
    if (!perguntaId) {
      throw new AppError(`respostas[${index}].perguntaId e obrigatorio.`, 400, 'VALIDATION_ERROR');
    }

    return {
      perguntaId,
      textoResposta: Object.hasOwn(item, 'textoResposta') ? String(item.textoResposta || '').trim() : '',
      opcaoRespostaIds: normalizeOpcaoIds(item),
    };
  });

  const perguntaIds = respostas.map((item) => item.perguntaId);
  if (new Set(perguntaIds).size !== perguntaIds.length) {
    throw new AppError('Nao e permitido enviar a mesma pergunta mais de uma vez.', 400, 'VALIDATION_ERROR');
  }

  return { respostas };
};
