import AppError from '../../utils/helpers/AppError.js';

export const novaCascata = (modelos) => {
  if (!Array.isArray(modelos) || modelos.length === 0) {
    // Falha cedo e barulhenta. Uma cascata vazia so apareceria na primeira
    // candidatura avaliada, longe da causa, como "AI_UNAVAILABLE" generico.
    throw new AppError('Cascata de modelos vazia.', 500, 'AI_CASCADE_EMPTY');
  }
  return { modelos: [...modelos], indice: 0, esgotados: [] };
};

export const degrauAtual = (estado) => estado.modelos[estado.indice] ?? null;

export const acabou = (estado) => estado.indice >= estado.modelos.length;

// Sem volta: um degrau esgotado nao e retomado na mesma rodada, porque a cota
// diaria nao volta dentro da sessao.
export const descer = (estado, motivo) => ({
  ...estado,
  indice: estado.indice + 1,
  esgotados: [
    ...estado.esgotados,
    { modelo: degrauAtual(estado), motivo, em: new Date().toISOString() },
  ],
});

// O caminho percorrido, para log e para o campo de rastreabilidade da
// Candidatura. 
export const trilha = (estado) => ({
  usados: estado.modelos.slice(0, estado.indice + 1),
  esgotados: estado.esgotados,
});
