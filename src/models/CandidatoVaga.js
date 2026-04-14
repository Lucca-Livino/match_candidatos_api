import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const STATUS_CANDIDATURA = ['inscrito', 'em_analise', 'aprovado', 'reprovado'];

const CandidatoVagaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    candidatoId: {
      type: String,
      required: true,
      index: true,
    },
    vagaId: {
      type: String,
      required: true,
      index: true,
    },
    compativel: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
    motivoIncompat_: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: STATUS_CANDIDATURA,
      default: 'inscrito',
    },
    movidoPor: {
      type: String,
      trim: true,
      maxlength: 180,
      default: 'sistema',
    },
  },
  {
    collection: 'candidatoVaga',
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  },
);

CandidatoVagaSchema.index({ candidatoId: 1, vagaId: 1 }, { unique: true });

const CandidatoVaga = mongoose.model('CandidatoVaga', CandidatoVagaSchema);

export default CandidatoVaga;
