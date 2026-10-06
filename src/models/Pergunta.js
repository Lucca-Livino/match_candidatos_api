import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const TIPOS_RESPOSTA_PERGUNTA = ['multipla_escolha', 'dissertativa', 'verdadeiro_falso'];

const PerguntaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    questionarioId: {
      type: String,
      required: true,
      index: true,
    },
    enunciado: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },
    tipoResposta: {
      type: String,
      required: true,
      enum: TIPOS_RESPOSTA_PERGUNTA,
    },
    peso: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    obrigatoria: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
    ordem: {
      type: Number,
      required: true,
      min: 1,
    },
    criadoEm: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'pergunta',
    timestamps: false,
  },
);

PerguntaSchema.index({ questionarioId: 1, ordem: 1 }, { unique: true });

const Pergunta = mongoose.model('Pergunta', PerguntaSchema);

export default Pergunta;
