export const normalizarTexto = (texto) =>
  String(texto ?? '')
    .normalize('NFKD')
    .replace(/\p{Cf}/gu, '')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
