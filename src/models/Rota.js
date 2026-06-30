import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const RotaSchema = new mongoose.Schema(
  {
    route: { type: String, index: true, trim: true, lowercase: true },
    domain: { type: String, required: true },
    active: { type: Boolean, default: false },
    get: { type: Boolean, default: false },
    post: { type: Boolean, default: false },
    put: { type: Boolean, default: false },
    patch: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

RotaSchema.index({ route: 1, domain: 1 }, { unique: true });
RotaSchema.plugin(mongoosePaginate);

RotaSchema.pre('save', function () {
  if (this.route) this.route = this.route.toLowerCase();
});

const Rota = mongoose.model('rotas', RotaSchema);

export default Rota;
