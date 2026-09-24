import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export const TIPOS_PERMISSAO = ['administrador', 'recrutador', 'candidato', 'suporte'];

const UsuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
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
    tipos_permissao: {
      type: [
        {
          type: String,
          enum: TIPOS_PERMISSAO,
        },
      ],
      required: true,
      default: ['candidato'],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'tipos_permissao deve conter ao menos um papel.',
      },
    },
    // Contato do perfil. Opcionais para todo papel: o recrutador cadastrado
    // pelo admin nao tem LinkedIn, e o candidato costuma preencher o telefone
    // depois do cadastro. String vazia e o "nao informado" — sem `required`,
    // um PATCH parcial nunca esbarra neles.
    telefone: {
      type: String,
      trim: true,
      maxlength: 20,
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
    status_ativo: {
      type: Boolean,
      default: true,
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'grupos',
      },
    ],
    permissions: [
      {
        route: { type: String, required: true },
        domain: { type: String },
        active: { type: Boolean, default: false },
        get: { type: Boolean, default: false },
        post: { type: Boolean, default: false },
        put: { type: Boolean, default: false },
        patch: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  },
);

UsuarioSchema.plugin(mongoosePaginate);

const Usuario = mongoose.model('Usuario', UsuarioSchema);

export default Usuario;
