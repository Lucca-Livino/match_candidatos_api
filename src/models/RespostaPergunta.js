import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const RespostaPerguntaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    respostaQuestionId: {
      type: String,
      required: true,
      index: true,
    },
    perguntaId: {
      type: String,
      required: true,
      index: true,
    },
    textoResposta: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    criadoEm: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'respostaPergunta',
    timestamps: false,
  },
);

RespostaPerguntaSchema.index({ respostaQuestionId: 1, perguntaId: 1 }, { unique: true });

const RespostaPergunta = mongoose.model('RespostaPergunta', RespostaPerguntaSchema);

export default RespostaPergunta;
