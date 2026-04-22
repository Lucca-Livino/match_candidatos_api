import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const OpcaoRespostaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    perguntaId: {
      type: String,
      required: true,
      index: true,
    },
    texto: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    correta: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    ordem: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    collection: 'opcaoResposta',
    timestamps: false,
  },
);

OpcaoRespostaSchema.index({ perguntaId: 1, ordem: 1 }, { unique: true });

const OpcaoResposta = mongoose.model('OpcaoResposta', OpcaoRespostaSchema);

export default OpcaoResposta;
