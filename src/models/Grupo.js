import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const GrupoSchema = new mongoose.Schema(
  {
    nome: { type: String, index: true, unique: true },
    descricao: { type: String, required: true },
    ativo: { type: Boolean, default: true },
    permissions: [
      {
        route: { type: String, index: true, required: true },
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
  { timestamps: true, versionKey: false },
);

GrupoSchema.pre('save', function () {
  const combos = this.permissions.map((p) => `${p.route}_${p.domain}`);
  if (combos.length !== new Set(combos).size) {
    throw new Error('Permissões duplicadas: route + domain devem ser únicos no grupo.');
  }
});

GrupoSchema.plugin(mongoosePaginate);

const Grupo = mongoose.model('grupos', GrupoSchema);

export default Grupo;
