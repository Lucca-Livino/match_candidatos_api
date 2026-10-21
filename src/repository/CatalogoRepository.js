import ItemCatalogo from '../models/ItemCatalogo.js';

class CatalogoRepository {
  async criar(payload) {
    return ItemCatalogo.create(payload);
  }

  async buscarPorId(id) {
    return ItemCatalogo.findOne({ id }).lean();
  }

  async buscarPorIds(ids) {
    return ItemCatalogo.find({ id: { $in: ids } }).lean();
  }

  async buscarAtivos({ tipo, prefixo, limit }) {
    const filtro = { tipo, ativo: true };
    if (prefixo) filtro.chaves = { $regex: `^${prefixo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    return ItemCatalogo.find(filtro).sort({ nome: 1 }).limit(limit).lean();
  }

  // Tela do administrador: o tipo inteiro, inativos inclusive.
  async listarPorTipo(tipo) {
    return ItemCatalogo.find({ tipo }).sort({ nome: 1 }).lean();
  }

  async listarTodos() {
    return ItemCatalogo.find({}).lean();
  }

  async atualizar(id, payload) {
    return ItemCatalogo.findOneAndUpdate({ id }, payload, { returnDocument: 'after', runValidators: true }).lean();
  }
}

export default CatalogoRepository;
