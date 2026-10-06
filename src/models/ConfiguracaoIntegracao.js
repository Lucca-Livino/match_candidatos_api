import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const PROVEDORES = ['gemini'];

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
