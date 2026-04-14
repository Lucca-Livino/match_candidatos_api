import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const ExperienciaSchema = new mongoose.Schema(
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
    empresa: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    cargo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    descricaoAtivida_: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    dataInicio: {
      type: Date,
      required: true,
    },
    dataFim: {
      type: Date,
      default: null,
    },
    mesesDuracao: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: 'experiencia',
    timestamps: false,
  },
);

const Experiencia = mongoose.model('Experiencia', ExperienciaSchema);

export default Experiencia;
