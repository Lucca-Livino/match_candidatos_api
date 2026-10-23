import GeminiProvider from '../../../service/match/GeminiProvider.js';
import { ErroDeIAPermanente } from '../../../utils/helpers/errosIA.js';

const espioes = [];

const espionar = () => {
  const espiao = jest.spyOn(GeminiProvider.prototype, 'gerarAvaliacao');
  espioes.push(espiao);
  return espiao;
};

// Substitui a chamada ao Gemini: o e2e nunca toca a rede. A nota de cada
// criterio e fixa, o que torna o score (e a decisao da triagem) previsivel.
export const configurarIA = ({ aderencia = 1, resumo = 'Avaliacao simulada no e2e.' } = {}) =>
  espionar().mockImplementation(async (payload) => ({
    criterios: payload.vaga.criterios.map((criterio) => ({
      criterioId: String(criterio.id),
      aderencia,
      evidencia: 'Evidencia simulada.',
    })),
    resumo,
  }));

export const derrubarIA = () =>
  espionar().mockRejectedValue(new ErroDeIAPermanente('IA fora do ar no e2e', { motivo: 'simulado' }));

// Restaura so os espioes da IA. Um jest.restoreAllMocks() desfaria tambem o
// silenciamento do console do jest.setup.js e a captura de e-mail do ambiente.
export const restaurarIA = () => {
  while (espioes.length) espioes.pop().mockRestore();
};
