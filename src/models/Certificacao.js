import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const CertificacaoSchema = new mongoose.Schema(
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
    nome: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    emissor: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    dataEmissao: {
      type: Date,
      default: null,
    },
    dataExpiracao: {
      type: Date,
      default: null,
    },
    codigo: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
  },
  {
    collection: 'certificacao',
    timestamps: false,
  },
);

const Certificacao = mongoose.model('Certificacao', CertificacaoSchema);

export default Certificacao;
