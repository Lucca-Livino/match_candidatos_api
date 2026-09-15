import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

// A lista existe com um item so. Nao e desperdicio: e o ponto de extensao que
// mantem o orquestrador fechado para modificacao quando entrar um segundo
// provedor. O Groq saiu da aplicacao no D06 (ver "Decisoes travadas").
export const PROVEDORES = ['gemini'];

// A cascata: modelos do MESMO provedor, em ordem de uso. O degrau seguinte so
// e acionado quando o anterior esgota a cota DIARIA (RPD) — 429 por minuto e
// tratado por backoff no proprio degrau, sem descer.
//
// Ordem: barato e rapido primeiro, reserva depois. A ordem inversa gastaria o
// modelo caro no trabalho corriqueiro e deixaria o barato sobrando, que e o
// oposto do que a camada gratuita recompensa.
//
// IDs mudam com frequencia. Ficam aqui como ponto unico de ajuste e sao
// sobrescreviveis pelo suporte em tempo de execucao.
//
// A reserva NAO e `gemini-3.1-flash`: esse ID nao existe na API (404 no teste
// de fumaca de 27/08 — `is not found for API version v1beta`). A familia 3.1
// so publicou `-flash-lite` e variantes pro/image. A reserva vem da geracao
// seguinte, mantendo o pareamento lite -> lite; os dois responderam com
// `{ score, criterios, resumo }` valido na fumaca.
export const CASCATA_PADRAO = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

export const LIMITE_DEGRAUS = 4;

export const CONFIGURACAO_PADRAO = {
  limiteCompatibilidade: 0.7,
  provedor: 'gemini',
  cascata: CASCATA_PADRAO,
  temperatura: 0,
  ativo: true,
};

const ConfiguracaoIntegracaoSchema = new mongoose.Schema(
  {
    id: { type: String, default: createUuid, unique: true, index: true },
    limiteCompatibilidade: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: CONFIGURACAO_PADRAO.limiteCompatibilidade,
    },
    provedor: {
      type: String,
      required: true,
      enum: PROVEDORES,
      default: CONFIGURACAO_PADRAO.provedor,
    },
    // Lista ORDENADA. O indice e a posicao do degrau, entao a ordem e dado,
    // nao apresentacao — o Mongoose preserva a ordem do array, e e disso que
    // a cascata depende.
    cascata: {
      type: [String],
      required: true,
      default: () => [...CONFIGURACAO_PADRAO.cascata],
      validate: [
        {
          validator: (v) => Array.isArray(v) && v.length >= 1,
          message: 'cascata precisa de pelo menos um modelo.',
        },
        {
          validator: (v) => v.length <= LIMITE_DEGRAUS,
          message: `cascata aceita no maximo ${LIMITE_DEGRAUS} modelos.`,
        },
        {
          // Degrau repetido nao acrescenta cota nenhuma: se o modelo esgotou,
          // esgotou nas duas posicoes. Aceitar duplicata daria a impressao de
          // uma reserva que nao existe.
          validator: (v) => new Set(v).size === v.length,
          message: 'cascata nao pode repetir modelo.',
        },
      ],
    },
    // 0 = maxima reprodutibilidade. O Gemini aceita o parametro (ao contrario
    // dos modelos da Anthropic), o que ajuda no experimento.
    temperatura: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: CONFIGURACAO_PADRAO.temperatura,
    },
    ativo: { type: Boolean, default: CONFIGURACAO_PADRAO.ativo },
    atualizadoPor: { type: String, trim: true, maxlength: 180, default: 'sistema' },
  },
  {
    collection: 'configuracaoIntegracao',
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  },
);

const ConfiguracaoIntegracao = mongoose.model(
  'ConfiguracaoIntegracao',
  ConfiguracaoIntegracaoSchema,
);

export default ConfiguracaoIntegracao;
