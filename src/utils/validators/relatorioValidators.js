import AppError from '../helpers/AppError.js';
import { PERIODOS } from '../helpers/serieTemporal.js';

export const validatePeriodo = (valor) => {
  const periodo = valor === undefined || valor === null || String(valor).trim() === ''
    ? 'tudo'
    : String(valor).trim().toLowerCase();

  if (!PERIODOS.includes(periodo)) {
    throw new AppError('período inválido.', 400, 'VALIDATION_ERROR', { allowed: PERIODOS });
  }

  return periodo;
};
