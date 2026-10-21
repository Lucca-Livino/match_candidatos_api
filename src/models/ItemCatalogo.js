import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { normalizarChave } from '../utils/helpers/normalizarChave.js';

export const TIPOS_CATALOGO = ['habilidade', 'area_curso', 'area_atuacao', 'certificacao'];

// Tipo do criterio da vaga -> tipo do catalogo em que o requisito e conferido.
export const TIPO_CATALOGO_POR_CRITERIO = {
  skill_tecnica: 'habilidade',
  formacao: 'area_curso',
  experiencia: 'area_atuacao',
  certificacao: 'certificacao',
};

export const calcularChaves = (nome, sinonimos = []) => [
  ...new Set([nome, ...sinonimos].map(normalizarChave).filter(Boolean)),
];

const ItemCatalogoSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID(), unique: true, index: true },
    tipo: { type: String, required: true, enum: TIPOS_CATALOGO },
    nome: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    sinonimos: { type: [String], default: [] },
    // Ids de itens do mesmo tipo que este item comprova (PostgreSQL implica SQL).
    // Um nivel so: o gate nao segue cadeia.
    implica: { type: [String], default: [] },
    // Inativo some do autocomplete, mas continua valendo no gate: vagas e
    // perfis antigos ainda apontam para ele.
    ativo: { type: Boolean, default: true },
    // Derivado de nome + sinonimos. E por ele que o texto livre do perfil e
    // casado, e o indice unico impede o mesmo sinonimo em dois itens do tipo.
    chaves: { type: [String], default: [] },
  },
  { collection: 'item_catalogo', timestamps: true },
);

ItemCatalogoSchema.index({ tipo: 1, chaves: 1 }, { unique: true });

ItemCatalogoSchema.pre('validate', function definirChaves() {
  this.chaves = calcularChaves(this.nome, this.sinonimos);
});

const ItemCatalogo = mongoose.model('ItemCatalogo', ItemCatalogoSchema);

export default ItemCatalogo;
