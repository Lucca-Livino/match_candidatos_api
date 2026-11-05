export const normalizarTexto = (texto) =>
  String(texto ?? '')
    .normalize('NFKD')
    .replace(/\p{Cf}/gu, '')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const palavrasSignificativas = (texto, ignoradas = new Set()) =>
  (normalizarTexto(texto).match(/[a-z0-9]{4,}/g) ?? []).filter((palavra) => !ignoradas.has(palavra));
