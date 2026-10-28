import { ApiError } from '@google/genai';
import GeminiProvider from '../../../service/match/GeminiProvider.js';
import { ErroDeIAPermanente } from '../../../utils/helpers/errosIA.js';

const espioes = [];

const espionar = () => {
  const espiao = jest.spyOn(GeminiProvider.prototype, 'gerarAvaliacao');
  espioes.push(espiao);
  return espiao;
};

export const configurarIA = ({ aderencia = 1, notas, resumo = 'Avaliacao simulada no e2e.' } = {}) =>
  espionar().mockImplementation(async (payload) => ({
    criterios: payload.vaga.criterios
      .filter((criterio) => !notas || Object.hasOwn(notas, criterio.nome))
      .map((criterio) => {
        const nota = notas ? notas[criterio.nome] : aderencia;
        return {
          criterioId: String(criterio.id),
          aderencia: nota,
          evidencia: `Evidencia simulada de ${criterio.nome}.`,
          atendido: nota >= 0.5,
        };
      }),
    resumo,
  }));

const gerarAvaliacaoReal = GeminiProvider.prototype.gerarAvaliacao;

export const simularGemini = (responder) => {
  const chamadas = [];
  const espiao = espionar().mockImplementation(function gerarComClienteFalso(payload, opcoes) {
    this.client = {
      models: {
        generateContent: async ({ model }) => {
          chamadas.push(model);
          const tentativa = chamadas.filter((m) => m === model).length;
          return { text: await responder(model, tentativa, payload) };
        },
      },
    };
    return gerarAvaliacaoReal.call(this, payload, opcoes);
  });
  return { espiao, chamadas };
};

export const respostaDoModelo = (payload, aderencia = 1) =>
  JSON.stringify({
    criterios: payload.vaga.criterios.map((c) => ({
      criterioId: String(c.id),
      aderencia,
      evidencia: 'Evidencia simulada.',
      atendido: aderencia >= 0.5,
    })),
    resumo: 'Avaliacao simulada no e2e.',
  });

export const erro429 = (modelo, escopo = 'minuto', { retryDelay } = {}) => {
  const quotaId = escopo === 'dia'
    ? 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'
    : 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier';
  const details = [
    {
      '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
      violations: [{ quotaId, quotaDimensions: { location: 'global', model: modelo } }],
    },
    ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
  ];
  return new ApiError({
    status: 429,
    message: JSON.stringify({
      error: { code: 429, message: `Quota exceeded, model: ${modelo}`, status: 'RESOURCE_EXHAUSTED', details },
    }),
  });
};

export const erroHttp = (status, mensagem = 'erro simulado') =>
  new ApiError({ status, message: JSON.stringify({ error: { code: status, message: mensagem } }) });

export const derrubarIA = () =>
  espionar().mockRejectedValue(new ErroDeIAPermanente('IA fora do ar no e2e', { motivo: 'simulado' }));

export const restaurarIA = () => {
  while (espioes.length) espioes.pop().mockRestore();
};
