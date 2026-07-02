import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const STATUS_RESPOSTA_QUESTIONARIO = ['em_andamento', 'finalizado'];

const RespostaQuestionarioSchema = new mongoose.Schema(
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
    usuarioId: {
      type: String,
      required: true,
      index: true,
    },
    iniciadoEm: {
      type: Date,
      default: Date.now,
    },
    criadoEm: {
      type: Date,
      default: Date.now,
    },
    finalizadoEm: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: STATUS_RESPOSTA_QUESTIONARIO,
      default: 'em_andamento',
    },
  },
  {
    collection: 'respostaQuestionario',
    timestamps: false,
  },
);

RespostaQuestionarioSchema.index({ questionarioId: 1, usuarioId: 1, status: 1 });

const RespostaQuestionario = mongoose.model('RespostaQuestionario', RespostaQuestionarioSchema);

export default RespostaQuestionario;
