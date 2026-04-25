import mongoose from 'mongoose';
import crypto from 'node:crypto';
import mongoosePaginate from 'mongoose-paginate-v2';

const createUuid = () => crypto.randomUUID();

const CandidatoSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    nome: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
    },
    senha: {
      type: String,
      trim: true,
      minlength: 8,
      maxlength: 255,
      select: false,
      default: null,
    },
    telefone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 255,
      default: '',
    },
    cidade: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    estado: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 2,
      default: '',
    },
  },
  {
    collection: 'candidato',
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  },
);

CandidatoSchema.plugin(mongoosePaginate);

const Candidato = mongoose.model('Candidato', CandidatoSchema);

export default Candidato;
