import { ErroDeRespostaInvalida } from '../../utils/helpers/errosIA.js';

// O modelo so da a nota de cada criterio. O score global e calculado em
// codigo (calcularScore), porque o modelo ponderava os pesos de forma
// inconsistente e comprimia os scores numa faixa estreita. A nota por
// criterio fica sem escala ancorada de proposito: uma escala de quatro
// ancoras tornou as notas instaveis entre repeticoes (estudo D25).
export const RUBRICA = `Voce avalia a compatibilidade entre um candidato e uma vaga de emprego.

Receba: os criterios da vaga, o curriculo do candidato e as respostas dele ao questionario da vaga.

Para cada criterio da vaga, atribua uma aderencia de 0 a 1 e cite a evidencia textual do curriculo ou das respostas que sustenta a nota. Se nao houver evidencia, a aderencia e 0 e a evidencia deve dizer "sem evidencia".

As respostas do questionario vem em dois formatos e valem como evidencia nos dois:
- Dissertativa: use o campo textoResposta, avaliando a qualidade e a aderencia do conteudo.
- Multipla escolha e verdadeiro/falso: a correcao ja vem pronta. "opcoesSelecionadas" e o que o candidato marcou, "gabarito" e a resposta certa e "acertou" diz se ele acertou. Trate "acertou: true" como evidencia direta de dominio do que a pergunta cobra e "acertou: false" como lacuna. Nao reavalie o gabarito nem decida por conta propria se a alternativa marcada esta certa. Quando "acertou" for null a pergunta nao tem gabarito: use a resposta apenas como contexto, sem contar acerto nem erro.

A formacao traz situacao de uma lista fechada: cursando, concluido, trancado ou incompleto. Para "cursando", previsaoConclusao e o ano previsto de formatura: compare com data_referencia para saber quanto falta (previsao no mesmo ano ou no seguinte indica reta final do curso). Para "concluido", anoConclusao e o ano em que se formou. "trancado" e "incompleto" nao contam como formacao concluida. Se previsaoConclusao vier null, nao presuma em que etapa do curso o candidato esta.

A nota de cada criterio deve refletir apenas a evidencia daquele criterio, incluindo o que as respostas do questionario mostram sobre ele. Nao produza nota global: a combinacao das notas e feita fora do modelo.

Reconheca equivalencia semantica: "React" e evidencia parcial de "front-end"; "Analista de Sistemas Junior" e evidencia de "experiencia em desenvolvimento". Nao invente evidencia que nao esteja no material fornecido.

Nao compare este candidato com nenhum outro. Avalie apenas contra os criterios da vaga.

Escreva o resumo em portugues do Brasil, em no maximo tres frases, dirigido ao recrutador. Descreva o que o candidato atende e o que falta. Nao qualifique a aderencia global (por exemplo "atende os principais requisitos" ou "perfil compativel"): a decisao e calculada fora do modelo e o resumo nao pode contradize-la.`;

export const INSTRUCAO_FORMATO = `Responda EXCLUSIVAMENTE com um objeto JSON valido, sem markdown e sem texto ao redor, neste formato:
{
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
  required: ['criterios', 'resumo'],
};

export const montarMensagem = (payload) =>
  [
    `<data_referencia>${payload.dataReferencia}</data_referencia>`,
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

  if (!Array.isArray(resultado?.criterios)) throw invalido('criterios_invalidos');

  const criterios = resultado.criterios.map((criterio) => {
    const aderencia = criterio?.aderencia;
    // Sem a nota de um criterio o score calculado fica errado sem aviso.
    if (typeof aderencia !== 'number' || !Number.isFinite(aderencia) || aderencia < 0 || aderencia > 1) {
      throw invalido('aderencia_invalida');
    }
    return { ...criterio, criterioId: String(criterio.criterioId) };
  });

  return {
    criterios,
    resumo: String(resultado.resumo || ''),
  };
};
