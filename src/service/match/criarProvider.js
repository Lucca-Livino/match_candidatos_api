import GeminiProvider from './GeminiProvider.js';
import AppError from '../../utils/helpers/AppError.js';

const FABRICAS = {
  gemini: () => new GeminiProvider(),
};

export const criarProvider = (nome) => {
  const fabrica = FABRICAS[nome];
  if (!fabrica) {
    throw new AppError(`Provedor de IA desconhecido: ${nome}.`, 500, 'AI_PROVIDER_UNKNOWN');
  }
  return fabrica();
};
