// Texto digitado vira literal dentro de `$regex`: sem o escape, `c++` quebra a
// consulta e um padrao malicioso pode prender o banco (ReDoS).
export const escaparRegex = (texto) => String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
