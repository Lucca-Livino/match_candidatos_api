import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const PROVEDORES = ['gemini', 'groq'];

// IDs de modelo mudam com frequencia nas camadas gratuitas. Ficam aqui como
// ponto unico de ajuste e sao sobrescreviveis pelo suporte em tempo de execucao.
export const MODELO_PADRAO_POR_PROVEDOR = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
};

export const CONFIGURACAO_PADRAO = {
  limiteCompatibilidade: 0.7,
  provedor: 'gemini',
  modelo: MODELO_PADRAO_POR_PROVEDOR.gemini,
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
    modelo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: CONFIGURACAO_PADRAO.modelo,
    },
    // 0 = maxima reprodutibilidade. Gemini e Groq aceitam o parametro,
    // o que ajuda no experimento de calibracao do limiar.
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
