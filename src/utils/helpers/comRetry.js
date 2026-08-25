import { classificarErroIA } from './classificarErroIA.js';

const dormirDeVerdade = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ErroDeCotaDiaria extends Error {
  constructor(causa, modelo = null) {
    super(`cota diaria esgotada${modelo ? ` no modelo ${modelo}` : ''}`);
    this.name = 'ErroDeCotaDiaria';
    this.causa = causa;
    this.modelo = modelo;
  }
}

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
