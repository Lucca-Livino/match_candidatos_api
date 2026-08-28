import { STATUS_CANDIDATURA } from '../../models/Candidatura.js';
import AppError from '../helpers/AppError.js';

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};


// `compativel` e `motivoIncompat_` NAO sao aceitos do payload: quem se
// inscreve e a pessoa avaliada, e deixar o cliente escrever o resultado da
// triagem entrega ao candidato o campo que a triagem existe para decidir.
// Os dois nascem do default do schema e so a avaliacao por IA os escreve
// (AvaliacaoCandidaturaService). `movidoPor` tambem fica fixo: e trilha de
// auditoria de quem moveu o registro, nao dado que o inscrito informa.
export const validateCreateCandidatura = (payload) => {
  ensureObject(payload);

  const vagaId = String(payload.vagaId || '').trim();

  if (!vagaId) {
    throw new AppError('vagaId e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  return {
    vagaId,
    movidoPor: 'sistema',
    status: 'inscrito',
  };
};

export const validateUpdateStatusCandidatura = (payload) => {
  ensureObject(payload);

  const status = String(payload.status || '')
    .trim()
    .toLowerCase();
  const movidoPor = String(payload.movidoPor || 'sistema').trim();

  if (!STATUS_CANDIDATURA.includes(status)) {
    throw new AppError('status invalido.', 400, 'VALIDATION_ERROR', { allowed: STATUS_CANDIDATURA });
  }

  return {
    status,
    movidoPor,
  };
};