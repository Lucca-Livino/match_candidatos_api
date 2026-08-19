import { PROVEDORES, MODELO_PADRAO_POR_PROVEDOR } from '../../models/ConfiguracaoIntegracao.js';
import AppError from '../helpers/AppError.js';

export const validateUpdateConfiguracao = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Payload invalido.', 400, 'VALIDATION_ERROR');
  }

  const resultado = {};

  if (Object.hasOwn(payload, 'limiteCompatibilidade')) {
    const limite = Number(payload.limiteCompatibilidade);
    if (!Number.isFinite(limite) || limite < 0 || limite > 1) {
      throw new AppError(
        'limiteCompatibilidade deve estar entre 0 e 1.',
        400,
        'VALIDATION_ERROR',
      );
    }
    resultado.limiteCompatibilidade = limite;
  }

  if (Object.hasOwn(payload, 'provedor')) {
    const provedor = String(payload.provedor || '').trim();
    if (!PROVEDORES.includes(provedor)) {
      throw new AppError('provedor invalido.', 400, 'VALIDATION_ERROR', { allowed: PROVEDORES });
    }
    resultado.provedor = provedor;
  }

  if (Object.hasOwn(payload, 'temperatura')) {
    const temperatura = Number(payload.temperatura);
    if (!Number.isFinite(temperatura) || temperatura < 0 || temperatura > 1) {
      throw new AppError('temperatura deve estar entre 0 e 1.', 400, 'VALIDATION_ERROR');
    }
    resultado.temperatura = temperatura;
  }

  if (Object.hasOwn(payload, 'modelo')) {
    const modelo = String(payload.modelo || '').trim();
    if (!modelo) {
      throw new AppError('modelo e obrigatorio.', 400, 'VALIDATION_ERROR');
    }
    resultado.modelo = modelo;
  } else if (resultado.provedor) {
    // Trocar de provedor sem informar modelo cairia num ID invalido para o
    // novo provedor. Aplica o padrao daquele provedor.
    resultado.modelo = MODELO_PADRAO_POR_PROVEDOR[resultado.provedor];
  }

  if (Object.hasOwn(payload, 'ativo')) {
    resultado.ativo = Boolean(payload.ativo);
  }

  if (Object.keys(resultado).length === 0) {
    throw new AppError('Nenhum campo valido informado.', 400, 'VALIDATION_ERROR');
  }

  return resultado;
};
