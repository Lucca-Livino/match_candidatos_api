import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

export const STATUS_CANDIDATURA = ['inscrito', 'em_analise', 'aprovado', 'reprovado'];

// Nota que o modelo deu a cada criterio, com a evidencia: e o porque do
// scoreIA. Registro de auditoria, visivel so ao suporte.
const CriterioAvaliadoSchema = new mongoose.Schema(
  {
    criterioId: { type: String, required: true },
    nome: { type: String, trim: true, maxlength: 180, default: '' },
    peso: { type: Number, min: 0, max: 100, default: 0 },
    obrigatorio: { type: Boolean, default: false },
    aderencia: { type: Number, min: 0, max: 1, default: 0 },
    evidencia: { type: String, trim: true, maxlength: 2000, default: '' },
    atendido: { type: Boolean, default: false },
    // O modelo nao devolveu nota para o criterio: entrou como 0 no score.
    omitido: { type: Boolean, default: false },
  },
  { _id: false },
);

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
    criteriosAvaliados: { type: [CriterioAvaliadoSchema], default: [] },
    // Trilha da ultima reabertura (aprovado/reprovado -> em_analise). Vem da
    // sessao, nunca do payload.
    reabertoPor: { type: String, trim: true, maxlength: 180, default: null },
    reabertoEm: { type: Date, default: null },
  },
  {
    collection: 'candidatura',
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
  },
);

CandidaturaSchema.index({ usuarioId: 1, vagaId: 1 }, { unique: true });

const Candidatura = mongoose.model('Candidatura', CandidaturaSchema);

export default Candidatura;
