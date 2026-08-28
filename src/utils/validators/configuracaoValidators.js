import { PROVEDORES, LIMITE_DEGRAUS } from '../../models/ConfiguracaoIntegracao.js';
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

  if (Object.hasOwn(payload, 'cascata')) {
    // As tres regras valem tanto aqui quanto no schema. Duplicacao proposital:
    // o validator devolve 400 com mensagem util para o front, o schema protege
    // quem escreve no banco por outro caminho (script, migracao, seed).
    const bruta = payload.cascata;
    if (!Array.isArray(bruta)) {
      throw new AppError('cascata deve ser uma lista de modelos.', 400, 'VALIDATION_ERROR');
    }

    const cascata = bruta.map((m) => String(m ?? '').trim()).filter(Boolean);

    if (cascata.length === 0) {
      throw new AppError('cascata precisa de pelo menos um modelo.', 400, 'VALIDATION_ERROR');
    }
    if (cascata.length > LIMITE_DEGRAUS) {
      throw new AppError(
        `cascata aceita no maximo ${LIMITE_DEGRAUS} modelos.`,
        400,
        'VALIDATION_ERROR',
      );
    }
    if (new Set(cascata).size !== cascata.length) {
      // Degrau repetido nao acrescenta cota: se o modelo esgotou, esgotou nas
      // duas posicoes. Aceitar daria a impressao de uma reserva inexistente.
      throw new AppError('cascata nao pode repetir modelo.', 400, 'VALIDATION_ERROR');
    }

    resultado.cascata = cascata;
  }

  if (Object.hasOwn(payload, 'ativo')) {
    resultado.ativo = Boolean(payload.ativo);
  }

  if (Object.keys(resultado).length === 0) {
    throw new AppError('Nenhum campo valido informado.', 400, 'VALIDATION_ERROR');
  }

  return resultado;
};
