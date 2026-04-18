import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const ScorePerguntaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    candidatoVagaId: {
      type: String,
      required: true,
      index: true,
    },
    respostaPergunta_: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    scoreObtido: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    scoreMaximo: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    atendido: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    avaliadorAutomatic: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
    criadoEm: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'scorePergunta',
    timestamps: false,
  },
);

const ScorePergunta = mongoose.model('ScorePergunta', ScorePerguntaSchema);

export default ScorePergunta;
