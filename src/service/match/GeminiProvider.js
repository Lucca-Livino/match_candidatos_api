import { GoogleGenAI } from '@google/genai';
import AvaliacaoProvider from './AvaliacaoProvider.js';
import { RUBRICA, SCHEMA_AVALIACAO, montarMensagem, extrairJson } from './promptAvaliacao.js';
import { comRetry } from '../../utils/helpers/comRetry.js';

class GeminiProvider extends AvaliacaoProvider {
  constructor(client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })) {
    super();
    this.client = client;
  }

  get nome() {
    return 'gemini';
  }

  async gerarAvaliacao(payload, { modelo, temperatura }) {
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

    return extrairJson(response.text);
  }
}

export default GeminiProvider;
