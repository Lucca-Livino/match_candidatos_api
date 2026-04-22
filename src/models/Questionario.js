import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const QuestionarioSchema = new mongoose.Schema(
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
    criadoPor: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 180,
    },
    instrucoes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    ativo: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
      index: true,
    },
  },
  {
    collection: 'questionario',
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  },
);

const Questionario = mongoose.model('Questionario', QuestionarioSchema);

export default Questionario;
