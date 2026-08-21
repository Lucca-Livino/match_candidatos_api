import { STATUS_CANDIDATURA } from '../../models/Candidatura.js';
import AppError from '../helpers/AppError.js';

const ensureObject = (value, code = 'VALIDATION_ERROR') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Payload invalido.', 400, code);
  }
};


export const validateCreateCandidatura = (payload) => {
  ensureObject(payload);

  const vagaId = String(payload.vagaId || '').trim();
  const compativel = Object.hasOwn(payload, 'compativel') ? Number(payload.compativel) : 1;
  const motivoIncompat_ = String(payload.motivoIncompat_ || '').trim();
  const movidoPor = String(payload.movidoPor || 'sistema').trim();

  if (!vagaId) {
    throw new AppError('vagaId e obrigatorio.', 400, 'VALIDATION_ERROR');
  }

  if (!Number.isFinite(compativel) || compativel < 0 || compativel > 1) {
    throw new AppError('compativel deve estar entre 0 e 1.', 400, 'VALIDATION_ERROR');
  }

  return {
    vagaId,
    compativel,
    motivoIncompat_,
    movidoPor,
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