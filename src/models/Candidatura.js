import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const STATUS_CANDIDATURA = ['inscrito', 'em_analise', 'aprovado', 'reprovado'];

const CandidaturaSchema = new mongoose.Schema(
  {
    id: { type: String, default: createUuid, unique: true, index: true },
    usuarioId: { type: String, required: true, index: true },
    vagaId: { type: String, required: true, index: true },
    compativel: { type: Number, min: 0, max: 1, default: 1 },
    motivoIncompat_: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, required: true, enum: STATUS_CANDIDATURA, default: 'inscrito' },
    movidoPor: { type: String, trim: true, maxlength: 180, default: 'sistema' },
    scoreIA: { type: Number, min: 0, max: 1, default: null },
    limiteAplicado: { type: Number, min: 0, max: 1, default: null },
    versaoModelo: { type: String, trim: true, maxlength: 120, default: null },
    avaliadoEm: { type: Date, default: null },
    justificativa: { type: String, trim: true, maxlength: 4000, default: '' },
  },
  {
    collection: 'candidatura',
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  },
);

CandidaturaSchema.index({ usuarioId: 1, vagaId: 1 }, { unique: true });

const Candidatura = mongoose.model('Candidatura', CandidaturaSchema);

export default Candidatura;
