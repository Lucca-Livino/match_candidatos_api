import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const GRAUS_ACADEMICOS = [
  'tecnico',
  'graduacao',
  'pos_graduacao',
  'mestrado',
  'doutorado',
];

const FormacaoSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    usuarioId: {
      type: String,
      required: true,
      index: true,
    },
    instituicao: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    curso: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    grau: {
      type: String,
      required: true,
      enum: GRAUS_ACADEMICOS,
    },
    situacao: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    anoInicio: {
      type: Number,
      required: true,
      min: 1900,
      max: 3000,
    },
    anoConclusao: {
      type: Number,
      min: 1900,
      max: 3000,
      default: null,
    },
  },
  {
    collection: 'formacao',
    timestamps: false,
  },
);

const Formacao = mongoose.model('Formacao', FormacaoSchema);

export default Formacao;
