import { GRAUS_ACADEMICOS } from '../../models/Formacao.js';
import { NIVEIS_HABILIDADE } from '../../models/Habilidade.js';
import AppError from '../helpers/AppError.js';


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};

const parseDateOrNull = (value, fieldName) => {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} invalida.`, 400, 'VALIDATION_ERROR');
  }

  return date;
};

const normalizeCandidato = (payload, isPatch = false) => {
  ensureObject(payload);

  const normalized = {};

  if (!isPatch || Object.hasOwn(payload, 'nome')) {
    const nome = String(payload.nome || '').trim();
    if (nome.length < 2) {
      throw new AppError('nome deve ter ao menos 2 caracteres.', 400, 'VALIDATION_ERROR');
    }
    normalized.nome = nome;
  }

  if (!isPatch || Object.hasOwn(payload, 'email')) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('email invalido.', 400, 'VALIDATION_ERROR');
    }
    normalized.email = email;
  }

  if (!isPatch || Object.hasOwn(payload, 'telefone')) {
    normalized.telefone = String(payload.telefone || '').trim();
  }

  if (!isPatch || Object.hasOwn(payload, 'linkedin')) {
    normalized.linkedin = String(payload.linkedin || '').trim();
  }

  if (!isPatch || Object.hasOwn(payload, 'cidade')) {
    normalized.cidade = String(payload.cidade || '').trim();
  }

  if (!isPatch || Object.hasOwn(payload, 'estado')) {
    normalized.estado = String(payload.estado || '')
      .trim()
      .toUpperCase();

    if (normalized.estado && normalized.estado.length !== 2) {
      throw new AppError('estado deve conter 2 caracteres.', 400, 'VALIDATION_ERROR');
    }
  }

  if (isPatch && Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateCandidato = (payload) => normalizeCandidato(payload, false);

export const validateUpdateCandidato = (payload) => normalizeCandidato(payload, true);

export const validateListCandidatoQuery = (query = {}) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    limit: Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit,
    cidade: query.cidade ? String(query.cidade).trim() : undefined,
    estado: query.estado ? String(query.estado).trim().toUpperCase() : undefined,
    nome: query.nome ? String(query.nome).trim() : undefined,
  };
};

export const validateCreateFormacao = (payload) => {
  ensureObject(payload);

  const instituicao = String(payload.instituicao || '').trim();
  const curso = String(payload.curso || '').trim();
  const grau = String(payload.grau || '')
    .trim()
    .toLowerCase();
  const situacao = String(payload.situacao || '').trim();
  const anoInicio = Number(payload.anoInicio);
  const anoConclusao = Object.hasOwn(payload, 'anoConclusao') ? Number(payload.anoConclusao) : null;

  if (!instituicao || !curso || !situacao) {
    throw new AppError('instituicao, curso e situacao sao obrigatorios.', 400, 'VALIDATION_ERROR');
  }

  if (!GRAUS_ACADEMICOS.includes(grau)) {
    throw new AppError('grau invalido.', 400, 'VALIDATION_ERROR', { allowed: GRAUS_ACADEMICOS });
  }

  if (!Number.isInteger(anoInicio) || anoInicio < 1900) {
    throw new AppError('anoInicio invalido.', 400, 'VALIDATION_ERROR');
  }

  if (anoConclusao !== null && (!Number.isInteger(anoConclusao) || anoConclusao < anoInicio)) {
    throw new AppError('anoConclusao invalido.', 400, 'VALIDATION_ERROR');
  }

  return {
    instituicao,
    curso,
    grau,
    situacao,
    anoInicio,
    anoConclusao,
  };
};

export const validateUpdateFormacao = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'instituicao')) {
    normalized.instituicao = String(payload.instituicao || '').trim();
    if (!normalized.instituicao) {
      throw new AppError('instituicao invalida.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'curso')) {
    normalized.curso = String(payload.curso || '').trim();
    if (!normalized.curso) {
      throw new AppError('curso invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'grau')) {
    normalized.grau = String(payload.grau || '')
      .trim()
      .toLowerCase();
    if (!GRAUS_ACADEMICOS.includes(normalized.grau)) {
      throw new AppError('grau invalido.', 400, 'VALIDATION_ERROR', { allowed: GRAUS_ACADEMICOS });
    }
  }

  if (Object.hasOwn(payload, 'situacao')) {
    normalized.situacao = String(payload.situacao || '').trim();
    if (!normalized.situacao) {
      throw new AppError('situacao invalida.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'anoInicio')) {
    normalized.anoInicio = Number(payload.anoInicio);
    if (!Number.isInteger(normalized.anoInicio) || normalized.anoInicio < 1900) {
      throw new AppError('anoInicio invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'anoConclusao')) {
    if (payload.anoConclusao === null || payload.anoConclusao === '') {
      normalized.anoConclusao = null;
    } else {
      normalized.anoConclusao = Number(payload.anoConclusao);
      if (!Number.isInteger(normalized.anoConclusao) || normalized.anoConclusao < 1900) {
        throw new AppError('anoConclusao invalido.', 400, 'VALIDATION_ERROR');
      }
    }
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  if (
    Number.isInteger(normalized.anoInicio) &&
    Number.isInteger(normalized.anoConclusao) &&
    normalized.anoConclusao < normalized.anoInicio
  ) {
    throw new AppError('anoConclusao nao pode ser menor que anoInicio.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateExperiencia = (payload) => {
  ensureObject(payload);

  const empresa = String(payload.empresa || '').trim();
  const cargo = String(payload.cargo || '').trim();
  const descricaoAtivida_ = String(payload.descricaoAtivida_ || '').trim();
  const dataInicio = parseDateOrNull(payload.dataInicio, 'dataInicio');
  const dataFim = parseDateOrNull(payload.dataFim, 'dataFim');

  if (!empresa || !cargo || !descricaoAtivida_) {
    throw new AppError('empresa, cargo e descricaoAtivida_ sao obrigatorios.', 400, 'VALIDATION_ERROR');
  }

  if (!dataInicio) {
    throw new AppError('dataInicio e obrigatoria.', 400, 'VALIDATION_ERROR');
  }

  if (dataFim && dataFim < dataInicio) {
    throw new AppError('dataFim nao pode ser anterior a dataInicio.', 400, 'VALIDATION_ERROR');
  }

  return {
    empresa,
    cargo,
    descricaoAtivida_,
    dataInicio,
    dataFim,
  };
};

export const validateUpdateExperiencia = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'empresa')) {
    normalized.empresa = String(payload.empresa || '').trim();
    if (!normalized.empresa) {
      throw new AppError('empresa invalida.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'cargo')) {
    normalized.cargo = String(payload.cargo || '').trim();
    if (!normalized.cargo) {
      throw new AppError('cargo invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'descricaoAtivida_')) {
    normalized.descricaoAtivida_ = String(payload.descricaoAtivida_ || '').trim();
    if (!normalized.descricaoAtivida_) {
      throw new AppError('descricaoAtivida_ invalida.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'dataInicio')) {
    normalized.dataInicio = parseDateOrNull(payload.dataInicio, 'dataInicio');
    if (!normalized.dataInicio) {
      throw new AppError('dataInicio e obrigatoria.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'dataFim')) {
    normalized.dataFim = parseDateOrNull(payload.dataFim, 'dataFim');
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateHabilidade = (payload) => {
  ensureObject(payload);

  const habilidade = String(payload.habilidade || '').trim();
  const nivel = String(payload.nivel || '')
    .trim()
    .toLowerCase();

  if (!habilidade) {
    throw new AppError('habilidade e obrigatoria.', 400, 'VALIDATION_ERROR');
  }

  if (!NIVEIS_HABILIDADE.includes(nivel)) {
    throw new AppError('nivel invalido.', 400, 'VALIDATION_ERROR', { allowed: NIVEIS_HABILIDADE });
  }

  return {
    habilidade,
    nivel,
  };
};

export const validateUpdateHabilidade = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'habilidade')) {
    normalized.habilidade = String(payload.habilidade || '').trim();
    if (!normalized.habilidade) {
      throw new AppError('habilidade invalida.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'nivel')) {
    normalized.nivel = String(payload.nivel || '')
      .trim()
      .toLowerCase();
    if (!NIVEIS_HABILIDADE.includes(normalized.nivel)) {
      throw new AppError('nivel invalido.', 400, 'VALIDATION_ERROR', { allowed: NIVEIS_HABILIDADE });
    }
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};

export const validateCreateCertificacao = (payload) => {
  ensureObject(payload);

  const nome = String(payload.nome || '').trim();
  const emissor = String(payload.emissor || '').trim();
  const codigo = String(payload.codigo || '').trim();
  const dataEmissao = parseDateOrNull(payload.dataEmissao, 'dataEmissao');
  const dataExpiracao = parseDateOrNull(payload.dataExpiracao, 'dataExpiracao');

  if (!nome || !emissor) {
    throw new AppError('nome e emissor sao obrigatorios.', 400, 'VALIDATION_ERROR');
  }

  return {
    nome,
    emissor,
    codigo,
    dataEmissao,
    dataExpiracao,
  };
};

export const validateUpdateCertificacao = (payload) => {
  ensureObject(payload);

  const normalized = {};

  if (Object.hasOwn(payload, 'nome')) {
    normalized.nome = String(payload.nome || '').trim();
    if (!normalized.nome) {
      throw new AppError('nome invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'emissor')) {
    normalized.emissor = String(payload.emissor || '').trim();
    if (!normalized.emissor) {
      throw new AppError('emissor invalido.', 400, 'VALIDATION_ERROR');
    }
  }

  if (Object.hasOwn(payload, 'codigo')) {
    normalized.codigo = String(payload.codigo || '').trim();
  }

  if (Object.hasOwn(payload, 'dataEmissao')) {
    normalized.dataEmissao = parseDateOrNull(payload.dataEmissao, 'dataEmissao');
  }

  if (Object.hasOwn(payload, 'dataExpiracao')) {
    normalized.dataExpiracao = parseDateOrNull(payload.dataExpiracao, 'dataExpiracao');
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar.', 400, 'VALIDATION_ERROR');
  }

  return normalized;
};


