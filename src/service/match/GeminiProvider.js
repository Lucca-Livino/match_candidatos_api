import { GoogleGenAI } from '@google/genai';
import AvaliacaoProvider from './AvaliacaoProvider.js';
import {
  RUBRICA,
  SCHEMA_AVALIACAO,
  montarMensagem,
  extrairJson,
  validarAvaliacao,
} from './promptAvaliacao.js';
import { comRetry } from '../../utils/helpers/comRetry.js';
import { classificarErroIA } from '../../utils/helpers/classificarErroIA.js';
import {
  ErroDeIA,
  ErroDeIAPermanente,
  ErroDeIARecuperavel,
  ErroDeCotaDiaria,
  ErroDeRespostaInvalida,
} from '../../utils/helpers/errosIA.js';

const traduzirErro = (error, modelo) => {
  // comRetry ja converteu a cota diaria, e validarAvaliacao ja tipou a
  // resposta fora do contrato. Retipar apagaria o motivo original.
  if (error instanceof ErroDeIA) return error;

  if (error instanceof SyntaxError) {
    return new ErroDeRespostaInvalida('json_invalido', { causa: error, modelo });
  }

  const { acao, motivo } = classificarErroIA(error);
  const opcoes = { causa: error, modelo, motivo };

  if (acao === 'desistir') return new ErroDeIAPermanente(error.message, opcoes);
  if (acao === 'escalar') return new ErroDeCotaDiaria(error, modelo);

  // Chegou aqui com acao 'repetir' significa que o comRetry ja esperou o que
  // tinha para esperar e o degrau nao respondeu.
  return new ErroDeIARecuperavel(error.message, opcoes);
};

class GeminiProvider extends AvaliacaoProvider {
  constructor(client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })) {
    super();
    this.client = client;
  }

  get nome() {
    return 'gemini';
  }

  async gerarAvaliacao(payload, { modelo, temperatura }) {
    try {
      const response = await comRetry(
        () =>
          this.client.models.generateContent({
            model: modelo,
            contents: montarMensagem(payload),
            config: {
              systemInstruction: RUBRICA,
              temperature: temperatura,
              responseMimeType: 'application/json',
              responseSchema: SCHEMA_AVALIACAO,
            },
          }),
        { modelo },
      );

      return validarAvaliacao(extrairJson(response.text), modelo);
    } catch (error) {
      throw traduzirErro(error, modelo);
    }
  }
}

export { traduzirErro };
export default GeminiProvider;
