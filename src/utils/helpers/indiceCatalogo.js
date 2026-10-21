import { normalizarChave } from './normalizarChave.js';

// Indice do catalogo em memoria, montado uma vez por avaliacao. Mantem o gate
// puro: ele recebe o indice pronto e nao toca no banco.
export const montarIndice = (itens = []) => {
  const porId = new Map();
  const porChave = new Map();
  for (const item of itens) {
    porId.set(item.id, item);
    for (const chave of item.chaves || []) porChave.set(`${item.tipo}:${chave}`, item.id);
  }
  return { porId, porChave };
};

// Qual item do catalogo um item do perfil representa: o vinculo gravado
// (id do mesmo tipo) ou, sem ele, o texto livre por chave exata.
export const resolver = (indice, tipo, { id, texto } = {}) => {
  const vinculado = id ? indice.porId.get(String(id)) : null;
  if (vinculado && vinculado.tipo === tipo) return vinculado.id;

  const chave = normalizarChave(texto);
  if (!chave) return null;
  return indice.porChave.get(`${tipo}:${chave}`) ?? null;
};

// Os ids mais o que cada um implica, um nivel so. Cadeia (A implica B implica
// C) fica de fora de proposito: quem cadastra a relacao decide cada par.
export const expandir = (indice, ids = []) => {
  const resultado = new Set();
  for (const id of ids) {
    if (!id) continue;
    resultado.add(id);
    for (const implicado of indice.porId.get(id)?.implica || []) resultado.add(implicado);
  }
  return resultado;
};
