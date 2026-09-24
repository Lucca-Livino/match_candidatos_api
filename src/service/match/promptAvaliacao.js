import { ErroDeRespostaInvalida } from '../../utils/helpers/errosIA.js';

// Escala descrita explicitamente: sem ela o modelo inventa uma calibragem
// diferente a cada vaga e o limiar deixa de significar a mesma coisa.
export const RUBRICA = `Voce avalia a compatibilidade entre um candidato e uma vaga de emprego.

Receba: os criterios ponderados da vaga, o curriculo do candidato e as respostas dele ao questionario da vaga.

Para cada criterio da vaga, atribua uma aderencia de 0 a 1 e cite a evidencia textual do curriculo ou das respostas que sustenta a nota. Se nao houver evidencia, a aderencia e 0 e a evidencia deve dizer "sem evidencia".

As respostas do questionario vem em dois formatos e valem como evidencia nos dois:
- Dissertativa: use o campo textoResposta, avaliando a qualidade e a aderencia do conteudo.
- Multipla escolha e verdadeiro/falso: a correcao ja vem pronta. "opcoesSelecionadas" e o que o candidato marcou, "gabarito" e a resposta certa e "acertou" diz se ele acertou. Trate "acertou: true" como evidencia direta de dominio do que a pergunta cobra e "acertou: false" como lacuna. Nao reavalie o gabarito nem decida por conta propria se a alternativa marcada esta certa. Quando "acertou" for null a pergunta nao tem gabarito: use a resposta apenas como contexto, sem contar acerto nem erro.

Depois, produza um score global de 0 a 1 ponderando os criterios pelo campo peso_percentual (criterios de maior peso pesam proporcionalmente mais) e ajustando pela qualidade das respostas dissertativas e pelos acertos das objetivas.

Escala do score global:
- 0.90 a 1.00 — atende todos os criterios de peso alto com evidencia direta e respostas consistentes.
- 0.70 a 0.89 — atende os criterios de maior peso; lacunas apenas em criterios de peso baixo.
- 0.50 a 0.69 — atende parcialmente os criterios de maior peso; lacunas relevantes.
- 0.30 a 0.49 — evidencia fraca ou apenas tangencial nos criterios principais.
- 0.00 a 0.29 — nao ha evidencia de aderencia aos criterios principais.

Reconheca equivalencia semantica: "React" e evidencia parcial de "front-end"; "Analista de Sistemas Junior" e evidencia de "experiencia em desenvolvimento". Nao invente evidencia que nao esteja no material fornecido.

Nao compare este candidato com nenhum outro. Avalie apenas contra os criterios da vaga.

Escreva o resumo em portugues do Brasil, em no maximo tres frases, dirigido ao recrutador.`;

export const INSTRUCAO_FORMATO = `Responda EXCLUSIVAMENTE com um objeto JSON valido, sem markdown e sem texto ao redor, neste formato:
{
  "score": <numero entre 0 e 1>,
  "criterios": [
    {
      "criterioId": "<id do criterio recebido>",
      "aderencia": <numero entre 0 e 1>,
      "evidencia": "<trecho do material ou 'sem evidencia'>",
      "atendido": <true ou false>
    }
  ],
  "resumo": "<ate tres frases>"
}`;

export const SCHEMA_AVALIACAO = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    criterios: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterioId: { type: 'string' },
          aderencia: { type: 'number' },
          evidencia: { type: 'string' },
          atendido: { type: 'boolean' },
        },
        required: ['criterioId', 'aderencia', 'evidencia', 'atendido'],
      },
    },
    resumo: { type: 'string' },
  },
  required: ['score', 'criterios', 'resumo'],
};

export const montarMensagem = (payload) =>
  [
    '<vaga>',
    JSON.stringify(payload.vaga, null, 2),
    '</vaga>',
    '<curriculo>',
    JSON.stringify(payload.curriculo, null, 2),
    '</curriculo>',
    '<respostas_questionario>',
    JSON.stringify(payload.questionario, null, 2),
    '</respostas_questionario>',
  ].join('\n');

export const extrairJson = (texto) => {
  const limpo = String(texto || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(limpo);
};

export const validarAvaliacao = (resultado, modelo = null) => {
  const invalido = (causa) => new ErroDeRespostaInvalida(causa, { modelo, motivo: causa });

  const score = Number(resultado?.score);
  if (!Number.isFinite(score) || score < 0 || score > 1) throw invalido('score_invalido');
  if (!Array.isArray(resultado.criterios)) throw invalido('criterios_invalidos');

  return {
    score,
    criterios: resultado.criterios,
    resumo: String(resultado.resumo || ''),
  };
};
