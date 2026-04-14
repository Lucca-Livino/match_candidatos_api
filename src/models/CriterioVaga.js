import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const CriterioVagaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    vagaId: {
      type: String,
      required: true,
      index: true,
    },
    tipoCriterioId: {
      type: Number,
      required: true,
    },
    descricao: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    peso: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    obrigatorio: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    criadoEm: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'criterioVaga',
    timestamps: false,
  },
);

const CriterioVaga = mongoose.model('CriterioVaga', CriterioVagaSchema);

export default CriterioVaga;
