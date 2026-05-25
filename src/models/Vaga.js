import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export const AREAS_VAGA = [
  'TI',
  'RH',
  'MARKETING',
  'FINANCEIRO',
  'COMERCIAL',
  'OPERACOES',
  'JURIDICO',
  'ADMINISTRATIVO',
  'OUTROS',
];

export const STATUS_VAGA = ['ativa', 'pausada', 'arquivada'];

export const TIPOS_CRITERIO_VAGA = ['skill_tecnica', 'formacao', 'experiencia', 'certificacao'];

const CriterioVagaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    tipo_criterio: {
      type: String,
      required: true,
      enum: TIPOS_CRITERIO_VAGA,
    },
    peso_percentual: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    obrigatorio: {
      type: Boolean,
      default: false,
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    _id: true,
  },
);

const VagaSchema = new mongoose.Schema(
  {
    area: {
      type: String,
      required: true,
      enum: AREAS_VAGA,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 180,
    },
    descricao: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },
    requisitos_gerais: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: STATUS_VAGA,
      default: 'ativa',
    },
    criterio_vaga: {
      type: [CriterioVagaSchema],
      default: [],
      validate: {
        validator(value) {
          if (!Array.isArray(value)) {
            return false;
          }

          const somaPesos = value.reduce((acc, item) => acc + Number(item.peso_percentual || 0), 0);
          return somaPesos <= 100;
        },
        message: 'A soma de peso_percentual em criterio_vaga nao pode ultrapassar 100.',
      },
    },
  },
  {
    timestamps: true,
  },
);

VagaSchema.plugin(mongoosePaginate);

const Vaga = mongoose.model('Vaga', VagaSchema);

export default Vaga;