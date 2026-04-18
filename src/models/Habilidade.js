import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const NIVEIS_HABILIDADE = ['basico', 'intermediario', 'avancado', 'especialista'];

const HabilidadeSchema = new mongoose.Schema(
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
    habilidade: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    nivel: {
      type: String,
      required: true,
      enum: NIVEIS_HABILIDADE,
    },
  },
  {
    collection: 'habilidade',
    timestamps: false,
  },
);

const Habilidade = mongoose.model('Habilidade', HabilidadeSchema);

export default Habilidade;
