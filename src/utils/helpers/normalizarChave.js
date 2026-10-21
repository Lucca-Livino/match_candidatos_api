// Chave de comparacao entre o texto do perfil e o catalogo. Igualdade exata
// depois de normalizar: nunca comparar por pedaco, que foi o defeito do gate
// antigo ("Java" passava por "JavaScript", "R" por "React").
//
// Tira acento, caixa, espaco e a pontuacao que so muda a grafia (. - _ /).
// `+` e `#` ficam: sem eles C, C++ e C# virariam a mesma chave.
export const normalizarChave = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s._/-]+/g, '')
    .trim();
