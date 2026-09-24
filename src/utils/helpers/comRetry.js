import { classificarErroIA } from './classificarErroIA.js';
import { ErroDeCotaDiaria } from './errosIA.js';

const dormirDeVerdade = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Reexportado por compatibilidade: o tipo vive em errosIA.js, junto dos outros
// erros do dominio, porque quem le a cascata precisa ver os tres lado a lado.
export { ErroDeCotaDiaria };

export const comRetry = async (
  fn,
  { tentativas = 4, esperaBaseMs = 1500, dormir = dormirDeVerdade, modelo = null } = {},
) => {
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    try {
      return await fn();
    } catch (error) {
      const { acao, atrasoSugeridoMs } = classificarErroIA(error);

      if (acao === 'escalar') throw new ErroDeCotaDiaria(error, modelo);
      if (acao !== 'repetir' || tentativa === tentativas - 1) throw error;
      const passo = esperaBaseMs * 2 ** tentativa;
      await dormir(Math.max(passo, atrasoSugeridoMs ?? 0));
    }
  }

  throw new Error('comRetry terminou sem resultado');
};
